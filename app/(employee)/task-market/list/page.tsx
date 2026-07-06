import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import ListTaskClient from "./list-task-client";

interface MyTask {
  id: string; title: string; status: string; progress: number;
  points: number; dueDate: string;
}

async function fetchMyActiveTasks(userId: string): Promise<MyTask[]> {
  const { data } = await adminSupabase
    .from("tasks")
    .select("id, title, status, progress_rate, provisional_score, due_date")
    .eq("assigned_to", userId)
    .not("status", "in", '("completed","cancelled")')
    .order("due_date", { ascending: true });

  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    progress: t.progress_rate,
    points: t.provisional_score ?? 0,
    dueDate: t.due_date ?? "",
  }));
}

export default async function ListTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string }>;
}) {
  const user = await getCurrentUser();
  const [myTasks, params] = await Promise.all([fetchMyActiveTasks(user.id), searchParams]);
  return <ListTaskClient myTasks={myTasks} userId={user.id} initialTaskId={params.taskId} />;
}
