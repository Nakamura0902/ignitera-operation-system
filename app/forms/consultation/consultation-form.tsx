"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  TextField, TextAreaField, ChipCheckboxGroup, ChipRadioGroup,
} from "@/components/forms/fields";
import {
  CONSULTATION_ISSUES_OPTIONS, CONSULTATION_TIMING_OPTIONS,
  CONSULTATION_BUDGET_OPTIONS, CONTACT_METHOD_OPTIONS,
} from "@/lib/line-customer-utils";
import { createLineCustomer } from "../actions";
import { useLiffProfile } from "@/components/forms/use-liff-profile";

export default function ConsultationForm() {
  const liffProfile = useLiffProfile();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [timing, setTiming] = useState("");
  const [budget, setBudget] = useState("");
  const [contactMethod, setContactMethod] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleIssue(v: string) {
    setIssues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("お名前を入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await createLineCustomer({
      form_type: "まずは相談",
      name, company_name: company, industry, website_url: websiteUrl,
      issues, message, desired_timing: timing, budget, contact_method: contactMethod,
      ...liffProfile,
    });
    setLoading(false);
    if (res.error) setError(res.error);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">送信ありがとうございます</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          いただいた内容をもとに、必要な支援内容を一緒に整理してご連絡します。<br />
          今しばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">まずは相談フォーム</h1>
        <p className="text-sm text-slate-500 leading-relaxed mt-3">
          具体的な依頼内容が決まっていない方でも大丈夫です。現在の状況や気になっていることをもとに、必要な支援内容を一緒に整理します。
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-6">
        <TextField label="お名前" value={name} onChange={setName} required placeholder="山田 太郎" />
        <TextField label="会社名・店舗名" value={company} onChange={setCompany} placeholder="株式会社〇〇" />
        <TextField label="業種" value={industry} onChange={setIndustry} placeholder="飲食 / 美容 / 建設 など" />
        <TextField label="現在のURL・SNS" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://" />

        <ChipCheckboxGroup label="今の状況に近いもの" options={CONSULTATION_ISSUES_OPTIONS}
          selected={issues} onToggle={toggleIssue} />

        <TextAreaField label="相談したい内容" value={message} onChange={setMessage}
          placeholder="気になっていること、実現したいことをご記入ください" rows={5} />

        <ChipRadioGroup label="希望時期" options={CONSULTATION_TIMING_OPTIONS} value={timing} onChange={setTiming} />

        <ChipRadioGroup label="予算感" options={CONSULTATION_BUDGET_OPTIONS} value={budget} onChange={setBudget} />

        <ChipRadioGroup label="希望する連絡方法" options={CONTACT_METHOD_OPTIONS}
          value={contactMethod} onChange={setContactMethod} />

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #0f1b3a, #1e2a4a)" }}
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> 送信中...</> : "この内容で相談する"}
        </button>
      </div>
    </div>
  );
}
