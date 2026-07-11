import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  const { data } = await adminSupabase
    .from("users")
    .select("muted_notification_types")
    .eq("id", user.id)
    .maybeSingle();
  const mutedTypes = (data?.muted_notification_types as string[] | null) ?? [];

  return (
    <SettingsClient
      user={user}
      initialSpecialty={user.specialty}
      initialMutedTypes={mutedTypes}
    />
  );
}
