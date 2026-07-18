// Task Board の型定義

export type BoardRole = "CEO" | "MANAGER" | "EMPLOYEE";

export interface Member {
  id: string;          // = users.id（不変の一意ID。認証uidと同じ）
  membershipId: string; // = employee_id
  authUserId: string;   // = users.id
  name: string;
  role: BoardRole;
  avatar: string;       // 頭文字（画像URLが無い場合）
  avatarUrl?: string | null;
  isActive: boolean;
}

export type TaskStatus =
  | "UNASSIGNED"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_REVIEW"
  | "COMPLETED"
  | "OVERDUE";

export type ScheduleBucket = "TODAY" | "TOMORROW_OR_LATER";

export interface BoardTask {
  id: string;
  title: string;
  description: string | null;
  completionCriteria: string | null;
  priorityRank: number | null;   // 未アサイン列の順位（小さいほど上位）
  difficulty: number;            // 1-5
  rewardPoints: number;
  deadline: string | null;       // ISO
  status: TaskStatus;
  scheduleBucket: ScheduleBucket | null;
  sortOrder: number;
  assigneeMemberId: string | null;
  createdByMemberId: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  locked: boolean;               // 納期48h未満
}

export interface TransferRequest {
  id: string;
  taskId: string;
  taskTitle: string;
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  progressPercent: number;
  reason: string;
  handoverNotes: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export interface WeeklyPerformance {
  acquiredCount: number;
  selfCompletedCount: number;
  completedCount: number;
  returnedCount: number;
  transferredCount: number;
  overdueCount: number;
  onTimeCompletedCount: number;
  totalDifficulty: number;
  totalRewardPoints: number;
  completionRate: number; // 自力完了 ÷ 取得 × 100
}
