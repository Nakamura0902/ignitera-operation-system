"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, ChevronRight } from "lucide-react";
import type { DirectiveRow } from "./page";

const STATUS_META: Record<DirectiveRow["status"], { label: string; dot: string; badge: string }> = {
  sent: { label: "未着手", dot: "#f59e0b", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "対応中", dot: "#0d9488", badge: "bg-teal-50 text-teal-700 border-teal-200" },
  done: { label: "完了", dot: "#64748b", badge: "bg-slate-100 text-slate-500 border-slate-200" },
};

type Filter = "all" | DirectiveRow["status"];

export default function InboxList({ rows }: { rows: DirectiveRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: rows.length,
    sent: rows.filter((r) => r.status === "sent").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    done: rows.filter((r) => r.status === "done").length,
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "すべて" },
    { key: "sent", label: "未着手" },
    { key: "in_progress", label: "対応中" },
    { key: "done", label: "完了" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Inbox size={20} className="text-teal-600" /> 受信箱
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">社長からAI秘書経由で届いた指示を確認し、タスクに変換します</p>
        </div>
        {counts.sent > 0 && (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
            未対応 {counts.sent}件
          </span>
        )}
      </div>

      {/* フィルタ */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === f.key
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            {f.label} {counts[f.key]}
          </button>
        ))}
      </div>

      {/* 一覧 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 border border-slate-200 bg-white flex flex-col items-center justify-center gap-3 text-center">
          <Inbox size={32} className="text-slate-300" />
          <p className="text-sm text-slate-400">
            {rows.length === 0
              ? "まだ届いている指示ブリーフはありません。社長からの指示がAI秘書経由で届くとここに表示されます"
              : "該当するブリーフはありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <Link key={r.id} href={`/manager/inbox/${r.id}`}
                className={`block rounded-2xl p-5 bg-white border border-slate-100 shadow-sm hover:border-teal-300 hover:shadow transition-all ${
                  r.status === "done" ? "opacity-70" : ""
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                    {meta.label}
                  </span>
                  {r.category && (
                    <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-medium">{r.category}</span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800 truncate">{r.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{r.summary}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-slate-400">受信: {r.receivedAt}</span>
                  <span className="text-[10px] text-teal-600 font-medium flex items-center gap-0.5">
                    詳細を見る <ChevronRight size={11} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
