"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";
import { verifyCeoOrAdmin } from "@/lib/api-auth";

export async function approvePayroll(payrollEstimateId: string, approvedByUserId: string) {
  const authError = await verifyCeoOrAdmin(approvedByUserId);
  if (authError) return { error: authError };

  const { data: estimate, error: fetchError } = await adminSupabase
    .from("payroll_estimates")
    .select("user_id, year, month, total_estimate, status")
    .eq("id", payrollEstimateId)
    .single();

  if (fetchError || !estimate) {
    return { error: "給与見込みが見つかりません" };
  }

  if (estimate.status === "approved") {
    return { error: "すでに承認済みです" };
  }

  const { error: updateError } = await adminSupabase
    .from("payroll_estimates")
    .update({
      status: "approved",
      approved_by: approvedByUserId,
      confirmed_total: estimate.total_estimate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payrollEstimateId);

  if (updateError) {
    return { error: "更新に失敗しました" };
  }

  await createNotification({
    userId: estimate.user_id,
    title: "給与見込みが承認されました",
    message: `${estimate.year}年${estimate.month}月分の給与見込み ¥${Number(estimate.total_estimate).toLocaleString()} が承認されました`,
    type: "approval_required",
    actionUrl: "/payroll-estimate",
  });

  await writeAuditLog({
    userId: approvedByUserId,
    action: "approve_payroll",
    targetType: "payroll_estimates",
    targetId: payrollEstimateId,
    before: { status: estimate.status },
    after: { status: "approved", confirmed_total: estimate.total_estimate },
  });

  return { success: true };
}

export async function approveAllPayrolls(payrollEstimateIds: string[], approvedByUserId: string) {
  const results = await Promise.all(
    payrollEstimateIds.map((id) => approvePayroll(id, approvedByUserId))
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    return { error: `${errors.length}件の承認に失敗しました` };
  }

  return { success: true, approvedCount: results.length };
}

// 今月分の給与見込みをスコア履歴から計算してDBに一括保存
export async function generatePayrollEstimates(year: number, month: number, generatedBy: string) {
  const authError = await verifyCeoOrAdmin(generatedBy);
  if (authError) return { error: authError };

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

  // 既存レコードを確認
  const { data: existing } = await adminSupabase
    .from("payroll_estimates")
    .select("id")
    .eq("year", year)
    .eq("month", month);

  if (existing && existing.length > 0) {
    return { error: `${year}年${month}月分はすでに生成済みです` };
  }

  // アクティブな全社員を取得
  const { data: users } = await adminSupabase
    .from("users")
    .select("id, full_name")
    .eq("is_active", true);

  if (!users || users.length === 0) return { error: "社員データが見つかりません" };

  const rows = await Promise.all(
    users.map(async (user) => {
      // 今月の確定済みポイントを集計
      const { data: history } = await adminSupabase
        .from("score_history")
        .select("points_after, points_before")
        .eq("user_id", user.id)
        .eq("score_type", "confirmed")
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      const totalPoints = (history ?? []).reduce(
        (sum, h) => sum + Math.max(0, (h.points_after ?? 0) - (h.points_before ?? 0)),
        0
      );

      const BASE_SALARY = 200000; // 最低保証20万円
      const POINT_RATE = 5;       // 1pt = ¥5
      const pointReward = totalPoints * POINT_RATE;
      const qualityBonus = 0;     // 手動レビュー後に設定
      const totalEstimate = BASE_SALARY + pointReward + qualityBonus;

      return {
        user_id: user.id,
        year,
        month,
        total_score_points: totalPoints,
        base_salary: BASE_SALARY,
        point_reward: pointReward,
        quality_bonus: qualityBonus,
        total_estimate: totalEstimate,
        status: "draft",
      };
    })
  );

  const { error: insertError } = await adminSupabase
    .from("payroll_estimates")
    .insert(rows);

  if (insertError) return { error: "保存に失敗しました" };

  await writeAuditLog({
    userId: generatedBy,
    action: "generate_payroll_estimates",
    targetType: "payroll_estimates",
    targetId: `${year}-${month}`,
    after: { year, month, count: rows.length },
  });

  return { success: true, count: rows.length };
}
