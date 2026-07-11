"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";
import { isPushSupported, getPushSubscribed, enablePush, disablePush } from "@/lib/push-client";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { updateNotificationPrefs } from "@/app/(employee)/settings/actions";

function StatusMessage({ message, isError }: { message: string; isError: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl ${
      isError ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
    }`}>
      {isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {message}
    </div>
  );
}

export default function NotificationSettings({
  userId,
  initialMuted,
}: {
  userId: string;
  initialMuted: string[];
}) {
  // --- Push（この端末） ---
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    getPushSubscribed().then(setSubscribed).catch(() => {});
  }, []);

  async function togglePush() {
    setBusy(true);
    setPushMsg(null);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
        setPushMsg({ text: "この端末の通知をオフにしました", error: false });
      } else {
        const res = await enablePush();
        if (res.ok) {
          setSubscribed(true);
          setPushMsg({ text: "この端末で通知を受け取ります", error: false });
        } else {
          setPushMsg({ text: res.error ?? "有効化に失敗しました", error: true });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  // --- 種類別オン/オフ ---
  const [muted, setMuted] = useState<string[]>(initialMuted);
  const [saving, setSaving] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ text: string; error: boolean } | null>(null);

  function toggleType(type: string) {
    setMuted((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function savePrefs() {
    setSaving(true);
    setPrefMsg(null);
    const res = await updateNotificationPrefs(userId, muted);
    setSaving(false);
    if (res.error) setPrefMsg({ text: res.error, error: true });
    else {
      setPrefMsg({ text: "通知設定を保存しました", error: false });
      setTimeout(() => setPrefMsg(null), 3000);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={15} className="text-blue-600" />
        <h2 className="text-sm font-bold text-slate-700">通知設定</h2>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        プッシュ通知の受信と、種類ごとの受け取りを設定します。
        {!supported && "（この端末／ブラウザは通知に対応していません。iPhoneはホーム画面に追加してからお試しください）"}
      </p>

      {/* Push トグル */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-500 mb-2">プッシュ通知（この端末）</p>
        {pushMsg && <div className="mb-2"><StatusMessage message={pushMsg.text} isError={pushMsg.error} /></div>}
        <button
          onClick={togglePush}
          disabled={!supported || busy}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
            subscribed ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {busy ? "処理中..." : subscribed ? "この端末の通知をオフにする" : "この端末で通知をオンにする"}
        </button>
      </div>

      {/* 種類別オン/オフ */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500 mb-3">受け取る通知の種類</p>
        <div className="space-y-2 mb-3">
          {NOTIFICATION_TYPES.map(({ value, label }) => {
            const on = !muted.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleType(value)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm text-slate-700">{label}</span>
                <span className={`relative w-10 h-5 rounded-full transition-colors ${on ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                </span>
              </button>
            );
          })}
        </div>
        {prefMsg && <div className="mb-3"><StatusMessage message={prefMsg.text} isError={prefMsg.error} /></div>}
        <button
          onClick={savePrefs}
          disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? "保存中..." : "通知設定を保存する"}
        </button>
      </div>
    </div>
  );
}
