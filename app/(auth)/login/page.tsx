"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Eye, EyeOff, Shield, ArrowRight,
  ClipboardList, TrendingUp, Coins, Lock, User,
} from "lucide-react";
import FireTransition from "@/components/fire-transition";
import { loginWithEmployeeId } from "@/lib/actions/auth";

type Phase = "idle" | "loading" | "success" | "fire";

const features = [
  {
    icon: ClipboardList,
    title: "割り当てられたタスクを確認",
    desc: "自分に必要な業務を一覧で確認できます。",
  },
  {
    icon: TrendingUp,
    title: "進捗状況をリアルタイムで把握",
    desc: "タスクの進捗率や期限をひと目でチェック。",
  },
  {
    icon: Coins,
    title: "ポイント・給与見込みを確認",
    desc: "獲得ポイントや給与の見込みを確認できます。",
  },
];

export default function LoginPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !password) return;
    setError(null);
    setPhase("loading");

    const result = await loginWithEmployeeId(employeeId, password);
    if (result.error) {
      setError(result.error);
      setPhase("idle");
      return;
    }
    setPhase("success");
    setTimeout(() => setPhase("fire"), 420);
  };

  const handleFireComplete = () => {
    window.location.href = "/";
  };

  const isLoading = phase === "loading";
  const isSuccess = phase === "success" || phase === "fire";

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-[#020B2D]">
      {/* Fire transition overlay */}
      {phase === "fire" && <FireTransition onComplete={handleFireComplete} />}

      {/* Login card — dissolves during fire */}
      <div
        className="w-full flex min-h-screen transition-all duration-500"
        style={{
          opacity: phase === "fire" ? 0 : 1,
          filter: phase === "fire" ? "blur(6px)" : "none",
          transform: phase === "fire" ? "scale(0.985)" : "scale(1)",
        }}
      >
        {/* ── Left brand panel ── */}
        <div
          className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #020B2D 0%, #06194A 50%, #0A1454 100%)",
          }}
        >
          {/* Decorative glow orbs */}
          <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #6D4AFF 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-60px] right-[-100px] w-[350px] h-[350px] rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)" }} />

          {/* Bottom light line decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, #6D4AFF, #2563EB, transparent)" }} />
          <div className="absolute bottom-8 left-0 right-0 h-px opacity-30"
            style={{ background: "linear-gradient(90deg, transparent, #A78BFA, transparent)" }} />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full p-10">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-12">
              <div className="w-8 h-8 relative">
                <Image src="/images/logo.png" alt="IGNITERA" fill className="object-contain" />
              </div>
              <span className="text-white font-bold text-sm tracking-wider">IGNITERA</span>
            </div>

            {/* Hero text */}
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-blue-300/60 text-xs font-medium tracking-[0.2em] uppercase mb-4">
                IGNITERA Command Center
              </p>
              <h1 className="text-white text-3xl font-bold leading-tight mb-4">
                AIが整理した仕事を、<br />迷わず実行。
              </h1>
              <p className="text-blue-200/50 text-sm mb-12">
                社内AI業務オペレーションシステム
              </p>

              {/* Feature cards */}
              <div className="space-y-4">
                {features.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(37, 99, 235, 0.2)", border: "1px solid rgba(96,165,250,0.2)" }}>
                      <Icon size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold mb-0.5">{title}</p>
                      <p className="text-blue-200/50 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subtle dashboard decoration */}
            <div className="mt-8 relative">
              <div className="rounded-xl border border-white/5 bg-white/3 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/40 text-xs">システム稼働中</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["タスク実行中", "AI処理件数", "今月の達成率"].map((label, i) => (
                    <div key={label} className="text-center">
                      <p className="text-blue-300 text-lg font-bold">
                        {["16", "128", "94%"][i]}
                      </p>
                      <p className="text-white/30 text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 bg-white flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-[420px]">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-7 h-7 relative">
                <Image src="/images/logo.png" alt="IGNITERA" fill className="object-contain" />
              </div>
              <span className="text-slate-800 font-bold text-sm">IGNITERA</span>
            </div>

            {/* Title */}
            <h2 className="text-[28px] font-bold text-slate-900 mb-1">社員ログイン</h2>
            <p className="text-slate-500 text-sm mb-8">社員IDとパスワードでログインします。</p>

            {/* Error message */}
            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">社員ID</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="社員IDを入力してください"
                    disabled={isLoading || isSuccess}
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力してください"
                    disabled={isLoading || isSuccess}
                    className="w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me + forgot password */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRememberMe((v) => !v)}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    rememberMe ? "bg-blue-600 border-blue-600" : "border-slate-300"
                  }`}>
                    {rememberMe && (
                      <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  ログイン状態を保持
                </button>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  パスワードを忘れた方はこちら
                </Link>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={isLoading || isSuccess || !employeeId.trim() || !password}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all relative overflow-hidden disabled:opacity-60"
                style={{
                  background: isSuccess
                    ? "linear-gradient(135deg, #059669, #10b981)"
                    : "linear-gradient(135deg, #2563EB, #7C3AED)",
                  boxShadow: isSuccess
                    ? "0 4px 24px rgba(5,150,105,0.35)"
                    : "0 4px 24px rgba(37,99,235,0.35)",
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    認証中...
                  </span>
                ) : isSuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                      <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    認証完了
                  </span>
                ) : (
                  "ログイン"
                )}
              </button>
            </form>

            {/* Notice card */}
            <div className="mt-6 px-4 py-3.5 rounded-xl flex items-start gap-3"
              style={{ background: "#F0F4FF", border: "1px solid #DBEAFE" }}>
              <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 shrink-0">
                <span className="text-blue-600 text-[9px] font-bold">i</span>
              </div>
              <p className="text-blue-700/80 text-xs leading-relaxed">
                ※ 指示入力は社長のみ可能です。<br />
                社員はAIが整理した業務を確認・実行します。
              </p>
            </div>

            {/* Setup link */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 mb-2">まだ社員IDをお持ちでない方</p>
              <Link
                href="/setup"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                初期登録はこちら
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Admin link */}
            <div className="mt-4 text-center">
              <Link
                href="/login?role=admin"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Shield size={13} />
                管理者ログインはこちら
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
