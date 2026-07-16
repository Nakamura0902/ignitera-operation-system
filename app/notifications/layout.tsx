import CeoSidebar from "@/components/ceo/sidebar";
import Sidebar from "@/components/employee/sidebar";
import { getCurrentUser } from "@/lib/get-current-user";
import { getUnreadCount } from "@/lib/notifications";
import { adminSupabase } from "@/lib/supabase/admin";

// 通知は全ロール共通ページ。ロールに応じて正しいサイドバー(=元のビュー)を出す。
export default async function NotificationsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // CEO
  if (user.role === "ceo") {
    const unreadCount = await getUnreadCount(user.id);
    return (
      <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
        <CeoSidebar user={{ name: user.name, avatar: user.avatar }} />
        <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pl-16 pr-4 lg:px-6 py-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">お知らせ</p>
            <div className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
              CEOビュー
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    );
  }

  // マネージャー / 社員（社員サイドバーを共用）
  const isManager = user.role === "manager";
  const [unreadCount, inboxRes] = await Promise.all([
    getUnreadCount(user.id),
    isManager
      ? adminSupabase.from("directives").select("id", { count: "exact", head: true })
          .eq("target_manager_id", user.id).eq("status", "sent")
      : Promise.resolve({ count: 0 }),
  ]);
  const inboxCount = inboxRes.count ?? 0;

  return (
    <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
      <Sidebar user={{ ...user, unreadCount, inboxCount }} />
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pl-16 pr-4 lg:px-6 py-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">お知らせ</p>
          <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            isManager ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-blue-50 text-blue-700 border-blue-200"
          }`}>
            {isManager ? "マネージャービュー" : "社員ビュー"}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
