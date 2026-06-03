import { adminSupabase } from "@/lib/supabase/admin";
import UserManagementClient from "./user-management-client";

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  employee_id: string | null;
  is_active: boolean;
  created_at: string;
  roles: { id: string; name: string; display_name: string } | null;
  departments: { id: string; name: string; display_name: string } | null;
}

export interface RoleOption {
  id: string;
  name: string;
  display_name: string;
}

export interface DeptOption {
  id: string;
  name: string;
  display_name: string;
}

async function fetchUsers(): Promise<UserRow[]> {
  const { data } = await adminSupabase
    .from("users")
    .select("id, full_name, email, employee_id, is_active, created_at, roles(id, name, display_name), departments(id, name, display_name)")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    employee_id: row.employee_id ?? null,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    roles: row.roles as unknown as UserRow["roles"],
    departments: row.departments as unknown as UserRow["departments"],
  }));
}

async function fetchRoles(): Promise<RoleOption[]> {
  const { data } = await adminSupabase
    .from("roles")
    .select("id, name, display_name")
    .order("name");
  return data ?? [];
}

async function fetchDepartments(): Promise<DeptOption[]> {
  const { data } = await adminSupabase
    .from("departments")
    .select("id, name, display_name")
    .order("name");
  return data ?? [];
}

export default async function UserManagementPage() {
  const [users, roles, departments] = await Promise.all([
    fetchUsers(),
    fetchRoles(),
    fetchDepartments(),
  ]);

  return (
    <UserManagementClient
      initialUsers={users}
      roles={roles}
      departments={departments}
    />
  );
}
