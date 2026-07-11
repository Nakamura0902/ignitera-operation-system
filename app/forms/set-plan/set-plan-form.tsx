"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  TextField, TextAreaField, ChipCheckboxGroup, ChipRadioGroup,
} from "@/components/forms/fields";
import {
  CURRENT_TOOLS_OPTIONS, SETPLAN_ISSUES_OPTIONS, INTERESTED_SERVICES_OPTIONS,
  SETPLAN_TIMING_OPTIONS, SETPLAN_BUDGET_OPTIONS,
} from "@/lib/line-customer-utils";
import { createLineCustomer } from "../actions";

export default function SetPlanForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [currentTools, setCurrentTools] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [timing, setTiming] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("お名前を入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await createLineCustomer({
      form_type: "セットプラン相談",
      name, company_name: company, industry, website_url: websiteUrl,
      current_tools: currentTools, issues, interested_services: services,
      desired_timing: timing, budget, message,
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
          内容を確認のうえ、担当より必要な支援内容を整理してご案内します。<br />
          今しばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">セットプラン相談フォーム</h1>
        <p className="text-sm text-slate-500 leading-relaxed mt-3">
          HP・LINE・MEO・SNSなどを組み合わせて、事業の集客導線を整えるセットプランの相談フォームです。現在の状況をもとに、必要な支援内容を整理してご案内します。
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-6">
        <TextField label="お名前" value={name} onChange={setName} required placeholder="山田 太郎" />
        <TextField label="会社名・店舗名" value={company} onChange={setCompany} placeholder="株式会社〇〇" />
        <TextField label="業種" value={industry} onChange={setIndustry} placeholder="飲食 / 美容 / 建設 など" />
        <TextField label="現在のホームページやSNSのURL" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://" />

        <ChipCheckboxGroup label="現在使っているもの" options={CURRENT_TOOLS_OPTIONS}
          selected={currentTools} onToggle={(v) => toggle(currentTools, setCurrentTools, v)} />

        <ChipCheckboxGroup label="現在の課題" options={SETPLAN_ISSUES_OPTIONS}
          selected={issues} onToggle={(v) => toggle(issues, setIssues, v)} />

        <ChipCheckboxGroup label="興味のある支援内容" options={INTERESTED_SERVICES_OPTIONS}
          selected={services} onToggle={(v) => toggle(services, setServices, v)} />

        <ChipRadioGroup label="希望時期" options={SETPLAN_TIMING_OPTIONS} value={timing} onChange={setTiming} />

        <ChipRadioGroup label="予算感" options={SETPLAN_BUDGET_OPTIONS} value={budget} onChange={setBudget} />

        <TextAreaField label="相談したい内容" value={message} onChange={setMessage}
          placeholder="現在の状況や、実現したいことをご記入ください" rows={5} />

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
