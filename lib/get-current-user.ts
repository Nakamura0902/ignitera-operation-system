import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  department: string;
  employeeId: string;
  avatar: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  // Verify session with the user's own cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use service role to bypass RLS for the profile fetch
  const [{ data }, { data: workDepts }] = await Promise.all([
    adminSupabase
      .from("users")
      .select("full_name, employee_id, departments(display_name)")
      .eq("id", user.id)
      .single(),
    adminSupabase
      .from("user_departments")
      .select("departments(display_name)")
      .eq("user_id", user.id),
  ]);

  const fullName = data?.full_name ?? "未設定";
  // 担当業務（複数）があれば「・」区切りで表示、なければ従来のdepartment_idを表示
  const workDeptNames = (workDepts ?? [])
    .map((d) => (d.departments as { display_name?: string } | null)?.display_name)
    .filter((n): n is string => !!n);
  const depts = data?.departments as { display_name?: string } | null;
  const departmentName =
    workDeptNames.length > 0 ? workDeptNames.join("・") : depts?.display_name ?? "部門未設定";
  const employeeId = (data as { employee_id?: string } | null)?.employee_id ?? "";

  return {
    id: user.id,
    name: fullName,
    email: user.email ?? "",
    department: departmentName,
    employeeId,
    avatar: fullName.charAt(0),
  };
}
