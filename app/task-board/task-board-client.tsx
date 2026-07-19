"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  defaultDropAnimationSideEffects, type DragEndEvent, type DragStartEvent, type DropAnimation,
} from "@dnd-kit/core";
import { GripVertical, Lock, Search, CornerUpLeft, Plus, X, Trash2 } from "lucide-react";
import type { BoardTask, Member, TransferRequest } from "@/types/task-board";
import { STATUS_LABEL, STATUS_BADGE, rankAccent, formatRemaining } from "@/lib/task-board";
import {
  createBoardTask, acquireTask, requestTransfer, respondTransfer, returnTask,
  updateBoardStatus, setSchedule, reportBoardCompletion, deleteBoardTask,
} from "./actions";

type UiRole = "ceo" | "manager" | "employee";
interface Stats { holding: number; weekPoints: number; completionRate: number; overdue: number }

interface Props {
  currentMemberId: string;
  role: UiRole;
  members: Member[];
  unassigned: BoardTask[];
  byMember: Record<string, BoardTask[]>;
  stats: Record<string, Stats>;
  requests: TransferRequest[];
}

const RETURN_REASONS = ["スキル不足", "工数見積もり誤り", "他タスクとの競合", "内容理解不足", "その他"];
const TRANSFER_REASONS = ["スキル不足", "工数見積もり誤り", "期限内完了が困難", "他社員の方が適任", "他タスクとの競合", "その他"];

// ドロップ時、元の位置へ戻るアニメーション（掴んだカードは半透明のまま残す）
const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
};

export default function TaskBoardClient(props: Props) {
  const { currentMemberId, role, members, unassigned, byMember, stats, requests } = props;
  const canCreate = role === "ceo" || role === "manager";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [drawerTask, setDrawerTask] = useState<BoardTask | null>(null);
  const [search, setSearch] = useState("");
  const [acquireT, setAcquireT] = useState<{ task: BoardTask; to: string } | null>(null);
  const [returnT, setReturnT] = useState<BoardTask | null>(null);
  const [transferT, setTransferT] = useState<{ task: BoardTask; to: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // 指定した社員の列を、スクロールコンテナ基準で正確に左端へ寄せる
  function scrollToColumn(id: string, behavior: ScrollBehavior = "auto") {
    const container = scrollRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-member-id="${id}"]`);
    if (!container || !el) return;
    const left = el.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft - 16;
    container.scrollTo({ left: Math.max(0, left), behavior });
  }
  // 本人列へ初期スクロール（並び順は変えない）
  function scrollToMe(behavior: ScrollBehavior = "auto") {
    scrollToColumn(currentMemberId, behavior);
  }
  useEffect(() => { scrollToMe("auto"); /* eslint-disable-next-line */ }, [currentMemberId]);

  const overdueTotal = Object.values(stats).reduce((s, v) => s + v.overdue, 0);

  function onDragStart(e: DragStartEvent) {
    setActiveTask(findTask(String(e.active.id), unassigned, byMember));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(e.active.id);
    const to = e.over ? String(e.over.id).replace("col:", "") : null;
    if (!to) return;
    const task = findTask(taskId, unassigned, byMember);
    if (!task || task.locked) return;
    const from = task.assigneeMemberId ?? "UNASSIGNED";
    if (from === to) return;

    if (from === "UNASSIGNED" && to === currentMemberId) setAcquireT({ task, to: currentMemberId });
    else if (from === "UNASSIGNED" && to !== "UNASSIGNED" && canCreate) setAcquireT({ task, to }); // CEO/mgr 直接割当
    else if (from === currentMemberId && to === "UNASSIGNED") setReturnT(task);
    else if (from === currentMemberId && to !== "UNASSIGNED") setTransferT({ task, to });
  }

  function searchMatch(m: Member) {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [m.name, m.membershipId, m.role].some((v) => v.toLowerCase().includes(q));
  }
  function scrollToMember(id: string) {
    scrollToColumn(id, "smooth");
  }

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pl-16 pr-4 lg:px-6 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-800">Task Board</h1>
            <span className="text-xs text-slate-500">未アサイン <b className="text-slate-700">{unassigned.length}</b>件</span>
            <span className="text-xs text-rose-600">期限超過 <b>{overdueTotal}</b>件</span>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="社員検索（名前/ID/役職）"
                className="w-48 pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" />
              {search && (
                <div className="absolute mt-1 w-56 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-40">
                  {members.filter(searchMatch).map((m) => (
                    <button key={m.id} onClick={() => { scrollToMember(m.id); setSearch(""); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between">
                      <span>{m.name}</span><span className="text-slate-400">{m.membershipId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => scrollToMe("smooth")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <CornerUpLeft size={13} /> 自分の欄へ戻る
            </button>
            {canCreate && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                <Plus size={13} /> タスクを追加
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 移管申請（自分宛・PCのみ操作可） */}
      {requests.length > 0 && (
        <div className="hidden lg:block bg-amber-50 border-b border-amber-200 px-4 lg:px-6 py-2 space-y-1">
          {requests.map((r) => (
            <TransferRequestRow key={r.id} req={r} />
          ))}
        </div>
      )}

      {/* スマホ: 自分の欄だけを表示（閲覧専用・実作業はPC） */}
      <MobileBoard
        member={members.find((m) => m.id === currentMemberId)}
        tasks={byMember[currentMemberId] ?? []}
        stat={stats[currentMemberId]}
        unassignedCount={unassigned.length}
        onOpenTask={setDrawerTask}
      />

      {/* PC: 未アサイン固定 + 社員横スクロール */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveTask(null)}>
        <div className="hidden lg:grid flex-1 min-h-0" style={{ gridTemplateColumns: "320px minmax(0,1fr)" }}>
          <UnassignedColumn tasks={unassigned} onOpen={setDrawerTask} currentMemberId={currentMemberId} onAcquire={(t) => setAcquireT({ task: t, to: currentMemberId })} />
          <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 h-full p-4">
              {members.map((m) => (
                <MemberColumn key={m.id} member={m} isSelf={m.id === currentMemberId}
                  tasks={byMember[m.id] ?? []} stat={stats[m.id]} onOpenTask={setDrawerTask} />
              ))}
              <div className="shrink-0 w-2" />
            </div>
          </div>
        </div>
        {/* ドラッグ中にカーソルへ追従するカード */}
        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeTask ? <DragCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* ドロワー・モーダル */}
      {drawerTask && (
        <TaskDrawer task={drawerTask} members={members} currentMemberId={currentMemberId} canManage={canCreate}
          onClose={() => setDrawerTask(null)}
          onReturn={() => { setReturnT(drawerTask); setDrawerTask(null); }}
          onTransfer={(to) => { setTransferT({ task: drawerTask, to }); setDrawerTask(null); }} />
      )}
      {acquireT && <AcquireModal data={acquireT} onClose={() => setAcquireT(null)} startTransition={startTransition} />}
      {returnT && <ReturnModal task={returnT} onClose={() => setReturnT(null)} startTransition={startTransition} />}
      {transferT && <TransferModal data={transferT} members={members} onClose={() => setTransferT(null)} startTransition={startTransition} />}
      {showAdd && <AddTaskModal members={members} onClose={() => setShowAdd(false)} startTransition={startTransition} />}
    </div>
  );
}

function findTask(id: string, unassigned: BoardTask[], byMember: Record<string, BoardTask[]>) {
  return unassigned.find((t) => t.id === id) ?? Object.values(byMember).flat().find((t) => t.id === id) ?? null;
}

// ---------- 未アサイン列（固定） ----------
function UnassignedColumn({ tasks, onOpen, currentMemberId, onAcquire }: {
  tasks: BoardTask[]; onOpen: (t: BoardTask) => void; currentMemberId: string; onAcquire: (t: BoardTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "col:UNASSIGNED" });
  return (
    <div ref={setNodeRef} className={`border-r border-slate-200 bg-white overflow-y-auto ${isOver ? "bg-blue-50/50" : ""}`}>
      <div className="sticky top-0 bg-white/95 backdrop-blur px-4 py-3 border-b border-slate-100 z-10">
        <p className="text-sm font-bold text-slate-800">未アサイン <span className="text-slate-400 font-normal">{tasks.length}件</span></p>
        <p className="text-[10px] text-slate-400">優先順位順（取得順の強制ではありません）</p>
      </div>
      <div className="p-3 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">未アサインのタスクはありません</p>
        ) : tasks.map((t) => (
          <TaskCard key={t.id} task={t} onOpen={onOpen}
            footer={<button onClick={(e) => { e.stopPropagation(); onAcquire(t); }}
              className="mt-2 w-full py-1.5 text-[11px] rounded-lg bg-blue-600 text-white hover:bg-blue-700">取得する</button>} />
        ))}
      </div>
    </div>
  );
}

// ---------- 社員列 ----------
function MemberColumn({ member, isSelf, tasks, stat, onOpenTask }: {
  member: Member; isSelf: boolean; tasks: BoardTask[]; stat?: Stats; onOpenTask: (t: BoardTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${member.id}` });
  return (
    <div data-member-id={member.id}
      className={`shrink-0 w-[300px] flex flex-col rounded-2xl border ${isSelf ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200"} bg-slate-50 ${isOver ? "ring-2 ring-blue-300" : ""}`}>
      {/* 社員カード（sticky） */}
      <button onClick={() => { /* member drawer 省略: 詳細はタスク側 */ }}
        className="sticky top-0 z-10 text-left bg-white rounded-t-2xl border-b border-slate-100 px-3 py-3 hover:bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: isSelf ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "linear-gradient(135deg,#64748b,#94a3b8)" }}>
            {member.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-slate-800 truncate">{member.name}</p>
              {isSelf && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded">YOU</span>}
            </div>
            <p className="text-[10px] text-slate-400">{member.role === "MANAGER" ? "マネージャー" : member.role === "CEO" ? "CEO" : "社員"}</p>
          </div>
        </div>
        {stat && (
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
            <span>保有 <b className="text-slate-700">{stat.holding}</b></span>
            <span>今週 <b className="text-blue-600">{stat.weekPoints}pt</b></span>
            <span>完遂率 <b>{stat.completionRate}%</b></span>
            {stat.overdue > 0 && <span className="text-rose-600">超過 {stat.overdue}</span>}
          </div>
        )}
      </button>
      {/* タスク縦並び */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-slate-300 text-center py-6">タスクなし</p>
        ) : tasks.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpenTask} />)}
      </div>
    </div>
  );
}

// ---------- スマホ: 自分の欄のみ（閲覧専用） ----------
function MobileBoard({ member, tasks, stat, unassignedCount, onOpenTask }: {
  member?: Member; tasks: BoardTask[]; stat?: Stats; unassignedCount: number; onOpenTask: (t: BoardTask) => void;
}) {
  return (
    <div className="lg:hidden flex-1 min-h-0 overflow-y-auto bg-slate-50 p-3 space-y-3">
      {/* 自分のカード */}
      <div className="rounded-2xl bg-white border border-blue-200 ring-1 ring-blue-100 p-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
            {member?.avatar ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-slate-800 truncate">{member?.name ?? "自分"}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded">YOU</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {member?.role === "MANAGER" ? "マネージャー" : member?.role === "CEO" ? "CEO" : "社員"}
            </p>
          </div>
        </div>
        {stat && (
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
            <span>保有 <b className="text-slate-700">{stat.holding}</b></span>
            <span>今週 <b className="text-blue-600">{stat.weekPoints}pt</b></span>
            <span>完遂率 <b>{stat.completionRate}%</b></span>
            {stat.overdue > 0 && <span className="text-rose-600">超過 {stat.overdue}</span>}
          </div>
        )}
      </div>

      {/* 自分のタスク（閲覧専用） */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">担当中のタスクはありません</p>
        ) : tasks.map((t) => (
          <button key={t.id} onClick={() => onOpenTask(t)}
            className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              {t.priorityRank != null && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rankAccent(t.priorityRank).badge}`}>#{t.priorityRank}</span>
              )}
              <span className="text-sm font-medium text-slate-800 flex-1 truncate">{t.title}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
              <span>難易度 {t.difficulty}</span>
              {t.rewardPoints > 0 && <span className="text-blue-600">{t.rewardPoints}pt</span>}
              <span className={t.status === "OVERDUE" ? "text-rose-600 font-medium" : ""}>{formatRemaining(t.deadline)}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-slate-400 text-center pt-1">
        未アサイン {unassignedCount}件 ・ タスクの取得や移管などの操作はPCから行えます
      </p>
    </div>
  );
}

// ---------- タスクカード ----------
function TaskCard({ task, onOpen, footer }: { task: BoardTask; onOpen: (t: BoardTask) => void; footer?: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: task.locked });
  const accent = rankAccent(task.priorityRank);
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${accent.border} shadow-sm ${isDragging ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-1.5 p-2.5">
        {/* ドラッグハンドル（カードクリックと競合させない） */}
        <button ref={setNodeRef} {...attributes} {...listeners}
          className={`mt-0.5 shrink-0 ${task.locked ? "text-slate-300 cursor-not-allowed" : "text-slate-400 cursor-grab active:cursor-grabbing"}`}
          title={task.locked ? "48時間未満のため移動不可" : "ドラッグで移動"}>
          {task.locked ? <Lock size={13} /> : <GripVertical size={14} />}
        </button>
        <button onClick={() => onOpen(task)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 mb-1">
            {task.priorityRank != null && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${accent.badge}`}>#{task.priorityRank}</span>
            )}
            <span className="text-sm font-medium text-slate-800 truncate">{task.title}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
            <span>難易度 {task.difficulty}</span>
            {task.rewardPoints > 0 && <span className="text-blue-600">{task.rewardPoints}pt</span>}
            <span className={task.status === "OVERDUE" ? "text-rose-600 font-medium" : ""}>{formatRemaining(task.deadline)}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
            {task.locked && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Lock size={9} /> 48h</span>}
          </div>
          {footer}
        </button>
      </div>
    </div>
  );
}

// ---------- ドラッグ中にカーソルへ追従する浮遊カード ----------
function DragCardOverlay({ task }: { task: BoardTask }) {
  const accent = rankAccent(task.priorityRank);
  return (
    <div className={`w-[272px] bg-white rounded-xl border border-slate-200 ${accent.border} shadow-2xl ring-2 ring-blue-300 rotate-2 cursor-grabbing`}>
      <div className="flex items-start gap-1.5 p-2.5">
        <span className="mt-0.5 shrink-0 text-slate-400"><GripVertical size={14} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {task.priorityRank != null && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${accent.badge}`}>#{task.priorityRank}</span>
            )}
            <span className="text-sm font-medium text-slate-800 truncate">{task.title}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
            <span>難易度 {task.difficulty}</span>
            {task.rewardPoints > 0 && <span className="text-blue-600">{task.rewardPoints}pt</span>}
            <span className={task.status === "OVERDUE" ? "text-rose-600 font-medium" : ""}>{formatRemaining(task.deadline)}</span>
          </div>
          <div className="mt-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 移管申請行（自分宛） ----------
function TransferRequestRow({ req }: { req: TransferRequest }) {
  const [isPending, startTransition] = useTransition();
  function respond(accept: boolean) {
    startTransition(async () => { await respondTransfer(req.id, accept); });
  }
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <p className="text-amber-800">
        <b>{req.fromName}</b> さんから「<b>{req.taskTitle}</b>」の移管申請（進捗{req.progressPercent}%・{req.reason}）
        <span className="text-amber-600"> — 承認で成果・報酬・責任が100%移ります</span>
      </p>
      <div className="flex gap-1.5 shrink-0">
        <button onClick={() => respond(false)} disabled={isPending} className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 bg-white">拒否</button>
        <button onClick={() => respond(true)} disabled={isPending} className="px-2.5 py-1 rounded-lg bg-amber-600 text-white">引き受ける</button>
      </div>
    </div>
  );
}

// ---------- 共通モーダル枠 ----------
function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function AcquireModal({ data, onClose, startTransition }: { data: { task: BoardTask; to: string }; onClose: () => void; startTransition: (cb: () => void) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t = data.task;
  function go() {
    setBusy(true); setErr(null);
    startTransition(async () => {
      const res = await acquireTask(t.id, data.to);
      if (res?.error) { setErr(res.error); setBusy(false); } else onClose();
    });
  }
  return (
    <ModalShell title="このタスクを取得しますか？" onClose={onClose}>
      <div className="space-y-1 text-sm text-slate-700 mb-4">
        <p className="font-semibold">{t.title}</p>
        <p className="text-xs text-slate-500">優先順位 {t.priorityRank ?? "—"} ・ 難易度 {t.difficulty} ・ {formatRemaining(t.deadline)} ・ {t.rewardPoints}pt</p>
        <p className="text-xs text-slate-500 mt-2">取得後は、あなたが納期・品質・成果の責任を負います。</p>
      </div>
      {err && <p className="text-xs text-rose-600 mb-2">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">キャンセル</button>
        <button onClick={go} disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
          {busy ? "取得中..." : "取得する"}
        </button>
      </div>
    </ModalShell>
  );
}

function ReturnModal({ task, onClose, startTransition }: { task: BoardTask; onClose: () => void; startTransition: (cb: () => void) => void }) {
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function go() {
    setBusy(true); setErr(null);
    startTransition(async () => {
      const res = await returnTask(task.id, reason);
      if (res?.error) { setErr(res.error); setBusy(false); } else onClose();
    });
  }
  return (
    <ModalShell title="タスクを返却しますか？" onClose={onClose}>
      <p className="text-xs text-slate-500 mb-3">この操作は自己管理実績に記録されます。完了実績・報酬は付与されません。</p>
      <label className="text-xs font-semibold text-slate-500">返却理由</label>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl">
        {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      {err && <p className="text-xs text-rose-600 mb-2">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">キャンセル</button>
        <button onClick={go} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium disabled:opacity-60">{busy ? "処理中..." : "未アサインへ返却"}</button>
      </div>
    </ModalShell>
  );
}

function TransferModal({ data, members, onClose, startTransition }: { data: { task: BoardTask; to: string }; members: Member[]; onClose: () => void; startTransition: (cb: () => void) => void }) {
  const to = members.find((m) => m.id === data.to);
  const [progress, setProgress] = useState(0);
  const [reason, setReason] = useState(TRANSFER_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function go() {
    setBusy(true); setErr(null);
    startTransition(async () => {
      const res = await requestTransfer({ taskId: data.task.id, toMemberId: data.to, progressPercent: progress, reason, handoverNotes: notes });
      if (res?.error) { setErr(res.error); setBusy(false); } else onClose();
    });
  }
  return (
    <ModalShell title="タスク移管申請" onClose={onClose}>
      <p className="text-sm text-slate-700 mb-1">{data.task.title}</p>
      <p className="text-xs text-slate-500 mb-3">移管先：<b>{to?.name}</b>。承認されると成果・報酬・完了実績・最終責任は100%移ります。</p>
      <label className="text-xs font-semibold text-slate-500">現在の進捗率: {progress}%</label>
      <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full mb-3 accent-blue-600" />
      <label className="text-xs font-semibold text-slate-500">移管理由</label>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl">
        {TRANSFER_REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <label className="text-xs font-semibold text-slate-500">引き継ぎ内容（任意）</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full mt-1 mb-3 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none" placeholder="完了済み作業・残作業・注意点など" />
      {err && <p className="text-xs text-rose-600 mb-2">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">キャンセル</button>
        <button onClick={go} disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">{busy ? "送信中..." : "移管を申請する"}</button>
      </div>
    </ModalShell>
  );
}

function AddTaskModal({ members, onClose, startTransition }: { members: Member[]; onClose: () => void; startTransition: (cb: () => void) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [reward, setReward] = useState("");
  const [revenueType, setRevenueType] = useState<"none" | "one_time" | "monthly">("none");
  const [revenue, setRevenue] = useState("");
  const [rank, setRank] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const toggleAssignee = (id: string) =>
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function go() {
    if (!title.trim()) { setErr("タスク名を入力してください"); return; }
    setBusy(true); setErr(null);
    startTransition(async () => {
      const res = await createBoardTask({
        title, description, difficulty,
        rewardPoints: Number(reward) || 0,
        revenueType,
        revenueAmount: revenueType === "none" ? 0 : Number(revenue.replace(/[,\s]/g, "")) || 0,
        priorityRank: rank ? Number(rank) : null,
        deadline: deadline || undefined,
        assigneeMemberIds: assignees,
      });
      if (res?.error) { setErr(res.error); setBusy(false); } else onClose();
    });
  }
  return (
    <ModalShell title="タスクを追加" onClose={onClose}>
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タスク名 *" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="詳細" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500">難易度</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-1 rounded text-xs border ${difficulty === d ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500">報酬pt</label>
            <input value={reward} onChange={(e) => setReward(e.target.value)} inputMode="numeric" placeholder="0" className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">売上</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {([
              { v: "none", label: "売上なし" },
              { v: "one_time", label: "単発" },
              { v: "monthly", label: "月額" },
            ] as const).map((o) => (
              <button key={o.v} type="button" onClick={() => setRevenueType(o.v)}
                className={`py-1.5 rounded-lg text-xs border ${revenueType === o.v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>{o.label}</button>
            ))}
          </div>
          {revenueType !== "none" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-slate-500">¥</span>
              <input value={revenue} onChange={(e) => setRevenue(e.target.value)} inputMode="numeric" placeholder="例: 300000"
                className="flex-1 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl" />
              {revenueType === "monthly" && <span className="text-xs text-slate-400">/ 月</span>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500">優先順位（任意・未アサイン内）</label>
            <input value={rank} onChange={(e) => setRank(e.target.value)} inputMode="numeric" placeholder="例: 2" className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">期限</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">
            担当者（複数選択可・未選択なら未アサイン）
            {assignees.length > 0 && <span className="text-blue-600"> — {assignees.length}名選択中</span>}
          </label>
          <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {members.map((m) => {
              const checked = assignees.includes(m.id);
              return (
                <label key={m.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${checked ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleAssignee(m.id)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-slate-700">{m.name}</span>
                  <span className="text-[11px] text-slate-400">{m.role === "MANAGER" ? "マネージャー" : m.role === "CEO" ? "CEO" : "社員"}</span>
                </label>
              );
            })}
          </div>
          {assignees.length > 1 && (
            <p className="text-[10px] text-slate-400 mt-1">選択人数分、同じタスクを個別に作成します（売上は先頭の1件のみに計上）</p>
          )}
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">キャンセル</button>
          <button onClick={go} disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">{busy ? "作成中..." : "作成する"}</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ---------- タスク詳細ドロワー ----------
function TaskDrawer({ task, members, currentMemberId, canManage, onClose, onReturn, onTransfer }: {
  task: BoardTask; members: Member[]; currentMemberId: string; canManage: boolean;
  onClose: () => void; onReturn: () => void; onTransfer: (to: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isMine = task.assigneeMemberId === currentMemberId;
  const assignee = members.find((m) => m.id === task.assigneeMemberId);
  const [transferTo, setTransferTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  function act(fn: () => Promise<{ error?: string } | void>) {
    startTransition(async () => { await fn(); onClose(); });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40" />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">{task.title}</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Info label="優先順位" value={task.priorityRank != null ? `#${task.priorityRank}` : "—"} />
            <Info label="難易度" value={String(task.difficulty)} />
            <Info label="報酬" value={`${task.rewardPoints}pt`} />
            <Info label="残り時間" value={formatRemaining(task.deadline)} />
            <Info label="担当者" value={assignee?.name ?? "未アサイン"} />
            <Info label="作成者" value={task.createdByName ? `${task.createdByName}` : "—"} />
          </div>
          {task.description && (
            <div><p className="text-xs font-semibold text-slate-500 mb-1">内容</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p></div>
          )}
          {task.locked && (
            <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <Lock size={13} className="mt-0.5 shrink-0" />
              納期まで48時間未満のため、返却・移管できません。現在の担当者が最終責任を持ちます。
            </div>
          )}

          {/* 削除（CEO / マネージャーのみ・PCから） */}
          {canManage && (
            <div className="hidden lg:block pt-2 border-t border-slate-100">
              {!confirmDelete ? (
                <button onClick={() => { setConfirmDelete(true); setDelErr(null); }}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700">
                  <Trash2 size={13} /> このタスクを削除
                </button>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs text-rose-700 font-medium mb-1">本当に削除しますか？</p>
                  <p className="text-[11px] text-slate-500 mb-2">ボード・各一覧から除外されます。この操作は監査ログに記録されます。</p>
                  {delErr && <p className="text-[11px] text-rose-600 mb-2">{delErr}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(false)} disabled={isPending}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600">キャンセル</button>
                    <button disabled={isPending}
                      onClick={() => startTransition(async () => {
                        const res = await deleteBoardTask(task.id);
                        if (res?.error) setDelErr(res.error); else onClose();
                      })}
                      className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 text-white font-medium disabled:opacity-60">
                      {isPending ? "削除中..." : "削除する"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* 本人担当の操作（実作業はPCのみ） */}
        {isMine && (
          <div className="lg:hidden border-t border-slate-100 p-4">
            <p className="text-[11px] text-slate-400 text-center">タスクの操作（進捗更新・完了報告・返却・移管）はPCから行えます</p>
          </div>
        )}
        {isMine && (
          <div className="hidden lg:block border-t border-slate-100 p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => act(() => setSchedule(task.id, "TODAY"))} disabled={isPending} className="py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">今日に設定</button>
              <button onClick={() => act(() => setSchedule(task.id, "TOMORROW_OR_LATER"))} disabled={isPending} className="py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">明日以降に設定</button>
              <button onClick={() => act(() => updateBoardStatus(task.id, "in_progress"))} disabled={isPending} className="py-2 text-xs rounded-lg bg-blue-50 text-blue-700 border border-blue-200">進行中にする</button>
              <button onClick={() => act(() => reportBoardCompletion(task.id))} disabled={isPending} className="py-2 text-xs rounded-lg bg-emerald-600 text-white">完了報告</button>
            </div>
            <div className="flex gap-2">
              <button onClick={onReturn} disabled={task.locked} className="flex-1 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40">未アサインへ返却</button>
              <select value={transferTo} onChange={(e) => { const v = e.target.value; setTransferTo(v); if (v) onTransfer(v); }} disabled={task.locked}
                className="flex-1 py-2 px-2 text-xs rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40">
                <option value="">他社員へ移管申請</option>
                {members.filter((m) => m.id !== currentMemberId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-slate-700 font-medium">{value}</p>
    </div>
  );
}
