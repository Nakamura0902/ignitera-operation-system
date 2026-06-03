"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (err) {
      setError("送信に失敗しました。メールアドレスを確認してください。");
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#020B2D] items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 relative">
            <Image src="/images/logo.png" alt="IGNITERA" fill className="object-contain" />
          </div>
          <span className="text-slate-800 font-bold text-sm">IGNITERA</span>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">メールを送信しました</h2>
            <p className="text-slate-500 text-sm mb-2">
              <span className="font-medium text-slate-700">{email}</span> に<br />
              パスワードリセット用のリンクを送信しました。
            </p>
            <p className="text-xs text-slate-400 mb-6">メールが届かない場合は迷惑メールフォルダをご確認ください。</p>
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5">
              <ArrowLeft size={14} /> ログイン画面へ戻る
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">パスワードリセット</h2>
            <p className="text-slate-500 text-sm mb-6">
              登録済みのメールアドレスを入力してください。<br />リセット用リンクをお送りします。
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">メールアドレス</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)", boxShadow: "0 4px 24px rgba(37,99,235,0.3)" }}
              >
                {loading ? "送信中..." : "リセットリンクを送信"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5">
                <ArrowLeft size={13} /> ログイン画面へ戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
