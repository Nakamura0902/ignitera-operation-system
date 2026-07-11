import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

// UIで扱うロール。内部ロール 'admin' はマネージャーとして 'manager' に写像する。
export type UiRole = "ceo" | "manager" | "employee";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UiRole;
  specialty: string | null;
  department: string;
  employeeId: string;
  avatar: string;
}

function toUiRole(name: string | undefined): UiRole {
  if (name === "ceo") return "ceo";
  if (name === "admin") return "manager"; // 内部 'admin' = マネージャー
  return "employee";
}

export async function getCurrentUser(): Promise<CurrentUser> {
  // Verify session with the user's own cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use service role to bypass RLS for the profile fetch
  const { data } = await adminSupabase
    .from("users")
    .select("full_name, employee_id, specialty, roles(name)")
    .eq("id", user.id)
    .single();

  const fullName = data?.full_name ?? "未設定";
  const role = toUiRole((data?.roles as { name?: string } | null)?.name);
  const specialty = (data as { specialty?: string | null } | null)?.specialty ?? null;
  const employeeId = (data as { employee_id?: string } | null)?.employee_id ?? "";

  // 部門は廃止。表示はマネージャーなら専門、それ以外はロール名を使う。
  const roleLabel = role === "ceo" ? "経営" : role === "manager" ? "マネージャー" : "社員";
  const department = specialty ?? roleLabel;

  return {
    id: user.id,
    name: fullName,
    email: user.email ?? "",
    role,
    specialty,
    department,
    employeeId,
    avatar: fullName.charAt(0),
  };
}
