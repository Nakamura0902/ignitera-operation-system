"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function toggleChecklistItem(
  itemId: string,
  currentStatus: string,
  taskId: string,
  userId: string
) {
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

export async function addComment(taskId: string, content: string, userId: string) {
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
