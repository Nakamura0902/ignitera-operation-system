import Link from "next/link";
import { MessageSquare, ArrowRight, FolderKanban, CheckSquare, TrendingUp } from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";

// KPIは常に最新を取得する
export const dynamic = "force-dynamic";

async function fetchCounts() {
  const [{ count: total }, { count: unhandled }] = await Promise.all([
    adminSupabase.from("line_customers").select("id", { count: "exact", head: true }),
    adminSupabase.from("line_customers").select("id", { count: "exact", head: true }).eq("status", "未対応"),
  ]);
  return { total: total ?? 0, unhandled: unhandled ?? 0 };
}

export default async function CommandCenterPage() {
  const { total, unhandled } = await fetchCounts();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          IGNITERAの事業支援オペレーションを一元管理する司令センターです。
        </p>
      </div>

      {/* 稼働中モジュール */}
      <Link
        href="/command-center/line-customers"
        className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(201,168,106,0.14)" }}>
              <MessageSquare size={20} style={{ color: "#b08d57" }} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">LINE顧客管理</p>
              <p className="text-sm text-slate-500 mt-0.5">LINE・フォームから入った相談者を管理します。</p>
              <div className="flex gap-5 mt-3">
                <div>
                  <p className="text-2xl font-bold text-slate-800">{total}</p>
                  <p className="text-[11px] text-slate-400">総リード数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "#b08d57" }}>{unhandled}</p>
                  <p className="text-[11px] text-slate-400">未対応</p>
                </div>
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 mt-1 shrink-0" />
        </div>
      </Link>

      {/* Coming Soon */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Coming Soon</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: FolderKanban, label: "案件管理", desc: "受注案件の進行を管理" },
            { icon: CheckSquare, label: "タスク管理", desc: "社内タスクの割当と進捗" },
            { icon: TrendingUp, label: "売上管理", desc: "月次売上と請求の可視化" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 opacity-70">
              <Icon size={18} className="text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-600">{label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
              <span className="inline-block mt-3 text-[10px] text-slate-400 border border-slate-200 rounded px-2 py-0.5">
                準備中
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
