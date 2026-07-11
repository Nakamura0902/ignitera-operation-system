import CeoSidebar from "@/components/ceo/sidebar";
import { Bell, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";

export default async function CeoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
      <CeoSidebar user={{ name: user.name, avatar: user.avatar }} />
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

        {/* CEO専用トップバー */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pl-16 pr-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
              <ShieldCheck size={13} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-700">CEOビュー</span>
            </div>
            <span className="text-xs text-slate-400">全社指示・承認・確認の専用画面</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <Bell size={16} className="text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white cursor-pointer"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              {user.avatar}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
