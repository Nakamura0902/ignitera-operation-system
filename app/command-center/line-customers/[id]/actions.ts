"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { verifyCeoOrAdmin } from "@/lib/api-auth";
import { sendLinePush } from "@/lib/line";
import { revalidatePath } from "next/cache";
import type { LineCustomerEditable } from "@/types/line-customer";

// 顧客詳細の編集は社長・マネージャーのみ
export async function updateLineCustomer(id: string, patch: LineCustomerEditable) {
  const authError = await verifyCeoOrAdmin();
  if (authError) return { error: authError };

  const { error } = await adminSupabase
    .from("line_customers")
    .update({
      status: patch.status,
      temperature: patch.temperature,
      estimated_plan: patch.estimated_plan,
      assignee: patch.assignee.trim() || null,
      memo: patch.memo.trim() || null,
      next_action: patch.next_action.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/command-center/line-customers/${id}`);
  revalidatePath("/command-center/line-customers");
  return { success: true };
}

// この顧客のLINEへメッセージを送信（社長・マネージャーのみ）。送信履歴はメモに追記。
export async function sendLineMessageToCustomer(id: string, text: string) {
  const authError = await verifyCeoOrAdmin();
  if (authError) return { error: authError };
  if (!text.trim()) return { error: "メッセージを入力してください" };

  const { data: customer } = await adminSupabase
    .from("line_customers")
    .select("line_user_id, memo")
    .eq("id", id)
    .maybeSingle();

  if (!customer?.line_user_id) return { error: "この相談者にはLINEユーザーが紐づいていません" };

  const result = await sendLinePush(customer.line_user_id, text.trim());
  if (!result.ok) return { error: result.error ?? "送信に失敗しました" };

  const stamp = new Date().toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const entry = `[LINE送信 ${stamp}] ${text.trim()}`;
  const newMemo = customer.memo ? `${customer.memo}\n${entry}` : entry;
  await adminSupabase.from("line_customers").update({ memo: newMemo }).eq("id", id);

  revalidatePath(`/command-center/line-customers/${id}`);
  return { success: true };
}
