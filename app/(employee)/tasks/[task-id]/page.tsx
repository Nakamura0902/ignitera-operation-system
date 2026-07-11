import { notFound } from "next/navigation";
import { adminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/get-current-user";
import TaskDetail, { DbTaskDetail } from "./task-detail";

async function fetchTask(taskId: string): Promise<DbTaskDetail | null> {
  const { data, error } = await adminSupabase
    .from("tasks")
    .select(`
      id, title, description, status, priority, progress_rate, due_date, provisional_score,
      task_scores ( difficulty, effort, contribution, urgency, quality_risk ),
      users!tasks_assigned_to_fkey ( full_name ),
      task_checklist_items ( id, title, weight, status, sort_order )
    `)
    .eq("id", taskId)
    .single();

  if (error || !data) return null;

  const { data: commentsData } = await adminSupabase
    .from("comments")
    .select("id, content, created_at, users ( full_name )")
    .eq("target_type", "task")
    .eq("target_id", taskId)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comments = (commentsData ?? []).map((c: any) => ({
    id: c.id,
    content: c.content,
    author_name: c.users?.full_name ?? "不明",
    created_at: c.created_at,
  }));

  return {
    id: data.id,
    title: data.title,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    description: (data as any).description ?? null,
    status: data.status as DbTaskDetail["status"],
    priority: data.priority as DbTaskDetail["priority"],
    progress_rate: data.progress_rate,
    due_date: data.due_date,
    provisional_score: data.provisional_score,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    department_name: "—",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignee_name: (data.users as any)?.full_name ?? "未割り当て",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    difficulty: (data.task_scores as any)?.difficulty ?? 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    effort: (data.task_scores as any)?.effort ?? 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contribution: (data.task_scores as any)?.contribution ?? 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    urgency: (data.task_scores as any)?.urgency ?? 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quality_risk: (data.task_scores as any)?.quality_risk ?? 3,
    checklist: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((data.task_checklist_items as any[]) ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          title: item.title,
          weight: item.weight,
          status: item.status as "pending" | "in_progress" | "completed",
          sort_order: item.sort_order,
        }))
    ),
    comments,
  };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ "task-id": string }>;
}) {
  const { "task-id": taskId } = await params;
  const [task, currentUser] = await Promise.all([fetchTask(taskId), getCurrentUser()]);
  if (!task) notFound();
  return <TaskDetail task={task} userId={currentUser.id} />;
}
