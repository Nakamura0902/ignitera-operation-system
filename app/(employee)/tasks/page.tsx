import { Filter } from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";
import TaskList, { DbTask } from "./task-list";

async function fetchTasks(): Promise<DbTask[]> {
  const { data, error } = await adminSupabase
    .from("tasks")
    .select(`
      id, title, status, priority, progress_rate, due_date, provisional_score,
      departments ( display_name ),
      task_scores ( difficulty, effort, contribution ),
      users!tasks_assigned_to_fkey ( full_name )
    `)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as DbTask["status"],
    priority: t.priority as DbTask["priority"],
    progress_rate: t.progress_rate,
    due_date: t.due_date,
    provisional_score: t.provisional_score,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    department_name: (t.departments as any)?.display_name ?? "未分類",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignee_name: (t.users as any)?.full_name ?? "未割り当て",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    difficulty: (t.task_scores as any)?.difficulty ?? 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    effort: (t.task_scores as any)?.effort ?? 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contribution: (t.task_scores as any)?.contribution ?? 3,
  }));
}

export default async function TasksPage() {
  const tasks = await fetchTasks();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">自分のタスク</h1>
          <p className="text-slate-500 text-sm mt-0.5">AIが整理・割り当てたタスクの一覧</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500">{tasks.length}件</span>
        </div>
      </div>

      <TaskList tasks={tasks} />
    </div>
  );
}
