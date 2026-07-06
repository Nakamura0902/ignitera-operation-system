"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { verifyCeoOrAdmin } from "@/lib/api-auth";

export async function approveMarketListing(listingId: string, approvedByUserId: string) {
  const authError = await verifyCeoOrAdmin(approvedByUserId);
  if (authError) return { error: authError };

  const { data: listing } = await adminSupabase
    .from("task_market_listings")
    .select("listed_by, task_id")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "出品が見つかりません" };

  const { error } = await adminSupabase
    .from("task_market_listings")
    .update({
      status: "open",
      approved_by: approvedByUserId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (error) return { error: "承認に失敗しました" };

  await adminSupabase
    .from("tasks")
    .update({ is_on_market: true })
    .eq("id", listing.task_id);

  await createNotification({
    userId: listing.listed_by,
    title: "タスクマーケットへの出品が承認されました",
    message: "出品申請が承認されました。マーケットに公開されています",
    type: "market_activity",
    actionUrl: "/task-market",
  });

  await writeAuditLog({
    userId: approvedByUserId,
    action: "approve_market_listing",
    targetType: "task_market_listings",
    targetId: listingId,
    after: { status: "open" },
  });

  return { success: true };
}

export async function rejectMarketListing(listingId: string, rejectedByUserId: string, reason?: string) {
  const authError = await verifyCeoOrAdmin(rejectedByUserId);
  if (authError) return { error: authError };

  const { data: listing } = await adminSupabase
    .from("task_market_listings")
    .select("listed_by")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "出品が見つかりません" };

  await adminSupabase
    .from("task_market_listings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", listingId);

  await createNotification({
    userId: listing.listed_by,
    title: "タスクマーケット出品が差し戻されました",
    message: reason ? `理由: ${reason}` : "出品申請が差し戻されました。再度申請が可能です",
    type: "market_activity",
    actionUrl: "/tasks",
  });

  await writeAuditLog({
    userId: rejectedByUserId,
    action: "reject_market_listing",
    targetType: "task_market_listings",
    targetId: listingId,
    after: { status: "cancelled", reason: reason ?? "" },
  });

  return { success: true };
}
