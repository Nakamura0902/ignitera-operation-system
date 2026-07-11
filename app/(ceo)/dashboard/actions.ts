"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/api-auth";
import { jstYearMonth } from "@/lib/format-date";
import { revalidatePath } from "next/cache";

// 今月の目標売上を設定（社長のみ）
export async function setMonthlyTarget(targetRevenue: number) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "ceo") return { error: "この操作は社長のみ可能です" };
  if (!Number.isFinite(targetRevenue) || targetRevenue < 0) {
    return { error: "目標金額が不正です" };
  }

  const { year, month } = jstYearMonth();

  const { error } = await adminSupabase
    .from("monthly_targets")
    .upsert(
      { year, month, target_revenue: targetRevenue, set_by: user.id },
      { onConflict: "year,month" }
    );

  if (error) return { error: "目標の保存に失敗しました" };

  revalidatePath("/dashboard");
  return { success: true };
}
