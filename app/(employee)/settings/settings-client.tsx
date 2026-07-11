"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Lock, CheckCircle2, AlertCircle, Target } from "lucide-react";
import { updateDisplayName, updatePassword, updateSpecialty } from "./actions";
import NotificationSettings from "@/components/settings/notification-settings";
import type { CurrentUser } from "@/lib/get-current-user";

const SPECIALTY_PRESETS = ["営業", "開発", "案件管理", "経理・請求", "事務・オペレーション"];

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

export default function SettingsClient({
  user,
  initialSpecialty,
  initialMutedTypes,
}: {
  user: CurrentUser;
  initialSpecialty: string | null;
  initialMutedTypes: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 氏名変更
  const [newName, setNewName] = useState(user.name);
  const [nameMsg, setNameMsg] = useState<{ text: string; error: boolean } | null>(null);

  // 専門（マネージャーのみ）
  const isPreset = initialSpecialty ? SPECIALTY_PRESETS.includes(initialSpecialty) : true;
  const [specialtyChoice, setSpecialtyChoice] = useState<string>(
    initialSpecialty ? (isPreset ? initialSpecialty : "その他") : ""
  );
  const [customSpecialty, setCustomSpecialty] = useState(isPreset ? "" : initialSpecialty ?? "");
  const [specMsg, setSpecMsg] = useState<{ text: string; error: boolean } | null>(null);

  // パスワード変更
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; error: boolean } | null>(null);

  function handleNameUpdate() {
    setNameMsg(null);
    startTransition(async () => {
      const result = await updateDisplayName(user.id, newName);
      if (result.error) setNameMsg({ text: result.error, error: true });
      else {
        setNameMsg({ text: "氏名を更新しました", error: false });
        router.refresh();
        setTimeout(() => setNameMsg(null), 3000);
      }
    });
  }

  function handleSpecialtyUpdate() {
    setSpecMsg(null);
    const value = specialtyChoice === "その他" ? customSpecialty.trim() : specialtyChoice;
    if (!value) return setSpecMsg({ text: "専門を選択してください", error: true });
    startTransition(async () => {
      const result = await updateSpecialty(user.id, value);
      if (result.error) setSpecMsg({ text: result.error, error: true });
      else {
        setSpecMsg({ text: "専門を更新しました", error: false });
        router.refresh();
        setTimeout(() => setSpecMsg(null), 3000);
      }
    });
  }

  function handlePasswordUpdate() {
    setPwMsg(null);
    startTransition(async () => {
      const result = await updatePassword(newPw, confirmPw);
      if (result.error) setPwMsg({ text: result.error, error: true });
      else {
        setPwMsg({ text: "パスワードを更新しました", error: false });
        setNewPw("");
        setConfirmPw("");
        setTimeout(() => setPwMsg(null), 3000);
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-800">設定・プロフィール</h1>

      {/* プロフィール表示 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{user.name}</p>
            <p className="text-sm text-slate-500">{user.department} / {user.employeeId}</p>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            { label: "区分", value: user.department },
            { label: "社員ID", value: user.employeeId },
            { label: "メールアドレス", value: user.email },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-medium text-slate-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 専門（マネージャーのみ） */}
      {user.role === "manager" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Target size={15} className="text-teal-600" />
            <h2 className="text-sm font-bold text-slate-700">専門（マネージャー専用）</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            あなたが管轄する専門領域を1つ選択してください。社長からの指示ブリーフはこの専門に基づいてあなた宛に振り分けられます。1つの専門につき担当マネージャーは1人です。
          </p>
          <div className="space-y-2 mb-3">
            {[...SPECIALTY_PRESETS, "その他"].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" name="specialty" checked={specialtyChoice === opt}
                  onChange={() => setSpecialtyChoice(opt)} className="accent-teal-600" />
                {opt}
                {opt === "その他" && specialtyChoice === "その他" && (
                  <input value={customSpecialty} onChange={(e) => setCustomSpecialty(e.target.value)}
                    className="ml-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-400"
                    placeholder="自由入力" />
                )}
              </label>
            ))}
          </div>
          {specMsg && <div className="mb-3"><StatusMessage message={specMsg.text} isError={specMsg.error} /></div>}
          <button onClick={handleSpecialtyUpdate} disabled={isPending}
            className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
            {isPending ? "更新中..." : "専門を更新する"}
          </button>
        </div>
      )}

      {/* 通知設定（Push＋種類別） */}
      <NotificationSettings userId={user.id} initialMuted={initialMutedTypes} />

      {/* 氏名変更 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Pencil size={15} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-700">氏名の変更</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">新しい氏名</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
              placeholder="例）山田 太郎" disabled={isPending} />
          </div>
          {nameMsg && <StatusMessage message={nameMsg.text} isError={nameMsg.error} />}
          <button onClick={handleNameUpdate} disabled={isPending || !newName.trim() || newName === user.name}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {isPending ? "更新中..." : "氏名を更新する"}
          </button>
        </div>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={15} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-700">パスワードの変更</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">新しいパスワード（8文字以上）</label>
            <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
              placeholder="新しいパスワード" disabled={isPending} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">確認用パスワード</label>
            <input type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
              placeholder="もう一度入力" disabled={isPending} />
          </div>
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-xs text-slate-400 hover:text-slate-600">
            {showPw ? "パスワードを隠す" : "パスワードを表示する"}
          </button>
          {pwMsg && <StatusMessage message={pwMsg.text} isError={pwMsg.error} />}
          <button onClick={handlePasswordUpdate} disabled={isPending || !newPw || !confirmPw}
            className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50">
            {isPending ? "更新中..." : "パスワードを変更する"}
          </button>
        </div>
      </div>
    </div>
  );
}
