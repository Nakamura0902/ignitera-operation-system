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
  assignedTo: string[]; // 複数指名可（1人ごとにタスクを複製）
  revenueAmount?: number;
  revenueType?: "none" | "one_time" | "monthly";
  checklist?: { title: string; weight: number }[];
}

export async function createTaskFromDirective(input: CreateTaskInput, userId: string) {
  const authError = await verifyOwnsDirective(input.directiveId, userId);
  if (authError) return { error: authError };

  if (!input.title.trim()) return { error: "タスク名を入力してください" };
  const assignees = Array.from(new Set((input.assignedTo ?? []).filter(Boolean)));
  if (assignees.length === 0) return { error: "担当社員を指名してください" };

  const revenueType = input.revenueType ?? "one_time";
  const revenueAmount = revenueType === "none"
    ? 0
    : (input.revenueAmount && input.revenueAmount > 0 ? input.revenueAmount : 0);
  const items = (input.checklist ?? []).filter((c) => c.title.trim());

  const createdIds: string[] = [];
  // 1人ごとにタスクを複製。売上は重複計上を避けるため最初の1件のみに付与
  for (let idx = 0; idx < assignees.length; idx++) {
    const assignedTo = assignees[idx];
    const isFirst = idx === 0;

    const { data: task, error } = await adminSupabase
      .from("tasks")
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        due_date: input.dueDate || null,
        assigned_to: assignedTo,
        created_by: userId,
        directive_id: input.directiveId,
        revenue_type: isFirst ? revenueType : "none",
        revenue_amount: isFirst ? revenueAmount : 0,
        status: "pending",
        progress_rate: 0,
      })
      .select("id")
      .single();

    if (error || !task) continue; // この担当者だけスキップ
    createdIds.push(task.id);

    // チェックリスト（任意）
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

    // 指名した社員に通知
    await createNotification({
      userId: assignedTo,
      title: "新しいタスクが割り当てられました",
      message: `「${input.title.trim()}」が割り当てられました`,
      type: "task_assigned",
      actionUrl: `/tasks/${task.id}`,
    });
  }

  if (createdIds.length === 0) return { error: "タスクの作成に失敗しました" };

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
    targetId: createdIds[0],
    after: { title: input.title, assigned_to: assignees, task_ids: createdIds, directive_id: input.directiveId },
  });

  revalidatePath(`/manager/inbox/${input.directiveId}`);
  return { success: true, taskIds: createdIds, count: createdIds.length };
}
