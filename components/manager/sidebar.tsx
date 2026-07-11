"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Bell, Settings, HelpCircle, Zap, LogOut } from "lucide-react";

export interface ManagerSidebarUser {
  name: string;
  specialty: string | null;
  avatar: string;
  inboxCount?: number;
  unreadCount?: number;
}

export default function ManagerSidebar({ user }: { user: ManagerSidebarUser }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navItems = [
    { href: "/manager/inbox", icon: Inbox, label: "受信箱", badge: user.inboxCount ?? 0 },
  ];
  const bottomItems = [
    { href: "/notifications", icon: Bell, label: "お知らせ", badge: user.unreadCount ?? 0 },
    { href: "/settings", icon: Settings, label: "設定・プロフィール", badge: 0 },
    { href: "/help", icon: HelpCircle, label: "ヘルプ", badge: 0 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #14322c 100%)" }}>

      {/* ロゴ */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0d9488, #059669)" }}>
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xs leading-tight">IGNITERA</p>
            <p className="text-teal-300 text-[10px] leading-tight">Command Center</p>
          </div>
        </div>
      </div>

      {/* メインナビ */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">メニュー</p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label, badge }) => (
            <li key={href}>
              <Link href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive(href)
                    ? "bg-teal-600 text-white font-medium shadow-lg shadow-teal-900/50"
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
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-white/8" />
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">その他</p>
        <ul className="space-y-0.5">
          {bottomItems.map(({ href, icon: Icon, label, badge }) => (
            <li key={href}>
              <Link href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive(href)
                    ? "bg-teal-600 text-white font-medium"
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
            </li>
          ))}
        </ul>
      </nav>

      {/* マネージャープロフィール */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/6 mb-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #0d9488, #059669)" }}>
            {user.avatar}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-semibold truncate">{user.name}</p>
            <p className="text-teal-400 text-[10px] font-medium truncate">
              {user.specialty ? `${user.specialty} マネージャー` : "マネージャー"}
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all text-xs">
            <LogOut size={13} />
            ログアウト
          </button>
        </form>
      </div>
    </aside>
  );
}
