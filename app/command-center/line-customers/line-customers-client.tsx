"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ChevronRight } from "lucide-react";
import type { LineCustomer } from "@/types/line-customer";
import { STATUS_OPTIONS, TEMPERATURE_OPTIONS, PLAN_OPTIONS, statusBadgeClass, temperatureBadgeClass, planBadgeClass } from "@/lib/line-customer-utils";
import { formatJstDate } from "@/lib/format-date";

interface Kpi { total: number; unhandled: number; hot: number; reserved: number; proposing: number; }

function Badge({ text, className }: { text: string; className: string }) {
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border font-medium ${className}`}>{text}</span>;
}

export default function LineCustomersClient({ customers, kpi }: { customers: LineCustomer[]; kpi: Kpi }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [temp, setTemp] = useState("all");
  const [plan, setPlan] = useState("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesQuery =
        query === "" ||
        c.name.toLowerCase().includes(query) ||
        (c.company_name ?? "").toLowerCase().includes(query) ||
        (c.industry ?? "").toLowerCase().includes(query);
      const matchesStatus = status === "all" || c.status === status;
      const matchesTemp = temp === "all" || c.temperature === temp;
      const matchesPlan = plan === "all" || c.estimated_plan === plan;
      return matchesQuery && matchesStatus && matchesTemp && matchesPlan;
    });
  }, [customers, q, status, temp, plan]);

  const kpiCards = [
    { label: "総リード数", value: kpi.total, color: "#0f1b3a" },
    { label: "未対応", value: kpi.unhandled, color: "#b08d57" },
    { label: "高温度", value: kpi.hot, color: "#e11d48" },
    { label: "相談予約済", value: kpi.reserved, color: "#4f46e5" },
    { label: "提案中", value: kpi.proposing, color: "#d97706" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users size={20} style={{ color: "#b08d57" }} /> LINE顧客管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">LINE・フォームから入った相談者を管理します。</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* フィルタ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・会社名・業種で検索"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#b08d57]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FilterSelect label="ステータス" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <FilterSelect label="温度感" value={temp} onChange={setTemp} options={TEMPERATURE_OPTIONS} />
          <FilterSelect label="検討プラン" value={plan} onChange={setPlan} options={PLAN_OPTIONS} />
        </div>
      </div>

      {/* 空状態 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <p className="text-sm text-slate-400">
            {customers.length === 0 ? "まだ相談者はいません。フォームから登録されるとここに表示されます。" : "条件に一致する相談者はいません。"}
          </p>
        </div>
      ) : (
        <>
          {/* テーブル（デスクトップ） */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-slate-400 bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3 pl-4 font-medium">登録日</th>
                  <th className="text-left py-3 font-medium">名前</th>
                  <th className="text-left py-3 font-medium">会社名</th>
                  <th className="text-left py-3 font-medium">業種</th>
                  <th className="text-left py-3 font-medium">相談種別</th>
                  <th className="text-left py-3 font-medium">検討プラン</th>
                  <th className="text-left py-3 font-medium">温度感</th>
                  <th className="text-left py-3 font-medium">ステータス</th>
                  <th className="text-left py-3 font-medium">担当者</th>
                  <th className="text-left py-3 pr-4 font-medium">次回対応</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id}
                    onClick={() => router.push(`/command-center/line-customers/${c.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="py-3 pl-4 text-xs text-slate-500 whitespace-nowrap">{formatJstDate(c.created_at)}</td>
                    <td className="py-3 font-medium text-slate-800 whitespace-nowrap">{c.name}</td>
                    <td className="py-3 text-slate-600 whitespace-nowrap">{c.company_name ?? "—"}</td>
                    <td className="py-3 text-slate-500 whitespace-nowrap">{c.industry ?? "—"}</td>
                    <td className="py-3 text-xs text-slate-500 whitespace-nowrap">{c.form_type}</td>
                    <td className="py-3"><Badge text={c.estimated_plan} className={planBadgeClass(c.estimated_plan)} /></td>
                    <td className="py-3"><Badge text={c.temperature} className={temperatureBadgeClass(c.temperature)} /></td>
                    <td className="py-3"><Badge text={c.status} className={statusBadgeClass(c.status)} /></td>
                    <td className="py-3 text-slate-600 whitespace-nowrap">{c.assignee ?? "—"}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs max-w-[160px] truncate">{c.next_action ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* カード（モバイル） */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <button key={c.id}
                onClick={() => router.push(`/command-center/line-customers/${c.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-[#d8c39c] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.company_name ?? "—"}・{c.industry ?? "—"}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge text={c.status} className={statusBadgeClass(c.status)} />
                  <Badge text={c.temperature} className={temperatureBadgeClass(c.temperature)} />
                  <Badge text={c.estimated_plan} className={planBadgeClass(c.estimated_plan)} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">{c.form_type}・{formatJstDate(c.created_at)}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-slate-400 text-right">{filtered.length} / {customers.length} 件</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#b08d57]">
      <option value="all">{label}：すべて</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
