import { adminSupabase } from "@/lib/supabase/admin";
import UserManagementClient from "./user-management-client";

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  employee_id: string | null;
  is_active: boolean;
  created_at: string;
  specialty: string | null;
  roles: { id: string; name: string; display_name: string } | null;
}

export interface RoleOption {
  id: string;
  name: string;
  display_name: string;
}

async function fetchUsers(): Promise<UserRow[]> {
  const { data } = await adminSupabase
    .from("users")
    .select("id, full_name, email, employee_id, is_active, created_at, specialty, roles(id, name, display_name)")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    employee_id: row.employee_id ?? null,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    specialty: (row as { specialty?: string | null }).specialty ?? null,
    roles: row.roles as unknown as UserRow["roles"],
  }));
}

async function fetchRoles(): Promise<RoleOption[]> {
  const { data } = await adminSupabase
    .from("roles")
    .select("id, name, display_name")
    .order("name");
  return data ?? [];
}

export default async function UserManagementPage() {
  const [users, roles] = await Promise.all([fetchUsers(), fetchRoles()]);

  return <UserManagementClient initialUsers={users} roles={roles} />;
}
