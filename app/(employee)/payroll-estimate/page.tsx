import { TrendingUp, TrendingDown } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";

interface MonthlyPoint { month: string; points: number; }

async function fetchPayrollData(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 過去6ヶ月の月情報
  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: `${d.getMonth() + 1}月`, year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const [payrollResult, pendingScoresResult, inProgressResult, historyResult] = await Promise.all([
    adminSupabase
      .from("payroll_estimates")
      .select("base_salary, point_reward, quality_bonus, total_score_points, status")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle(),

    // 承認待ちポイント（task_scores.status = 'pending_review'）
    adminSupabase
      .from("task_scores")
      .select("provisional_total, tasks!inner ( assigned_to )")
      .eq("status", "pending_review")
      .eq("tasks.assigned_to", userId),

    // 進行中タスクの予定ポイント
    adminSupabase
      .from("tasks")
      .select("provisional_score")
      .eq("assigned_to", userId)
      .in("status", ["pending", "in_progress"]),

    // 月別ポイント履歴（confirmed）
    adminSupabase
      .from("score_history")
      .select("points_before, points_after, created_at")
      .eq("user_id", userId)
      .eq("score_type", "confirmed")
      .gte("created_at", sixMonthsAgo)
      .order("created_at", { ascending: true }),
  ]);

  const payroll = payrollResult.data;

  const monthlyPoints = payroll?.total_score_points ?? 0;
  const pointReward = payroll?.point_reward ?? (monthlyPoints * 5);
  const qualityBonus = payroll?.quality_bonus ?? 0;
  const baseSalary = payroll?.base_salary ?? 0;

  const pendingPoints = (pendingScoresResult.data ?? []).reduce(
    (sum, r) => sum + (r.provisional_total ?? 0), 0
  );

  const inProgressPoints = (inProgressResult.data ?? []).reduce(
    (sum, r) => sum + (r.provisional_score ?? 0), 0
  );

  const totalEstimatedPoints = monthlyPoints + pendingPoints + inProgressPoints;

  // 月別ポイント推移
  const historyRows = (historyResult.data ?? []) as {
    points_before: number; points_after: number; created_at: string;
  }[];

  const monthlyPointHistory: MonthlyPoint[] = months.map(({ label, year: y, month: m }) => {
    const monthStr = `${y}-${String(m).padStart(2, "0")}`;
    const total = historyRows
      .filter((r) => r.created_at.startsWith(monthStr))
      .reduce((sum, r) => sum + (r.points_after - r.points_before), 0);
    return { month: label, points: Math.max(0, total) };
  });

  return {
    baseSalary, pointReward, qualityBonus, monthlyPoints,
    pendingPoints, inProgressPoints, totalEstimatedPoints,
    monthlyPointHistory,
  };
}

function MiniBarChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.map((d) => d.points), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const pct = (d.points / max) * 100;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-md transition-all"
              style={{
                height: `${pct}%`,
                background: isLast ? "linear-gradient(180deg,#2563eb,#7c3aed)" : "#e2e8f0",
                minHeight: 4,
              }} />
            <span className="text-[9px] text-slate-400">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function PayrollEstimatePage() {
  const user = await getCurrentUser();
  const {
    baseSalary, pointReward, qualityBonus, monthlyPoints,
    pendingPoints, inProgressPoints, totalEstimatedPoints,
    monthlyPointHistory,
  } = await fetchPayrollData(user.id);

  const prevMonth = monthlyPointHistory[monthlyPointHistory.length - 2] ?? { month: "", points: 0 };
  const thisMonth = monthlyPointHistory[monthlyPointHistory.length - 1] ?? { month: "", points: 0 };
  const diff = thisMonth.points - prevMonth.points;
  const diffPct = prevMonth.points > 0 ? Math.round((diff / prevMonth.points) * 100) : 0;

  const totalEstimate = baseSalary + pointReward + qualityBonus;

  // ドーナツチャート用の比率計算
  const safeTotal = totalEstimatedPoints || 1;
  const earnedPct = monthlyPoints / safeTotal;
  const pendingPct = pendingPoints / safeTotal;
  const inProgressPct = inProgressPoints / safeTotal;
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">ポイント・給与見込み</h1>
        <p className="text-slate-500 text-sm mt-0.5">今月の獲得ポイントと給与反映見込み（確定前）</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "獲得済みポイント", value: `${monthlyPoints.toLocaleString()} pt`, color: "#2563eb", note: "確定済み" },
          { label: "承認待ちポイント", value: `${pendingPoints.toLocaleString()} pt`, color: "#f59e0b", note: "レビュー待ち" },
          { label: "進行中予定ポイント", value: `${inProgressPoints.toLocaleString()} pt`, color: "#8b5cf6", note: "完了後獲得" },
          { label: "合計見込み", value: `${totalEstimatedPoints.toLocaleString()} pt`, color: "#059669", note: "今月全体" },
        ].map(({ label, value, color, note }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-1">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* ドーナツチャート + 内訳 */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-5">ポイント内訳</h2>
          <div className="flex items-center gap-8">
            <div className="shrink-0">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="52" fill="none" stroke="#f1f5f9" strokeWidth="20" />
                <circle cx="70" cy="70" r="52" fill="none" stroke="#2563eb" strokeWidth="20"
                  strokeDasharray={`${earnedPct * circumference} ${circumference}`}
                  strokeLinecap="butt" transform="rotate(-90 70 70)" />
                <circle cx="70" cy="70" r="52" fill="none" stroke="#f59e0b" strokeWidth="20"
                  strokeDasharray={`${pendingPct * circumference} ${circumference}`}
                  strokeLinecap="butt"
                  transform={`rotate(${-90 + earnedPct * 360} 70 70)`} />
                <circle cx="70" cy="70" r="52" fill="none" stroke="#8b5cf6" strokeWidth="20"
                  strokeDasharray={`${inProgressPct * circumference} ${circumference}`}
                  strokeLinecap="butt"
                  transform={`rotate(${-90 + (earnedPct + pendingPct) * 360} 70 70)`} />
                <text x="70" y="65" textAnchor="middle" fontSize="18" fontWeight="700" fill="#1e293b">
                  {totalEstimatedPoints.toLocaleString()}
                </text>
                <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">pt 見込み</text>
              </svg>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: "獲得済み", value: monthlyPoints, color: "#2563eb", pct: Math.round(earnedPct * 100) },
                { label: "承認待ち", value: pendingPoints, color: "#f59e0b", pct: Math.round(pendingPct * 100) },
                { label: "進行中予定", value: inProgressPoints, color: "#8b5cf6", pct: Math.round(inProgressPct * 100) },
              ].map(({ label, value, color, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                      <span className="text-sm text-slate-600">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{value.toLocaleString()} pt</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 前月比 */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold ${
                diff >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}>
                {diff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                前月比 {diff >= 0 ? "+" : ""}{diffPct}%（{diff >= 0 ? "+" : ""}{diff} pt）
              </div>
              <span className="text-xs text-slate-400">先月: {prevMonth.points.toLocaleString()} pt</span>
            </div>
          </div>
        </div>

        {/* 推移グラフ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4">月別ポイント推移</h2>
          <MiniBarChart data={monthlyPointHistory} />
        </div>
      </div>

      {/* 給与見込み */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 mb-5">給与反映見込み（今月）</h2>
        <div className="space-y-3">
          {[
            { label: "基本給（最低保証）", value: baseSalary, note: "毎月固定" },
            { label: "ポイント報酬", value: pointReward, note: "獲得ポイント換算" },
            { label: "品質ボーナス", value: qualityBonus, note: "品質係数適用分" },
          ].map(({ label, value, note }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-sm text-slate-700 font-medium">{label}</p>
                <p className="text-xs text-slate-400">{note}</p>
              </div>
              <p className="text-lg font-bold text-slate-800">¥{value.toLocaleString()}</p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-sm font-bold text-slate-800">合計見込み</p>
              <p className="text-xs text-slate-400">※ 社長承認後に確定</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">¥{totalEstimate.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700">
            この金額は見込みです。点数はレビュー後に確定し、給与反映は社長の承認を経て確定します。
          </p>
        </div>
      </div>
    </div>
  );
}
