"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Clock } from "lucide-react";
import { getProgressColor } from "@/lib/status-utils";
import { submitMarketApplication } from "../actions";

interface MarketTask {
  listingId: string; title: string; department: string; priority: string;
  progress: number; dueDate: string; difficulty: number;
  remainingPoints: number; listedBy: string; requiredSkills: string[]; handoverNote: string;
}

export default function ApplyTaskClient({ task, userId }: { task: MarketTask | null; userId: string }) {
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(3);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">📨</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">申請を送信しました</h2>
        <p className="text-slate-500 mb-6">
          出品者または管理者が確認後、承認・却下をお知らせします。
        </p>
        <Link href="/task-market"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          マーケットに戻る
        </Link>
      </div>
    );
  }

  function handleSubmit() {
    if (!task) return;
    setErrorMessage("");
    if (!reason.trim()) {
      setErrorMessage("引き受け理由を入力してください");
      return;
    }
    startTransition(async () => {
      const result = await submitMarketApplication({
        listingId: task.listingId,
        message: reason + (message ? `\n\n${message}` : ""),
        userId,
      });
      if (result && result.error) {
        setErrorMessage(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/task-market" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14} /> タスクマーケット
        </Link>
        <ChevronRight size={12} />
        <span className="text-slate-800">引き受け申請</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-800">引き受け申請</h1>
        <p className="text-slate-500 text-sm mt-0.5">申請後、出品者または管理者の承認が必要です。</p>
      </div>

      {/* 対象タスク情報 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">引き受けるタスク</h2>
        {task ? (
          <>
            <div className="flex items-start gap-4">
              <div className="text-center shrink-0">
                <p className="text-3xl font-bold text-blue-600">{task.remainingPoints}</p>
                <p className="text-xs text-slate-400">残りpt</p>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-2">{task.title}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> 期限: {task.dueDate || "未設定"}
                  </span>
                  <span>出品者: {task.listedBy}</span>
                  <span>難易度: {task.difficulty} / 5</span>
                  <span>部門: {task.department}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${task.progress}%`,
                    background: getProgressColor(task.progress)
                  }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">現在の進捗: {task.progress}%</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-2">引き継ぎメモ</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{task.handoverNote}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {task.requiredSkills.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                  {s}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">募集中のタスクが見つかりません</p>
        )}
      </div>

      {task && (
        <>
          {/* 引き受け理由 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3">引き受け理由 <span className="text-red-500">*必須</span></h2>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="このタスクを引き受けたい理由を入力してください..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* 予定工数 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3">
              予定工数: <span className="text-blue-600">{hours}h</span>
            </h2>
            <input
              type="range" min={1} max={20} value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1h</span><span>10h</span><span>20h</span>
            </div>
          </div>

          {/* メッセージ */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3">出品者へのメッセージ（任意）</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="確認事項や進め方のメッセージをどうぞ..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* ポイント確認 */}
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
            <p className="text-sm font-bold text-blue-800 mb-3">承認された場合の獲得ポイント</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{task.remainingPoints} pt</p>
                <p className="text-xs text-blue-500">完了・品質評価後に確定</p>
              </div>
              <div className="text-right text-sm text-blue-700">
                <p>給与反映見込み</p>
                <p className="text-xl font-bold">¥{(task.remainingPoints * 5).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || isPending}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            {isPending ? "送信中..." : "引き受け申請を送る"}
          </button>
          <p className="text-center text-xs text-slate-400">
            承認後、担当者として割り当てられます
          </p>
        </>
      )}
    </div>
  );
}
