import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import { formatJstShortDateTime } from "@/lib/format-date";
import AiSecretaryClient from "./ai-secretary-client";

async function fetchHistory(userId: string) {
  const { data } = await adminSupabase
    .from("reports")
    .select("id, title, content, created_at")
    .eq("created_by", userId)
    .eq("type", "ad_hoc")
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((r) => ({
    id: r.id,
    text: r.title,
    date: formatJstShortDateTime(r.created_at),
    status: "完了",
    summary: (r.content as { summary?: string })?.summary ?? "",
  }));
}

export default async function AiSecretaryPage() {
  const user = await getCurrentUser();
  const initialHistory = await fetchHistory(user.id);
  return <AiSecretaryClient userId={user.id} initialHistory={initialHistory} />;
}
