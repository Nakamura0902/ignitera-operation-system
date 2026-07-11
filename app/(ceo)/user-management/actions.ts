"use server";

import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { getApiUser, isCeoOrAdmin } from "@/lib/api-auth";

// ユーザー管理操作は社長・管理者のみ。操作者IDを返す
async function requireAdmin(): Promise<{ error: string } | { actorId: string }> {
  const session = await getApiUser();
  if (!session) return { error: "認証が必要です" };
  if (!isCeoOrAdmin(session)) return { error: "この操作は社長・管理者のみ可能です" };
  return { actorId: session.id };
}

export async function updateUserRole(userId: string, roleId: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { data: before } = await adminSupabase
    .from("users")
    .select("role_id")
    .eq("id", userId)
    .single();

  const { error } = await adminSupabase
    .from("users")
    .update({ role_id: roleId })
    .eq("id", userId);

  if (error) return { error: "ロールの更新に失敗しました" };

  await writeAuditLog({
    userId: auth.actorId,
    action: "update_user_role",
    targetType: "users",
    targetId: userId,
    before: { role_id: before?.role_id },
    after: { role_id: roleId },
  });

  revalidatePath("/user-management");
  return { success: true };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { error } = await adminSupabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: "ステータスの更新に失敗しました" };

  await writeAuditLog({
    userId: auth.actorId,
    action: "toggle_user_active",
    targetType: "users",
    targetId: userId,
    before: { is_active: !isActive },
    after: { is_active: isActive },
  });

  revalidatePath("/user-management");
  return { success: true };
}
