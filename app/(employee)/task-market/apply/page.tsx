import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import ApplyTaskClient from "./apply-task-client";

interface MarketTask {
  listingId: string; title: string; department: string; priority: string;
  progress: number; dueDate: string; difficulty: number;
  remainingPoints: number; listedBy: string; requiredSkills: string[]; handoverNote: string;
}

async function fetchListing(listingId: string | null): Promise<MarketTask | null> {
  const query = adminSupabase
    .from("task_market_listings")
    .select(`
      id, handover_note, required_skills,
      tasks (
        id, title, priority, progress_rate, due_date, provisional_score,
        departments ( display_name ),
        task_scores ( difficulty )
      ),
      users!task_market_listings_listed_by_fkey ( full_name )
    `)
    .eq("status", "open");

  const result = listingId
    ? await query.eq("id", listingId).single()
    : await query.order("created_at", { ascending: false }).limit(1).maybeSingle();

  const row = result.data;
  if (!row) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task = row.tasks as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lister = row.users as any;
  const score = task?.provisional_score ?? 0;
  const progress = task?.progress_rate ?? 0;
  const remainingPoints = Math.round(score * (1 - progress / 100));

  return {
    listingId: row.id,
    title: task?.title ?? "不明なタスク",
    department: task?.departments?.display_name ?? "未分類",
    priority: task?.priority ?? "medium",
    progress,
    dueDate: task?.due_date ?? "",
    difficulty: task?.task_scores?.difficulty ?? 3,
    remainingPoints,
    listedBy: lister?.full_name ?? "不明",
    requiredSkills: (row.required_skills as string[]) ?? [],
    handoverNote: row.handover_note ?? "",
  };
}

export default async function ApplyTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  const params = await searchParams;
  const listingId = params.listingId ?? null;
  const [task, user] = await Promise.all([fetchListing(listingId), getCurrentUser()]);

  return <ApplyTaskClient task={task} userId={user.id} />;
}
