"use client";

import { useState } from "react";
import { Star, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { confirmTaskScore, rejectTaskScore } from "./actions";
import type { TaskScoreRow } from "./page";

const dimensions = [
  { key: "difficulty", label: "難易度", weight: 25, color: "#2563eb" },
  { key: "effort", label: "工数", weight: 20, color: "#7c3aed" },
  { key: "contribution", label: "貢献度", weight: 30, color: "#059669" },
  { key: "urgency", label: "緊急度", weight: 10, color: "#f59e0b" },
  { key: "qualityRisk", label: "品質リスク", weight: 15, color: "#ef4444" },
] as const;

const qualityOptions = [
  { label: "超優秀", coef: 1.2, cls: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { label: "良好", coef: 1.0, cls: "bg-blue-500 hover:bg-blue-600 text-white" },
  { label: "軽微な修正あり", coef: 0.8, cls: "bg-amber-500 hover:bg-amber-600 text-white" },
  { label: "大幅修正あり", coef: 0.5, cls: "bg-orange-500 hover:bg-orange-600 text-white" },
  { label: "未納品/放棄", coef: 0.0, cls: "bg-red-500 hover:bg-red-600 text-white" },
];

function ScoreRow({
  task,
  expanded,
  onToggle,
  onConfirm,
  onReject,
  loading,
}: {
  task: TaskScoreRow;
  expanded: boolean;
  onToggle: () => void;
  onConfirm: (coef: number) => void;
  onReject: () => void;
  loading: boolean;
}) {
  const finalScore = task.confirmedTotal ?? (
    task.qualityCoefficient != null
      ? Math.round(task.provisionalScore * task.qualityCoefficient)
      : null
  );

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="py-3 pl-4">
          <span className="text-[10px] font-mono text-slate-400">{task.id.slice(0, 8)}</span>
        </td>
        <td className="py-3">
          <p className="text-sm font-medium text-slate-800">{task.title}</p>
          <p className="text-[10px] text-slate-400">{task.assigneeName} · {task.departmentName}</p>
        </td>
        <td className="py-3 text-center">
          <span className="text-base font-bold text-slate-700">{task.provisionalScore}</span>
          <span className="text-[10px] text-slate-400 ml-1">pt</span>
        </td>
        <td className="py-3 text-center">
          {task.qualityCoefficient != null ? (
            <span className={`text-sm font-bold ${
              task.qualityCoefficient >= 1.2 ? "text-emerald-600" :
              task.qualityCoefficient >= 1.0 ? "text-blue-600" : "text-red-600"
            }`}>×{task.qualityCoefficient}</span>
          ) : (
            <span className="text-xs text-slate-400">未評価</span>
          )}
        </td>
        <td className="py-3 text-center">
          {finalScore != null ? (
            <span className="text-base font-bold text-emerald-600">{finalScore}<span className="text-[10px] font-normal text-slate-400 ml-1">pt</span></span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="py-3 text-center">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            task.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>
            {task.isApproved ? "承認済み" : "承認待ち"}
          </span>
        </td>
        <td className="py-3 text-center pr-4">
          <div className="flex items-center justify-center gap-2">
            {!task.isApproved && (
              <button
                onClick={(e) => { e.stopPropagation(); onReject(); }}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <XCircle size={12} /> 差し戻し
              </button>
            )}
            {expanded ? <ChevronUp size={14} className="text-slate-400 ml-1" /> : <ChevronDown size={14} className="text-slate-400 ml-1" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50/50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-3">スコア内訳</p>
                <div className="space-y-2">
                  {dimensions.map((dim) => {
                    const val = task[dim.key as keyof TaskScoreRow] as number;
                    return (
                      <div key={dim.key} className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 w-20">{dim.label}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div key={n} className="w-5 h-5 rounded flex items-center justify-center text-[10px]"
                              style={{ background: n <= val ? dim.color + "30" : "#f1f5f9", color: n <= val ? dim.color : "#94a3b8" }}>
                              {n <= val ? "●" : "○"}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">{val}/5</span>
                        <span className="text-[10px] text-slate-400">×{dim.weight}</span>
                        <span className="text-[11px] font-bold" style={{ color: dim.color }}>
                          = {val * dim.weight}pt
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                {!task.isApproved ? (
                  <>
                    <p className="text-xs font-bold text-slate-600 mb-3">品質係数を選択して承認</p>
                    <div className="space-y-2">
                      {qualityOptions.map((opt) => (
                        <button
                          key={opt.coef}
                          onClick={() => onConfirm(opt.coef)}
                          disabled={loading}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${opt.cls}`}
                        >
                          <span>{opt.label}</span>
                          <span>×{opt.coef} → {Math.round(task.provisionalScore * opt.coef)}pt</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-3">承認済み</p>
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">仮: {task.provisionalScore}pt</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-sm font-bold text-emerald-600">確定: {task.confirmedTotal}pt</span>
                        {task.qualityCoefficient && (
                          <span className="text-xs text-slate-400">（×{task.qualityCoefficient}）</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function TaskScoresClient({ initialScores, ceoId }: { initialScores: TaskScoreRow[]; ceoId: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pending = initialScores.filter((t) => !t.isApproved).length;

  async function handleConfirm(scoreId: string, provisionalScore: number, coef: number) {
    setLoadingId(scoreId);
    const confirmedTotal = Math.round(provisionalScore * coef);
    const result = await confirmTaskScore(scoreId, confirmedTotal, coef, ceoId);
    setLoadingId(null);
    if (result.error) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setMessage("点数を確定しました");
      setExpanded(null);
      router.refresh();
    }
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleReject(scoreId: string) {
    setLoadingId(scoreId);
    const result = await rejectTaskScore(scoreId, ceoId);
    setLoadingId(null);
    if (result.error) {
      setMessage(`エラー: ${result.error}`);
    } else {
      setMessage("差し戻しました");
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
            <Star size={20} className="text-amber-500" /> タスク点数管理
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">タスクのスコアを確認し、品質係数を反映して承認する</p>
        </div>
        {pending > 0 && (
          <span className="text-[10px] px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-semibold">
            ⏳ 承認待ち {pending}件
          </span>
        )}
      </div>

      {/* 品質係数説明 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <p className="text-xs font-bold text-slate-600 mb-3">品質係数（社長が判定）</p>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "超優秀", coef: "×1.2", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { label: "良好", coef: "×1.0", cls: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "軽微な修正あり", coef: "×0.8", cls: "bg-amber-50 border-amber-200 text-amber-700" },
            { label: "大幅修正あり", coef: "×0.5", cls: "bg-orange-50 border-orange-200 text-orange-700" },
            { label: "未納品/放棄", coef: "×0.0", cls: "bg-red-50 border-red-200 text-red-700" },
          ].map(({ label, coef, cls }) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium ${cls}`}>
              <span className="font-bold">{coef}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* スコアテーブル */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="text-left py-3 pl-4 font-medium">ID</th>
              <th className="text-left py-3 font-medium">タスク名</th>
              <th className="text-center py-3 font-medium">仮スコア</th>
              <th className="text-center py-3 font-medium">品質係数</th>
              <th className="text-center py-3 font-medium">確定スコア</th>
              <th className="text-center py-3 font-medium">状態</th>
              <th className="text-center py-3 pr-4 font-medium">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialScores.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                  タスクスコアデータがありません
                </td>
              </tr>
            ) : (
              initialScores.map((task) => (
                <ScoreRow
                  key={task.id}
                  task={task}
                  expanded={expanded === task.id}
                  onToggle={() => setExpanded(expanded === task.id ? null : task.id)}
                  onConfirm={(coef) => handleConfirm(task.id, task.provisionalScore, coef)}
                  onReject={() => handleReject(task.id)}
                  loading={loadingId === task.id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 承認待ち案内 */}
      {pending > 0 && (
        <div className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div>
            <p className="text-sm font-bold text-emerald-800">各タスクを展開して品質係数を選択してください</p>
            <p className="text-xs text-emerald-600 mt-0.5">承認待ち {pending}件 — タスク行をクリックして展開し、品質係数ボタンで確定</p>
          </div>
          <CheckCircle2 size={24} className="text-emerald-500" />
        </div>
      )}
    </div>
  );
}
