import Link from "next/link";
import { FolderKanban, AlertTriangle, ArrowRight, CheckCircle2, Clock, Pause } from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";

interface ProjectRow {
  id: string; name: string; client: string; assignee: string;
  progress: number; amount: number; daysLeft: number; status: string; dueDate: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "進行中", cls: "bg-emerald-100 text-emerald-700" },
    on_hold: { label: "保留中", cls: "bg-blue-100 text-blue-700" },
    cancelled: { label: "キャンセル", cls: "bg-red-100 text-red-700" },
    completed: { label: "完了", cls: "bg-slate-100 text-slate-600" },
  };
  const v = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.cls}`}>{v.label}</span>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "active") return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === "on_hold") return <Clock size={14} className="text-blue-500" />;
  return <Pause size={14} className="text-slate-400" />;
}

async function fetchProjects(): Promise<ProjectRow[]> {
  const { data } = await adminSupabase
    .from("projects")
    .select(`
      id, name, status, budget, due_date,
      clients (company_name),
      users!projects_lead_member_id_fkey (full_name),
      tasks (progress_rate)
    `)
    .neq("status", "completed")
    .order("due_date", { ascending: true });

  const now = new Date();

  return (data ?? []).map((p) => {
    const client = p.clients as { company_name?: string } | null;
    const lead = p.users as { full_name?: string } | null;
    const tasks = p.tasks as { progress_rate?: number }[] | null;

    const dueDate = p.due_date ? new Date(p.due_date) : null;
    const daysLeft = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const avgProgress = tasks && tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + (t.progress_rate ?? 0), 0) / tasks.length)
      : 0;

    return {
      id: p.id,
      name: p.name,
      client: client?.company_name ?? "未設定",
      assignee: lead?.full_name ?? "未設定",
      progress: avgProgress,
      amount: Number(p.budget ?? 0),
      daysLeft,
      status: p.status,
      dueDate: p.due_date ?? "",
    };
  });
}

export default async function ProjectsDashboardPage() {
  const projects = await fetchProjects();

  const totalRevenue = projects.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const urgentCount = projects.filter((p) => p.daysLeft <= 3 && p.daysLeft > 0).length;
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderKanban size={20} className="text-amber-600" /> 案件ダッシュボード
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">全案件の進捗・リスク・売上予測を一覧</p>
        </div>
        {urgentCount > 0 && (
          <span className="text-[10px] px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full font-semibold">
            ⚠ 期日迫る案件 {urgentCount}件
          </span>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "進行中案件", value: `${projects.length}件`, sub: "アクティブ案件", color: "#2563eb" },
          { label: "案件合計金額", value: `¥${(totalRevenue / 10000).toFixed(0)}万`, sub: "受注金額合計", color: "#059669" },
          { label: "期日迫る案件", value: `${urgentCount}件`, sub: "残3日以内", color: "#ef4444" },
          { label: "平均進捗率", value: `${avgProgress}%`, sub: "全案件タスクの平均", color: "#7c3aed" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* 案件テーブル */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 mb-5">案件一覧</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">進行中の案件はありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-3 font-medium w-8"></th>
                  <th className="text-left pb-3 font-medium">案件名</th>
                  <th className="text-left pb-3 font-medium">担当</th>
                  <th className="text-left pb-3 font-medium w-36">進捗</th>
                  <th className="text-left pb-3 font-medium">期日</th>
                  <th className="text-right pb-3 font-medium">金額</th>
                  <th className="text-center pb-3 font-medium">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3"><StatusIcon status={p.status} /></td>
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-400">{p.client}</p>
                    </td>
                    <td className="py-3 text-xs text-slate-600">{p.assignee}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${p.progress}%`,
                              background: p.progress >= 80 ? "#10b981" : "#2563eb",
                            }} />
                        </div>
                        <span className="text-xs text-slate-600 w-8 text-right">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <p className="text-xs text-slate-600">{p.dueDate}</p>
                      {p.daysLeft !== 999 && (
                        <p className={`text-[10px] font-medium ${p.daysLeft <= 3 ? "text-red-600" : p.daysLeft <= 7 ? "text-orange-500" : "text-slate-400"}`}>
                          残{p.daysLeft}日
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-800">
                      {p.amount > 0 ? `¥${(p.amount / 10000).toFixed(0)}万` : "—"}
                    </td>
                    <td className="py-3 text-center"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 下段 2カラム */}
      <div className="grid grid-cols-2 gap-6">
        {/* 要注意案件 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" /> 要注意案件
          </h2>
          {projects.filter((p) => p.daysLeft <= 7 && p.daysLeft > 0).length > 0 ? (
            <div className="space-y-3">
              {projects.filter((p) => p.daysLeft <= 7 && p.daysLeft > 0).map((p) => (
                <div key={p.id} className={`p-3 rounded-xl border ${
                  p.daysLeft <= 3 ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"
                }`}>
                  <p className="text-sm font-bold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.client} · 残{p.daysLeft}日 · {p.progress}%完了</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">要注意案件はありません</p>
          )}
          <Link href="/approval-center"
            className="mt-4 flex items-center justify-between p-3 bg-amber-600 rounded-xl text-white hover:bg-amber-700 transition-colors text-sm font-bold">
            承認センターへ <ArrowRight size={14} />
          </Link>
        </div>

        {/* AI サマリー */}
        <div className="rounded-2xl p-5 border border-purple-200"
          style={{ background: "linear-gradient(135deg, #f5f3ff, #eff6ff)" }}>
          <h2 className="text-sm font-bold text-slate-700 mb-3">案件管理AIのサマリー</h2>
          {projects.length > 0 ? (
            <>
              <div className="flex items-start gap-2 mb-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <p className="text-xs text-slate-600">進行中案件 {projects.length}件 · 平均進捗 {avgProgress}%</p>
              </div>
              {urgentCount > 0 && (
                <div className="flex items-start gap-2 mb-2">
                  <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <p className="text-xs text-slate-600">期日まで3日以内の案件が {urgentCount}件あります。優先確認を推奨します</p>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <p className="text-xs text-slate-600">受注金額合計 ¥{(totalRevenue / 10000).toFixed(0)}万</p>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">案件データがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
