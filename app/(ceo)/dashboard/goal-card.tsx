"use client";

import { useState, useTransition } from "react";
import { Target, Pencil, Check, X, Loader2 } from "lucide-react";
import { setMonthlyTarget } from "./actions";

export default function GoalCard({
  month,
  target,
  achieved,
  oneTime = 0,
  monthly = 0,
}: {
  month: number;
  target: number;
  achieved: number;
  oneTime?: number;
  monthly?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(target || ""));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const over = target > 0 && achieved > target;

  function save() {
    setError(null);
    const num = Number(value.replace(/[,\s]/g, ""));
    if (!Number.isFinite(num) || num < 0) {
      setError("金額を正しく入力してください");
      return;
    }
    startTransition(async () => {
      const res = await setMonthlyTarget(num);
      if (res.error) setError(res.error);
      else setEditing(false);
    });
  }

  return (
    <div className="rounded-2xl p-6 border border-blue-200"
      style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">{month}月の売上目標</h2>
        </div>
        {!editing && (
          <button onClick={() => { setValue(String(target || "")); setEditing(true); }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
            <Pencil size={12} /> 目標を設定
          </button>
        )}
      </div>

      {editing ? (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">¥</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="numeric"
              placeholder="1000000"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
            />
            <button onClick={save} disabled={isPending}
              className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center disabled:opacity-50">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button onClick={() => { setEditing(false); setError(null); }}
              className="w-9 h-9 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      ) : (
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] text-slate-400">達成売上（単発＋月額）</p>
            <p className="text-3xl font-bold text-slate-800">¥{achieved.toLocaleString()}</p>
            {(oneTime > 0 || monthly > 0) && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                単発 ¥{oneTime.toLocaleString()} ・ 月額 ¥{monthly.toLocaleString()}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400">目標</p>
            <p className="text-lg font-bold text-slate-600">
              {target > 0 ? `¥${target.toLocaleString()}` : "未設定"}
            </p>
          </div>
        </div>
      )}

      {/* 進捗バー */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-slate-100">
          <div className="h-3 rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: over ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#2563eb,#7c3aed)",
            }} />
        </div>
        <span className={`text-sm font-bold w-14 text-right ${over ? "text-emerald-600" : "text-blue-700"}`}>
          {target > 0 ? `${pct}%` : "—"}
        </span>
      </div>
      {over && <p className="text-[11px] text-emerald-600 mt-1.5 text-right">目標達成 ・ 超過分 ¥{(achieved - target).toLocaleString()}</p>}
    </div>
  );
}
