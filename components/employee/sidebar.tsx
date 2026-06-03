"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, CheckSquare, ShoppingBag, PackagePlus, PackageCheck,
  TrendingUp, Star, Bell, Settings, HelpCircle, Zap, LogOut,
} from "lucide-react";

export interface SidebarUser {
  name: string;
  department: string;
  employeeId: string;
  avatar: string;
  unreadCount?: number;
}

const navItems = [
  { href: "/home", icon: Home, label: "ホーム" },
  { href: "/tasks", icon: CheckSquare, label: "自分のタスク" },
  { href: "/task-market", icon: ShoppingBag, label: "タスクマーケット" },
  { href: "/task-market/list", icon: PackagePlus, label: "出品中タスク" },
  { href: "/task-market/my-tasks", icon: PackageCheck, label: "引き受けタスク" },
  { href: "/payroll-estimate", icon: TrendingUp, label: "ポイント・給与" },
  { href: "/score-history", icon: Star, label: "評価履歴" },
];

export default function Sidebar({ user }: { user: SidebarUser }) {
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
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #1a2744 100%)" }}>

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
          {navItems.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive(href)
                    ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/50"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{label}</span>
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
  );
}
