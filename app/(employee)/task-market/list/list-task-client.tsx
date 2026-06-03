"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getProgressLabel } from "@/lib/status-utils";
import { submitMarketListing } from "../actions";

interface MyTask {
  id: string; title: string; status: string; progress: number;
  points: number; dueDate: string;
}

const reasons = [
  { id: "busy", label: "忙しい" },
  { id: "skill_gap", label: "スキルが足りない" },
  { id: "deadline", label: "期限に間に合わない" },
  { id: "other_priority", label: "他の優先タスクがある" },
];

const skillOptions = [
  "営業経験あり", "今日中に対応可能", "連絡責任感あり",
  "Excel/スプレッドシート", "デザイン経験", "コーディング経験",
];

export default function ListTaskClient({ myTasks, userId }: { myTasks: MyTask[]; userId: string }) {
  const [selectedTaskId, setSelectedTaskId] = useState(myTasks[0]?.id ?? "");
  const [reason, setReason] = useState("busy");
  const [handoverNote, setHandoverNote] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const task = myTasks.find((t) => t.id === selectedTaskId) ?? myTasks[0];
  const progress = task?.progress ?? 0;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  function handleSubmit() {
    setErrorMessage("");
    if (!handoverNote.trim()) {
      setErrorMessage("引き継ぎメモは必須です");
      return;
    }
    if (!task) {
      setErrorMessage("タスクを選択してください");
      return;
    }
    startTransition(async () => {
      const result = await submitMarketListing({
        taskId: task.id,
        reason,
        handoverNote,
        requiredSkills: selectedSkills,
        userId,
      });
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">承認待ちです</h2>
        <p className="text-slate-500 mb-6">
          出品申請を送信しました。管理者の承認後、タスクマーケットに掲載されます。
        </p>
        <Link href="/task-market"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          マーケットを見る <ChevronRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/task-market" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14} /> タスクマーケット
        </Link>
        <ChevronRight size={12} />
        <span className="text-slate-800">マーケットに出す</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-800">タスクをマーケットに出す</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          出品申請後、管理者の承認を経てマーケットに掲載されます。
        </p>
      </div>

      {myTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
          <p className="text-slate-400 text-sm">出品可能なタスクがありません</p>
        </div>
      ) : (
        <>
          {/* 対象タスク選択 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3">対象タスクを選ぶ</h2>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              {myTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}（{t.points}pt {t.dueDate ? `/ ${t.dueDate}` : ""}）
                </option>
              ))}
            </select>

            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-blue-700 font-medium">現在の進捗</span>
                <span className="text-lg font-bold text-blue-700">{progress}%</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-blue-600 mt-1">{getProgressLabel(progress)}</p>
            </div>
          </div>

          {/* 出品理由 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3">出品理由</h2>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left ${
                    reason === r.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 引き継ぎメモ */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-1">引き継ぎメモ <span className="text-red-500">*必須</span></h2>
            <p className="text-xs text-slate-400 mb-3">どこまで完了か・残り作業・資料の場所・注意点を書いてください</p>
            <textarea
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              placeholder="例：構成案まで完了。残りはドラフト作成と数値確認。参考資料はDriveの「提案書フォルダ」にあります。期限が厳しいので早めの対応をお願いします。"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-32 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* 希望条件 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3">希望条件（引き受ける人への条件）</h2>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedSkills.includes(skill)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-purple-400"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* 残りポイント確認 */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">引き受け者への残りポイント</p>
                <p className="text-2xl font-bold text-blue-600">
                  {task ? Math.round(task.points * (1 - progress / 100)) : 0} pt
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">あなたの取り分</p>
                <p className="text-xl font-bold text-slate-700">
                  {task ? Math.round(task.points * (progress / 100)) : 0} pt
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              ※ 進捗{progress}%分（{task ? Math.round(task.points * progress / 100) : 0}pt）はあなたの獲得分。残りが引き受け者の獲得分。
            </p>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          )}

          {/* 送信 */}
          <button
            onClick={handleSubmit}
            disabled={!handoverNote.trim() || isPending}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            {isPending ? "送信中..." : "承認申請を送る"}
          </button>
          <p className="text-center text-xs text-slate-400">
            出品後、管理者の承認を経てマーケットに掲載されます
          </p>
        </>
      )}
    </div>
  );
}
