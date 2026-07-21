"use client";

import { useState } from "react";
import { Wallet, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { approvePayroll, approveAllPayrolls, generatePayrollEstimates } from "./actions";
import type { PayrollRow } from "./page";

function StatusBadge({ status }: { status: PayrollRow["status"] }) {
  const map = {
    draft: { label: "承認待ち", cls: "bg-amber-100 text-amber-700" },
    reviewed: { label: "レビュー済み", cls: "bg-blue-100 text-blue-700" },
    approved: { label: "承認済み", cls: "bg-emerald-100 text-emerald-700" },
  };
  const v = map[status];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.cls}`}>{v.label}</span>;
}

export default function PayrollReportClient({
  payrollRows,
  year,
  month,
  ceoId,
}: {
  payrollRows: PayrollRow[];
  year: number;
  month: number;
  ceoId: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    const result = await generatePayrollEstimates(year, month, ceoId);
    setGenerating(false);
    if (result.error) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setMessage(`${result.count}名分の給与見込みを生成しました`);
      router.refresh();
    }
    setTimeout(() => setMessage(null), 4000);
  }

  const pending = payrollRows.filter((r) => r.status !== "approved");
  const totalEstimate = payrollRows.reduce((s, r) => s + r.totalEstimate, 0);
  const totalBase = payrollRows.reduce((s, r) => s + r.baseSalary, 0);
  const totalPoints = payrollRows.reduce((s, r) => s + r.pointReward, 0);
  const totalBonus = payrollRows.reduce((s, r) => s + r.qualityBonus, 0);

  async function handleApprove(rowId: string) {
    setLoadingId(rowId);
    const result = await approvePayroll(rowId, ceoId);
    setLoadingId(null);
    if (result.error) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setMessage("承認しました");
      router.refresh();
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleApproveAll() {
    const ids = pending.map((r) => r.id);
    setLoadingId("all");
    const result = await approveAllPayrolls(ids, ceoId);
    setLoadingId(null);
    if (result.error) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setMessage(`${result.approvedCount}名を一括承認しました`);
      router.refresh();
    }
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
            <Wallet size={20} className="text-emerald-600" /> 給与反映レポート
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{year}年{month}月分 給与見込みの確認と最終承認</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="text-[10px] px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-semibold">
              ⏳ 承認待ち {pending.length}名
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
            {generating ? "生成中..." : `${year}年${month}月分を生成`}
          </button>
        </div>
      </div>

      {/* 総合サマリー */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: "給与支払い総額（見込み）", value: `¥${totalEstimate.toLocaleString()}`, sub: `${payrollRows.length}名分の合計`, color: "#2563eb" },
          { label: "基本給合計", value: `¥${totalBase.toLocaleString()}`, sub: "固定分", color: "#7c3aed" },
          { label: "ポイント報酬合計", value: `¥${totalPoints.toLocaleString()}`, sub: "確定pt換算", color: "#059669" },
          { label: "品質ボーナス合計", value: `¥${totalBonus.toLocaleString()}`, sub: "係数×確定pt", color: "#f59e0b" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* 給与計算式の説明 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <p className="text-xs font-bold text-slate-600 mb-3">給与計算式</p>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold">基本給</div>
          <span className="text-slate-400 font-bold">+</span>
          <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold">ポイント報酬</div>
          <span className="text-slate-400 font-bold">+</span>
          <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold">品質ボーナス</div>
          <span className="text-slate-400 font-bold">=</span>
          <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold">支給総額</div>
          <span className="text-xs text-slate-400 ml-2">※ ポイント報酬 = 確定pt × ¥5</span>
        </div>
      </div>

      {/* 社員別テーブル */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">社員別 給与見込み一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 pl-6 font-medium">社員</th>
                <th className="text-center py-3 font-medium">確定pt</th>
                <th className="text-center py-3 font-medium">仮pt</th>
                <th className="text-right py-3 font-medium">基本給</th>
                <th className="text-right py-3 font-medium">ポイント報酬</th>
                <th className="text-right py-3 font-medium">品質ボーナス</th>
                <th className="text-right py-3 font-medium">支給見込み</th>
                <th className="text-center py-3 font-medium">最低賃金</th>
                <th className="text-center py-3 pr-6 font-medium">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    給与見込みデータがありません
                  </td>
                </tr>
              ) : (
                payrollRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-6">
                      <p className="font-medium text-slate-800">{row.name}</p>
                      <p className="text-[10px] text-slate-400">{row.department} · {row.employeeId}</p>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-sm font-bold text-slate-700">{row.confirmedPoints.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 ml-0.5">pt</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-sm text-amber-600 font-medium">+{row.pendingPoints}</span>
                      <span className="text-[10px] text-slate-400 ml-0.5">pt</span>
                    </td>
                    <td className="py-4 text-right font-medium text-slate-700">
                      ¥{row.baseSalary.toLocaleString()}
                    </td>
                    <td className="py-4 text-right font-medium text-emerald-600">
                      ¥{row.pointReward.toLocaleString()}
                    </td>
                    <td className="py-4 text-right font-medium text-amber-600">
                      {row.qualityBonus > 0 ? `¥${row.qualityBonus.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-4 text-right">
                      <span className="text-base font-bold text-blue-600">¥{row.totalEstimate.toLocaleString()}</span>
                    </td>
                    <td className="py-4 text-center">
                      {row.minSalaryMet
                        ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                        : <AlertCircle size={14} className="text-red-500 mx-auto" />
                      }
                    </td>
                    <td className="py-4 text-center pr-6">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={row.status} />
                        {row.status !== "approved" && (
                          <button
                            onClick={() => handleApprove(row.id)}
                            disabled={loadingId === row.id || loadingId === "all"}
                            className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-bold transition-colors disabled:opacity-50"
                          >
                            承認
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* 合計行 */}
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="py-4 pl-6 font-bold text-slate-700">合計</td>
                <td className="py-4 text-center font-bold text-slate-700">
                  {payrollRows.reduce((s, r) => s + r.confirmedPoints, 0).toLocaleString()}pt
                </td>
                <td className="py-4 text-center font-bold text-amber-600">
                  +{payrollRows.reduce((s, r) => s + r.pendingPoints, 0).toLocaleString()}pt
                </td>
                <td className="py-4 text-right font-bold text-slate-700">¥{totalBase.toLocaleString()}</td>
                <td className="py-4 text-right font-bold text-emerald-600">¥{totalPoints.toLocaleString()}</td>
                <td className="py-4 text-right font-bold text-amber-600">¥{totalBonus.toLocaleString()}</td>
                <td className="py-4 text-right font-bold text-blue-700 text-base">¥{totalEstimate.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 一括承認 */}
      {pending.length > 0 && (
        <div className="flex items-center justify-between p-5 bg-blue-50 border border-blue-200 rounded-2xl">
          <div>
            <p className="text-sm font-bold text-blue-800">{year}年{month}月分 給与を一括承認する</p>
            <p className="text-xs text-blue-600 mt-0.5">
              承認後、各社員の確定給与として処理されます。
              承認待ち {pending.length}名 / 合計 ¥{pending.reduce((s, r) => s + r.totalEstimate, 0).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApproveAll}
              disabled={loadingId === "all"}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> 一括承認する <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
