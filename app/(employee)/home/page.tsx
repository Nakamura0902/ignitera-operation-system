import Link from "next/link";
import {
  TrendingUp, Clock, ShoppingBag, BarChart3, ChevronRight,
  AlertCircle, ArrowRight,
} from "lucide-react";
import { getProgressLabel, getProgressColor, getPriorityLabel, getPriorityColor } from "@/lib/status-utils";
import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-xs font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </span>
  );
}

async function fetchHomeData(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

  const [tasksResult, payrollResult, openMarketResult] = await Promise.all([
    adminSupabase
      .from("tasks")
      .select(`
        id, title, status, priority, progress_rate, due_date, provisional_score,
        users!tasks_assigned_to_fkey ( full_name ),
        task_scores ( difficulty, effort, contribution, urgency, quality_risk )
      `)
      .eq("assigned_to", userId)
      .neq("status", "cancelled")
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true }),

    adminSupabase
      .from("payroll_estimates")
      .select("point_reward, total_score_points, quality_bonus, base_salary")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle(),

    adminSupabase
      .from("task_market_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  const allTasks = (tasksResult.data ?? []) as {
    id: string; title: string; status: string; priority: string; progress_rate: number;
    due_date: string | null; provisional_score: number | null;
    users: { full_name?: string } | null;
    task_scores: { difficulty?: number; effort?: number; contribution?: number; urgency?: number; quality_risk?: number } | null;
  }[];

  const completedThisMonth = allTasks.filter(
    (t) => t.status === "completed" && t.due_date && t.due_date >= monthStart
  ).length;

  const activeTasks = allTasks
    .filter((t) => t.status !== "completed")
    .slice(0, 6)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      progress: t.progress_rate,
      dueDate: t.due_date ?? "",
      assignee: t.users?.full_name ?? "未割り当て",
      points: t.provisional_score ?? 0,
      difficulty: t.task_scores?.difficulty ?? 3,
      effort: t.task_scores?.effort ?? 3,
      contribution: t.task_scores?.contribution ?? 3,
      qualityRisk: t.task_scores?.quality_risk ?? 3,
    }));

  const urgentCount = allTasks.filter((t) => t.priority === "urgent" && t.status !== "completed").length;
  const activeTotal = allTasks.filter((t) => t.status !== "completed").length;

  const avgProgress = activeTasks.length > 0
    ? Math.round(activeTasks.reduce((sum, t) => sum + t.progress, 0) / activeTasks.length)
    : 0;

  const payroll = payrollResult.data;
  const monthlyPoints = payroll?.total_score_points ?? 0;
  const pointReward = payroll?.point_reward ?? 0;

  const openMarketCount = openMarketResult.count ?? 0;

  return { activeTasks, urgentCount, activeTotal, completedThisMonth, avgProgress, monthlyPoints, pointReward, openMarketCount };
}

export default async function HomePage() {
  const authUser = await getCurrentUser();
  const {
    activeTasks, urgentCount, activeTotal, completedThisMonth,
    avgProgress, monthlyPoints, pointReward, openMarketCount,
  } = await fetchHomeData(authUser.id);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            おはようございます、{authUser.name}さん
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            今日も AIが整理したタスクを確認して進めましょう。
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{dateLabel}</p>
          {urgentCount > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-red-600 text-xs font-medium">
              <AlertCircle size={12} />
              緊急タスクが {urgentCount} 件あります
            </div>
          )}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="今月の獲得ポイント"
          value={`${monthlyPoints.toLocaleString()} pt`}
          sub={`給与報酬見込み ¥${pointReward.toLocaleString()}`}
          color="#2563eb"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="給与反映予定"
          value={`¥${pointReward.toLocaleString()}`}
          sub="ポイント報酬分（確定前）"
          color="#7c3aed"
          icon={<BarChart3 size={16} />}
        />
        <StatCard
          label="進行中タスク"
          value={`${activeTotal} 件`}
          sub={`今月完了 ${completedThisMonth} 件`}
          color="#059669"
          icon={<Clock size={16} />}
        />
        <StatCard
          label="平均進捗率"
          value={`${avgProgress}%`}
          sub="進行中タスク平均"
          color="#f59e0b"
          icon={<ShoppingBag size={16} />}
        />
      </div>

      {/* タスク一覧 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700">進行中のタスク</h2>
          <Link href="/tasks" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            すべて見る <ChevronRight size={12} />
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
            <p className="text-slate-400 text-sm">進行中のタスクはありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeTasks.map((task) => {
              const progressColor = getProgressColor(task.progress);
              const progressLabel = getProgressLabel(task.progress);
              const dueDate = task.dueDate ? new Date(task.dueDate) : null;
              const diffDays = dueDate
                ? Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
                : null;
              const isOverdue = diffDays !== null && diffDays < 0;
              const isDueSoon = diffDays !== null && diffDays >= 0 && diffDays <= 2;

              return (
                <div key={task.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group">

                  {/* ヘッダー */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {task.points} pt
                    </span>
                  </div>

                  {/* タイトル */}
                  <h3 className="font-bold text-slate-800 text-sm mb-3 group-hover:text-blue-700 transition-colors">
                    {task.title}
                  </h3>

                  {/* 進捗 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-medium" style={{ color: progressColor }}>
                        {progressLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{task.progress}%</span>
                    </div>
                    <ProgressBar value={task.progress} color={progressColor} />
                  </div>

                  {/* スコア内訳 */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    <ScorePill label="難" value={task.difficulty} />
                    <ScorePill label="工" value={task.effort} />
                    <ScorePill label="貢" value={task.contribution} />
                    <ScorePill label="品" value={task.qualityRisk} />
                  </div>

                  {/* 期限・担当 */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock size={11} />
                      {task.assignee}
                    </span>
                    {diffDays !== null ? (
                      <span className={`font-semibold ${isOverdue ? "text-red-600" : isDueSoon ? "text-orange-500" : "text-slate-500"}`}>
                        {isOverdue ? `${Math.abs(diffDays)}日超過` : `残 ${diffDays}日`}
                      </span>
                    ) : (
                      <span className="text-slate-400">期限未設定</span>
                    )}
                  </div>

                  {/* 詳細ボタン */}
                  <Link href={`/tasks/${task.id}`}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                    詳細を見る <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* タスクマーケット案内 */}
      <div className="rounded-2xl p-5 border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">タスクマーケット</h3>
              {openMarketCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {openMarketCount}件 募集中
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              他のメンバーが出品したタスクを引き受けて、ポイントを獲得できます。
            </p>
          </div>
          <Link href="/task-market"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
            マーケットを見る <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
