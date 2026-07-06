"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowLeft, Clock, CheckCircle2, Circle, ChevronRight,
  ShoppingBag, Send, MessageSquare,
} from "lucide-react";
import TaskAttachments from "@/components/employee/task-attachments";
import { getProgressLabel, getProgressColor, getPriorityLabel, getPriorityColor } from "@/lib/status-utils";
import { formatJstDateTime } from "@/lib/format-date";
import { updateTaskProgress, addComment, toggleChecklistItem, submitTaskCompletion } from "./actions";

export interface DbTaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "review" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  progress_rate: number;
  due_date: string | null;
  provisional_score: number | null;
  department_name: string;
  assignee_name: string;
  difficulty: number;
  effort: number;
  contribution: number;
  urgency: number;
  quality_risk: number;
  checklist: {
    id: string;
    title: string;
    weight: number;
    status: "pending" | "in_progress" | "completed";
    sort_order: number;
  }[];
  comments: {
    id: string;
    content: string;
    author_name: string;
    created_at: string;
  }[];
}

function ScoreBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`w-5 h-5 rounded ${i < value ? "bg-blue-500" : "bg-slate-100"}`} />
        ))}
      </div>
      <span className="text-sm font-bold text-slate-700">{value}</span>
    </div>
  );
}

export default function TaskDetail({ task, userId }: { task: DbTaskDetail; userId: string }) {
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressInput, setProgressInput] = useState(task.progress_rate);
  const [commentText, setCommentText] = useState("");
  const [progressError, setProgressError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [completionError, setCompletionError] = useState("");
  const [isPending, startTransition] = useTransition();
  // チェックリストの楽観的UI用（クリック後即座に表示を切り替える）
  const [checklistState, setChecklistState] = useState<Record<string, "pending" | "in_progress" | "completed">>(
    Object.fromEntries(task.checklist.map((item) => [item.id, item.status]))
  );

  const progressColor = getProgressColor(task.progress_rate);

  // checklistStateを使って楽観的に計算
  const computedProgress = task.checklist.length > 0
    ? Math.min(100, Math.round(task.checklist.reduce((acc, item) => {
        const s = checklistState[item.id] ?? item.status;
        if (s === "completed") return acc + item.weight;
        if (s === "in_progress") return acc + item.weight * 0.5;
        return acc;
      }, 0)))
    : task.progress_rate;

  function handleChecklistToggle(itemId: string, currentStatus: "pending" | "in_progress" | "completed") {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    // 楽観的に即更新
    setChecklistState((prev) => ({ ...prev, [itemId]: newStatus }));
    startTransition(async () => {
      const result = await toggleChecklistItem(itemId, currentStatus, task.id, userId);
      if (result.error) {
        // 失敗したら元に戻す
        setChecklistState((prev) => ({ ...prev, [itemId]: currentStatus }));
      }
    });
  }

  const circumference = 2 * Math.PI * 36;
  const dash = (task.progress_rate / 100) * circumference;

  const dueLabel = task.due_date
    ? (() => {
        const diff = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000);
        if (diff < 0) return <span className="text-red-600 font-semibold">{Math.abs(diff)}日超過</span>;
        if (diff <= 2) return <span className="text-orange-500 font-semibold">残 {diff}日（{task.due_date.slice(0, 10)}）</span>;
        return <span>残 {diff}日（{task.due_date.slice(0, 10)}）</span>;
      })()
    : <span className="text-slate-400">期限未設定</span>;

  function handleProgressUpdate() {
    setProgressError("");
    startTransition(async () => {
      const result = await updateTaskProgress(task.id, progressInput, userId);
      if (result.error) {
        setProgressError(result.error);
      } else {
        setShowProgressModal(false);
      }
    });
  }

  function handleSubmitCompletion() {
    setCompletionError("");
    startTransition(async () => {
      const result = await submitTaskCompletion(task.id, userId);
      if (result.error) {
        setCompletionError(result.error);
      } else {
        setCompletionMessage("完了提出しました。管理者の確認をお待ちください");
      }
    });
  }

  function handleCommentSubmit() {
    setCommentError("");
    if (!commentText.trim()) return;
    startTransition(async () => {
      const result = await addComment(task.id, commentText, userId);
      if (result.error) {
        setCommentError(result.error);
      } else {
        setCommentText("");
      }
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/tasks" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14} /> タスク一覧
        </Link>
        <ChevronRight size={12} />
        <span className="text-slate-800 font-medium">{task.title}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* メインカラム */}
        <div className="col-span-2 space-y-5">
          {/* タスクヘッダー */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <svg width="88" height="88" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r="36" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle
                    cx="44" cy="44" r="36"
                    fill="none"
                    stroke={progressColor}
                    strokeWidth="8"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 44 44)"
                  />
                  <text x="44" y="44" textAnchor="middle" dominantBaseline="middle"
                    fill={progressColor} fontSize="16" fontWeight="700">
                    {task.progress_rate}%
                  </text>
                </svg>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {task.department_name}
                  </span>
                  <span className="text-xs text-slate-400">{task.id.slice(0, 8)}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-800 mb-2">{task.title}</h1>
                {task.description ? (
                  <p className="text-sm text-slate-500 leading-relaxed">{task.description}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">説明なし</p>
                )}

                <div className="flex items-center gap-6 mt-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> 担当: {task.assignee_name}
                  </span>
                  <span className="flex items-center gap-1.5">期限: {dueLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* チェックリスト */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">進捗チェックリスト</h2>
            {task.checklist.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">チェックリストはまだ設定されていません</p>
            ) : (
              <>
                <div className="space-y-3">
                  {task.checklist.map((item) => {
                    const currentStatus = checklistState[item.id] ?? item.status;
                    const isCompleted = currentStatus === "completed";
                    const isInProgress = currentStatus === "in_progress";
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleChecklistToggle(item.id, currentStatus)}
                        disabled={isPending}
                        className="w-full flex items-center gap-3 text-left hover:bg-slate-50 rounded-xl px-2 py-1 -mx-2 transition-colors disabled:opacity-60"
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        ) : isInProgress ? (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-blue-500 shrink-0 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          </div>
                        ) : (
                          <Circle size={18} className="text-slate-300 shrink-0" />
                        )}
                        <span className={`flex-1 text-sm ${
                          isCompleted ? "line-through text-slate-400" :
                          isInProgress ? "text-slate-800 font-medium" : "text-slate-500"
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                          {item.weight}%
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">チェックリスト加重進捗</span>
                    <span className="text-sm font-bold" style={{ color: progressColor }}>{computedProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${computedProgress}%`, background: progressColor }} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 関連資料 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">関連資料</h2>
            <TaskAttachments taskId={task.id} userId={userId} />
          </div>

          {/* コメント */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MessageSquare size={15} /> コメント・やりとり
            </h2>

            {task.comments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2 mb-4">コメントはまだありません</p>
            ) : (
              <div className="space-y-3 mb-4">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{comment.author_name}</span>
                      <span className="text-[10px] text-slate-400">
                        {formatJstDateTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}

            {commentError && (
              <p className="text-xs text-red-600 mb-2">{commentError}</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCommentSubmit(); }}
                placeholder="コメントを入力..."
                className="flex-1 text-sm px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
                disabled={isPending}
              />
              <button
                onClick={handleCommentSubmit}
                disabled={isPending || !commentText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                <Send size={13} /> 送信
              </button>
            </div>
          </div>
        </div>

        {/* サイドカラム */}
        <div className="space-y-5">
          {/* 点数カード */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">獲得予定ポイント</h2>
            <div className="text-center mb-5">
              <p className="text-4xl font-bold text-blue-600">{task.provisional_score ?? "—"}</p>
              <p className="text-sm text-slate-400">pt（仮）</p>
              {task.provisional_score && (
                <div className="mt-2 px-3 py-1.5 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700">給与反映見込み</p>
                  <p className="text-lg font-bold text-blue-800">
                    ¥{Math.round(task.provisional_score * 5).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <ScoreBar label="難易度" value={task.difficulty} />
              <ScoreBar label="工数" value={task.effort} />
              <ScoreBar label="貢献度" value={task.contribution} />
              <ScoreBar label="緊急度" value={task.urgency} />
              <ScoreBar label="品質リスク" value={task.quality_risk} />
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              ※ 点数はレビュー後に確定します
            </p>
          </div>

          {/* アクションボタン */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">アクション</h2>
            <button
              onClick={() => setShowProgressModal(true)}
              className="w-full py-3 rounded-xl font-medium text-sm text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
              進捗を更新する
            </button>
            <Link href={`/task-market/list?taskId=${task.id}`}
              className="w-full py-3 rounded-xl font-medium text-sm border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
              <ShoppingBag size={14} /> マーケットに出す
            </Link>
            <button
              onClick={handleSubmitCompletion}
              disabled={isPending || !!completionMessage || task.status === "review" || task.status === "completed"}
              className="w-full py-3 rounded-xl font-medium text-sm border border-emerald-300 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={14} />
              {task.status === "completed" ? "完了済み" :
               task.status === "review" || completionMessage ? "確認待ち（提出済み）" :
               isPending ? "提出中..." : "完了で提出する"}
            </button>
            {completionMessage && (
              <p className="text-xs text-emerald-600 text-center">{completionMessage}</p>
            )}
            {completionError && (
              <p className="text-xs text-red-600 text-center">{completionError}</p>
            )}
          </div>
        </div>
      </div>

      {/* 進捗更新モーダル */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">進捗を更新する</h3>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">進捗率</span>
                <span className="text-2xl font-bold text-blue-600">{progressInput}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={progressInput}
                onChange={(e) => setProgressInput(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-xs text-slate-500 mt-1">{getProgressLabel(progressInput)}</p>
            </div>
            {progressError && (
              <p className="text-xs text-red-600 mb-3">{progressError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowProgressModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                disabled={isPending}>
                キャンセル
              </button>
              <button
                onClick={handleProgressUpdate}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {isPending ? "更新中..." : "更新する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
