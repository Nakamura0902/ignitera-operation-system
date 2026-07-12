"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, CheckSquare, ShoppingBag, PackagePlus, PackageCheck,
  TrendingUp, Star, Bell, Settings, HelpCircle, Zap, LogOut, Menu, X, Inbox,
} from "lucide-react";

export interface SidebarUser {
  name: string;
  department: string;
  employeeId: string;
  avatar: string;
  unreadCount?: number;
  role?: string;
  inboxCount?: number;
}

const baseNavItems = [
  { href: "/home", icon: Home, label: "ホーム", badge: 0 },
  { href: "/tasks", icon: CheckSquare, label: "自分のタスク", badge: 0 },
  { href: "/task-market", icon: ShoppingBag, label: "タスクマーケット", badge: 0 },
  { href: "/task-market/list", icon: PackagePlus, label: "出品中タスク", badge: 0 },
  { href: "/task-market/my-tasks", icon: PackageCheck, label: "引き受けタスク", badge: 0 },
  { href: "/payroll-estimate", icon: TrendingUp, label: "ポイント・給与", badge: 0 },
  { href: "/score-history", icon: Star, label: "評価履歴", badge: 0 },
];

export default function Sidebar({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);
  // マネージャーは社員画面に加えて「受信箱」(CEOからの依頼→タスク化)を持つ
  const navItems = user.role === "manager"
    ? [{ href: "/manager/inbox", icon: Inbox, label: "受信箱", badge: user.inboxCount ?? 0 }, ...baseNavItems]
    : baseNavItems;
  const bottomItems = [
    { href: "/notifications", icon: Bell, label: "お知らせ", badge: user.unreadCount ?? 0 },
    { href: "/settings", icon: Settings, label: "設定・プロフィール" },
    { href: "/help", icon: HelpCircle, label: "ヘルプ" },
  ];
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* モバイル: ハンバーガー */}
      <button onClick={() => setOpen(true)}
        className="lg:hidden fixed top-2.5 left-3 z-50 w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700">
        <Menu size={18} />
      </button>
      {/* モバイル: 背景オーバーレイ */}
      {open && <div onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 bg-slate-900/50 z-40" />}

    <aside className={`fixed left-0 top-0 h-screen w-56 flex flex-col z-40 transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #1a2744 100%)" }}>
      <button onClick={() => setOpen(false)} className="lg:hidden absolute top-3 right-3 text-white/70 hover:text-white">
        <X size={18} />
      </button>

      {/* ロゴ */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xs leading-tight">IGNITERA</p>
            <p className="text-blue-300 text-[10px] leading-tight">Command Center</p>
          </div>
        </div>
      </div>

      {/* メインナビ */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">メニュー</p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label, badge }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive(href)
                    ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/50"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-white/8" />
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">その他</p>
        <ul className="space-y-0.5">
          {bottomItems.map(({ href, icon: Icon, label, badge }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive(href)
                    ? "bg-blue-600 text-white font-medium"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 社員プロフィール */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/6 mb-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
            {user.avatar}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-semibold truncate">{user.name}</p>
            <p className="text-slate-400 text-xs truncate">{user.department}</p>
            <p className="text-slate-500 text-[10px]">{user.employeeId}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all text-xs"
          >
            <LogOut size={13} />
            ログアウト
          </button>
        </form>
      </div>
    </aside>
    </>
  );
}
