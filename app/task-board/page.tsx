import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import { isTaskLocked, jstWeekRange, memberTaskSortKey } from "@/lib/task-board";
import type { BoardTask, Member, TaskStatus, TransferRequest } from "@/types/task-board";
import TaskBoardClient from "./task-board-client";

export const dynamic = "force-dynamic";

function toBoardRole(name: string | null | undefined): Member["role"] {
  if (name === "ceo") return "CEO";
  if (name === "admin") return "MANAGER";
  return "EMPLOYEE";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function TaskBoardPage() {
  const current = await getCurrentUser();
  const now = new Date();
  const { start: weekStart, end: weekEnd } = jstWeekRange(now);

  const [{ data: userRows }, { data: taskRows }, { data: historyRows }, { data: reqRows }] = await Promise.all([
    adminSupabase.from("users")
      .select("id, full_name, employee_id, avatar_url, is_active, roles(name)")
      .eq("is_active", true)
      .order("employee_id", { ascending: true }),
    adminSupabase.from("tasks")
      .select("id, title, description, priority_rank, difficulty, reward_points, due_date, status, schedule_bucket, sort_order, assigned_to, created_by, created_at, updated_at, completed_at, project_id")
      .neq("status", "cancelled")
      .order("priority_rank", { ascending: true }),
    adminSupabase.from("task_assignment_history")
      .select("action, to_member_id, from_member_id, created_at")
      .gte("created_at", weekStart).lt("created_at", weekEnd),
    adminSupabase.from("task_transfer_requests")
      .select("id, task_id, from_member_id, to_member_id, progress_percent, reason, handover_notes, status, created_at")
      .eq("to_member_id", current.id).eq("status", "PENDING"),
  ]);

  // 作成者名の解決用マップ
  const nameById = new Map<string, { name: string; role: string }>();
  for (const u of userRows ?? []) {
    nameById.set(u.id, { name: u.full_name ?? "未設定", role: (u.roles as any)?.name ?? "employee" });
  }

  const members: Member[] = (userRows ?? []).map((u: any) => ({
    id: u.id,
    membershipId: u.employee_id ?? "",
    authUserId: u.id,
    name: u.full_name ?? "未設定",
    role: toBoardRole((u.roles as any)?.name),
    avatar: (u.full_name ?? "?").charAt(0),
    avatarUrl: u.avatar_url ?? null,
    isActive: u.is_active ?? true,
  }));

  function deriveStatus(t: any): TaskStatus {
    if (!t.assigned_to) return "UNASSIGNED";
    if (t.status === "completed") return "COMPLETED";
    if (t.due_date && new Date(t.due_date) < now) return "OVERDUE";
    if (t.status === "in_progress") return "IN_PROGRESS";
    if (t.status === "review") return "WAITING_REVIEW";
    return "NOT_STARTED";
  }

  const tasks: BoardTask[] = (taskRows ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    completionCriteria: null,
    priorityRank: t.priority_rank ?? null,
    difficulty: t.difficulty ?? 3,
    rewardPoints: t.reward_points ?? 0,
    deadline: t.due_date ?? null,
    status: deriveStatus(t),
    scheduleBucket: t.schedule_bucket ?? null,
    sortOrder: t.sort_order ?? 0,
    assigneeMemberId: t.assigned_to ?? null,
    createdByMemberId: t.created_by ?? null,
    createdByName: t.created_by ? nameById.get(t.created_by)?.name ?? null : null,
    createdByRole: t.created_by ? nameById.get(t.created_by)?.role ?? null : null,
    projectId: t.project_id ?? null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    completedAt: t.completed_at ?? null,
    locked: isTaskLocked(t.due_date, now),
  }));

  // 未アサイン（完了除く）を優先順位順に
  const unassigned = tasks
    .filter((t) => t.status === "UNASSIGNED")
    .sort((a, b) => (a.priorityRank ?? 9999) - (b.priorityRank ?? 9999));

  // 社員ごとのタスク（完了は除外して表示、並びは規定順）
  const byMember: Record<string, BoardTask[]> = {};
  for (const m of members) byMember[m.id] = [];
  for (const t of tasks) {
    if (t.assigneeMemberId && t.status !== "COMPLETED" && byMember[t.assigneeMemberId]) {
      byMember[t.assigneeMemberId].push(t);
    }
  }
  for (const id of Object.keys(byMember)) {
    byMember[id].sort((a, b) => {
      const ka = memberTaskSortKey(a.status, a.scheduleBucket);
      const kb = memberTaskSortKey(b.status, b.scheduleBucket);
      return ka !== kb ? ka - kb : a.sortOrder - b.sortOrder;
    });
  }

  // 週次の簡易実績（保有・今週pt・完遂率・期限超過）
  const stats: Record<string, { holding: number; weekPoints: number; completionRate: number; overdue: number }> = {};
  for (const m of members) {
    const acquired = (historyRows ?? []).filter((h: any) => h.action === "ACQUIRED" && h.to_member_id === m.id).length;
    const selfDone = (historyRows ?? []).filter((h: any) => h.action === "COMPLETED" && h.to_member_id === m.id).length;
    const weekPoints = tasks
      .filter((t) => t.assigneeMemberId === m.id && t.completedAt && t.completedAt >= weekStart && t.completedAt < weekEnd)
      .reduce((s, t) => s + t.rewardPoints, 0);
    stats[m.id] = {
      holding: (byMember[m.id] ?? []).length,
      weekPoints,
      completionRate: acquired > 0 ? Math.round((selfDone / acquired) * 100) : 0,
      overdue: (byMember[m.id] ?? []).filter((t) => t.status === "OVERDUE").length,
    };
  }

  const requests: TransferRequest[] = (reqRows ?? []).map((r: any) => ({
    id: r.id, taskId: r.task_id,
    taskTitle: tasks.find((t) => t.id === r.task_id)?.title ?? "タスク",
    fromMemberId: r.from_member_id, fromName: nameById.get(r.from_member_id)?.name ?? "不明",
    toMemberId: r.to_member_id, progressPercent: r.progress_percent, reason: r.reason,
    handoverNotes: r.handover_notes ?? null, status: r.status, createdAt: r.created_at,
  }));

  return (
    <TaskBoardClient
      currentMemberId={current.id}
      role={current.role}
      members={members}
      unassigned={unassigned}
      byMember={byMember}
      stats={stats}
      requests={requests}
    />
  );
}
