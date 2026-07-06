import { getCurrentUser } from "@/lib/get-current-user";
import CeoSettingsClient from "./ceo-settings-client";

export default async function CeoSettingsPage() {
  const user = await getCurrentUser();
  return <CeoSettingsClient user={user} />;
}
