import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import { formatJstDateTime } from "@/lib/format-date";
import InboxList from "./inbox-list";

export interface DirectiveRow {
  id: string;
  category: string | null;
  title: string;
  summary: string;
  status: "sent" | "in_progress" | "done";
  receivedAt: string;
}

const STATUS_ORDER: Record<string, number> = { sent: 0, in_progress: 1, done: 2 };

export default async function ManagerInboxPage() {
  const user = await getCurrentUser();

  const { data } = await adminSupabase
    .from("directives")
    .select("id, category, organized_title, organized_summary, status, created_at")
    .eq("target_manager_id", user.id)
    .order("created_at", { ascending: false });

  const rows: DirectiveRow[] = (data ?? [])
    .map((d) => ({
      id: d.id,
      category: d.category,
      title: d.organized_title,
      summary: d.organized_summary,
      status: d.status as DirectiveRow["status"],
      receivedAt: formatJstDateTime(d.created_at),
    }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return <InboxList rows={rows} />;
}
