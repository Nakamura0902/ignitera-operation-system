// 通知の種類（種類別オン/オフ設定で使う）。値はDBのCHECK制約と一致。
export const NOTIFICATION_TYPES = [
  { value: "task_assigned", label: "タスクの割り当て・更新" },
  { value: "deadline_warning", label: "期限が近いお知らせ" },
  { value: "approval_required", label: "承認依頼" },
  { value: "score_confirmed", label: "点数の確定" },
  { value: "market_activity", label: "タスクマーケット" },
  { value: "system", label: "システム通知" },
] as const;
