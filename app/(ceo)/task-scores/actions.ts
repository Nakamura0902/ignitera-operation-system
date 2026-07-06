"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { verifyCeoOrAdmin } from "@/lib/api-auth";

export async function confirmTaskScore(
  taskScoreId: string,
  confirmedTotal: number,
  qualityCoefficient: number,
  approvedByUserId: string
) {
  const authError = await verifyCeoOrAdmin(approvedByUserId);
  if (authError) return { error: authError };

  const { data: scoreRow, error: fetchError } = await adminSupabase
    .from("task_scores")
    .select("provisional_total, task_id")
    .eq("id", taskScoreId)
    .single();

  if (fetchError || !scoreRow) {
    return { error: "スコアが見つかりません" };
  }

  const { error: updateScoreError } = await adminSupabase
    .from("task_scores")
    .update({
      confirmed_total: confirmedTotal,
      quality_coefficient: qualityCoefficient,
      approved_by: approvedByUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskScoreId);

  if (updateScoreError) {
    return { error: "スコア更新に失敗しました" };
  }

  const { data: taskRow } = await adminSupabase
    .from("tasks")
    .select("assigned_to, title")
    .eq("id", scoreRow.task_id)
    .single();

  await adminSupabase
    .from("tasks")
    .update({ confirmed_score: confirmedTotal })
    .eq("id", scoreRow.task_id);

  if (taskRow?.assigned_to) {
    await adminSupabase.from("score_history").insert({
      user_id: taskRow.assigned_to,
      task_id: scoreRow.task_id,
      score_type: "confirmed",
      points_before: scoreRow.provisional_total,
      points_after: confirmedTotal,
      reason: `品質係数×${qualityCoefficient} で確定`,
      changed_by: approvedByUserId,
    });

    await createNotification({
      userId: taskRow.assigned_to,
      title: "タスク点数が確定されました",
      message: `「${taskRow.title}」の確定ポイント: ${confirmedTotal}pt（×${qualityCoefficient}）`,
      type: "score_confirmed",
      actionUrl: "/score-history",
    });
  }

  await writeAuditLog({
    userId: approvedByUserId,
    action: "confirm_task_score",
    targetType: "task_scores",
    targetId: taskScoreId,
    before: { provisional_total: scoreRow.provisional_total },
    after: { confirmed_total: confirmedTotal, quality_coefficient: qualityCoefficient },
  });

  return { success: true };
}

export async function rejectTaskScore(
  taskScoreId: string,
  rejectedByUserId: string,
  reason?: string
) {
  const authError = await verifyCeoOrAdmin(rejectedByUserId);
  if (authError) return { error: authError };

  const { data: scoreRow } = await adminSupabase
    .from("task_scores")
    .select("task_id")
    .eq("id", taskScoreId)
    .single();

  if (!scoreRow) return { error: "スコアが見つかりません" };

  const { data: taskRow } = await adminSupabase
    .from("tasks")
    .select("assigned_to, title")
    .eq("id", scoreRow.task_id)
    .single();

  if (taskRow?.assigned_to) {
    await createNotification({
      userId: taskRow.assigned_to,
      title: "タスク点数が差し戻されました",
      message: `「${taskRow.title}」の点数が差し戻されました。${reason ? `理由: ${reason}` : ""}`,
      type: "score_confirmed",
      actionUrl: "/tasks",
    });
  }

  await writeAuditLog({
    userId: rejectedByUserId,
    action: "reject_task_score",
    targetType: "task_scores",
    targetId: taskScoreId,
    after: { reason: reason ?? "" },
  });

  return { success: true };
}
