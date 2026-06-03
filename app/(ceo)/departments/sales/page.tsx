import Link from "next/link";
import {
  TrendingUp, AlertTriangle, ArrowRight, ChevronRight,
  Flame, Wind, Thermometer,
} from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";
import { getTemperatureColor, getTemperatureLabel } from "@/lib/status-utils";

const stageLabelMap: Record<string, string> = {
  initial: "初回接触",
  meeting: "商談中",
  proposal: "提案済み",
  negotiation: "交渉中",
  closed_won: "受注",
  closed_lost: "失注",
};

const stageOrder = ["initial", "meeting", "proposal", "negotiation", "closed_won"];

interface Lead {
  id: string;
  company: string;
  contact: string;
  assignee: string;
  temperature: "hot" | "warm" | "cold";
  stage: string;
  stageLabel: string;
  amount: number;
  probability: number;
  nextAction: string;
}

function TempIcon({ temperature }: { temperature: "hot" | "warm" | "cold" }) {
  if (temperature === "hot") return <Flame size={12} className="text-red-500" />;
  if (temperature === "warm") return <Thermometer size={12} className="text-orange-500" />;
  return <Wind size={12} className="text-blue-400" />;
}

async function fetchLeads(): Promise<Lead[]> {
  const { data } = await adminSupabase
    .from("leads")
    .select(`
      id,
      company_name,
      contact_name,
      temperature,
      stage,
      next_action,
      users!leads_assigned_to_fkey (full_name)
    `)
    .not("stage", "in", '("closed_won","closed_lost")')
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const user = row.users as { full_name?: string } | null;
    const probMap: Record<string, Record<string, number>> = {
      hot: { initial: 40, meeting: 60, proposal: 75, negotiation: 85 },
      warm: { initial: 20, meeting: 40, proposal: 55, negotiation: 70 },
      cold: { initial: 10, meeting: 25, proposal: 40, negotiation: 55 },
    };
    const temp = (row.temperature as "hot" | "warm" | "cold") ?? "cold";
    const stage = row.stage ?? "initial";
    const probability = probMap[temp]?.[stage] ?? 30;

    return {
      id: row.id,
      company: row.company_name,
      contact: row.contact_name ?? "",
      assignee: user?.full_name ?? "未設定",
      temperature: temp,
      stage,
      stageLabel: stageLabelMap[stage] ?? stage,
      amount: 0,
      probability,
      nextAction: row.next_action ?? "次回アクション未設定",
    };
  });
}

export default async function SalesDashboardPage() {
  const salesPipeline = await fetchLeads();

  const totalPipeline = salesPipeline.reduce((s, l) => s + l.amount, 0);
  const totalExpected = salesPipeline.reduce((s, l) => s + l.amount * (l.probability / 100), 0);
  const hotCount = salesPipeline.filter((l) => l.temperature === "hot").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" /> 営業ダッシュボード
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">営業パイプラインと商談状況の一覧</p>
        </div>
        <span className="text-[10px] px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full font-semibold">
          🔥 ホット案件 {hotCount}件
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "パイプライン合計", value: `¥${(totalPipeline / 10000).toFixed(0)}万`, sub: "全商談の合計金額", color: "#2563eb" },
          { label: "期待収益（加重）", value: `¥${(totalExpected / 10000).toFixed(0)}万`, sub: "確率加重後", color: "#059669" },
          { label: "ホット案件", value: `${hotCount}件`, sub: "高確率の商談", color: "#ef4444" },
          { label: "進行中商談", value: `${salesPipeline.length}件`, sub: "全アクティブ商談", color: "#f59e0b" },
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

          {/* パイプラインテーブル */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">商談パイプライン</h2>
            {salesPipeline.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">進行中の商談はありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="text-left pb-3 font-medium">企業名</th>
                      <th className="text-left pb-3 font-medium">担当</th>
                      <th className="text-left pb-3 font-medium">温度感</th>
                      <th className="text-left pb-3 font-medium">フェーズ</th>
                      <th className="text-right pb-3 font-medium">確率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesPipeline.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3">
                          <p className="font-medium text-slate-800">{lead.company}</p>
                          <p className="text-[11px] text-slate-400">{lead.contact}</p>
                        </td>
                        <td className="py-3 text-xs text-slate-600">{lead.assignee}</td>
                        <td className="py-3">
                          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit ${getTemperatureColor(lead.temperature)}`}>
                            <TempIcon temperature={lead.temperature} />
                            {getTemperatureLabel(lead.temperature)}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {stageOrder.map((s, i) => (
                              <div key={s} className={`h-1.5 flex-1 rounded-full ${
                                stageOrder.indexOf(lead.stage) >= i ? "bg-emerald-500" : "bg-slate-200"
                              }`} />
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{lead.stageLabel}</p>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`text-sm font-bold ${lead.probability >= 60 ? "text-emerald-600" : lead.probability >= 40 ? "text-amber-600" : "text-slate-500"}`}>
                            {lead.probability}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* フォロー推奨 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={15} className="text-orange-500" /> AIのフォロー推奨
            </h2>
            {salesPipeline.filter((l) => l.temperature === "hot").length > 0 ? (
              <div className="space-y-3">
                {salesPipeline.filter((l) => l.temperature === "hot").slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-start gap-3 p-4 rounded-xl border bg-red-50 border-red-200">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 mb-0.5">{lead.company}</p>
                      <p className="text-xs text-slate-600">{lead.nextAction}</p>
                      <p className="text-[10px] text-slate-400 mt-1">担当: {lead.assignee} · {lead.stageLabel}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">ホット案件はありません</p>
            )}
          </div>
        </div>

        {/* 右パネル */}
        <div className="space-y-5">
          {/* 今週のアクション */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">今週の必須アクション</h2>
            {salesPipeline.slice(0, 3).length > 0 ? (
              <div className="space-y-2">
                {salesPipeline.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs font-bold text-slate-800 mb-0.5">{lead.company}</p>
                    <p className="text-[10px] text-slate-500">{lead.nextAction}</p>
                    <p className="text-[10px] text-slate-400 mt-1">担当: {lead.assignee}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">商談データがありません</p>
            )}
          </div>

          {/* 温度感サマリー */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">温度感サマリー</h2>
            <div className="space-y-2">
              {(["hot", "warm", "cold"] as const).map((temp) => {
                const count = salesPipeline.filter((l) => l.temperature === temp).length;
                return (
                  <div key={temp} className="flex items-center gap-3 p-2">
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-24 ${getTemperatureColor(temp)}`}>
                      {temp === "hot" ? <Flame size={11} /> : temp === "warm" ? <Thermometer size={11} /> : <Wind size={11} />}
                      {getTemperatureLabel(temp)}
                    </span>
                    <span className="text-sm font-bold text-slate-700">{count}件</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Link href="/approval-center"
            className="flex items-center justify-between p-4 bg-emerald-600 rounded-2xl text-white hover:bg-emerald-700 transition-colors">
            <span className="text-sm font-bold">承認センターへ</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
