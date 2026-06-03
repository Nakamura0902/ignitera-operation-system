"use server";

import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";

const SYSTEM_USER_ID = "system";

export async function updateUserRole(userId: string, roleId: string) {
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
    userId: SYSTEM_USER_ID,
    action: "update_user_role",
    targetType: "users",
    targetId: userId,
    before: { role_id: before?.role_id },
    after: { role_id: roleId },
  });

  revalidatePath("/user-management");
  return { success: true };
}

export async function updateUserDepartment(userId: string, departmentId: string) {
  const { data: before } = await adminSupabase
    .from("users")
    .select("department_id")
    .eq("id", userId)
    .single();

  const { error } = await adminSupabase
    .from("users")
    .update({ department_id: departmentId })
    .eq("id", userId);

  if (error) return { error: "部門の更新に失敗しました" };

  await writeAuditLog({
    userId: SYSTEM_USER_ID,
    action: "update_user_department",
    targetType: "users",
    targetId: userId,
    before: { department_id: before?.department_id },
    after: { department_id: departmentId },
  });

  revalidatePath("/user-management");
  return { success: true };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const { error } = await adminSupabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: "ステータスの更新に失敗しました" };

  await writeAuditLog({
    userId: SYSTEM_USER_ID,
    action: "toggle_user_active",
    targetType: "users",
    targetId: userId,
    before: { is_active: !isActive },
    after: { is_active: isActive },
  });

  revalidatePath("/user-management");
  return { success: true };
}
