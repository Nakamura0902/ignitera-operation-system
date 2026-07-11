"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, ExternalLink, Send, MessageSquare } from "lucide-react";
import type { LineCustomer } from "@/types/line-customer";
import { STATUS_OPTIONS, TEMPERATURE_OPTIONS, PLAN_OPTIONS } from "@/lib/line-customer-utils";
import { formatJstDateTime } from "@/lib/format-date";
import { updateLineCustomer, sendLineMessageToCustomer } from "./actions";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 sm:w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-700 flex-1 break-words">{value || "—"}</span>
    </div>
  );
}

function Chips({ items }: { items: string[] | null }) {
  if (!items || items.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{i}</span>
      ))}
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#b08d57]">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function LineSendCard({ customerId, displayName }: { customerId: string; displayName: string | null }) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  function send() {
    setMsg(null);
    startTransition(async () => {
      const res = await sendLineMessageToCustomer(customerId, text);
      if (res.error) setMsg({ text: res.error, error: true });
      else {
        setMsg({ text: "LINEに送信しました", error: false });
        setText("");
        setTimeout(() => setMsg(null), 3000);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={15} style={{ color: "#06c755" }} />
        <h2 className="text-sm font-bold text-slate-700">LINEで送信</h2>
      </div>
      <p className="text-[11px] text-slate-400">{displayName ? `${displayName} さんのLINEに直接送信します。` : "この相談者のLINEに直接送信します。"}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="メッセージを入力"
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#06c755] resize-none" />
      {msg && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
          msg.error ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>
          {msg.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {msg.text}
        </div>
      )}
      <button onClick={send} disabled={isPending || !text.trim()}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "#06c755" }}>
        {isPending ? <><Loader2 size={14} className="animate-spin" /> 送信中...</> : <><Send size={14} /> LINEに送信</>}
      </button>
    </div>
  );
}

export default function CustomerDetailClient({ customer }: { customer: LineCustomer }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState(customer.status);
  const [temperature, setTemperature] = useState(customer.temperature);
  const [plan, setPlan] = useState(customer.estimated_plan);
  const [assignee, setAssignee] = useState(customer.assignee ?? "");
  const [memo, setMemo] = useState(customer.memo ?? "");
  const [nextAction, setNextAction] = useState(customer.next_action ?? "");
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateLineCustomer(customer.id, {
        status, temperature, estimated_plan: plan,
        assignee, memo, next_action: nextAction,
      });
      if (res.error) setMsg({ text: res.error, error: true });
      else {
        setMsg({ text: "保存しました", error: false });
        router.refresh();
        setTimeout(() => setMsg(null), 3000);
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Link href="/command-center/line-customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#b08d57]">
        <ArrowLeft size={15} /> 一覧に戻る
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-800">{customer.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {customer.form_type}・{customer.source ?? "LINE"}・登録 {formatJstDateTime(customer.created_at)}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* 左：フォーム回答 */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-3">基本情報</h2>
            <InfoRow label="お名前" value={customer.name} />
            <InfoRow label="会社名・店舗名" value={customer.company_name} />
            <InfoRow label="業種" value={customer.industry} />
            <InfoRow label="連絡方法" value={customer.contact_method} />
            <InfoRow label="URL / SNS" value={
              customer.website_url ? (
                <a href={customer.website_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#b08d57] hover:underline break-all">
                  {customer.website_url} <ExternalLink size={12} className="shrink-0" />
                </a>
              ) : null
            } />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-3">フォーム回答</h2>
            <InfoRow label="現在使っているもの" value={<Chips items={customer.current_tools} />} />
            <InfoRow label="課題 / 状況" value={<Chips items={customer.issues} />} />
            <InfoRow label="興味サービス" value={<Chips items={customer.interested_services} />} />
            <InfoRow label="希望時期" value={customer.desired_timing} />
            <InfoRow label="予算感" value={customer.budget} />
            <InfoRow label="相談内容" value={
              customer.message ? <span className="whitespace-pre-wrap leading-relaxed">{customer.message}</span> : null
            } />
          </div>
        </div>

        {/* 右：編集 */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700">管理情報</h2>
            <Select label="ステータス" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <Select label="温度感" value={temperature} onChange={setTemperature} options={TEMPERATURE_OPTIONS} />
            <Select label="検討プラン" value={plan} onChange={setPlan} options={PLAN_OPTIONS} />
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">担当者</label>
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)}
                placeholder="担当者名"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#b08d57]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">次回アクション</label>
              <input value={nextAction} onChange={(e) => setNextAction(e.target.value)}
                placeholder="例：来週LINEでフォロー"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#b08d57]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">メモ</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4}
                placeholder="社内メモ"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#b08d57] resize-none" />
            </div>

            {msg && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
                msg.error ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {msg.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {msg.text}
              </div>
            )}

            <button onClick={save} disabled={isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #0f1b3a, #1e2a4a)" }}>
              {isPending ? <><Loader2 size={14} className="animate-spin" /> 保存中...</> : "変更を保存する"}
            </button>
          </div>

          {customer.line_user_id && (
            <LineSendCard customerId={customer.id} displayName={customer.line_display_name} />
          )}
        </div>
      </div>
    </div>
  );
}
