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

// マネージャーの専門を更新する。1専門1マネージャーのため重複を防ぐ。
export async function updateSpecialty(userId: string, specialty: string) {
  const authError = await verifyActor(userId);
  if (authError) return { error: authError };

  const value = specialty.trim();
  if (!value) return { error: "専門を選択してください" };

  // 呼び出し元がマネージャー(内部ロール'admin')であることを確認
  const { data: me } = await adminSupabase
    .from("users")
    .select("roles(name)")
    .eq("id", userId)
    .single();
  const roleName = (me?.roles as { name?: string } | null)?.name;
  if (roleName !== "admin") return { error: "専門はマネージャーのみ設定できます" };

  // 同じ専門を持つ別のマネージャーがいないか確認
  const { data: dup } = await adminSupabase
    .from("users")
    .select("id, roles!inner(name)")
    .eq("specialty", value)
    .eq("roles.name", "admin")
    .neq("id", userId)
    .maybeSingle();
  if (dup) return { error: "この専門はすでに別のマネージャーが担当しています" };

  const { error } = await adminSupabase
    .from("users")
    .update({ specialty: value })
    .eq("id", userId);

  if (error) return { error: "専門の更新に失敗しました" };

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
