"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Trash2, Loader2, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";
import { DesktopOnly } from "@/components/desktop-only";
import { createDirectDirective } from "./actions";
import type { ManagerOption } from "./page";

export default function DirectTaskClient({ managers }: { managers: ManagerOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [managerId, setManagerId] = useState("");
  const [checkItems, setCheckItems] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  function submit() {
    setMsg(null);
    if (!title.trim()) return setMsg({ text: "件名を入力してください", error: true });
    if (!body.trim()) return setMsg({ text: "内容を入力してください", error: true });
    if (!managerId) return setMsg({ text: "担当マネージャーを選択してください", error: true });

    startTransition(async () => {
      const res = await createDirectDirective({
        title, body, category,
        targetManagerId: managerId,
        checkItems,
      });
      if (res.error) setMsg({ text: res.error, error: true });
      else {
        const name = managers.find((m) => m.id === managerId)?.name ?? "マネージャー";
        setMsg({ text: `${name}さんにタスク依頼を送りました`, error: false });
        setTitle(""); setBody(""); setCategory(""); setManagerId(""); setCheckItems([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList size={20} className="text-blue-600" /> タスク依頼（直接）
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          AI秘書を介さず、担当マネージャーに直接タスクを依頼します。マネージャーが受信箱でタスクに落とし込みます。
        </p>
      </div>

      <DesktopOnly label="タスク依頼の作成はPCから">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
        <div>
          <label className="text-xs font-semibold text-slate-500">件名 *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
            placeholder="例: 来月の商談フォロー体制を整える" />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500">内容・依頼したいこと *</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
            placeholder="背景・依頼内容・ゴールなどを記入" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">カテゴリ（任意）</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              placeholder="例: 営業" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <UserCheck size={12} className="text-blue-600" /> 担当マネージャー *
            </label>
            {managers.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600">マネージャーが登録されていません</p>
            ) : (
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400">
                <option value="">選択してください</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.specialty ? `（${m.specialty}）` : ""}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 確認事項（任意） */}
        <div>
          <label className="text-xs font-semibold text-slate-500">確認事項（任意）</label>
          <div className="space-y-2 mt-1">
            {checkItems.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={c}
                  onChange={(e) => setCheckItems((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                  placeholder="確認したいこと" />
                <button onClick={() => setCheckItems((prev) => prev.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setCheckItems((prev) => [...prev, ""])}
            className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700">
            <Plus size={12} /> 確認事項を追加
          </button>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
            msg.error ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}>
            {msg.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {msg.text}
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={submit} disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> 送信中...</> : <><ClipboardList size={14} /> マネージャーに依頼する</>}
          </button>
        </div>
      </div>
      </DesktopOnly>
    </div>
  );
}
