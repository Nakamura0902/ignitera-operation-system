"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { verifyActor } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";

// このマネージャーが対象ブリーフの受信者本人であることを確認する
async function verifyOwnsDirective(directiveId: string, userId: string): Promise<string | null> {
  const authError = await verifyActor(userId);
  if (authError) return authError;

  const { data } = await adminSupabase
    .from("directives")
    .select("target_manager_id")
    .eq("id", directiveId)
    .maybeSingle();

  if (!data || data.target_manager_id !== userId) return "このブリーフを操作する権限がありません";
  return null;
}

export async function updateDirectiveStatus(
  directiveId: string,
  status: "sent" | "in_progress" | "done",
  userId: string
) {
  const authError = await verifyOwnsDirective(directiveId, userId);
  if (authError) return { error: authError };

  const { error } = await adminSupabase
    .from("directives")
    .update({ status })
    .eq("id", directiveId);

  if (error) return { error: "ステータスの更新に失敗しました" };

  await writeAuditLog({
    userId,
    action: "directive.status_changed",
    targetType: "directive",
    targetId: directiveId,
    after: { status },
  });

  revalidatePath(`/manager/inbox/${directiveId}`);
  revalidatePath("/manager/inbox");
  return { success: true };
}

export interface CreateTaskInput {
  directiveId: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  assignedTo: string;
  revenueAmount?: number;
  checklist?: { title: string; weight: number }[];
}

export async function createTaskFromDirective(input: CreateTaskInput, userId: string) {
  const authError = await verifyOwnsDirective(input.directiveId, userId);
  if (authError) return { error: authError };

  if (!input.title.trim()) return { error: "タスク名を入力してください" };
  if (!input.assignedTo) return { error: "担当社員を指名してください" };

  const { data: task, error } = await adminSupabase
    .from("tasks")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority,
      due_date: input.dueDate || null,
      assigned_to: input.assignedTo,
      created_by: userId,
      directive_id: input.directiveId,
      revenue_amount: input.revenueAmount && input.revenueAmount > 0 ? input.revenueAmount : 0,
      status: "pending",
      progress_rate: 0,
    })
    .select("id")
    .single();

  if (error || !task) return { error: "タスクの作成に失敗しました" };

  // チェックリスト（任意）
  const items = (input.checklist ?? []).filter((c) => c.title.trim());
  if (items.length > 0) {
    await adminSupabase.from("task_checklist_items").insert(
      items.map((c, i) => ({
        task_id: task.id,
        title: c.title.trim(),
        weight: Math.max(1, Math.min(100, Math.round(c.weight) || 1)),
        sort_order: i,
      }))
    );
  }

  // ブリーフが未着手なら対応中に自動更新
  await adminSupabase
    .from("directives")
    .update({ status: "in_progress" })
    .eq("id", input.directiveId)
    .eq("status", "sent");

  await writeAuditLog({
    userId,
    action: "task.created_by_manager",
    targetType: "task",
    targetId: task.id,
    after: { title: input.title, assigned_to: input.assignedTo, directive_id: input.directiveId },
  });

  // 指名した社員に通知
  await createNotification({
    userId: input.assignedTo,
    title: "新しいタスクが割り当てられました",
    message: `「${input.title.trim()}」が割り当てられました`,
    type: "task_assigned",
    actionUrl: `/tasks/${task.id}`,
  });

  revalidatePath(`/manager/inbox/${input.directiveId}`);
  return { success: true, taskId: task.id };
}
