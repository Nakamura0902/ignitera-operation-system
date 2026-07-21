"use client";

import { useState } from "react";
import { ShoppingBag, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveMarketListing, rejectMarketListing } from "./actions";
import type { MarketListing } from "./page";

function RiskBadge({ risk }: { risk: MarketListing["riskLevel"] }) {
  const map = {
    high: "bg-red-100 text-red-700 border-red-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    low: "bg-emerald-100 text-emerald-700 border-emerald-300",
  };
  const labels = { high: "高リスク", medium: "中リスク", low: "低リスク" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${map[risk]}`}>
      {labels[risk]}
    </span>
  );
}

function StatusBadge({ status }: { status: MarketListing["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_approval: { label: "承認待ち", cls: "bg-amber-100 text-amber-700" },
    open: { label: "公開中", cls: "bg-blue-100 text-blue-700" },
    taken: { label: "引き受け済み", cls: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "差し戻し", cls: "bg-red-100 text-red-700" },
  };
  const v = map[status];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.cls}`}>{v.label}</span>;
}

export default function TaskMarketMonitorClient({ initialListings, ceoId }: { initialListings: MarketListing[]; ceoId: string }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pendingCount = initialListings.filter((m) => m.status === "pending_approval").length;
  const highRiskCount = initialListings.filter((m) => m.riskLevel === "high").length;

  async function handleApprove(listingId: string) {
    setLoadingId(listingId);
    const result = await approveMarketListing(listingId, ceoId);
    setLoadingId(null);
    if (result.error) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setMessage("承認しました");
      router.refresh();
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleReject(listingId: string) {
    setLoadingId(listingId);
    const result = await rejectMarketListing(listingId, ceoId);
    setLoadingId(null);
    if (result.error) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setMessage("差し戻しました");
      router.refresh();
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleBulkApprove() {
    const lowRisk = initialListings.filter(
      (m) => m.status === "pending_approval" && m.riskLevel === "low"
    );
    for (const listing of lowRisk) {
      await approveMarketListing(listing.id, ceoId);
    }
    setMessage(`低リスク ${lowRisk.length}件を一括承認しました`);
    router.refresh();
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

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
            <ShoppingBag size={20} className="text-blue-600" /> タスクマーケット監視
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">引き継ぎ申請の確認・承認・差し戻しを行う</p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <span className="text-[10px] px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-semibold">
              ⏳ 承認待ち {pendingCount}件
            </span>
          )}
          {highRiskCount > 0 && (
            <span className="text-[10px] px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full font-semibold">
              ⚠ 高リスク {highRiskCount}件
            </span>
          )}
        </div>
      </div>

      {/* ルール説明 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold text-slate-600 mb-3">マーケット承認ルール</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="font-bold text-emerald-700 mb-1">承認する場合</p>
            <p>担当変更が品質・期日に影響しないと判断し、引き受け申請者のスキルが十分な場合</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="font-bold text-amber-700 mb-1">保留する場合</p>
            <p>リスク評価が不十分、または申請理由が不明確な場合。追加情報を求める</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <p className="font-bold text-red-700 mb-1">差し戻す場合</p>
            <p>高リスク案件での担当変更、期日間近な重要タスクの引き継ぎは原則否認</p>
          </div>
        </div>
      </div>

      {/* 一覧 */}
      {initialListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100">
          <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
          <p className="text-slate-600 font-bold">出品申請はありません</p>
          <p className="text-sm text-slate-400 mt-1">新しい出品申請が来たらここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialListings.map((listing) => (
            <div key={listing.id} className={`bg-white rounded-2xl p-6 shadow-sm border ${
              listing.riskLevel === "high" ? "border-red-200" :
              listing.status === "pending_approval" ? "border-amber-200" : "border-slate-100"
            }`}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400">{listing.id.slice(0, 8)}</span>
                    <RiskBadge risk={listing.riskLevel} />
                    <StatusBadge status={listing.status} />
                    {listing.riskLevel === "high" && (
                      <span className="flex items-center gap-1 text-[10px] text-red-700 font-bold">
                        <AlertTriangle size={10} /> 要注意
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{listing.taskTitle}</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 text-xs">
                    <div>
                      <p className="text-slate-400">申請者（出し手）</p>
                      <p className="font-medium text-slate-700 mt-0.5">{listing.lister}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">引き受け申請者</p>
                      <p className={`font-medium mt-0.5 ${listing.applicant ? "text-slate-700" : "text-slate-400"}`}>
                        {listing.applicant ?? "まだいません"}
                        {listing.applicantCount > 0 && (
                          <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                            {listing.applicantCount}件申請中
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">部門</p>
                      <p className="font-medium text-slate-700 mt-0.5">{listing.department}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">残りポイント</p>
                      <p className="font-bold text-blue-600 mt-0.5">{listing.remainingPoints}pt</p>
                    </div>
                    <div>
                      <p className="text-slate-400">出品時進捗</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${listing.progressAtListing}%` }} />
                        </div>
                        <span className="text-slate-600">{listing.progressAtListing}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400">期日</p>
                      <p className={`font-medium mt-0.5 ${listing.daysUntilDue <= 1 ? "text-red-600" : listing.daysUntilDue <= 3 ? "text-orange-600" : "text-slate-700"}`}>
                        {listing.dueDate} {listing.daysUntilDue !== 999 ? `（残${listing.daysUntilDue}日）` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 mb-0.5">出品理由</p>
                    <p className="text-xs text-slate-700">{listing.reason}</p>
                  </div>
                </div>

                {/* アクションボタン */}
                {listing.status === "pending_approval" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(listing.id)}
                      disabled={loadingId === listing.id}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                      <CheckCircle2 size={12} /> 承認する
                    </button>
                    <button
                      onClick={() => handleReject(listing.id)}
                      disabled={loadingId === listing.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50">
                      <XCircle size={12} /> 差し戻す
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">
                      保留にする
                    </button>
                  </div>
                )}
                {listing.status === "open" && (
                  <div className="shrink-0">
                    <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                      引き受け待ち <ArrowRight size={12} />
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 一括承認 */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div>
            <p className="text-sm font-bold text-amber-800">低リスクの申請を一括承認</p>
            <p className="text-xs text-amber-600 mt-0.5">低リスクと判定された申請のみ一括承認できます（高リスクは個別確認が必要）</p>
          </div>
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition-colors">
            <CheckCircle2 size={14} /> 低リスクのみ一括承認
          </button>
        </div>
      )}
    </div>
  );
}
