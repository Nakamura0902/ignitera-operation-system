"use client";

import { useState, useEffect } from "react";
import {
  Bot, Send, Mic, Zap, ChevronRight, Tag, Building2,
  ClipboardList, AlertCircle, CheckCircle2, FileText, Users,
  Loader2, CheckCheck,
} from "lucide-react";

const templates = [
  "今週の売上目標と未対応案件を整理して、優先度の高い商談から動けるようにしてほしい",
  "来月のリソース計画を今週中にまとめてほしい。開発・営業・事務のバランスを見て",
  "未入金請求2件の督促タイミングと、その後の対応フローを提示してほしい",
  "ECサイト案件のスコープ拡大について、費用・リスク・対応策の案を出してほしい",
  "全員の今月のタスク達成率を確認し、遅れているメンバーの支援策を提案してほしい",
  "来週の商談フォロー優先リストを作って、営業部のアクション計画を整理してほしい",
];

interface AiResult {
  category: string;
  departments: string[];
  summary: string;
  actions: { label: string; dept: string; done: boolean }[];
  checkItems: string[];
}

interface TaskCreated {
  task_count: number;
  report_id: string;
  tasks: { id: string; title: string }[];
}

interface HistoryItem {
  id: string;
  text: string;
  date: string;
  status: string;
  summary: string;
}

export default function AiSecretaryClient({
  userId,
  initialHistory,
}: {
  userId: string;
  initialHistory: HistoryItem[];
}) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskCreated, setTaskCreated] = useState<TaskCreated | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);

  // 初回マウント時に最新履歴を取得（SSRデータが古い可能性があるため）
  useEffect(() => {
    fetch(`/api/ai-history?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.history?.length > 0) setHistory(data.history);
      })
      .catch(() => {});
  }, [userId]);

  async function handleSubmit() {
    if (!instruction.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTaskCreated(null);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: instruction }],
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      let raw = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AIからの応答を解析できませんでした");

      const parsed: AiResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);

      // DBに保存してから履歴を更新
      await fetch("/api/ai-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, instruction, result: parsed }),
      });

      // 最新履歴を再取得
      const histRes = await fetch(`/api/ai-history?userId=${userId}`);
      const histData = await histRes.json();
      if (histData.history) setHistory(histData.history);

    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTasks() {
    if (!result || taskLoading) return;
    setTaskLoading(true);
    try {
      const res = await fetch("/api/tasks/from-ai-secretary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "タスク作成に失敗しました");
      setTaskCreated(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "タスク作成に失敗しました");
    } finally {
      setTaskLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Bot size={20} className="text-blue-600" /> AI秘書 — 指示入力
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">社長からの指示を受け取り、部門AIへ自動的に振り分けます</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左: 入力エリア */}
        <div className="col-span-2 space-y-4">

          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl w-fit">
            <AlertCircle size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">この画面は社長専用です — 社員は閲覧・入力できません</span>
          </div>

          {/* 指示入力 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={16} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">指示を入力する</h2>
              <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full font-semibold">社長専用</span>
            </div>

            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none text-slate-700 leading-relaxed"
              placeholder="AI秘書への指示を入力してください..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
            />

            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  <Mic size={14} /> 音声入力
                </button>
                <span className="text-xs text-slate-400">{instruction.length} 文字 · Cmd+Enter で送信</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!instruction.trim() || loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> 処理中...</>
                  : <><Send size={14} /> 送信して指示する</>
                }
              </button>
            </div>
          </div>

          {/* テンプレート */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Zap size={14} className="text-amber-500" /> よく使う指示テンプレート
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t, i) => (
                <button key={i}
                  onClick={() => setInstruction(t)}
                  className="text-left text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-slate-600 leading-relaxed">
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 過去の指示履歴 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-3">過去の指示履歴</h2>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">まだ指示履歴はありません</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setInstruction(h.text.replace("…", ""))}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-left hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 truncate">{h.text}</p>
                      {h.summary && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{h.summary}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">{h.date}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium shrink-0">{h.status}</span>
                    <ChevronRight size={12} className="text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右: AI整理結果 */}
        <div className="space-y-4">
          {loading && (
            <div className="rounded-2xl p-8 border border-blue-200 flex flex-col items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg, #eff6ff, #f5f3ff)" }}>
              <Loader2 size={24} className="text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600">AI秘書が整理中です...</p>
            </div>
          )}

          {result && !loading && (
            <>
              <div className="rounded-2xl p-5 border border-blue-200"
                style={{ background: "linear-gradient(135deg, #eff6ff, #f5f3ff)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Bot size={14} className="text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-800">AI整理結果</h2>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white rounded-full">完了</span>
                </div>

                <div className="flex items-center gap-2 mb-3 p-3 bg-white/70 rounded-xl">
                  <Tag size={12} className="text-purple-600" />
                  <div>
                    <p className="text-[10px] text-slate-400">分類</p>
                    <p className="text-xs font-bold text-slate-800">{result.category}</p>
                  </div>
                </div>

                <div className="mb-3 p-3 bg-white/70 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={12} className="text-blue-600" />
                    <p className="text-[10px] text-slate-500 font-semibold">関係部門</p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {result.departments.map((d) => (
                      <span key={d} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{d}</span>
                    ))}
                  </div>
                </div>

                <div className="mb-3 p-3 bg-white/70 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-semibold mb-1">AIサマリー</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{result.summary}</p>
                </div>

                <div className="mb-3 p-3 bg-white/70 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardList size={12} className="text-blue-600" />
                    <p className="text-[10px] text-slate-500 font-semibold">次のアクション</p>
                  </div>
                  <div className="space-y-2">
                    {result.actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {a.done
                          ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                          : <div className="w-3 h-3 rounded-full border-2 border-blue-300 shrink-0 mt-0.5" />
                        }
                        <div>
                          <p className="text-[10px] text-slate-700">{a.label}</p>
                          <p className="text-[9px] text-slate-400">{a.dept}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.checkItems.length > 0 && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertCircle size={12} className="text-amber-600" />
                      <p className="text-[10px] text-amber-700 font-semibold">社長の確認が必要</p>
                    </div>
                    <div className="space-y-1.5">
                      {result.checkItems.map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-[9px] font-bold text-amber-600 mt-0.5">▶</span>
                          <p className="text-[10px] text-amber-800">{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h2 className="text-sm font-bold text-slate-700 mb-3">このまま実行する</h2>

                {taskCreated && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCheck size={14} className="text-emerald-600" />
                      <p className="text-xs font-bold text-emerald-700">
                        {taskCreated.task_count}件のタスクを作成しました
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {taskCreated.tasks.map((t) => (
                        <p key={t.id} className="text-[10px] text-emerald-600 pl-1">· {t.title}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={handleCreateTasks}
                    disabled={taskLoading || !!taskCreated}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {taskLoading
                      ? <><Loader2 size={14} className="animate-spin" /> タスク作成中...</>
                      : taskCreated
                      ? <><CheckCheck size={14} /> タスク作成済み</>
                      : <><ClipboardList size={14} /> タスク化して部門AIに振り分ける</>
                    }
                  </button>

                  {[
                    { label: "案件として正式登録する", icon: <FileText size={14} />, color: "bg-purple-600 text-white" },
                    { label: "提案書ドラフトを作成する", icon: <FileText size={14} />, color: "bg-emerald-600 text-white" },
                    { label: "部門担当者に通知する", icon: <Users size={14} />, color: "bg-amber-600 text-white" },
                    { label: "保留にする（後で確認）", icon: <AlertCircle size={14} />, color: "bg-slate-200 text-slate-600" },
                  ].map((b, i) => (
                    <button key={i} disabled className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium opacity-40 cursor-not-allowed ${b.color}`}>
                      {b.icon} {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!result && !loading && (
            <div className="rounded-2xl p-8 border border-slate-200 flex flex-col items-center justify-center gap-3 text-center"
              style={{ background: "#f8fafc" }}>
              <Bot size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400">指示を入力して送信すると<br />AI整理結果がここに表示されます</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
