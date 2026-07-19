import Link from "next/link";
import {
  ArrowRight, AlertTriangle, CheckCircle2, Clock, Bot,
  TrendingUp, Receipt, ChevronRight, Send, Zap,
} from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";
import { jstYearMonth, jstMonthRange } from "@/lib/format-date";
import GoalCard from "./goal-card";

// 今月の売上目標と達成売上（完了タスクの売上合計）
async function fetchRevenueGoal() {
  const { year, month } = jstYearMonth();
  const { start, end } = jstMonthRange(year, month);

  const [{ data: targetRow }, { data: oneTimeRows }, { data: monthlyRows }] = await Promise.all([
    adminSupabase.from("monthly_targets").select("target_revenue").eq("year", year).eq("month", month).maybeSingle(),
    // 単発: 今月完了したタスクの売上
    adminSupabase.from("tasks").select("revenue_amount")
      .eq("status", "completed").eq("revenue_type", "one_time")
      .gte("updated_at", start).lt("updated_at", end),
    // 月額: 解約(cancelled)されていない月額タスクは毎月計上
    adminSupabase.from("tasks").select("revenue_amount")
      .eq("revenue_type", "monthly").neq("status", "cancelled"),
  ]);

  const sum = (rows: unknown[] | null) =>
    (rows ?? []).reduce((s: number, t) => s + Number((t as { revenue_amount?: number }).revenue_amount ?? 0), 0);

  const target = Number((targetRow as { target_revenue?: number } | null)?.target_revenue ?? 0);
  const oneTime = sum(oneTimeRows);
  const monthly = sum(monthlyRows);
  return { month, target, achieved: oneTime + monthly, oneTime, monthly };
}

async function fetchCeoKpi() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [
    { count: pendingScores },
    { count: pendingListings },
    { count: draftPayrolls },
    { count: activeProjects },
    { data: invoiceData },
    { count: recentReports },
  ] = await Promise.all([
    adminSupabase
      .from("task_scores")
      .select("*", { count: "exact", head: true })
      .is("confirmed_total", null)
      .is("approved_by", null),
    adminSupabase
      .from("task_market_listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    adminSupabase
      .from("payroll_estimates")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft")
      .eq("year", year)
      .eq("month", month),
    adminSupabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .neq("status", "completed"),
    adminSupabase
      .from("invoices")
      .select("total_amount")
      .eq("status", "sent"),
    adminSupabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .not("ai_agent_id", "is", null)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const billingScheduled = (invoiceData ?? []).reduce(
    (sum, inv) => sum + Number(inv.total_amount ?? 0),
    0
  );
  const pendingApproval = (pendingScores ?? 0) + (pendingListings ?? 0) + (draftPayrolls ?? 0);

  return {
    pendingApproval,
    weeklyProjects: activeProjects ?? 0,
    billingScheduled,
    aiProposals: recentReports ?? 0,
    todayImportant: pendingApproval,
  };
}

async function fetchApprovalItems() {
  const { data } = await adminSupabase
    .from("task_scores")
    .select(`
      id,
      provisional_total,
      tasks (
        title,
        priority,
        due_date,
        users!tasks_assigned_to_fkey (full_name)
      )
    `)
    .is("confirmed_total", null)
    .is("approved_by", null)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []).map((row) => {
    const task = row.tasks as {
      title?: string;
      priority?: string;
      due_date?: string;
      users?: { full_name?: string } | null;
    } | null;

    const dueDate = task?.due_date ? new Date(task.due_date) : null;
    const now = new Date();
    const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const urgency: "urgent" | "high" | "medium" | "low" =
      task?.priority === "urgent" || daysLeft <= 1 ? "urgent" :
      task?.priority === "high" || daysLeft <= 3 ? "high" :
      task?.priority === "medium" ? "medium" : "low";

    return {
      id: row.id,
      urgency,
      typeLabel: "タスク点数",
      title: task?.title ?? "タスク名不明",
      detail: `担当: ${task?.users?.full_name ?? "未設定"} · 仮${row.provisional_total}pt`,
    };
  });
}

// マネージャー別の進行中タスク数（マネージャーが作成したタスク）
async function fetchManagerTaskCounts() {
  const { data: managers } = await adminSupabase
    .from("users")
    .select("id, full_name, specialty, roles!inner(name)")
    .eq("is_active", true)
    .eq("roles.name", "admin");

  if (!managers) return [];

  const results = await Promise.all(
    managers.map(async (m) => {
      const { count } = await adminSupabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("created_by", m.id)
        .neq("status", "completed");

      const name = (m as { full_name?: string }).full_name ?? "マネージャー";
      const specialty = (m as { specialty?: string | null }).specialty;
      return { dept: specialty ? `${name}（${specialty}）` : name, tasks: count ?? 0 };
    })
  );

  return results;
}

interface ApprovalItemDash {
  id: string; urgency: "urgent" | "high" | "medium" | "low"; typeLabel: string; title: string; detail: string;
}

function StatCard({ label, value, sub, color, icon, href }: {
  label: string; value: string; sub?: string; color: string;
  icon: React.ReactNode; href?: string;
}) {
  const inner = (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const flowSteps = [
  { label: "社長", sub: "指示入力", color: "#f59e0b", icon: "👤" },
  { label: "AI秘書", sub: "整理・振り分け", color: "#2563eb", icon: "🤖" },
  { label: "部門AI", sub: "タスク化", color: "#7c3aed", icon: "⚡" },
  { label: "社員", sub: "実行・報告", color: "#059669", icon: "👥" },
];

export default async function CeoDashboardPage() {
  const [ceoKpi, approvalItems, deptCounts, revenueGoal] = await Promise.all([
    fetchCeoKpi(),
    fetchApprovalItems(),
    fetchManagerTaskCounts(),
    fetchRevenueGoal(),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">CEO Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">全社状況の確認・指示・承認を行う司令センター</p>
        </div>
        <div className="flex items-center gap-2">
          {ceoKpi.pendingApproval > 0 && (
            <span className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} /> 承認待ち {ceoKpi.pendingApproval}件
            </span>
          )}
          <Link href="/approval-center"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            承認センターへ <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* 今月の売上目標と進捗 */}
      <GoalCard month={revenueGoal.month} target={revenueGoal.target} achieved={revenueGoal.achieved}
        oneTime={revenueGoal.oneTime} monthly={revenueGoal.monthly} />

      {/* AI秘書 指示バー */}
      <div className="rounded-2xl p-5 border border-blue-200"
        style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Bot size={16} className="text-blue-600" />
          <span className="text-sm font-bold text-slate-800">AI秘書に指示する</span>
          <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full font-semibold">社長専用</span>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            defaultValue="新しいLP/PRを立ち上げる前に、案件の優先度を整理し、来月の収益計画とあわせて整理してほしい。"
            className="flex-1 px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
          />
          <Link href="/ai-secretary"
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            <Send size={14} /> 指示する
          </Link>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {["今週の売上目標を整理して", "営業会議の議題を作成して", "案件の優先順位を整理して", "経費削減のアイデアを提案して"].map((t) => (
            <span key={t} className="text-[10px] px-3 py-1 bg-white border border-blue-200 rounded-full text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="本日の重要事項" value={`${ceoKpi.todayImportant}件`} sub="今日対応が必要" color="#2563eb" icon={<Zap size={16} />} href="/approval-center" />
        <StatCard label="確認待ち" value={`${ceoKpi.pendingApproval}件`} sub="承認待ちタスク" color="#f59e0b" icon={<Clock size={16} />} href="/approval-center" />
        <StatCard label="今週の案件" value={`${ceoKpi.weeklyProjects}件`} sub="進行中案件" color="#059669" icon={<CheckCircle2 size={16} />} href="/reports" />
        <StatCard label="請求予定" value={`¥${(ceoKpi.billingScheduled / 10000).toFixed(0)}万`} sub="今月合計" color="#7c3aed" icon={<Receipt size={16} />} href="/reports" />
        <StatCard label="AIからの提案" value={`${ceoKpi.aiProposals}件`} sub="確認が必要" color="#ef4444" icon={<Bot size={16} />} href="/ai-secretary" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 指示フロー図 */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-5">指示の流れ — 全社AI連携構造</h2>
            <div className="flex items-center gap-3">
              {flowSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-3 flex-1">
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mx-auto mb-2"
                      style={{ background: step.color + "15" }}>
                      {step.icon}
                    </div>
                    <p className="text-sm font-bold text-slate-800">{step.label}</p>
                    <p className="text-[10px] text-slate-400">{step.sub}</p>
                    {step.label === "社長" && (
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">指示入力のみ</span>
                    )}
                  </div>
                  {i < flowSteps.length - 1 && (
                    <ArrowRight size={18} className="text-slate-300 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 承認待ちアイテム */}
          {approvalItems.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <AlertTriangle size={15} className="text-orange-500" /> 承認が必要なタスク点数
              </h2>
              <div className="space-y-2">
                {approvalItems.map((item) => (
                  <Link key={item.id} href="/task-scores"
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
                      item.urgency === "urgent" ? "border-red-200 bg-red-50" :
                      item.urgency === "high" ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-white hover:border-blue-200"
                    }`}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.urgency === "urgent" ? "bg-red-100 text-red-700" :
                      item.urgency === "high" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
                    }`}>{item.urgency === "urgent" ? "緊急" : item.urgency === "high" ? "高" : "通常"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.detail}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 次に判断すべきこと */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">次に判断すべきこと</h2>
            <div className="space-y-2">
              {[
                { text: "タスク点数を承認する", href: "/task-scores", urgent: ceoKpi.pendingApproval > 0 },
                { text: "タスクマーケットの出品申請を確認する", href: "/task-market-monitor", urgent: false },
                { text: "今月の給与見込みレポートを確認する", href: "/payroll-report", urgent: false },
                { text: "レポートで全社状況を確認する", href: "/reports", urgent: false },
              ].map((a, i) => (
                <Link key={i} href={a.href}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
                    a.urgent ? "border-red-200 bg-red-50" : "border-slate-200 bg-white hover:border-blue-200"
                  }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    a.urgent ? "bg-red-500 text-white" : "bg-blue-100 text-blue-600"
                  }`}>{i + 1}</span>
                  <p className="flex-1 text-sm text-slate-700">{a.text}</p>
                  <ArrowRight size={14} className="text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 右サイドパネル */}
        <div className="space-y-5">
          {/* 部門ステータス */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">マネージャー別ステータス（進行中タスク数）</h2>
            {deptCounts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">マネージャーが登録されていません</p>
            ) : deptCounts.map(({ dept, tasks }) => {
              const status = tasks >= 25 ? "alert" : tasks >= 15 ? "warning" : "active";
              return (
                <div key={dept} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-teal-500" />
                  <span className="text-sm flex-1 text-slate-700 truncate">{dept}</span>
                  <span className="text-xs text-slate-400">{tasks}件</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    status === "alert" ? "bg-red-100 text-red-600" :
                    status === "warning" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    {status === "alert" ? "要確認" : status === "warning" ? "注意" : "正常"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 最新の承認待ち */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700">承認待ち（最新）</h2>
              <Link href="/approval-center" className="text-xs text-blue-600 hover:text-blue-700">すべて →</Link>
            </div>
            <div className="space-y-3">
              {approvalItems.slice(0, 4).map((item) => (
                <Link key={item.id} href="/task-scores"
                  className="block p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                      item.urgency === "urgent" ? "bg-red-100 text-red-700 border-red-300" :
                      item.urgency === "high" ? "bg-orange-100 text-orange-700 border-orange-300" : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>{item.typeLabel}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{item.detail}</p>
                </Link>
              ))}
              {approvalItems.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">承認待ちはありません</p>
              )}
            </div>
          </div>

          {/* AIからの提案 */}
          <div className="rounded-2xl p-5 border border-purple-200"
            style={{ background: "linear-gradient(135deg, #f5f3ff, #eff6ff)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={14} className="text-purple-600" />
              <h2 className="text-sm font-bold text-slate-700">AIからの提案</h2>
            </div>
            {[
              "来週の商談フォローを今週中に実施することを推奨します",
              "承認待ちのタスク点数を確認・承認してください",
              "今月の給与見込みを最終確認してください",
            ].map((p, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-slate-600">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
