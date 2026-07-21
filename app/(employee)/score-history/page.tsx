import { getQualityLabel, getQualityColor } from "@/lib/status-utils";
import { Star, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";

interface EvaluationEntry {
  id: string; taskTitle: string; qualityRating: string; qualityCoefficient: number;
  provisionalPoints: number; confirmedPoints: number; evaluator: string;
  completedAt: string; comment?: string;
}
interface MonthlyPoint { month: string; points: number; }

async function fetchScoreHistory(userId: string) {
  const now = new Date();

  // 過去6ヶ月分の月ラベルを生成
  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: `${d.getMonth() + 1}月`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const [scoresResult, historyResult] = await Promise.all([
    // 評価済みtask_scores (confirmed or approved)
    adminSupabase
      .from("task_scores")
      .select(`
        id, provisional_total, confirmed_total, quality_coefficient, status,
        tasks!inner ( id, title, due_date, assigned_to ),
        users!task_scores_reviewed_by_fkey ( full_name )
      `)
      .in("status", ["approved"])
      .eq("tasks.assigned_to", userId),

    // score_historyをconfirmedタイプで取得（月別集計用）
    adminSupabase
      .from("score_history")
      .select("id, points_before, points_after, score_type, created_at")
      .eq("user_id", userId)
      .eq("score_type", "confirmed")
      .gte("created_at", sixMonthsAgo)
      .order("created_at", { ascending: true }),
  ]);

  // 評価一覧を整形
  const evaluationHistory: EvaluationEntry[] = (scoresResult.data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = row.tasks as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewer = row.users as any;
    const coefficient = Number(row.quality_coefficient ?? 1.0);
    const rating =
      coefficient >= 1.2 ? "excellent" :
      coefficient >= 1.0 ? "good" :
      coefficient >= 0.8 ? "minor_revision" : "major_revision";

    return {
      id: row.id,
      taskTitle: task?.title ?? "不明なタスク",
      qualityRating: rating,
      qualityCoefficient: coefficient,
      provisionalPoints: row.provisional_total ?? 0,
      confirmedPoints: row.confirmed_total ?? 0,
      evaluator: reviewer?.full_name ?? "管理者",
      completedAt: task?.due_date?.slice(0, 10) ?? "—",
    };
  });

  // 月別ポイント集計
  const historyRows = (historyResult.data ?? []) as {
    points_before: number; points_after: number; created_at: string;
  }[];

  const monthlyPointHistory: MonthlyPoint[] = months.map(({ label, year, month }) => {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const total = historyRows
      .filter((r) => r.created_at.startsWith(monthStr))
      .reduce((sum, r) => sum + (r.points_after - r.points_before), 0);
    return { month: label, points: Math.max(0, total) };
  });

  return { evaluationHistory, monthlyPointHistory };
}

export default async function ScoreHistoryPage() {
  const user = await getCurrentUser();
  const { evaluationHistory, monthlyPointHistory } = await fetchScoreHistory(user.id);

  const totalConfirmed = evaluationHistory.reduce((acc, e) => acc + e.confirmedPoints, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">評価履歴</h1>
        <p className="text-slate-500 text-sm mt-0.5">完了済みタスクの評価・確定ポイント一覧</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">評価済みタスク数</p>
          <p className="text-2xl font-bold text-slate-800">{evaluationHistory.length} 件</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">確定ポイント合計</p>
          <p className="text-2xl font-bold text-blue-600">{totalConfirmed.toLocaleString()} pt</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">平均品質係数</p>
          <p className="text-2xl font-bold text-emerald-600">
            {evaluationHistory.length > 0
              ? (evaluationHistory.reduce((a, e) => a + e.qualityCoefficient, 0) / evaluationHistory.length).toFixed(2)
              : "—"
            }
          </p>
        </div>
      </div>

      {/* 評価一覧 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">評価済みタスク一覧</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {evaluationHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">評価済みタスクはまだありません</p>
          ) : evaluationHistory.map((ev) => (
            <div key={ev.id} className="p-5 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                {/* 評価アイコン */}
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${getQualityColor(ev.qualityRating)}`}>
                  <Star size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-sm">{ev.taskTitle}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getQualityColor(ev.qualityRating)}`}>
                      {getQualityLabel(ev.qualityRating)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>評価者: {ev.evaluator}</span>
                    <span>完了: {ev.completedAt}</span>
                  </div>
                  {ev.comment && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2 italic">
                      「{ev.comment}」
                    </p>
                  )}
                </div>

                {/* ポイント */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <span className="text-xs text-slate-400 line-through">{ev.provisionalPoints} pt</span>
                    <span className="text-xs text-slate-400">→</span>
                    <span className="text-lg font-bold text-blue-600">{ev.confirmedPoints} pt</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs">
                    <span className="text-slate-400">×</span>
                    <span className={`font-bold ${
                      ev.qualityCoefficient >= 1.2 ? "text-emerald-600" :
                      ev.qualityCoefficient >= 1.0 ? "text-blue-600" :
                      ev.qualityCoefficient >= 0.8 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {ev.qualityCoefficient.toFixed(1)}
                    </span>
                    <span className="text-slate-400">（品質係数）</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ポイント推移 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-600" />
          月別ポイント推移
        </h2>
        <div className="grid grid-cols-6 gap-1.5 sm:gap-3">
          {monthlyPointHistory.map((d, i) => {
            const max = Math.max(...monthlyPointHistory.map((x) => x.points), 1);
            const isLast = i === monthlyPointHistory.length - 1;
            const pct = (d.points / max) * 100;
            return (
              <div key={d.month} className="text-center">
                <p className="text-sm font-bold mb-2" style={{ color: isLast ? "#2563eb" : "#94a3b8" }}>
                  {d.points.toLocaleString()}
                </p>
                <div className="h-24 bg-slate-50 rounded-lg overflow-hidden flex items-end">
                  <div className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${pct}%`,
                      background: isLast ? "linear-gradient(180deg,#2563eb,#7c3aed)" : "#e2e8f0",
                      minHeight: 4,
                    }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{d.month}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
