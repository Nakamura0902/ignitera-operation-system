"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password === confirm;
  const isValid = password.length >= 8 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (err) {
      setError("パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#020B2D] items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 relative">
            <Image src="/images/logo.png" alt="IGNITERA" fill className="object-contain" />
          </div>
          <span className="text-slate-800 font-bold text-sm">IGNITERA</span>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">パスワードを変更しました</h2>
            <p className="text-slate-500 text-sm">ログイン画面へ移動しています...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">新しいパスワード設定</h2>
            <p className="text-slate-500 text-sm mb-6">8文字以上の新しいパスワードを設定してください。</p>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">新しいパスワード</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8文字以上で入力"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">パスワード（確認）</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="パスワードを再入力"
                    disabled={loading}
                    className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                      confirm && !passwordsMatch
                        ? "border-red-300 focus:ring-red-500/30"
                        : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirm && !passwordsMatch && (
                  <p className="text-[11px] text-red-500 mt-1">パスワードが一致しません。</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)", boxShadow: "0 4px 24px rgba(37,99,235,0.3)" }}
              >
                {loading ? "更新中..." : "パスワードを変更する"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
