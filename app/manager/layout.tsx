import ManagerSidebar from "@/components/manager/sidebar";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";
import { getUnreadCount } from "@/lib/notifications";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user.role !== "manager") redirect(user.role === "ceo" ? "/dashboard" : "/home");

  const [unreadCount, { count: inboxCount }] = await Promise.all([
    getUnreadCount(user.id),
    adminSupabase
      .from("directives")
      .select("id", { count: "exact", head: true })
      .eq("target_manager_id", user.id)
      .eq("status", "sent"),
  ]);

  return (
    <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
      <ManagerSidebar user={{ ...user, inboxCount: inboxCount ?? 0, unreadCount }} />

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* トップバー */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pl-16 pr-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-slate-700">マネージャーコンソール</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
              マネージャービュー
            </div>

            <a href="/notifications" className="relative w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <Bell size={16} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </a>

            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #059669)" }}>
              {user.avatar}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
