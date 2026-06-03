import { adminSupabase } from "@/lib/supabase/admin";
import TaskMarketClient from "./task-market-client";

interface MarketTask {
  id: string; listingId: string; title: string; department: string; priority: string;
  progress: number; dueDate: string; difficulty: number; effort: number;
  remainingPoints: number; listedBy: string; requiredSkills: string[]; handoverNote: string;
}

async function fetchOpenListings(): Promise<MarketTask[]> {
  const { data } = await adminSupabase
    .from("task_market_listings")
    .select(`
      id, handover_note, required_skills,
      tasks (
        id, title, priority, progress_rate, due_date, provisional_score,
        departments ( display_name ),
        task_scores ( difficulty, effort )
      ),
      users!task_market_listings_listed_by_fkey ( full_name )
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = row.tasks as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lister = row.users as any;
    const score = task?.provisional_score ?? 0;
    const progress = task?.progress_rate ?? 0;
    const remainingPoints = Math.round(score * (1 - progress / 100));

    return {
      id: task?.id ?? row.id,
      listingId: row.id,
      title: task?.title ?? "不明なタスク",
      department: task?.departments?.display_name ?? "未分類",
      priority: task?.priority ?? "medium",
      progress,
      dueDate: task?.due_date ?? "",
      difficulty: task?.task_scores?.difficulty ?? 3,
      effort: task?.task_scores?.effort ?? 3,
      remainingPoints,
      listedBy: lister?.full_name ?? "不明",
      requiredSkills: (row.required_skills as string[]) ?? [],
      handoverNote: row.handover_note ?? "",
    };
  });
}

export default async function TaskMarketPage() {
  const marketTasks = await fetchOpenListings();
  return <TaskMarketClient marketTasks={marketTasks} />;
}
