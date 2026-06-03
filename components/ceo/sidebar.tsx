"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, Code2, TrendingUp, FolderKanban,
  Receipt, ClipboardList, BarChart3, Star, ShoppingBag,
  Wallet, ShieldCheck, Settings, Zap, LogOut, Users,
} from "lucide-react";

export interface CeoSidebarUser {
  name: string;
  avatar: string;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "ホーム" },
  { href: "/ai-secretary", icon: Bot, label: "AI秘書", badge: "指示" },
  { href: "/departments/development", icon: Code2, label: "開発" },
  { href: "/departments/sales", icon: TrendingUp, label: "営業" },
  { href: "/departments/projects", icon: FolderKanban, label: "案件" },
  { href: "/departments/accounting", icon: Receipt, label: "経理・請求" },
  { href: "/departments/operations", icon: ClipboardList, label: "事務" },
  { href: "/reports", icon: BarChart3, label: "レポート" },
];

const managementItems = [
  { href: "/task-scores", icon: Star, label: "点数管理", badge: 0 },
  { href: "/task-market-monitor", icon: ShoppingBag, label: "タスクマーケット", badge: 0 },
  { href: "/payroll-report", icon: Wallet, label: "給与反映", badge: 0 },
  { href: "/approval-center", icon: ShieldCheck, label: "承認センター", badge: 0 },
  { href: "/user-management", icon: Users, label: "ユーザー管理", badge: 0 },
];

export default function CeoSidebar({ user }: { user: CeoSidebarUser }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

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
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">ダッシュボード</p>
        {navItems.map(({ href, icon: Icon, label, badge }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive(href)
                ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/50"
                : "text-slate-300 hover:bg-white/8 hover:text-white"
            }`}>
            <Icon size={15} className="shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {badge === "指示" && (
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/30 text-blue-300 rounded font-medium">専用</span>
            )}
          </Link>
        ))}

        <div className="my-3 border-t border-white/8" />
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">管理・承認</p>
        {managementItems.map(({ href, icon: Icon, label, badge }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive(href)
                ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/50"
                : "text-slate-300 hover:bg-white/8 hover:text-white"
            }`}>
            <Icon size={15} className="shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {badge}
              </span>
            )}
          </Link>
        ))}

        <div className="my-3 border-t border-white/8" />
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/8 hover:text-white transition-all">
          <Settings size={15} />
          <span>設定</span>
        </Link>
      </nav>

      {/* 社長プロフィール */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/6 mb-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            {user.avatar}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-semibold truncate">{user.name}</p>
            <p className="text-amber-400 text-[10px] font-medium">代表取締役 CEO</p>
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
