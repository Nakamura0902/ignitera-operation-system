// LINE顧客管理 の定数・選択肢・簡易判定・表示ヘルパー

// ---- 候補値 ----
export const STATUS_OPTIONS = [
  "未対応", "連絡済", "相談予約済", "提案中", "受注", "失注", "保留",
] as const;

export const TEMPERATURE_OPTIONS = ["高", "中", "低", "未設定"] as const;

export const PLAN_OPTIONS = ["Starter", "Growth", "Business", "Premium", "未定"] as const;

// ---- フォーム選択肢 ----
export const CURRENT_TOOLS_OPTIONS = [
  "ホームページ", "LP", "LINE公式アカウント", "Instagram", "Googleビジネスプロフィール", "特になし",
];

export const SETPLAN_ISSUES_OPTIONS = [
  "問い合わせを増やしたい", "ホームページを整えたい", "LINEを活用したい",
  "MEO/Googleマップを強化したい", "SNSを活用したい", "業務を効率化したい", "何から始めればいいかわからない",
];

export const INTERESTED_SERVICES_OPTIONS = [
  "Web制作", "LINE構築", "MEO対策", "SNS運用", "AI活用", "月額での改善支援", "まだ決まっていない",
];

export const SETPLAN_TIMING_OPTIONS = ["すぐ相談したい", "1ヶ月以内", "3ヶ月以内", "情報収集中"];

export const SETPLAN_BUDGET_OPTIONS = [
  "〜1万円/月", "1〜2万円/月", "2〜3万円/月", "3〜5万円/月", "5万円以上/月", "未定",
];

export const CONSULTATION_ISSUES_OPTIONS = [
  "集客を増やしたい", "問い合わせを増やしたい", "ホームページを整えたい", "SNSやLINEを活用したい",
  "業務を効率化したい", "AIを使ってみたい", "採用を強化したい", "何から始めればいいかわからない",
];

export const CONSULTATION_TIMING_OPTIONS = ["すぐ相談したい", "1ヶ月以内", "3ヶ月以内", "情報収集中"];

export const CONSULTATION_BUDGET_OPTIONS = [
  "未定", "〜10万円", "10〜30万円", "30万円以上", "月額支援も相談したい",
];

export const CONTACT_METHOD_OPTIONS = ["LINE", "メール", "オンライン相談"];

// ---- 簡易判定 ----
export function estimatePlanFromBudget(budget: string | null | undefined): string {
  switch (budget) {
    case "〜1万円/月": return "Starter";
    case "1〜2万円/月": return "Growth";
    case "2〜3万円/月": return "Business";
    case "3〜5万円/月":
    case "5万円以上/月": return "Premium";
    default: return "未定";
  }
}

export function judgeTemperature(desiredTiming: string | null | undefined): string {
  if (desiredTiming === "すぐ相談したい") return "高";
  if (desiredTiming === "1ヶ月以内") return "中";
  return "低";
}

// ---- 表示ヘルパー ----
export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    未対応: "bg-slate-100 text-slate-600 border-slate-200",
    連絡済: "bg-blue-50 text-blue-700 border-blue-200",
    相談予約済: "bg-indigo-50 text-indigo-700 border-indigo-200",
    提案中: "bg-amber-50 text-amber-700 border-amber-200",
    受注: "bg-emerald-50 text-emerald-700 border-emerald-200",
    失注: "bg-rose-50 text-rose-600 border-rose-200",
    保留: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export function temperatureBadgeClass(temp: string): string {
  const map: Record<string, string> = {
    高: "bg-rose-50 text-rose-600 border-rose-200",
    中: "bg-amber-50 text-amber-700 border-amber-200",
    低: "bg-sky-50 text-sky-600 border-sky-200",
    未設定: "bg-slate-100 text-slate-400 border-slate-200",
  };
  return map[temp] ?? "bg-slate-100 text-slate-400 border-slate-200";
}

export function planBadgeClass(plan: string): string {
  const map: Record<string, string> = {
    Starter: "bg-slate-100 text-slate-600 border-slate-200",
    Growth: "bg-sky-50 text-sky-700 border-sky-200",
    Business: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Premium: "bg-[#f6efe2] text-[#8a6a34] border-[#e4d3b0]",
    未定: "bg-slate-100 text-slate-400 border-slate-200",
  };
  return map[plan] ?? "bg-slate-100 text-slate-400 border-slate-200";
}
