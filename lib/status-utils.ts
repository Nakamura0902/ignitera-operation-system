export function getProgressLabel(progress: number): string {
  if (progress === 0) return "未着手";
  if (progress <= 30) return "準備・調査中";
  if (progress <= 60) return "作業中";
  if (progress <= 90) return "仕上げ中";
  if (progress <= 99) return "確認待ち";
  return "完了・承認済み";
}

export function getProgressColor(progress: number): string {
  if (progress === 0) return "#94a3b8";
  if (progress <= 30) return "#f59e0b";
  if (progress <= 60) return "#3b82f6";
  if (progress <= 90) return "#8b5cf6";
  if (progress <= 99) return "#06b6d4";
  return "#10b981";
}

export function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = { urgent: "緊急", high: "高", medium: "中", low: "低" };
  return map[priority] ?? priority;
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-blue-100 text-blue-700",
    low: "bg-slate-100 text-slate-600",
  };
  return map[priority] ?? "bg-slate-100 text-slate-600";
}

export function getQualityLabel(rating: string): string {
  const map: Record<string, string> = {
    excellent: "素晴らしい",
    good: "問題なし",
    minor_revision: "軽微な修正",
    major_revision: "大幅修正",
  };
  return map[rating] ?? rating;
}

export function getQualityColor(rating: string): string {
  const map: Record<string, string> = {
    excellent: "bg-emerald-100 text-emerald-700",
    good: "bg-blue-100 text-blue-700",
    minor_revision: "bg-amber-100 text-amber-700",
    major_revision: "bg-red-100 text-red-700",
  };
  return map[rating] ?? "bg-slate-100 text-slate-600";
}

export function getTemperatureColor(t: string): string {
  const map: Record<string, string> = {
    hot: "text-red-600 bg-red-50",
    warm: "text-orange-500 bg-orange-50",
    cold: "text-blue-500 bg-blue-50",
  };
  return map[t] ?? "text-slate-600 bg-slate-50";
}

export function getTemperatureLabel(t: string): string {
  const map: Record<string, string> = { hot: "🔥 ホット", warm: "🌤 ウォーム", cold: "❄️ コールド" };
  return map[t] ?? t;
}

export function getInvoiceStatusColor(s: string): string {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
  };
  return map[s] ?? "bg-slate-100 text-slate-600";
}

export function getApprovalUrgencyColor(u: string): string {
  const map: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    low: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[u] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export function getApprovalUrgencyLabel(u: string): string {
  const map: Record<string, string> = { urgent: "緊急", high: "高", medium: "中", low: "低" };
  return map[u] ?? u;
}
