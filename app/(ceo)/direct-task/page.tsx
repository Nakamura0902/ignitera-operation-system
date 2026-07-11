import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import DirectTaskClient from "./direct-task-client";

export interface ManagerOption {
  id: string;
  name: string;
  specialty: string | null;
}

export default async function DirectTaskPage() {
  await getCurrentUser();

  const { data } = await adminSupabase
    .from("users")
    .select("id, full_name, specialty, roles!inner ( name )")
    .eq("is_active", true)
    .eq("roles.name", "admin");

  const managers: ManagerOption[] = (data ?? []).map((m) => ({
    id: m.id,
    name: (m as { full_name?: string }).full_name ?? "マネージャー",
    specialty: (m as { specialty?: string | null }).specialty ?? null,
  }));

  return <DirectTaskClient managers={managers} />;
}
