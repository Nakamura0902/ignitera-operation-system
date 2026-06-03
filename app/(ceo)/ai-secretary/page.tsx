import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
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
    date: new Date(r.created_at).toLocaleString("ja-JP", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
    status: "完了",
    summary: (r.content as { summary?: string })?.summary ?? "",
  }));
}

export default async function AiSecretaryPage() {
  const user = await getCurrentUser();
  const initialHistory = await fetchHistory(user.id);
  return <AiSecretaryClient userId={user.id} initialHistory={initialHistory} />;
}
