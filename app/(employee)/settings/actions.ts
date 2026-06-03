"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateDisplayName(userId: string, newName: string) {
  if (!newName.trim()) return { error: "氏名を入力してください" };

  const { error } = await adminSupabase
    .from("users")
    .update({ full_name: newName.trim() })
    .eq("id", userId);

  if (error) return { error: "氏名の更新に失敗しました" };

  revalidatePath("/settings");
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
