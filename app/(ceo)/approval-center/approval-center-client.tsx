"use client";

import { useState } from "react";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  Receipt, Wallet, Star, ShoppingBag, FileText, FolderKanban,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getApprovalUrgencyColor, getApprovalUrgencyLabel } from "@/lib/status-utils";
import { approveItem, rejectItem } from "./actions";
import type { ApprovalItem } from "./page";

const typeIcons: Record<string, React.ReactNode> = {
  task_score: <Star size={14} className="text-amber-500" />,
  market: <ShoppingBag size={14} className="text-blue-500" />,
  invoice: <Receipt size={14} className="text-purple-500" />,
  payroll: <Wallet size={14} className="text-emerald-500" />,
  proposal: <FileText size={14} className="text-orange-500" />,
  project_policy: <FolderKanban size={14} className="text-slate-500" />,
  customer_send: <FileText size={14} className="text-blue-500" />,
};

const typeGroups = [
  { key: "all", label: "すべて" },
  { key: "task_score", label: "タスク点数" },
  { key: "market", label: "マーケット" },
  { key: "payroll", label: "給与反映" },
];

function ApprovalCard({
  item,
  onApprove,
  onReject,
  loading,
}: {
  item: ApprovalItem;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${
      item.urgency === "urgent" ? "border-red-200" :
      item.urgency === "high" ? "border-orange-200" : "border-slate-100"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          item.urgency === "urgent" ? "bg-red-50" :
          item.urgency === "high" ? "bg-orange-50" : "bg-slate-50"
        }`}>
          {typeIcons[item.type]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getApprovalUrgencyColor(item.urgency)}`}>
              {getApprovalUrgencyLabel(item.urgency)}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
              {item.typeLabel}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
          {item.amount && (
            <p className="text-sm font-bold text-blue-600 mt-1">¥{item.amount.toLocaleString()}</p>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            申請者: {item.submittedBy} · {item.submittedAt}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onApprove}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
            <CheckCircle2 size={12} /> 承認
          </button>
          <button
            onClick={onReject}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50">
            <XCircle size={12} /> 差し戻し
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">
            <Clock size={12} /> 保留
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalCenterClient({ initialItems, ceoId }: { initialItems: ApprovalItem[]; ceoId: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pending = initialItems.filter((item) => !processedIds.has(item.id));
  const filtered = filter === "all" ? pending : pending.filter((item) => item.type === filter);

  const urgentCount = pending.filter((i) => i.urgency === "urgent").length;
  const highCount = pending.filter((i) => i.urgency === "high").length;

  async function handleApprove(item: ApprovalItem) {
    setLoadingId(item.id);
    const result = await approveItem(item.type, item.id, ceoId);
    setLoadingId(null);
    if ("error" in result) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setProcessedIds((prev) => new Set([...prev, item.id]));
      setMessage("承認しました");
      router.refresh();
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleReject(item: ApprovalItem) {
    setLoadingId(item.id);
    const result = await rejectItem(item.type, item.id, ceoId);
    setLoadingId(null);
    if ("error" in result) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setProcessedIds((prev) => new Set([...prev, item.id]));
      setMessage("差し戻しました");
      router.refresh();
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleBulkApprove() {
    const lowPriority = filtered.filter((i) => i.urgency === "low" || i.urgency === "medium");
    for (const item of lowPriority) {
      setLoadingId(item.id);
      await approveItem(item.type, item.id, ceoId);
      setProcessedIds((prev) => new Set([...prev, item.id]));
    }
    setLoadingId(null);
    setMessage(`${lowPriority.length}件を一括承認しました`);
    router.refresh();
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* メッセージ */}
      {message && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl shadow-lg">
          {message}
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-600" /> 承認センター
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">全社の承認待ちアイテムを一元管理する社長専用ビュー</p>
        </div>
        <div className="flex gap-2">
          {urgentCount > 0 && (
            <span className="text-[10px] px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full font-bold flex items-center gap-1">
              <AlertTriangle size={10} /> 緊急 {urgentCount}件
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-full font-semibold">
              高優先 {highCount}件
            </span>
          )}
          <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold">
            残り {pending.length}件
          </span>
        </div>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-2 flex-wrap">
        {typeGroups.map((g) => {
          const count = g.key === "all"
            ? pending.length
            : pending.filter((i) => i.type === g.key).length;
          return (
            <button
              key={g.key}
              onClick={() => setFilter(g.key)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === g.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
              }`}>
              {g.label} {count > 0 && <span className={`ml-1 font-bold ${filter === g.key ? "text-blue-200" : "text-blue-600"}`}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* 承認カード一覧 */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {(["urgent", "high", "medium", "low"] as const).map((urgency) => {
            const items = filtered.filter((i) => i.urgency === urgency);
            if (items.length === 0) return null;
            return (
              <div key={urgency}>
                {urgency === "urgent" && (
                  <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                    <AlertTriangle size={11} /> 緊急対応
                  </p>
                )}
                {urgency === "high" && <p className="text-xs font-bold text-orange-600 mb-2">高優先</p>}
                {urgency === "medium" && <p className="text-xs font-bold text-slate-500 mb-2 mt-4">通常</p>}
                <div className="space-y-3">
                  {items.map((item) => (
                    <ApprovalCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item)}
                      onReject={() => handleReject(item)}
                      loading={loadingId === item.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100">
          <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
          <p className="text-slate-600 font-bold">すべて処理済みです</p>
          <p className="text-sm text-slate-400 mt-1">承認待ちのアイテムはありません</p>
        </div>
      )}

      {/* 一括承認 */}
      {pending.filter((i) => i.urgency === "low" || i.urgency === "medium").length > 0 && filter === "all" && (
        <div className="flex items-center justify-between p-5 rounded-2xl border"
          style={{ background: "linear-gradient(135deg, #eff6ff, #f5f3ff)", borderColor: "#bfdbfe" }}>
          <div>
            <p className="text-sm font-bold text-slate-800">未処理の低優先承認を一括処理</p>
            <p className="text-xs text-slate-500 mt-0.5">低優先（低・中）のアイテムを一括承認できます。緊急・高優先は個別確認を推奨します</p>
          </div>
          <button
            onClick={handleBulkApprove}
            disabled={loadingId !== null}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
            <CheckCircle2 size={14} /> 低・中優先を一括承認
          </button>
        </div>
      )}
    </div>
  );
}
