import { adminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/get-current-user";
import TaskScoresClient from "./task-scores-client";

export interface TaskScoreRow {
  id: string;
  taskId: string;
  title: string;
  assigneeName: string;
  departmentName: string;
  difficulty: number;
  effort: number;
  contribution: number;
  urgency: number;
  qualityRisk: number;
  provisionalScore: number;
  confirmedTotal: number | null;
  qualityCoefficient: number | null;
  isApproved: boolean;
}

async function fetchTaskScores(): Promise<TaskScoreRow[]> {
  const { data } = await adminSupabase
    .from("task_scores")
    .select(`
      id,
      task_id,
      difficulty,
      effort,
      contribution,
      urgency,
      quality_risk,
      provisional_total,
      confirmed_total,
      quality_coefficient,
      approved_by,
      tasks (
        title,
        users!tasks_assigned_to_fkey (full_name)
      )
    `)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const task = row.tasks as {
      title?: string;
      users?: { full_name?: string } | null;
      departments?: { display_name?: string } | null;
    } | null;

    return {
      id: row.id,
      taskId: row.task_id,
      title: task?.title ?? "タスク名不明",
      assigneeName: task?.users?.full_name ?? "未設定",
      departmentName: "—",
      difficulty: row.difficulty,
      effort: row.effort,
      contribution: row.contribution,
      urgency: row.urgency,
      qualityRisk: row.quality_risk,
      provisionalScore: row.provisional_total,
      confirmedTotal: row.confirmed_total ?? null,
      qualityCoefficient: row.quality_coefficient ?? null,
      isApproved: row.approved_by != null,
    };
  });
}

export default async function TaskScoresPage() {
  const [taskScores, user] = await Promise.all([fetchTaskScores(), getCurrentUser()]);
  return <TaskScoresClient initialScores={taskScores} ceoId={user.id} />;
}
