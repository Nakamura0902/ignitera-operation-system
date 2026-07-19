"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { getApiUser, isCeoOrAdmin } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { isTaskLocked, remainingHours } from "@/lib/task-board";
import { revalidatePath } from "next/cache";

// 履歴を1件記録する
async function recordHistory(params: {
  taskId: string;
  action: string;
  fromMemberId?: string | null;
  toMemberId?: string | null;
  reason?: string | null;
  progressPercent?: number | null;
  deadline?: string | null;
  createdByMemberId: string;
}) {
  await adminSupabase.from("task_assignment_history").insert({
    task_id: params.taskId,
    action: params.action,
    from_member_id: params.fromMemberId ?? null,
    to_member_id: params.toMemberId ?? null,
    reason: params.reason ?? null,
    progress_percent: params.progressPercent ?? null,
    remaining_hours_at_action: params.deadline ? Math.round(remainingHours(params.deadline) ?? 0) : null,
    created_by_member_id: params.createdByMemberId,
  });
}

// ---- タスク作成（CEO / マネージャー） ----
export interface CreateBoardTaskInput {
  title: string;
  description?: string;
  completionCriteria?: string;
  priorityRank?: number | null;
  difficulty: number;
  rewardPoints?: number;
  deadline?: string;
  projectId?: string;
  assigneeMemberId?: string | null; // CEO/mgrは直接割当可（後方互換）
  assigneeMemberIds?: string[]; // 複数割当可（1人ごとにタスクを複製）
  revenueAmount?: number;
  revenueType?: "none" | "one_time" | "monthly";
}

export async function createBoardTask(input: CreateBoardTaskInput) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  if (!isCeoOrAdmin(user)) return { error: "タスク追加は社長・マネージャーのみ可能です" };
  if (!input.title.trim()) return { error: "タスク名を入力してください" };

  const difficulty = Math.min(5, Math.max(1, Math.round(input.difficulty) || 3));
  const revenueType = input.revenueType ?? "one_time";
  const revenueAmount = revenueType === "none" ? 0 : (input.revenueAmount && input.revenueAmount > 0 ? input.revenueAmount : 0);
  const rewardPoints = input.rewardPoints && input.rewardPoints > 0 ? input.rewardPoints : 0;

  // 作成者情報
  const { data: creator } = await adminSupabase
    .from("users").select("full_name, roles(name)").eq("id", user.id).single();
  const creatorRole = (creator?.roles as { name?: string } | null)?.name === "ceo" ? "CEO" : "MANAGER";

  const assignees = Array.from(new Set(
    (input.assigneeMemberIds && input.assigneeMemberIds.length > 0
      ? input.assigneeMemberIds
      : (input.assigneeMemberId ? [input.assigneeMemberId] : [])
    ).filter(Boolean)
  ));

  const baseFields = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: "medium",
    difficulty,
    reward_points: rewardPoints,
    due_date: input.deadline || null,
    project_id: input.projectId || null,
    created_by: user.id,
    status: "pending",
    progress_rate: 0,
  };

  // 割当なし: 未アサインキューへ1件（優先順位を計算・繰り下げ）
  if (assignees.length === 0) {
    let rank = input.priorityRank ?? null;
    if (rank != null) {
      const { data: toShift } = await adminSupabase
        .from("tasks").select("id, priority_rank")
        .is("assigned_to", null).not("priority_rank", "is", null).gte("priority_rank", rank);
      for (const t of toShift ?? []) {
        await adminSupabase.from("tasks").update({ priority_rank: (t.priority_rank as number) + 1 }).eq("id", t.id);
      }
    } else {
      const { data: maxRow } = await adminSupabase
        .from("tasks").select("priority_rank").is("assigned_to", null)
        .order("priority_rank", { ascending: false }).limit(1).maybeSingle();
      rank = ((maxRow?.priority_rank as number | null) ?? 0) + 1;
    }

    const { data: task, error } = await adminSupabase.from("tasks").insert({
      ...baseFields, revenue_amount: revenueAmount, revenue_type: revenueType,
      priority_rank: rank, assigned_to: null,
    }).select("id").single();
    if (error || !task) return { error: "タスクの作成に失敗しました" };

    await recordHistory({ taskId: task.id, action: "CREATED", toMemberId: null, createdByMemberId: user.id, deadline: input.deadline ?? null });
    revalidatePath("/task-board");
    return { success: true, taskIds: [task.id], count: 1, creatorRole };
  }

  // 割当あり: 1人ごとに複製。優先順位は付与しない（未アサインキュー専用）
  // 売上は重複計上を避けるため先頭の1件のみに付与
  const createdIds: string[] = [];
  for (let i = 0; i < assignees.length; i++) {
    const assignee = assignees[i];
    const isFirst = i === 0;
    const { data: task, error } = await adminSupabase.from("tasks").insert({
      ...baseFields,
      revenue_amount: isFirst ? revenueAmount : 0,
      revenue_type: isFirst ? revenueType : "none",
      priority_rank: null, assigned_to: assignee,
    }).select("id").single();
    if (error || !task) continue;
    createdIds.push(task.id);

    await recordHistory({ taskId: task.id, action: "CREATED", toMemberId: assignee, createdByMemberId: user.id, deadline: input.deadline ?? null });
    await createNotification({
      userId: assignee, title: "新しいタスクが割り当てられました",
      message: input.title.trim(), type: "task_assigned", actionUrl: "/task-board",
    });
  }

  if (createdIds.length === 0) return { error: "タスクの作成に失敗しました" };
  revalidatePath("/task-board");
  return { success: true, taskIds: createdIds, count: createdIds.length, creatorRole };
}

// ---- タスク削除（CEO / マネージャーのみ・ソフト削除 + 監査ログ） ----
export async function deleteBoardTask(taskId: string) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  if (!isCeoOrAdmin(user)) return { error: "タスクの削除は社長・マネージャーのみ可能です" };

  const { data: task } = await adminSupabase
    .from("tasks").select("id, title, status, assigned_to, revenue_amount").eq("id", taskId).maybeSingle();
  if (!task) return { error: "タスクが見つかりません" };
  if (task.status === "cancelled") return { error: "このタスクは既に削除されています" };

  // ソフト削除: cancelled にするとボード・各一覧から除外される（記録は残す）
  const { error } = await adminSupabase.from("tasks").update({ status: "cancelled" }).eq("id", taskId);
  if (error) return { error: "タスクの削除に失敗しました" };

  await writeAuditLog({
    userId: user.id,
    action: "task.deleted",
    targetType: "task",
    targetId: taskId,
    before: { title: task.title, status: task.status, assigned_to: task.assigned_to, revenue_amount: task.revenue_amount },
  });

  // 担当者がいた場合は通知
  if (task.assigned_to) {
    await createNotification({
      userId: task.assigned_to, title: "タスクが削除されました",
      message: `「${task.title}」が削除されました`, type: "system", actionUrl: "/task-board",
    });
  }

  revalidatePath("/task-board");
  return { success: true };
}

// ---- タスク取得（未アサイン → 本人 / CEO・mgrは他者へ割当可） ----
export async function acquireTask(taskId: string, toMemberId: string) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };

  // 自分以外へ割り当てられるのは CEO/マネージャーのみ
  if (toMemberId !== user.id && !isCeoOrAdmin(user)) {
    return { error: "他の社員へ割り当てできるのは社長・マネージャーのみです" };
  }

  const { data: task } = await adminSupabase
    .from("tasks").select("id, assigned_to, due_date, title").eq("id", taskId).maybeSingle();
  if (!task) return { error: "タスクが見つかりません" };
  if (task.assigned_to) return { error: "このタスクは既に取得されています" };

  const { error } = await adminSupabase
    .from("tasks").update({ assigned_to: toMemberId, priority_rank: null }).eq("id", taskId)
    .is("assigned_to", null); // 二重取得防止（既にassignedなら0行）
  if (error) return { error: "取得に失敗しました" };

  await recordHistory({
    taskId, action: "ACQUIRED", toMemberId,
    createdByMemberId: user.id, deadline: task.due_date,
  });

  revalidatePath("/task-board");
  return { success: true };
}

// ---- 移管申請（現担当者 → 他社員。同意待ち） ----
export interface TransferInput {
  taskId: string;
  toMemberId: string;
  progressPercent: number;
  reason: string;
  completedWork?: string;
  remainingWork?: string;
  handoverNotes?: string;
}
export async function requestTransfer(input: TransferInput) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };

  const { data: task } = await adminSupabase
    .from("tasks").select("assigned_to, due_date, title").eq("id", input.taskId).maybeSingle();
  if (!task) return { error: "タスクが見つかりません" };
  if (task.assigned_to !== user.id) return { error: "自分が担当するタスクのみ移管申請できます" };
  if (isTaskLocked(task.due_date)) return { error: "納期まで48時間未満のため移管できません" };
  if (input.toMemberId === user.id) return { error: "自分自身へは移管できません" };

  const { error } = await adminSupabase.from("task_transfer_requests").insert({
    task_id: input.taskId, from_member_id: user.id, to_member_id: input.toMemberId,
    progress_percent: input.progressPercent, reason: input.reason,
    completed_work: input.completedWork || null, remaining_work: input.remainingWork || null,
    handover_notes: input.handoverNotes || null, status: "PENDING",
  });
  if (error) return { error: "移管申請に失敗しました" };

  await recordHistory({
    taskId: input.taskId, action: "TRANSFER_REQUESTED",
    fromMemberId: user.id, toMemberId: input.toMemberId,
    reason: input.reason, progressPercent: input.progressPercent,
    createdByMemberId: user.id, deadline: task.due_date,
  });
  await createNotification({
    userId: input.toMemberId, title: "タスク移管申請が届きました",
    message: `「${task.title}」の移管申請`, type: "task_assigned", actionUrl: "/task-board",
  });

  revalidatePath("/task-board");
  return { success: true };
}

// ---- 移管申請への応答（受取人のみ） ----
export async function respondTransfer(requestId: string, accept: boolean) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };

  const { data: req } = await adminSupabase
    .from("task_transfer_requests").select("*").eq("id", requestId).maybeSingle();
  if (!req) return { error: "申請が見つかりません" };
  if (req.to_member_id !== user.id) return { error: "この申請を操作する権限がありません" };
  if (req.status !== "PENDING") return { error: "既に処理済みの申請です" };

  const { data: task } = await adminSupabase
    .from("tasks").select("due_date, title").eq("id", req.task_id).maybeSingle();

  await adminSupabase.from("task_transfer_requests")
    .update({ status: accept ? "ACCEPTED" : "REJECTED", resolved_at: new Date().toISOString() })
    .eq("id", requestId);

  if (accept) {
    // 正式移管: 成果・報酬・実績・責任は100%受取人へ。元担当者には付与しない。
    await adminSupabase.from("tasks").update({ assigned_to: user.id }).eq("id", req.task_id);
    await recordHistory({
      taskId: req.task_id, action: "TRANSFER_ACCEPTED",
      fromMemberId: req.from_member_id, toMemberId: user.id,
      progressPercent: req.progress_percent, createdByMemberId: user.id,
      deadline: task?.due_date ?? null,
    });
    await createNotification({
      userId: req.from_member_id, title: "移管が承認されました",
      message: `「${task?.title ?? "タスク"}」は移管されました`, type: "task_assigned", actionUrl: "/task-board",
    });
  } else {
    await recordHistory({
      taskId: req.task_id, action: "TRANSFER_REJECTED",
      fromMemberId: req.from_member_id, toMemberId: user.id,
      createdByMemberId: user.id, deadline: task?.due_date ?? null,
    });
    await createNotification({
      userId: req.from_member_id, title: "移管が拒否されました",
      message: `「${task?.title ?? "タスク"}」の移管は拒否されました`, type: "task_assigned", actionUrl: "/task-board",
    });
  }

  revalidatePath("/task-board");
  return { success: true };
}

// ---- 返却（未アサインへ。48h以上のみ） ----
export async function returnTask(taskId: string, reason: string) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };

  const { data: task } = await adminSupabase
    .from("tasks").select("assigned_to, due_date, progress_rate").eq("id", taskId).maybeSingle();
  if (!task) return { error: "タスクが見つかりません" };
  if (task.assigned_to !== user.id) return { error: "自分が担当するタスクのみ返却できます" };
  if (isTaskLocked(task.due_date)) return { error: "納期まで48時間未満のため返却できません" };

  const { data: maxRow } = await adminSupabase
    .from("tasks").select("priority_rank").is("assigned_to", null)
    .order("priority_rank", { ascending: false }).limit(1).maybeSingle();
  const rank = ((maxRow?.priority_rank as number | null) ?? 0) + 1;

  const { error } = await adminSupabase.from("tasks")
    .update({ assigned_to: null, status: "pending", priority_rank: rank, schedule_bucket: null }).eq("id", taskId);
  if (error) return { error: "返却に失敗しました" };

  await recordHistory({
    taskId, action: "RETURNED", fromMemberId: user.id, reason,
    progressPercent: task.progress_rate, createdByMemberId: user.id, deadline: task.due_date,
  });

  revalidatePath("/task-board");
  return { success: true };
}

// ---- 強制担当変更（CEOのみ・48hロックも例外・監査記録） ----
export async function forceReassign(taskId: string, toMemberId: string | null) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "ceo") return { error: "強制変更は社長のみ可能です" };

  const { data: task } = await adminSupabase
    .from("tasks").select("assigned_to, due_date").eq("id", taskId).maybeSingle();
  if (!task) return { error: "タスクが見つかりません" };

  await adminSupabase.from("tasks").update({ assigned_to: toMemberId }).eq("id", taskId);
  await recordHistory({
    taskId, action: "FORCE_REASSIGNED", fromMemberId: task.assigned_to, toMemberId,
    createdByMemberId: user.id, deadline: task.due_date,
  });
  await writeAuditLog({
    userId: user.id, action: "task.force_reassigned", targetType: "task", targetId: taskId,
    before: { assigned_to: task.assigned_to }, after: { assigned_to: toMemberId },
  });

  revalidatePath("/task-board");
  return { success: true };
}

// ---- ステータス変更 / 予定 / 完了報告（担当者本人） ----
export async function updateBoardStatus(taskId: string, status: "pending" | "in_progress" | "review") {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  const { data: task } = await adminSupabase.from("tasks").select("assigned_to").eq("id", taskId).maybeSingle();
  if (!task || task.assigned_to !== user.id) return { error: "担当者のみ変更できます" };
  await adminSupabase.from("tasks").update({ status }).eq("id", taskId);
  revalidatePath("/task-board");
  return { success: true };
}

export async function setSchedule(taskId: string, bucket: "TODAY" | "TOMORROW_OR_LATER") {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  const { data: task } = await adminSupabase.from("tasks").select("assigned_to").eq("id", taskId).maybeSingle();
  if (!task || task.assigned_to !== user.id) return { error: "担当者のみ変更できます" };
  await adminSupabase.from("tasks").update({ schedule_bucket: bucket }).eq("id", taskId);
  revalidatePath("/task-board");
  return { success: true };
}

export async function reportBoardCompletion(taskId: string) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  const { data: task } = await adminSupabase
    .from("tasks").select("assigned_to, due_date").eq("id", taskId).maybeSingle();
  if (!task || task.assigned_to !== user.id) return { error: "担当者のみ完了報告できます" };

  await adminSupabase.from("tasks")
    .update({ status: "completed", progress_rate: 100, completed_at: new Date().toISOString() }).eq("id", taskId);
  await recordHistory({
    taskId, action: "COMPLETED", toMemberId: user.id,
    createdByMemberId: user.id, deadline: task.due_date,
  });
  revalidatePath("/task-board");
  return { success: true };
}
