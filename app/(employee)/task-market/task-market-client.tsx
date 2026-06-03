"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Clock, ArrowRight, ShoppingBag } from "lucide-react";
import { getProgressColor, getProgressLabel, getPriorityLabel, getPriorityColor } from "@/lib/status-utils";

interface MarketTask {
  id: string; listingId: string; title: string; department: string; priority: string;
  progress: number; dueDate: string; difficulty: number; effort: number;
  remainingPoints: number; listedBy: string; requiredSkills: string[]; handoverNote: string;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export default function TaskMarketClient({ marketTasks }: { marketTasks: MarketTask[] }) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");

  const filtered = marketTasks.filter((t) => {
    const matchSearch = t.title.includes(search) || t.department.includes(search);
    const matchDept = deptFilter === "all" || t.department === deptFilter;
    const matchDiff = diffFilter === "all" || t.difficulty === Number(diffFilter);
    return matchSearch && matchDept && matchDiff;
  });

  const depts = ["all", "開発", "営業", "案件管理", "経理・請求", "事務"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag size={20} className="text-blue-600" />
            タスクマーケット
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            メンバーが出品したタスクを引き受けて、ポイントを獲得できます。
          </p>
        </div>
        <div className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">
          {marketTasks.length} 件 募集中
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="タスク名・部門で検索..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
          />
        </div>
        <select
          value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
        >
          {depts.map((d) => <option key={d} value={d}>{d === "all" ? "全部門" : d}</option>)}
        </select>
        <select
          value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
        >
          <option value="all">全難易度</option>
          {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>難易度 {d}</option>)}
        </select>
      </div>

      {/* タスクカード */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
            <p className="text-slate-400 text-sm">募集中のタスクはありません</p>
          </div>
        )}
        {filtered.map((task) => {
          const progressColor = getProgressColor(task.progress);
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
          const diffDays = dueDate
            ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
            : null;

          return (
            <div key={task.listingId}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all">
              <div className="flex items-start gap-5">
                {/* 左: ポイント */}
                <div className="shrink-0 text-center w-20">
                  <div className="text-2xl font-bold text-blue-600">{task.remainingPoints}</div>
                  <div className="text-[10px] text-slate-400">残りpt</div>
                  <div className="mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                </div>

                {/* 中央 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {task.department}
                    </span>
                    <span className="text-[10px] text-slate-400">出品者: {task.listedBy}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">{task.title}</h3>

                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px]" style={{ color: progressColor }}>
                        現在 {getProgressLabel(task.progress)}
                      </span>
                      <span className="text-xs font-bold text-slate-600">{task.progress}%</span>
                    </div>
                    <ProgressBar value={task.progress} color={progressColor} />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {task.requiredSkills.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-4">
                    {diffDays !== null ? (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        残 {diffDays}日（{task.dueDate}）
                      </span>
                    ) : (
                      <span className="flex items-center gap-1"><Clock size={11} /> 期限未設定</span>
                    )}
                    <span>難易度 {task.difficulty} / 工数 {task.effort}h</span>
                  </div>
                </div>

                {/* 右: ボタン */}
                <div className="shrink-0 flex flex-col gap-2">
                  <Link href={`/task-market/apply?listingId=${task.listingId}`}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    引き受け申請 <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* 引き継ぎメモ */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">引き継ぎメモ</p>
                <p className="text-xs text-slate-600 line-clamp-2">{task.handoverNote}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
