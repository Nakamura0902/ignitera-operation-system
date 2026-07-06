"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { verifyCeoOrAdmin } from "@/lib/api-auth";

export async function approveItem(
  type: "task_score" | "market" | "payroll",
  itemId: string,
  approvedByUserId: string
) {
  const authError = await verifyCeoOrAdmin(approvedByUserId);
  if (authError) return { error: authError };

  if (type === "task_score") {
    const { data: score } = await adminSupabase
      .from("task_scores")
      .select("provisional_total, task_id")
      .eq("id", itemId)
      .single();

    if (!score) return { error: "スコアが見つかりません" };

    const confirmedTotal = score.provisional_total;

    await adminSupabase
      .from("task_scores")
      .update({
        confirmed_total: confirmedTotal,
        quality_coefficient: 1.0,
        approved_by: approvedByUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    const { data: task } = await adminSupabase
      .from("tasks")
      .select("assigned_to, title")
      .eq("id", score.task_id)
      .single();

    if (task?.assigned_to) {
      await createNotification({
        userId: task.assigned_to,
        title: "タスク点数が承認されました",
        message: `「${task.title}」の確定ポイント: ${confirmedTotal}pt`,
        type: "score_confirmed",
        actionUrl: "/score-history",
      });
    }

    await writeAuditLog({
      userId: approvedByUserId,
      action: "approve_task_score",
      targetType: "task_scores",
      targetId: itemId,
      after: { confirmed_total: confirmedTotal, quality_coefficient: 1.0 },
    });

    return { success: true };
  }

  if (type === "market") {
    const { data: listing } = await adminSupabase
      .from("task_market_listings")
      .select("listed_by, task_id")
      .eq("id", itemId)
      .single();

    if (!listing) return { error: "出品が見つかりません" };

    await adminSupabase
      .from("task_market_listings")
      .update({
        status: "open",
        approved_by: approvedByUserId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    // タスク側にも出品中フラグを立てる（task-market-monitorの承認と同じ挙動）
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
      targetId: itemId,
      after: { status: "open" },
    });

    return { success: true };
  }

  if (type === "payroll") {
    const { data: estimate } = await adminSupabase
      .from("payroll_estimates")
      .select("user_id, total_estimate, year, month")
      .eq("id", itemId)
      .single();

    if (!estimate) return { error: "給与見込みが見つかりません" };

    await adminSupabase
      .from("payroll_estimates")
      .update({
        status: "approved",
        approved_by: approvedByUserId,
        confirmed_total: estimate.total_estimate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    await createNotification({
      userId: estimate.user_id,
      title: "給与見込みが承認されました",
      message: `${estimate.year}年${estimate.month}月分 ¥${Number(estimate.total_estimate).toLocaleString()} が承認されました`,
      type: "approval_required",
      actionUrl: "/payroll-estimate",
    });

    await writeAuditLog({
      userId: approvedByUserId,
      action: "approve_payroll",
      targetType: "payroll_estimates",
      targetId: itemId,
      after: { status: "approved", confirmed_total: estimate.total_estimate },
    });

    return { success: true };
  }

  return { error: "不明な種類です" };
}

export async function rejectItem(
  type: "task_score" | "market" | "payroll",
  itemId: string,
  rejectedByUserId: string,
  reason?: string
) {
  const authError = await verifyCeoOrAdmin(rejectedByUserId);
  if (authError) return { error: authError };

  if (type === "market") {
    const { data: listing } = await adminSupabase
      .from("task_market_listings")
      .select("listed_by")
      .eq("id", itemId)
      .single();

    await adminSupabase
      .from("task_market_listings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", itemId);

    if (listing?.listed_by) {
      await createNotification({
        userId: listing.listed_by,
        title: "タスクマーケット出品が差し戻されました",
        message: reason ? `理由: ${reason}` : "出品申請が差し戻されました",
        type: "market_activity",
        actionUrl: "/tasks",
      });
    }

    await writeAuditLog({
      userId: rejectedByUserId,
      action: "reject_market_listing",
      targetType: "task_market_listings",
      targetId: itemId,
      after: { status: "cancelled", reason: reason ?? "" },
    });
  } else {
    await writeAuditLog({
      userId: rejectedByUserId,
      action: `reject_${type}`,
      targetType: type === "task_score" ? "task_scores" : "payroll_estimates",
      targetId: itemId,
      after: { reason: reason ?? "" },
    });
  }

  return { success: true };
}
