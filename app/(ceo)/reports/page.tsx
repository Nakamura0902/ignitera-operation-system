import { BarChart3, TrendingUp, Bot, ArrowUp, ArrowDown } from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";

interface ReportDept { dept: string; tasks: number; completed: number; revenue: number; achievement: number; }
interface RevenueEntry { month: string; amount: number; }

async function fetchReportsData() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // 月次売上（過去6ヶ月の入金済み請求書）
  const { data: paidInvoices } = await adminSupabase
    .from("invoices")
    .select("total_amount, paid_date")
    .eq("status", "paid")
    .gte("paid_date", sixMonthsAgo.toISOString().split("T")[0]);

  const monthMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getMonth() + 1}月`;
    monthMap.set(key, 0);
  }
  for (const inv of paidInvoices ?? []) {
    if (!inv.paid_date) continue;
    const d = new Date(inv.paid_date);
    const key = `${d.getMonth() + 1}月`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(inv.total_amount ?? 0));
    }
  }
  const revenueHistory: RevenueEntry[] = Array.from(monthMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));

  // 部門別パフォーマンス
  const { data: departments } = await adminSupabase
    .from("departments")
    .select("id, display_name");

  const reportDepartments: ReportDept[] = await Promise.all(
    (departments ?? []).map(async (dept) => {
      const [{ count: totalTasks }, { count: completedTasks }, { data: invoices }] = await Promise.all([
        adminSupabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("department_id", dept.id),
        adminSupabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("department_id", dept.id)
          .eq("status", "completed"),
        adminSupabase
          .from("projects")
          .select("id")
          .eq("department_id", dept.id)
          .then(async ({ data: projects }) => {
            if (!projects || projects.length === 0) return { data: [] };
            const projectIds = projects.map((p) => p.id);
            return adminSupabase
              .from("invoices")
              .select("total_amount")
              .in("project_id", projectIds)
              .eq("status", "paid");
          }),
      ]);

      const revenue = (invoices ?? []).reduce(
        (s, inv) => s + Number(inv.total_amount ?? 0),
        0
      );

      const total = totalTasks ?? 0;
      const completed = completedTasks ?? 0;
      const achievement = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        dept: dept.display_name,
        tasks: total,
        completed,
        revenue,
        achievement,
      };
    })
  );

  // AI提案数（過去7日間のAI生成レポート）
  const { count: aiReportCount } = await adminSupabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .not("ai_agent_id", "is", null)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  return { revenueHistory, reportDepartments, aiProposals: aiReportCount ?? 0 };
}

export default async function ReportsPage() {
  const { revenueHistory, reportDepartments, aiProposals } = await fetchReportsData();

  const maxRevenue = revenueHistory.length > 0 ? Math.max(...revenueHistory.map((r) => r.amount), 1) : 1;
  const maxDeptRevenue = reportDepartments.filter((d) => d.revenue > 0).length > 0
    ? Math.max(...reportDepartments.filter((d) => d.revenue > 0).map((d) => d.revenue))
    : 1;

  const totalRevenue = revenueHistory[revenueHistory.length - 1]?.amount ?? 0;
  const prevRevenue = revenueHistory[revenueHistory.length - 2]?.amount ?? 0;
  const growthPct = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : "0.0";
  const isGrowthPositive = Number(growthPct) >= 0;

  const totalTasks = reportDepartments.reduce((s, d) => s + d.tasks, 0);
  const totalCompleted = reportDepartments.reduce((s, d) => s + d.completed, 0);
  const avgAchievement = reportDepartments.length > 0
    ? Math.round(reportDepartments.reduce((s, d) => s + d.achievement, 0) / reportDepartments.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-600" /> 経営レポート
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">全社パフォーマンスの可視化</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "今月の売上", value: `¥${(totalRevenue / 10000).toFixed(0)}万`, sub: `前月比 ${isGrowthPositive ? "+" : ""}${growthPct}%`, color: "#059669", up: isGrowthPositive },
          { label: "タスク完了率", value: `${totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%`, sub: `${totalCompleted}/${totalTasks}タスク`, color: "#2563eb" },
          { label: "全社達成率", value: `${avgAchievement}%`, sub: "部門平均", color: "#7c3aed" },
          { label: "AIによる提案", value: `${aiProposals}件`, sub: "今週の改善提案", color: "#f59e0b" },
        ].map(({ label, value, sub, color, up }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              {up !== undefined && (
                up
                  ? <ArrowUp size={14} className="text-emerald-500" />
                  : <ArrowDown size={14} className="text-red-500" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">

          {/* 売上推移チャート */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-600" /> 月次売上推移
            </h2>
            <div className="flex items-end gap-6 h-40">
              {revenueHistory.map((r, i) => {
                const heightPct = (r.amount / maxRevenue) * 100;
                const isLatest = i === revenueHistory.length - 1;
                const prev = i > 0 ? revenueHistory[i - 1].amount : r.amount;
                const isUp = r.amount >= prev;
                return (
                  <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                    <p className={`text-[10px] font-bold ${isLatest ? "text-blue-600" : "text-slate-500"}`}>
                      ¥{(r.amount / 10000).toFixed(0)}万
                    </p>
                    {i > 0 && (
                      <span className={`text-[9px] font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                        {isUp ? "▲" : "▼"}{Math.abs(prev > 0 ? ((r.amount - prev) / prev) * 100 : 0).toFixed(1)}%
                      </span>
                    )}
                    <div className="w-full rounded-t-lg transition-all relative"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        background: isLatest ? "linear-gradient(180deg, #2563eb, #7c3aed)" : "#e2e8f0",
                        minHeight: "8px",
                      }}>
                      {isLatest && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">{r.month}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 部門別パフォーマンステーブル */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">部門別パフォーマンス</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left pb-3 font-medium">部門</th>
                    <th className="text-center pb-3 font-medium">タスク数</th>
                    <th className="text-center pb-3 font-medium">完了</th>
                    <th className="text-right pb-3 font-medium">売上貢献</th>
                    <th className="text-left pb-3 font-medium w-40">達成率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportDepartments.map((d) => (
                    <tr key={d.dept} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-medium text-slate-800">{d.dept}</td>
                      <td className="py-3 text-center text-slate-600">{d.tasks}</td>
                      <td className="py-3 text-center text-slate-600">{d.completed}</td>
                      <td className="py-3 text-right font-bold text-slate-700">
                        {d.revenue > 0 ? `¥${(d.revenue / 10000).toFixed(0)}万` : "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                            <div className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${d.achievement}%`,
                                background: d.achievement >= 85 ? "#10b981" : d.achievement >= 70 ? "#f59e0b" : "#ef4444",
                              }} />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${
                            d.achievement >= 85 ? "text-emerald-600" : d.achievement >= 70 ? "text-amber-600" : "text-red-600"
                          }`}>{d.achievement}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 部門別売上バーチャート */}
            {reportDepartments.filter((d) => d.revenue > 0).length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-3">部門別売上貢献</p>
                <div className="space-y-2">
                  {reportDepartments.filter((d) => d.revenue > 0).map((d) => (
                    <div key={d.dept} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-16 text-right">{d.dept}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-4 rounded-full flex items-center pl-2 transition-all"
                          style={{
                            width: `${(d.revenue / maxDeptRevenue) * 100}%`,
                            background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                            minWidth: "32px",
                          }}>
                          <span className="text-[9px] text-white font-bold">¥{(d.revenue / 10000).toFixed(0)}万</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右パネル */}
        <div className="space-y-5">
          {/* AIレポートサマリー */}
          <div className="rounded-2xl p-5 border border-purple-200"
            style={{ background: "linear-gradient(135deg, #f5f3ff, #eff6ff)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={14} className="text-purple-600" />
              <h2 className="text-sm font-bold text-slate-700">AIレポートサマリー</h2>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
              <p className="text-xs text-slate-600">今月の売上 ¥{(totalRevenue / 10000).toFixed(0)}万 · 前月比 {isGrowthPositive ? "+" : ""}{growthPct}%</p>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
              <p className="text-xs text-slate-600">全社タスク完了率 {totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}% · {totalCompleted}/{totalTasks}件</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
              <p className="text-xs text-slate-600">平均達成率 {avgAchievement}% · 85%以上の部門が高パフォーマンスです</p>
            </div>
          </div>

          {/* 改善提案 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">AIからの改善提案</h2>
            <div className="space-y-3">
              {reportDepartments
                .filter((d) => d.achievement < 85 && d.tasks > 0)
                .slice(0, 3)
                .map((d, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${
                    d.achievement < 70 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                  }`}>
                    <span className={`text-[10px] font-bold ${d.achievement < 70 ? "text-red-700" : "text-amber-700"}`}>{d.dept}</span>
                    <p className="text-xs text-slate-600 mt-0.5">達成率{d.achievement}% — タスク完了の加速を推奨</p>
                  </div>
                ))}
              {reportDepartments.filter((d) => d.achievement < 85 && d.tasks > 0).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">すべての部門が良好なパフォーマンスです</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
