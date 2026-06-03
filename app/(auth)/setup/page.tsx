"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, CheckCircle2, User, ArrowLeft, Building2 } from "lucide-react";
import { setupEmployee, getDepartments } from "@/lib/actions/auth";

const DEPT_LABELS: Record<string, string> = {
  development: "開発部",
  sales: "営業部",
  projects: "案件管理部",
  accounting: "経理・請求部",
  operations: "事務・オペレーション部",
};

const steps = [
  { num: 1, label: "アカウント設定" },
  { num: 2, label: "確認" },
  { num: 3, label: "完了" },
];

export default function SetupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [assignedId, setAssignedId] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  const passwordsMatch = password === passwordConfirm;
  const isValid =
    fullName.trim() !== "" &&
    departmentId !== "" &&
    email.trim() !== "" &&
    password.length >= 8 &&
    passwordsMatch &&
    agreed;

  const selectedDeptName = departments.find((d) => d.id === departmentId);
  const selectedDeptLabel = selectedDeptName
    ? DEPT_LABELS[selectedDeptName.name] ?? selectedDeptName.name
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setIsLoading(true);

    startTransition(async () => {
      const result = await setupEmployee(email, password, fullName, departmentId || null);
      setIsLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.employeeId) setAssignedId(result.employeeId);
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    });
  };

  return (
    <div className="min-h-screen w-full flex bg-[#020B2D]">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #020B2D 0%, #06194A 55%, #0A1454 100%)" }}
      >
        <div className="absolute top-[-100px] right-[-100px] w-[380px] h-[380px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #A78BFA 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #6D4AFF, #2563EB, transparent)" }} />

        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 relative">
              <Image src="/images/logo.png" alt="IGNITERA" fill className="object-contain" />
            </div>
            <span className="text-white font-bold text-sm tracking-wider">IGNITERA</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <p className="text-purple-300/60 text-xs font-medium tracking-[0.2em] uppercase mb-4">
              はじめまして！
            </p>
            <h1 className="text-white text-3xl font-bold leading-tight mb-4">
              これから、あなたの業務を支える<br />
              強力なパートナーになります。
            </h1>
            <p className="text-blue-200/50 text-sm mb-12">まずは初期設定を完了しましょう。</p>

            <div className="space-y-5">
              {[
                { icon: "🔒", title: "エンタープライズ級のセキュリティ", desc: "通信とデータを暗号化し、厳重に保護します。" },
                { icon: "👤", title: "あなただけの専用アカウント", desc: "自動発行された社員IDで、安全に利用できます。" },
                { icon: "✅", title: "かんたんセットアップ", desc: "3ステップで設定完了。すぐに利用開始できます。" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{ background: "rgba(109,74,255,0.2)", border: "1px solid rgba(167,139,250,0.2)" }}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-0.5">{title}</p>
                    <p className="text-blue-200/50 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 bg-white flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-[600px]">
          {done ? (
            /* ── Completion screen ── */
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">初期設定が完了しました</h2>
              <p className="text-slate-500 text-sm mb-6">
                {fullName}さんの社員IDが発行されました。
              </p>
              <div className="inline-block bg-slate-50 border border-slate-200 rounded-xl px-8 py-4 mb-3">
                <p className="text-xs text-slate-500 mb-1">発行された社員ID</p>
                <p className="text-3xl font-bold text-blue-600 tracking-wider">{assignedId}</p>
              </div>
              <p className="text-xs text-slate-400 mb-2">このIDをメモしてください。ログイン時に使用します。</p>
              <p className="text-slate-400 text-xs mt-4">ログイン画面へ移動しています...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">初期設定</h2>
                  <p className="text-slate-500 text-sm mt-0.5">最初にログイン情報を設定してください。</p>
                </div>
                <Link href="/login" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
                  <ArrowLeft size={14} /> ログインへ
                </Link>
              </div>

              {/* Step bar */}
              <div className="flex items-center gap-0 mb-8 mt-6">
                {steps.map(({ num, label }, idx) => (
                  <div key={num} className="flex items-center flex-1">
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        num === 1 ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-400"
                      }`}>
                        {num}
                      </div>
                      <span className={`text-xs font-medium whitespace-nowrap ${num === 1 ? "text-slate-700" : "text-slate-400"}`}>
                        {label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-3" />}
                  </div>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-5 gap-5">
                {/* Form — 3 cols */}
                <div className="col-span-3 space-y-5">
                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Full name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">氏名</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="例）山田 太郎"
                          disabled={isLoading}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">部署</label>
                      <div className="relative">
                        <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                        <select
                          value={departmentId}
                          onChange={(e) => setDepartmentId(e.target.value)}
                          disabled={isLoading || departments.length === 0}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50 bg-white appearance-none"
                        >
                          <option value="">部署を選択してください</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {DEPT_LABELS[dept.name] ?? dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">メールアドレス</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="例）your.email@company.com"
                          disabled={isLoading}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">ログイン通知や重要なお知らせをお送りします。</p>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="8文字以上で入力"
                          disabled={isLoading}
                          className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                        <button type="button" onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Password confirm */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード（確認用）</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPasswordConfirm ? "text" : "password"}
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          placeholder="パスワードを再入力"
                          disabled={isLoading}
                          className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                            passwordConfirm && !passwordsMatch
                              ? "border-red-300 focus:ring-red-500/30 focus:border-red-500"
                              : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
                          }`}
                        />
                        <button type="button" onClick={() => setShowPasswordConfirm((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPasswordConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {passwordConfirm && !passwordsMatch && (
                        <p className="text-[11px] text-red-500 mt-1">パスワードが一致しません。</p>
                      )}
                    </div>

                    {/* Notice */}
                    <div className="px-4 py-3 rounded-xl text-xs text-blue-700/80 leading-relaxed"
                      style={{ background: "#F0F4FF", border: "1px solid #DBEAFE" }}>
                      ※ 社員IDは登録完了後に自動発行されます。ログイン時に使用します。
                    </div>

                    {/* Agreement */}
                    <button
                      type="button"
                      onClick={() => setAgreed((v) => !v)}
                      className="flex items-center gap-2.5 text-sm text-slate-600"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                        agreed ? "bg-blue-600 border-blue-600" : "border-slate-300"
                      }`}>
                        {agreed && (
                          <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      利用規約と社内セキュリティポリシーに同意する
                    </button>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!isValid || isLoading}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                        boxShadow: "0 4px 24px rgba(37,99,235,0.3)",
                      }}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          登録中...
                        </span>
                      ) : "初期設定を完了する"}
                    </button>
                  </form>
                </div>

                {/* Summary card — 2 cols */}
                <div className="col-span-2">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sticky top-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">設定内容の確認</p>
                    <div className="space-y-3.5">
                      {[
                        { label: "氏名", value: fullName.trim() || "（未入力）", icon: User, highlight: false },
                        { label: "部署", value: selectedDeptLabel || "（未選択）", icon: Building2, highlight: false },
                        { label: "ログイン方法", value: "社員ID + パスワード", icon: Lock, highlight: false },
                        { label: "社員ID", value: "登録完了後に自動発行", icon: User, highlight: false },
                        { label: "ステータス", value: "初期設定中", icon: CheckCircle2, highlight: true },
                      ].map(({ label, value, icon: Icon, highlight }) => (
                        <div key={label} className="flex items-start gap-2.5">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            highlight ? "bg-emerald-100" : "bg-blue-50"
                          }`}>
                            <Icon size={12} className={highlight ? "text-emerald-600" : "text-blue-500"} />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 leading-none mb-0.5">{label}</p>
                            <p className={`text-xs font-semibold ${highlight ? "text-emerald-600" : "text-slate-700"}`}>
                              {value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed px-1">
                    ※ パスワードは第三者に共有せず、<br />大切に管理してください。
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
