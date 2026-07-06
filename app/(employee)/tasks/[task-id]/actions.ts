"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { verifyActor } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";

export async function toggleChecklistItem(
  itemId: string,
  currentStatus: string,
  taskId: string,
  userId: string
) {
  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  const newStatus = currentStatus === "completed" ? "pending" : "completed";

  const { error } = await adminSupabase
    .from("task_checklist_items")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) return { error: "チェックリストの更新に失敗しました" };

  // 更新後の全アイテムで進捗率を再計算
  const { data: items } = await adminSupabase
    .from("task_checklist_items")
    .select("weight, status")
    .eq("task_id", taskId);

  if (items && items.length > 0) {
    const newProgress = Math.min(
      100,
      Math.round(
        items.reduce((acc, item) => {
          if (item.status === "completed") return acc + item.weight;
          if (item.status === "in_progress") return acc + item.weight * 0.5;
          return acc;
        }, 0)
      )
    );

    const newTaskStatus =
      newProgress === 100 ? "completed" :
      newProgress > 0 ? "in_progress" : "pending";

    await adminSupabase
      .from("tasks")
      .update({ progress_rate: newProgress, status: newTaskStatus })
      .eq("id", taskId);

    await writeAuditLog({
      userId,
      action: "toggle_checklist_item",
      targetType: "task",
      targetId: taskId,
      after: { item_id: itemId, status: newStatus, progress_rate: newProgress },
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  return { success: true };
}

export async function updateTaskProgress(taskId: string, newProgress: number, userId: string) {
  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  const { data: task, error: fetchError } = await adminSupabase
    .from("tasks")
    .select("progress_rate, status, assigned_to, title")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    return { error: "タスクが見つかりません" };
  }

  const previousProgress = task.progress_rate;

  let newStatus = task.status;
  if (newProgress === 100) {
    newStatus = "completed";
  } else if (previousProgress === 0 && newProgress > 0) {
    newStatus = "in_progress";
  }

  const { error: updateError } = await adminSupabase
    .from("tasks")
    .update({ progress_rate: newProgress, status: newStatus })
    .eq("id", taskId);

  if (updateError) {
    return { error: "進捗の更新に失敗しました" };
  }

  await adminSupabase.from("task_progress_history").insert({
    task_id: taskId,
    user_id: userId,
    previous_progress: previousProgress,
    new_progress: newProgress,
  });

  await writeAuditLog({
    userId,
    action: "update_task_progress",
    targetType: "task",
    targetId: taskId,
    before: { progress_rate: previousProgress, status: task.status },
    after: { progress_rate: newProgress, status: newStatus },
  });

  if (task.assigned_to && task.assigned_to !== userId) {
    await createNotification({
      userId: task.assigned_to,
      title: "タスクの進捗が更新されました",
      message: `「${task.title}」の進捗が ${newProgress}% に更新されました`,
      type: "task_assigned",
      actionUrl: `/tasks/${taskId}`,
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  return { success: true };
}

// 完了で提出する: ステータスを「確認待ち(review)」にして管理者レビューへ回す
export async function submitTaskCompletion(taskId: string, userId: string) {
  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  const { data: task, error: fetchError } = await adminSupabase
    .from("tasks")
    .select("status, progress_rate, assigned_to, created_by, title")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) {
    return { error: "タスクが見つかりません" };
  }
  if (task.assigned_to !== userId) {
    return { error: "担当者のみ完了提出できます" };
  }
  if (task.status === "review") {
    return { error: "すでに提出済みです（確認待ち）" };
  }
  if (task.status === "completed") {
    return { error: "このタスクはすでに完了しています" };
  }

  // 進捗91〜99%が「確認待ち」の定義（CLAUDE.md）。現在値が91未満なら95に引き上げる
  const newProgress = Math.max(task.progress_rate, 95);

  const { error: updateError } = await adminSupabase
    .from("tasks")
    .update({ status: "review", progress_rate: newProgress })
    .eq("id", taskId);

  if (updateError) {
    return { error: "完了提出に失敗しました" };
  }

  await adminSupabase.from("task_progress_history").insert({
    task_id: taskId,
    user_id: userId,
    previous_progress: task.progress_rate,
    new_progress: newProgress,
  });

  await writeAuditLog({
    userId,
    action: "submit_task_completion",
    targetType: "task",
    targetId: taskId,
    before: { status: task.status, progress_rate: task.progress_rate },
    after: { status: "review", progress_rate: newProgress },
  });

  // タスク作成者（社長・管理者）にレビュー依頼を通知
  if (task.created_by && task.created_by !== userId) {
    await createNotification({
      userId: task.created_by,
      title: "タスクが完了提出されました",
      message: `「${task.title}」が完了提出されました。内容を確認してください`,
      type: "approval_required",
      actionUrl: `/tasks/${taskId}`,
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  return { success: true };
}

export async function addComment(taskId: string, content: string, userId: string) {
  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  if (!content.trim()) {
    return { error: "コメントを入力してください" };
  }

  const { error: insertError } = await adminSupabase.from("comments").insert({
    user_id: userId,
    content: content.trim(),
    target_type: "task",
    target_id: taskId,
  });

  if (insertError) {
    return { error: "コメントの投稿に失敗しました" };
  }

  const { data: task } = await adminSupabase
    .from("tasks")
    .select("assigned_to, title")
    .eq("id", taskId)
    .single();

  if (task?.assigned_to && task.assigned_to !== userId) {
    await createNotification({
      userId: task.assigned_to,
      title: "タスクにコメントが届きました",
      message: `「${task.title}」にコメントが投稿されました`,
      type: "task_assigned",
      actionUrl: `/tasks/${taskId}`,
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  return { success: true };
}
