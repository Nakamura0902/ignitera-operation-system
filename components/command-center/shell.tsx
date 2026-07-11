"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, FolderKanban, CheckSquare,
  TrendingUp, Settings, Menu, X,
} from "lucide-react";

const GOLD = "#c9a86a";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  ready: boolean;
}

const NAV: NavItem[] = [
  { href: "/command-center", icon: LayoutDashboard, label: "Dashboard", ready: true },
  { href: "/command-center/line-customers", icon: MessageSquare, label: "LINE顧客管理", ready: true },
  { href: "/command-center/projects", icon: FolderKanban, label: "案件管理", ready: false },
  { href: "/command-center/tasks", icon: CheckSquare, label: "タスク管理", ready: false },
  { href: "/command-center/sales", icon: TrendingUp, label: "売上管理", ready: false },
  { href: "/command-center/settings", icon: Settings, label: "設定", ready: false },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/command-center" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex-1 py-4 px-3 space-y-1">
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Menu</p>
      {NAV.map(({ href, icon: Icon, label, ready }) => {
        const active = isActive(href);
        const inner = (
          <span className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            active ? "bg-white/10 text-white font-medium" : ready ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-500 cursor-default"
          }`}>
            {active && <span className="absolute left-0 w-1 h-6 rounded-r" style={{ background: GOLD }} />}
            <Icon size={16} className="shrink-0" style={active ? { color: GOLD } : undefined} />
            <span className="flex-1 truncate">{label}</span>
            {!ready && <span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">Soon</span>}
          </span>
        );
        return ready ? (
          <Link key={href} href={href} onClick={onNavigate} className="relative block">{inner}</Link>
        ) : (
          <div key={href} className="relative">{inner}</div>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="h-full flex flex-col" style={{ background: "linear-gradient(180deg, #0f1b3a 0%, #16233f 100%)" }}>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(201,168,106,0.15)", border: `1px solid ${GOLD}` }}>
            <span className="font-bold text-sm" style={{ color: GOLD }}>I</span>
          </div>
          <div className="leading-tight">
            <p className="text-white font-semibold text-sm tracking-wide">IGNITERA</p>
            <p className="text-[10px]" style={{ color: GOLD }}>CommandCenter</p>
          </div>
        </div>
      </div>
      <NavList onNavigate={onNavigate} />
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-slate-500">事業支援オペレーション</p>
      </div>
    </div>
  );
}

export default function CommandCenterShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* デスクトップ固定サイドバー */}
      <aside className="hidden lg:block fixed left-0 top-0 h-screen w-60 z-40">
        <SidebarInner />
      </aside>

      {/* モバイルドロワー */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64">
            <SidebarInner onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:ml-60 flex flex-col min-h-screen">
        {/* トップバー */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-600">
            <Menu size={20} />
          </button>
          <p className="text-sm font-semibold text-slate-700">IGNITERA CommandCenter</p>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
