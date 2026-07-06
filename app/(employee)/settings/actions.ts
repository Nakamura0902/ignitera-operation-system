"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyActor } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";

export async function updateDisplayName(userId: string, newName: string) {
  const authError = await verifyActor(userId);
  if (authError) return { error: authError };
  if (!newName.trim()) return { error: "氏名を入力してください" };

  const { error } = await adminSupabase
    .from("users")
    .update({ full_name: newName.trim() })
    .eq("id", userId);

  if (error) return { error: "氏名の更新に失敗しました" };

  revalidatePath("/settings");
  return { success: true };
}

// 担当業務（複数部門）を更新する。users.department_idには先頭の部門を入れて既存機能と互換を保つ
export async function updateWorkDepartments(userId: string, departmentIds: string[]) {
  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  if (departmentIds.length === 0) {
    return { error: "担当業務を1つ以上選択してください" };
  }

  const { error: deleteError } = await adminSupabase
    .from("user_departments")
    .delete()
    .eq("user_id", userId);

  if (deleteError) return { error: "担当業務の更新に失敗しました" };

  const { error: insertError } = await adminSupabase
    .from("user_departments")
    .insert(departmentIds.map((departmentId) => ({ user_id: userId, department_id: departmentId })));

  if (insertError) return { error: "担当業務の更新に失敗しました" };

  await adminSupabase
    .from("users")
    .update({ department_id: departmentIds[0] })
    .eq("id", userId);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updatePassword(newPassword: string, confirmPassword: string) {
  if (newPassword.length < 8) return { error: "パスワードは8文字以上にしてください" };
  if (newPassword !== confirmPassword) return { error: "パスワードが一致しません" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: "パスワードの更新に失敗しました" };
  return { success: true };
}
