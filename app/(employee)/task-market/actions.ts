"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { verifyActor } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitMarketListing(formData: {
  taskId: string;
  reason: string;
  handoverNote: string;
  requiredSkills: string[];
  userId: string;
}) {
  const { taskId, reason, handoverNote, requiredSkills, userId } = formData;

  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  if (!handoverNote.trim()) {
    return { error: "引き継ぎメモは必須です" };
  }

  const { data: task, error: taskError } = await adminSupabase
    .from("tasks")
    .select("title, provisional_score, progress_rate, due_date")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { error: "タスクが見つかりません" };
  }

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const now = new Date();
  if (dueDate) {
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / 3600000;
    if (hoursUntilDue <= 3) {
      return { error: "期限まで3時間以内のタスクは出品できません" };
    }
  }

  // 出品時点の進捗と残りポイントを記録（点数分配・CEO監視画面で使用）
  const progressAtListing = task.progress_rate ?? 0;
  const remainingPoints = Math.round(
    (task.provisional_score ?? 0) * (1 - progressAtListing / 100)
  );

  const { error: insertError } = await adminSupabase
    .from("task_market_listings")
    .insert({
      task_id: taskId,
      listed_by: userId,
      reason,
      handover_note: handoverNote,
      required_skills: requiredSkills,
      progress_at_listing: progressAtListing,
      remaining_points: remainingPoints,
      status: "pending_approval",
      expires_at: task.due_date ?? null,
    });

  if (insertError) {
    return { error: "出品申請に失敗しました" };
  }

  await writeAuditLog({
    userId,
    action: "create_market_listing",
    targetType: "task",
    targetId: taskId,
    after: { reason, status: "pending_approval" },
  });

  revalidatePath("/task-market");
  return { success: true };
}

export async function submitMarketApplication(formData: {
  listingId: string;
  message: string;
  userId: string;
}) {
  const { listingId, message, userId } = formData;

  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  if (!message.trim()) {
    return { error: "引き受け理由を入力してください" };
  }

  // 既に申請済みかチェック
  const { data: existing } = await adminSupabase
    .from("task_applications")
    .select("id")
    .eq("listing_id", listingId)
    .eq("applicant_id", userId)
    .maybeSingle();

  if (existing) {
    return { error: "すでに申請済みです" };
  }

  const { error: insertError } = await adminSupabase
    .from("task_applications")
    .insert({
      listing_id: listingId,
      applicant_id: userId,
      message: message.trim(),
      status: "pending",
    });

  if (insertError) {
    return { error: "申請に失敗しました" };
  }

  // 出品者に通知
  const { data: listing } = await adminSupabase
    .from("task_market_listings")
    .select("listed_by, tasks ( title )")
    .eq("id", listingId)
    .single();

  if (listing?.listed_by && listing.listed_by !== userId) {
    const taskTitle = (listing.tasks as { title?: string } | null)?.title ?? "タスク";
    await createNotification({
      userId: listing.listed_by,
      title: "タスクに引き受け申請が届きました",
      message: `「${taskTitle}」に引き受け申請が届きました`,
      type: "market_activity",
      actionUrl: "/task-market/my-tasks",
    });
  }

  await writeAuditLog({
    userId,
    action: "create_market_application",
    targetType: "task_market_listing",
    targetId: listingId,
    after: { status: "pending" },
  });

  revalidatePath("/task-market");
  redirect("/task-market");
}

// 自分の出品タスクへの申請を承認する
export async function approveApplication(applicationId: string, ownerId: string) {
  const authError = await verifyActor(ownerId);
  if (authError) return { error: authError };

  const { data: app } = await adminSupabase
    .from("task_applications")
    .select(`
      id, applicant_id, listing_id,
      task_market_listings ( id, task_id, listed_by )
    `)
    .eq("id", applicationId)
    .single();

  if (!app) return { error: "申請が見つかりません" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listing = app.task_market_listings as any;
  if (listing?.listed_by !== ownerId) return { error: "権限がありません" };

  // 申請を承認
  await adminSupabase
    .from("task_applications")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: ownerId })
    .eq("id", applicationId);

  // 他の申請をすべて拒否
  await adminSupabase
    .from("task_applications")
    .update({ status: "rejected" })
    .eq("listing_id", app.listing_id)
    .neq("id", applicationId);

  // 出品をtakenに更新
  await adminSupabase
    .from("task_market_listings")
    .update({ status: "taken", updated_at: new Date().toISOString() })
    .eq("id", app.listing_id);

  // タスクの担当者を変更
  if (listing?.task_id && app.applicant_id) {
    await adminSupabase
      .from("tasks")
      .update({ assigned_to: app.applicant_id, is_on_market: false })
      .eq("id", listing.task_id);
  }

  // 申請者に通知
  await createNotification({
    userId: app.applicant_id,
    title: "引き受け申請が承認されました",
    message: "タスクの担当者として正式に割り当てられました",
    type: "market_activity",
    actionUrl: "/task-market/my-tasks",
  });

  await writeAuditLog({
    userId: ownerId,
    action: "approve_market_application",
    targetType: "task_market_listings",
    targetId: app.listing_id,
    after: { application_id: applicationId, new_assignee: app.applicant_id },
  });

  revalidatePath("/task-market/my-tasks");
  return { success: true };
}

// 自分の出品タスクへの申請を拒否する
export async function rejectApplication(applicationId: string, ownerId: string) {
  const authError = await verifyActor(ownerId);
  if (authError) return { error: authError };

  const { data: app } = await adminSupabase
    .from("task_applications")
    .select(`
      id, applicant_id, listing_id,
      task_market_listings ( listed_by )
    `)
    .eq("id", applicationId)
    .single();

  if (!app) return { error: "申請が見つかりません" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listing = app.task_market_listings as any;
  if (listing?.listed_by !== ownerId) return { error: "権限がありません" };

  await adminSupabase
    .from("task_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: ownerId })
    .eq("id", applicationId);

  await createNotification({
    userId: app.applicant_id,
    title: "引き受け申請が却下されました",
    message: "今回は見送りとなりました。他のタスクへの申請もぜひご検討ください",
    type: "market_activity",
    actionUrl: "/task-market",
  });

  await writeAuditLog({
    userId: ownerId,
    action: "reject_market_application",
    targetType: "task_applications",
    targetId: applicationId,
    after: { status: "rejected" },
  });

  revalidatePath("/task-market/my-tasks");
  return { success: true };
}
