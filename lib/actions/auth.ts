"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginWithEmployeeId(employeeId: string, password: string) {
  const trimmedId = employeeId.trim().toUpperCase();

  const { data: userData } = await adminSupabase
    .from("users")
    .select("email")
    .eq("employee_id", trimmedId)
    .single();

  if (!userData?.email) {
    return { error: "社員IDが見つかりません" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password,
  });

  if (error) {
    return { error: "社員IDまたはパスワードが正しくありません" };
  }

  return { success: true };
}

export async function getDepartments() {
  const { data } = await adminSupabase
    .from("departments")
    .select("id, name")
    .order("name");
  return data ?? [];
}

export async function setupEmployee(
  email: string,
  password: string,
  fullName: string,
  departmentId: string | null
) {
  // Check email not already used in public.users
  const { data: existing } = await adminSupabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    return { error: "このメールアドレスはすでに登録されています" };
  }

  // Generate next employee ID: find highest GTA#### and increment
  const { data: topUser } = await adminSupabase
    .from("users")
    .select("employee_id")
    .like("employee_id", "GTA%")
    .order("employee_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  const match = (topUser?.employee_id as string | null)?.match(/^GTA(\d{4})$/);
  if (match) nextNum = parseInt(match[1], 10) + 1;
  const employeeId = `GTA${String(nextNum).padStart(4, "0")}`;

  // Get employee role id
  const { data: roleData } = await adminSupabase
    .from("roles")
    .select("id")
    .eq("name", "employee")
    .single();

  // Create Supabase auth user
  const { data: authData, error: signUpError } = await adminSupabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });

  if (signUpError || !authData.user) {
    return { error: signUpError?.message ?? "アカウント作成に失敗しました" };
  }

  // Insert into public.users
  const { error: insertError } = await adminSupabase.from("users").insert({
    id: authData.user.id,
    email: email.trim().toLowerCase(),
    full_name: fullName.trim() || "未設定",
    role_id: roleData?.id ?? null,
    employee_id: employeeId,
    department_id: departmentId || null,
  });

  if (insertError) {
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return { error: "ユーザー登録に失敗しました: " + insertError.message };
  }

  return { success: true, employeeId };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
