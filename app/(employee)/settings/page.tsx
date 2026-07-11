import { getCurrentUser } from "@/lib/get-current-user";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return <SettingsClient user={user} initialSpecialty={user.specialty} />;
}
