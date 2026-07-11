import Sidebar from "@/components/employee/sidebar";
import HeaderSearch from "@/components/employee/header-search";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";
import { getUnreadCount } from "@/lib/notifications";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unreadCount = await getUnreadCount(user.id);

  return (
    <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
      <Sidebar user={{ ...user, unreadCount }} />

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* トップバー */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pl-16 pr-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <HeaderSearch userId={user.id} />
          </div>

          <div className="flex items-center gap-3">
            {/* 社員バッジ */}
            <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              社員ビュー
            </div>

            {/* AI入力は社長のみ */}
            <div className="px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full border border-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              AI入力は社長のみ
            </div>

            {/* 通知 */}
            <a href="/notifications" className="relative w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <Bell size={16} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </a>

            {/* アバター */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white cursor-pointer"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
            >
              {user.avatar}
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
