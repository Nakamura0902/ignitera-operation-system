import Link from "next/link";
import {
  Code2, GitPullRequest, Rocket, AlertTriangle, ChevronRight,
  CheckCircle2, Clock, ArrowRight,
} from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";

async function fetchDevelopmentData() {
  const { data: devDept } = await adminSupabase
    .from("departments")
    .select("id")
    .eq("name", "development")
    .single();

  if (!devDept) return { devTasks: [], projects: [] };

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    adminSupabase
      .from("tasks")
      .select(`
        id, title, priority, status, progress_rate,
        users!tasks_assigned_to_fkey (full_name)
      `)
      .eq("department_id", devDept.id)
      .neq("status", "completed")
      .order("priority", { ascending: false })
      .limit(8),
    adminSupabase
      .from("projects")
      .select(`
        id, name, status, budget, due_date,
        clients (company_name),
        users!projects_lead_member_id_fkey (full_name)
      `)
      .eq("department_id", devDept.id)
      .neq("status", "completed")
      .order("due_date", { ascending: true }),
  ]);

  const now = new Date();

  const devTasks = (tasks ?? []).map((t) => {
    const user = t.users as { full_name?: string } | null;
    return {
      id: t.id,
      title: t.title,
      assignee: user?.full_name ?? "未設定",
      progress: t.progress_rate,
      priority: t.priority,
      status: t.status,
    };
  });

  const projectRows = (projects ?? []).map((p) => {
    const client = p.clients as { company_name?: string } | null;
    const lead = p.users as { full_name?: string } | null;
    const dueDate = p.due_date ? new Date(p.due_date) : null;
    const daysLeft = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    return {
      id: p.id,
      name: p.name,
      client: client?.company_name ?? "未設定",
      assignee: lead?.full_name ?? "未設定",
      daysLeft,
      dueDate: p.due_date ?? "",
      amount: Number(p.budget ?? 0),
      status: p.status,
    };
  });

  return { devTasks, projects: projectRows };
}

export default async function DevelopmentPage() {
  const { devTasks, projects } = await fetchDevelopmentData();

  const urgentCount = devTasks.filter((t) => t.priority === "urgent").length;
  const totalBudget = projects.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Code2 size={20} className="text-blue-600" /> 開発ダッシュボード
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">開発部の進捗・案件状況を一覧</p>
        </div>
        {urgentCount > 0 && (
          <span className="text-[10px] px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-full font-semibold">
            ⚠ 緊急タスク {urgentCount}件
          </span>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "進行中タスク", value: `${devTasks.length}件`, sub: "未完了タスク数", color: "#2563eb" },
          { label: "緊急タスク", value: `${urgentCount}件`, sub: "即対応が必要", color: "#f59e0b" },
          { label: "案件予算合計", value: `¥${(totalBudget / 10000).toFixed(0)}万`, sub: "開発案件合計", color: "#059669" },
          { label: "GitHub PR / デプロイ", value: "連携なし", sub: "GitHub連携が必要です", color: "#7c3aed" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">

          {/* スプリントタスク */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Code2 size={15} className="text-blue-600" /> 進行中タスク
            </h2>
            {devTasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">進行中のタスクはありません</p>
            ) : (
              <div className="space-y-3">
                {devTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          task.priority === "urgent" ? "bg-red-100 text-red-700" :
                          task.priority === "high" ? "bg-orange-100 text-orange-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {task.priority === "urgent" ? "緊急" : task.priority === "high" ? "高" : "通常"}
                        </span>
                        <p className="text-sm font-medium text-slate-800">{task.title}</p>
                      </div>
                      <p className="text-xs text-slate-400">担当: {task.assignee}</p>
                    </div>
                    <div className="w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">{task.progress}%</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          task.status === "review" ? "bg-blue-100 text-blue-700" :
                          task.status === "in_progress" ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {task.status === "review" ? "レビュー中" :
                           task.status === "in_progress" ? "進行中" : "未着手"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 案件テーブル */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">開発案件の進捗</h2>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">進行中の案件はありません</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                        {p.daysLeft <= 3 && p.daysLeft > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">残{p.daysLeft}日</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{p.client} · 担当: {p.assignee}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{p.dueDate}</p>
                      {p.amount > 0 && (
                        <p className="text-sm font-bold text-slate-700 mt-0.5">¥{(p.amount / 10000).toFixed(0)}万</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右パネル */}
        <div className="space-y-5">
          {/* PR / デプロイ — データなし */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <GitPullRequest size={14} className="text-purple-600" /> Pull Request
            </h2>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-400">GitHub連携なし</p>
              <p className="text-[10px] text-slate-300 mt-1">GitHub APIとの連携が必要です</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Rocket size={14} className="text-blue-600" /> デプロイ状況
            </h2>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-400">GitHub連携なし</p>
              <p className="text-[10px] text-slate-300 mt-1">デプロイ履歴はGitHub Actionsとの連携後に表示されます</p>
            </div>
          </div>

          {/* 技術アラート */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-500" /> 技術アラート
            </h2>
            {projects.filter((p) => p.daysLeft <= 3 && p.daysLeft > 0).length > 0 ? (
              <div className="space-y-2">
                {projects.filter((p) => p.daysLeft <= 3 && p.daysLeft > 0).map((p) => (
                  <div key={p.id} className="flex items-start gap-2 p-3 rounded-xl border bg-red-50 border-red-200 text-xs text-red-700">
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    {p.name} — 残{p.daysLeft}日
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">アラートなし</p>
            )}
          </div>

          <Link href="/approval-center"
            className="flex items-center justify-between p-4 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 transition-colors">
            <span className="text-sm font-bold">承認センターへ</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
