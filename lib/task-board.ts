import type { TaskStatus } from "@/types/task-board";

export const LOCK_MS = 48 * 60 * 60 * 1000;

// 納期まで48時間未満なら返却・移管・ドラッグ不可（=責任固定）
export function isTaskLocked(deadline: Date | string | null, now: Date = new Date()): boolean {
  if (!deadline) return false;
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  return d.getTime() - now.getTime() < LOCK_MS;
}

export function remainingHours(deadline: string | null, now: Date = new Date()): number | null {
  if (!deadline) return null;
  return (new Date(deadline).getTime() - now.getTime()) / (60 * 60 * 1000);
}

// 例: "残り 32時間" / "残り 5時間" / "超過"
export function formatRemaining(deadline: string | null, now: Date = new Date()): string {
  const h = remainingHours(deadline, now);
  if (h === null) return "期限なし";
  if (h < 0) return "期限超過";
  if (h < 1) return `残り ${Math.max(1, Math.round(h * 60))}分`;
  if (h < 48) return `残り ${Math.round(h)}時間`;
  return `残り ${Math.round(h / 24)}日`;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  UNASSIGNED: "未アサイン",
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  WAITING_REVIEW: "確認待ち",
  COMPLETED: "完了",
  OVERDUE: "期限超過",
};

export const STATUS_BADGE: Record<TaskStatus, string> = {
  UNASSIGNED: "bg-slate-100 text-slate-500 border-slate-200",
  NOT_STARTED: "bg-slate-100 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  WAITING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-rose-50 text-rose-600 border-rose-200",
};

// 未アサイン列内の並び順（1位=最上位）に応じた強調
export function rankAccent(rank: number | null): { border: string; badge: string } {
  if (rank === 1) return { border: "border-l-4 border-l-rose-500", badge: "bg-rose-500 text-white" };
  if (rank === 2 || rank === 3) return { border: "border-l-4 border-l-orange-400", badge: "bg-orange-400 text-white" };
  return { border: "border-l-4 border-l-slate-200", badge: "bg-slate-200 text-slate-600" };
}

export function difficultyLabel(d: number): string {
  return `難易度 ${d}`;
}

// 同一社員列内の並び: 期限超過 → 進行中 → 今日 → 明日以降 → 確認待ち
export function memberTaskSortKey(status: TaskStatus, bucket: string | null): number {
  if (status === "OVERDUE") return 0;
  if (status === "IN_PROGRESS") return 1;
  if (bucket === "TODAY") return 2;
  if (bucket === "TOMORROW_OR_LATER") return 3;
  if (status === "WAITING_REVIEW") return 4;
  return 5;
}

// JSTの「今週(月曜始まり)」の開始・終了ISO(+09:00)
export function jstWeekRange(now: Date = new Date()): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  const wd = parts.find((p) => p.type === "weekday")!.value; // Mon..Sun
  const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
  const base = new Date(`${y}-${m}-${d}T00:00:00+09:00`);
  const start = new Date(base.getTime() - idx * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}
