"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, ArrowRight, Filter } from "lucide-react";
import { getProgressColor, getProgressLabel, getPriorityColor, getPriorityLabel } from "@/lib/status-utils";

export interface DbTask {
  id: string;
  title: string;
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
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

type FilterKey = "all" | "in_progress" | "pending" | "review" | "completed";

export default function TaskList({ tasks }: { tasks: DbTask[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "すべて" },
    { key: "in_progress", label: "進行中" },
    { key: "pending", label: "未着手" },
    { key: "review", label: "確認待ち" },
    { key: "completed", label: "完了" },
  ];

  const filtered = activeFilter === "all"
    ? tasks
    : tasks.filter((t) => t.status === activeFilter);

  return (
    <>
      {/* フィルタータブ */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(({ key, label }) => {
          const count = key === "all" ? tasks.length : tasks.filter((t) => t.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeFilter === key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-blue-200"
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* タスクカード */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm border border-slate-100">
            該当するタスクはありません
          </div>
        )}
        {filtered.map((task) => {
          const progressColor = getProgressColor(task.progress_rate);
          const today = new Date();
          const dueDate = task.due_date ? new Date(task.due_date) : null;
          const diffDays = dueDate
            ? Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
            : null;
          const isOverdue = diffDays !== null && diffDays < 0;
          const isDueSoon = diffDays !== null && diffDays >= 0 && diffDays <= 2;

          return (
            <div key={task.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all">
              <div className="flex items-start gap-4">
                {/* 進捗円 */}
                <div className="shrink-0 w-14 h-14 rounded-full border-4 flex items-center justify-center text-sm font-bold"
                  style={{ borderColor: progressColor, color: progressColor }}>
                  {task.progress_rate}%
                </div>

                {/* 中央: 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {task.department_name}
                    </span>
                    <span className="text-[10px] text-slate-400">{task.id.slice(0, 8)}</span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm mb-2 leading-snug">{task.title}</h3>

                  <ProgressBar value={task.progress_rate} color={progressColor} />
                  <p className="text-[10px] mt-1" style={{ color: progressColor }}>
                    {getProgressLabel(task.progress_rate)}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {task.assignee_name}
                    </span>
                    {diffDays === null ? (
                      <span className="text-slate-400">期限未設定</span>
                    ) : (
                      <span className={`font-semibold ${isOverdue ? "text-red-600" : isDueSoon ? "text-orange-500" : "text-slate-500"}`}>
                        {isOverdue
                          ? `${Math.abs(diffDays)}日超過`
                          : `残 ${diffDays}日（${task.due_date}）`}
                      </span>
                    )}
                  </div>
                </div>

                {/* 右: ポイント＋ボタン */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">{task.provisional_score ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">pt（仮）</p>
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap justify-end">
                    <span className="text-[10px] px-2 py-1 bg-slate-50 rounded-lg text-slate-500">難:{task.difficulty}</span>
                    <span className="text-[10px] px-2 py-1 bg-slate-50 rounded-lg text-slate-500">工:{task.effort}</span>
                    <span className="text-[10px] px-2 py-1 bg-slate-50 rounded-lg text-slate-500">貢:{task.contribution}</span>
                  </div>
                  <Link href={`/tasks/${task.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                    詳細 <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
