import Link from "next/link";
import {
  ClipboardList, FileText, BookOpen, ArrowRight, CheckCircle2, Clock,
} from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";

const docTypeLabels: Record<string, string> = {
  procedure: "手順書",
  template: "テンプレート",
  manual: "マニュアル",
  meeting_minutes: "議事録",
  proposal: "提案書",
  checklist: "チェックリスト",
};

const docTypeColors: Record<string, string> = {
  manual: "bg-blue-100 text-blue-700",
  template: "bg-purple-100 text-purple-700",
  meeting_minutes: "bg-amber-100 text-amber-700",
  procedure: "bg-emerald-100 text-emerald-700",
  proposal: "bg-orange-100 text-orange-700",
  checklist: "bg-slate-100 text-slate-600",
};

interface DocRow {
  id: string; title: string; type: string; typeLabel: string;
  department: string; updatedAt: string; author: string;
}

async function fetchOperationsData() {
  const { data: opsDept } = await adminSupabase
    .from("departments")
    .select("id")
    .eq("name", "operations")
    .single();

  const [{ data: documents }, { count: totalDocs }, { count: aiDocs }] = await Promise.all([
    adminSupabase
      .from("documents")
      .select(`
        id, title, type, updated_at,
        departments (display_name),
        users!documents_created_by_fkey (full_name)
      `)
      .order("updated_at", { ascending: false })
      .limit(10),
    adminSupabase
      .from("documents")
      .select("*", { count: "exact", head: true }),
    adminSupabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("is_ai_generated", true)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const docRows: DocRow[] = (documents ?? []).map((doc) => {
    const dept = doc.departments as { display_name?: string } | null;
    const user = doc.users as { full_name?: string } | null;
    return {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      typeLabel: docTypeLabels[doc.type] ?? doc.type,
      department: dept?.display_name ?? "全社",
      updatedAt: new Date(doc.updated_at).toLocaleDateString("ja-JP"),
      author: user?.full_name ?? "不明",
    };
  });

  return { docRows, totalDocs: totalDocs ?? 0, aiDocs: aiDocs ?? 0 };
}

const sopItems = [
  { title: "新メンバーオンボーディング手順", step: 8, completed: 8, status: "完了" as const, dept: "全社" },
  { title: "タスク提出・確認フロー", step: 5, completed: 5, status: "完了" as const, dept: "全社" },
  { title: "請求書発行フロー", step: 6, completed: 4, status: "進行中" as const, dept: "経理" },
  { title: "クライアント提案書作成手順", step: 7, completed: 3, status: "進行中" as const, dept: "営業" },
];

export default async function OperationsPage() {
  const { docRows, totalDocs, aiDocs } = await fetchOperationsData();

  const sopCompleted = sopItems.filter((s) => s.status === "完了").length;
  const sopPct = sopItems.length > 0 ? Math.round((sopCompleted / sopItems.length) * 100) : 0;

  const meetingMinutes = docRows.filter((d) => d.type === "meeting_minutes").slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList size={20} className="text-violet-600" /> 事務・オペレーションダッシュボード
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">社内ドキュメント・SOP・議事録の管理</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "ドキュメント総数", value: `${totalDocs}件`, sub: "登録済みドキュメント", color: "#2563eb" },
          { label: "SOP完了率", value: `${sopPct}%`, sub: `${sopCompleted}/${sopItems.length} が完了`, color: "#059669" },
          { label: "議事録", value: `${meetingMinutes.length}件`, sub: "最近の議事録", color: "#f59e0b" },
          { label: "AI作成文書", value: `${aiDocs}件`, sub: "今月の自動生成", color: "#7c3aed" },
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

          {/* ドキュメント一覧 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <FileText size={15} className="text-blue-600" /> 最新ドキュメント
            </h2>
            {docRows.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">ドキュメントがありません</p>
            ) : (
              <div className="space-y-2">
                {docRows.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{doc.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{doc.department} · 更新: {doc.updatedAt} · 作成: {doc.author}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${docTypeColors[doc.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {doc.typeLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SOP管理 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <BookOpen size={15} className="text-amber-600" /> SOP（標準作業手順書）管理
            </h2>
            <div className="space-y-3">
              {sopItems.map((sop) => {
                const pct = Math.round((sop.completed / sop.step) * 100);
                return (
                  <div key={sop.title} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    {sop.status === "完了"
                      ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      : <Clock size={16} className="text-amber-500 shrink-0" />
                    }
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{sop.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{sop.dept} · {sop.completed}/{sop.step}ステップ完了</p>
                    </div>
                    <div className="w-24">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500">{pct}%</span>
                        <span className={`text-[10px] font-medium ${sop.status === "完了" ? "text-emerald-600" : "text-amber-600"}`}>{sop.status}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full">
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: sop.status === "完了" ? "#10b981" : "#f59e0b" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右パネル */}
        <div className="space-y-5">
          {/* 事務AIサマリー */}
          <div className="rounded-2xl p-5 border border-purple-200"
            style={{ background: "linear-gradient(135deg, #f5f3ff, #eff6ff)" }}>
            <h2 className="text-sm font-bold text-slate-700 mb-3">事務AIサマリー</h2>
            <div className="flex items-start gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
              <p className="text-xs text-slate-600">ドキュメント総数 {totalDocs}件 · AI生成 {aiDocs}件</p>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
              <p className="text-xs text-slate-600">SOP完了率 {sopPct}% — 未完了の手順書の更新を推奨します</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
              <p className="text-xs text-slate-600">最新ドキュメントを確認し、チームに共有してください</p>
            </div>
          </div>

          {/* 直近の議事録 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <FileText size={14} className="text-slate-500" /> 直近の議事録
            </h2>
            {meetingMinutes.length > 0 ? (
              <div className="space-y-2">
                {meetingMinutes.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <FileText size={12} className="text-slate-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-700">{doc.title}</p>
                      <p className="text-[10px] text-slate-400">{doc.updatedAt} · {doc.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">議事録データなし</p>
            )}
          </div>

          <Link href="/ai-secretary"
            className="flex items-center justify-between p-4 bg-violet-600 rounded-2xl text-white hover:bg-violet-700 transition-colors">
            <span className="text-sm font-bold">AI秘書に指示する</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
