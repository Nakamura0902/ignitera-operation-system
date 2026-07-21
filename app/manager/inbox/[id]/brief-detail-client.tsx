"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, CheckSquare, Plus, Trash2, Loader2,
  UserCheck, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
} from "lucide-react";
import { getPriorityColor, getPriorityLabel, getProgressColor } from "@/lib/status-utils";
import { DesktopOnly } from "@/components/desktop-only";
import { updateDirectiveStatus, createTaskFromDirective } from "./actions";
import type { BriefTaskRow, EmployeeOption } from "./page";

interface Brief {
  id: string;
  category: string | null;
  title: string;
  summary: string;
  body: string;
  rawInstruction: string;
  checkItems: string[];
  status: "sent" | "in_progress" | "done";
  receivedAt: string;
}

const STATUS_META: Record<Brief["status"], { label: string; badge: string }> = {
  sent: { label: "未着手", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "対応中", badge: "bg-teal-50 text-teal-700 border-teal-200" },
  done: { label: "完了", badge: "bg-slate-100 text-slate-500 border-slate-200" },
};

const PRIORITIES: { key: "low" | "medium" | "high" | "urgent"; label: string }[] = [
  { key: "low", label: "低" },
  { key: "medium", label: "中" },
  { key: "high", label: "高" },
  { key: "urgent", label: "緊急" },
];

export default function BriefDetailClient({
  brief,
  tasks,
  employees,
  managerSpecialty,
  userId,
}: {
  brief: Brief;
  tasks: BriefTaskRow[];
  employees: EmployeeOption[];
  managerSpecialty: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Brief["status"]>(brief.status);
  const [showRaw, setShowRaw] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  // フォーム状態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [revenue, setRevenue] = useState("");
  const [revenueType, setRevenueType] = useState<"none" | "one_time" | "monthly">("one_time");
  const [scope, setScope] = useState<"managed" | "all">(managerSpecialty ? "managed" : "all");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const toggleAssignee = (id: string) =>
    setAssignedTo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const [checklist, setChecklist] = useState<{ title: string; weight: number }[]>([]);

  const managed = employees.filter((e) => managerSpecialty && e.specialty === managerSpecialty);
  const options = scope === "managed" ? managed : employees;
  const checklistTotal = checklist.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  function changeStatus(next: Brief["status"]) {
    setMsg(null);
    startTransition(async () => {
      const res = await updateDirectiveStatus(brief.id, next, userId);
      if (res.error) setMsg({ text: res.error, error: true });
      else {
        setStatus(next);
        router.refresh();
      }
    });
  }

  function submitTask() {
    setMsg(null);
    if (!title.trim()) return setMsg({ text: "タスク名を入力してください", error: true });
    if (assignedTo.length === 0) return setMsg({ text: "担当社員を指名してください", error: true });

    startTransition(async () => {
      const res = await createTaskFromDirective(
        {
          directiveId: brief.id,
          title,
          description,
          priority,
          dueDate: dueDate || undefined,
          assignedTo,
          revenueType,
          revenueAmount: revenueType === "none" ? 0 : Number(revenue.replace(/[,\s]/g, "")) || 0,
          checklist,
        },
        userId
      );
      if (res.error) {
        setMsg({ text: res.error, error: true });
      } else {
        const names = assignedTo.map((id) => employees.find((e) => e.id === id)?.name ?? "担当者");
        const label = names.length === 1 ? `${names[0]}さん` : `${names.length}名（${names.join("・")}）`;
        setMsg({ text: `タスクを作成し、${label}に割り当てました`, error: false });
        setTitle("");
        setDescription("");
        setPriority("medium");
        setDueDate("");
        setRevenue("");
        setRevenueType("one_time");
        setAssignedTo([]);
        setChecklist([]);
        if (status === "sent") setStatus("in_progress");
        router.refresh();
      }
    });
  }

  const meta = STATUS_META[status];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link href="/manager/inbox" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ArrowLeft size={15} /> 受信箱に戻る
      </Link>

      {/* ヘッダー */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}>
            {meta.label}
          </span>
          {brief.category && (
            <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-medium">{brief.category}</span>
          )}
          {status === "done" && <span className="text-[10px] text-slate-400">このブリーフは完了扱いです</span>}
        </div>
        <h1 className="text-xl font-bold text-slate-800">{brief.title}</h1>
        <p className="text-xs text-slate-400 mt-1">受信: {brief.receivedAt}</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl ${
          msg.error ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
        }`}>
          {msg.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {msg.text}
        </div>
      )}

      {/* 指示内容 & 確認事項 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} className="text-teal-600" />
            <h2 className="text-sm font-bold text-slate-700">指示内容（AI整理）</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">{brief.summary}</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{brief.body}</p>

          <button onClick={() => setShowRaw((v) => !v)}
            className="mt-4 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
            {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            社長の原文を{showRaw ? "隠す" : "見る"}
          </button>
          {showRaw && (
            <p className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
              {brief.rawInstruction}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={15} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-700">確認事項</h2>
          </div>
          {brief.checkItems.length === 0 ? (
            <p className="text-xs text-slate-400">特筆すべき確認事項はありません</p>
          ) : (
            <ul className="space-y-2">
              {brief.checkItems.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-amber-600 mt-0.5">▶</span>
                  <span className="text-xs text-slate-700 leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ステータス操作 */}
      <DesktopOnly label="ステータス変更はPCから">
      <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <span className="text-xs font-semibold text-slate-500">ステータス:</span>
        <button
          onClick={() => changeStatus("in_progress")}
          disabled={isPending || status === "in_progress"}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed">
          対応中にする
        </button>
        <button
          onClick={() => changeStatus("done")}
          disabled={isPending || status === "done"}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
          完了にする
        </button>
      </div>
      </DesktopOnly>

      {/* 作成済みタスク */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 mb-3">
          このブリーフから作成したタスク（{tasks.length}件）
        </h2>
        {tasks.length === 0 ? (
          <p className="text-xs text-slate-400">まだこのブリーフからタスクは作成されていません。下のフォームから作成してください</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: getProgressColor(t.progress) }}>
                  {t.progress}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{t.title}</p>
                  <p className="text-[10px] text-slate-400">担当: {t.assignee}{t.revenue > 0 ? ` · 売上 ¥${t.revenue.toLocaleString()}` : ""}{t.dueDate ? ` · 期限: ${t.dueDate}` : ""}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getPriorityColor(t.priority)}`}>
                  {getPriorityLabel(t.priority)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* タスク作成フォーム */}
      <DesktopOnly label="タスク作成・社員への割り当てはPCから">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Plus size={15} className="text-teal-600" /> 新しいタスクを作成する
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">タスク名 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
              placeholder="例: 商談リストのホット案件抽出" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">説明</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none"
              placeholder="作業内容の補足..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">優先度 *</label>
              <div className="flex gap-1.5 mt-1">
                {PRIORITIES.map((p) => (
                  <button key={p.key} onClick={() => setPriority(p.key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      priority === p.key ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">期限</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
            </div>
          </div>

          {/* 売上タイプ・売上額 */}
          <div>
            <label className="text-xs font-semibold text-slate-500">このタスクで発生する売上</label>
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {([
                { v: "none", label: "売上なし" },
                { v: "one_time", label: "単発" },
                { v: "monthly", label: "月額" },
              ] as const).map((o) => (
                <button key={o.v} type="button" onClick={() => setRevenueType(o.v)}
                  className={`py-2 rounded-xl text-xs border transition-all ${
                    revenueType === o.v ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}>{o.label}</button>
              ))}
            </div>
            {revenueType !== "none" && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-slate-500">¥</span>
                <input value={revenue} onChange={(e) => setRevenue(e.target.value)} inputMode="numeric"
                  placeholder="例: 300000"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
                {revenueType === "monthly" && <span className="text-xs text-slate-400 whitespace-nowrap">/ 月</span>}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              {revenueType === "none" && "このタスクは売上目標に計上されません"}
              {revenueType === "one_time" && "完了した月に、今月の売上目標の達成分として集計されます"}
              {revenueType === "monthly" && "月額制。解約されるまで毎月の達成売上に計上されます"}
            </p>
          </div>

          {/* 担当社員の指名 */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <UserCheck size={12} className="text-teal-600" /> 担当社員を指名 *
                {assignedTo.length > 0 && <span className="text-teal-600">（{assignedTo.length}名選択中）</span>}
              </label>
              <div className="flex gap-1 text-[10px]">
                <button onClick={() => { setScope("managed"); setAssignedTo([]); }}
                  className={`px-2 py-0.5 rounded-full border ${scope === "managed" ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-400 border-slate-200"}`}>
                  自分の管轄のみ
                </button>
                <button onClick={() => { setScope("all"); setAssignedTo([]); }}
                  className={`px-2 py-0.5 rounded-full border ${scope === "all" ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-400 border-slate-200"}`}>
                  全社員から選ぶ
                </button>
              </div>
            </div>
            {options.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600">
                管轄内に社員がいません。「全社員から選ぶ」に切り替えてください
              </p>
            ) : (
              <>
                <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {options.map((e) => {
                    const checked = assignedTo.includes(e.id);
                    return (
                      <label key={e.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${checked ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleAssignee(e.id)}
                          className="w-4 h-4 accent-teal-600" />
                        <span className="text-slate-700">{e.name}</span>
                        {e.specialty && <span className="text-[11px] text-slate-400">（{e.specialty}）</span>}
                      </label>
                    );
                  })}
                </div>
                {assignedTo.length > 1 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    選択した人数分、同じ内容のタスクを個別に作成します（売上は重複を避けるため先頭の1件のみに計上）
                  </p>
                )}
              </>
            )}
          </div>

          {/* チェックリスト（任意） */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-500">チェックリスト（任意）</label>
              <span className={`text-[10px] ${checklistTotal > 100 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                合計: {checklistTotal}% / 100%
              </span>
            </div>
            <div className="space-y-2">
              {checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={c.title}
                    onChange={(e) => setChecklist((cl) => cl.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-400"
                    placeholder="チェック項目" />
                  <input type="number" value={c.weight} min={1} max={100}
                    onChange={(e) => setChecklist((cl) => cl.map((x, j) => j === i ? { ...x, weight: Number(e.target.value) } : x))}
                    className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-400" />
                  <span className="text-[10px] text-slate-400">%</span>
                  <button onClick={() => setChecklist((cl) => cl.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setChecklist((cl) => [...cl, { title: "", weight: 0 }])}
              className="mt-2 flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700">
              <Plus size={12} /> チェック項目を追加
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={submitTask} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> 作成中...</> : <><Plus size={14} /> このタスクを作成する</>}
            </button>
          </div>
        </div>
      </div>
      </DesktopOnly>
    </div>
  );
}
