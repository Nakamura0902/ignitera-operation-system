"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, UserCheck, X } from "lucide-react";
import { getProgressColor, getProgressLabel } from "@/lib/status-utils";
import { approveApplication, rejectApplication } from "../actions";
import type { IncomingApplication } from "./page";

interface AcceptedTask {
  id: string; taskId: string; title: string; originalAssignee: string; department: string;
  progress: number; dueDate: string; remainingPoints: number;
  status: "in_progress" | "completed"; acceptedAt: string; confirmedPoints?: number;
}

interface MyListing {
  id: string; taskTitle: string; status: string; createdAt: string;
  progress: number; dueDate: string;
}

const listingStatusLabel: Record<string, string> = {
  pending_approval: "承認待ち",
  open: "募集中",
  taken: "引き受け済み",
  cancelled: "キャンセル",
};

const listingStatusColor: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-700",
  open: "bg-blue-100 text-blue-700",
  taken: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export default function MyAcceptedTasksClient({
  acceptedTasks,
  myListings,
  incomingApplications,
  userId,
}: {
  acceptedTasks: AcceptedTask[];
  myListings: MyListing[];
  incomingApplications: IncomingApplication[];
  userId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "completed" | "listings" | "incoming">("active");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeTasks = acceptedTasks.filter((t) => t.status === "in_progress");
  const completedTasks = acceptedTasks.filter((t) => t.status === "completed");
  const pendingApps = incomingApplications.filter((a) => a.status === "pending");

  function handleApprove(applicationId: string) {
    setLoadingId(applicationId);
    startTransition(async () => {
      const result = await approveApplication(applicationId, userId);
      setLoadingId(null);
      if (result.error) {
        setMessage(`エラー: ${result.error}`);
      } else {
        setMessage("承認しました。担当者が変更されました");
        router.refresh();
      }
      setTimeout(() => setMessage(null), 4000);
    });
  }

  function handleReject(applicationId: string) {
    setLoadingId(applicationId);
    startTransition(async () => {
      const result = await rejectApplication(applicationId, userId);
      setLoadingId(null);
      if (result.error) {
        setMessage(`エラー: ${result.error}`);
      } else {
        setMessage("却下しました");
        router.refresh();
      }
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">マーケット活動</h1>
        <p className="text-slate-500 text-sm mt-0.5">引き受けタスクと出品中タスクの管理</p>
      </div>

      {message && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "active", label: "引き受け中", count: activeTasks.length },
          { key: "completed", label: "完了済み", count: completedTasks.length },
          { key: "listings", label: "出品中タスク", count: myListings.length },
          { key: "incoming", label: "届いた申請", count: pendingApps.length, badge: pendingApps.length > 0 },
        ].map(({ key, label, count, badge }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              tab === key
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                : "bg-white text-slate-600 border border-slate-200"
            }`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === key ? "bg-white/20 text-white" :
              (badge ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500")
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {tab === "active" && (
        <div className="space-y-4">
          {activeTasks.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
              <p className="text-slate-400 text-sm">引き受け中のタスクはありません</p>
            </div>
          )}
          {activeTasks.map((task) => {
            const color = getProgressColor(task.progress);
            return (
              <div key={task.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-full border-4 flex items-center justify-center text-sm font-bold"
                    style={{ borderColor: color, color }}>
                    {task.progress}%
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                        引き受け中
                      </span>
                      <span className="text-[10px] text-slate-400">{task.department}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1">{task.title}</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      元担当: {task.originalAssignee} / 引き受け: {task.acceptedAt}
                    </p>
                    <ProgressBar value={task.progress} color={color} />
                    <p className="text-[10px] mt-1" style={{ color }}>{getProgressLabel(task.progress)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold text-blue-600">{task.remainingPoints} pt</p>
                    <p className="text-[10px] text-slate-400 mb-2">残りpt</p>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={11} /> {task.dueDate}
                      </div>
                    )}
                    <Link href={`/tasks/${task.taskId}`}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                      詳細 <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "completed" && (
        <div className="space-y-4">
          {completedTasks.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
              <p className="text-slate-400 text-sm">完了済みのタスクはありません</p>
            </div>
          )}
          {completedTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
              <div className="flex items-center gap-4">
                <CheckCircle2 size={40} className="text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                      完了
                    </span>
                    <span className="text-[10px] text-slate-400">{task.department}</span>
                  </div>
                  <h3 className="font-bold text-slate-800">{task.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    元担当: {task.originalAssignee} / 完了: {task.dueDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-600">{task.confirmedPoints ?? task.remainingPoints} pt</p>
                  <p className="text-[10px] text-slate-400">確定ポイント</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "listings" && (
        <div className="space-y-4">
          {myListings.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
              <p className="text-slate-400 text-sm">出品中のタスクはありません</p>
            </div>
          )}
          {myListings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listingStatusColor[listing.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {listingStatusLabel[listing.status] ?? listing.status}
                    </span>
                    <span className="text-[10px] text-slate-400">出品日: {listing.createdAt}</span>
                  </div>
                  <h3 className="font-bold text-slate-800">{listing.taskTitle}</h3>
                  {listing.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <Clock size={11} /> 期限: {listing.dueDate}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-600">{listing.progress}%</p>
                  <p className="text-[10px] text-slate-400">進捗</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "incoming" && (
        <div className="space-y-4">
          {pendingApps.length === 0 && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
              <p className="text-slate-400 text-sm">届いている申請はありません</p>
            </div>
          )}
          {pendingApps.map((app) => (
            <div key={app.applicationId} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <UserCheck size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800">{app.applicantName}</span>
                    <span className="text-[10px] text-slate-400">が申請</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{app.appliedAt}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">{app.taskTitle}</p>
                  {app.message && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 italic mb-3">
                      「{app.message}」
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleApprove(app.applicationId)}
                      disabled={isPending || loadingId === app.applicationId}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} />
                      {loadingId === app.applicationId ? "処理中..." : "承認する"}
                    </button>
                    <button
                      onClick={() => handleReject(app.applicationId)}
                      disabled={isPending || loadingId === app.applicationId}
                      className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <X size={13} /> 却下する
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
