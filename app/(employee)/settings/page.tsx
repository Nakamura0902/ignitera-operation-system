import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  const [{ data: departments }, { data: myDepts }] = await Promise.all([
    adminSupabase.from("departments").select("id, display_name").order("name"),
    adminSupabase.from("user_departments").select("department_id").eq("user_id", user.id),
  ]);

  return (
    <SettingsClient
      user={user}
      departments={departments ?? []}
      initialDepartmentIds={(myDepts ?? []).map((d) => d.department_id)}
    />
  );
}
