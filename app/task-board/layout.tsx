import CeoSidebar from "@/components/ceo/sidebar";
import Sidebar from "@/components/employee/sidebar";
import { getCurrentUser } from "@/lib/get-current-user";
import { getUnreadCount } from "@/lib/notifications";
import { adminSupabase } from "@/lib/supabase/admin";

// Task Board は全ロール共通。ロールに応じたサイドバーを出す。ヘッダーはボード側で描画。
export default async function TaskBoardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user.role === "ceo") {
    return (
      <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
        <CeoSidebar user={{ name: user.name, avatar: user.avatar }} />
        <div className="flex-1 lg:ml-56 min-h-screen">{children}</div>
      </div>
    );
  }

  const isManager = user.role === "manager";
  const [unreadCount, inboxRes] = await Promise.all([
    getUnreadCount(user.id),
    isManager
      ? adminSupabase.from("directives").select("id", { count: "exact", head: true })
          .eq("target_manager_id", user.id).eq("status", "sent")
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
      <Sidebar user={{ ...user, unreadCount, inboxCount: inboxRes.count ?? 0 }} />
      <div className="flex-1 lg:ml-56 min-h-screen">{children}</div>
    </div>
  );
}
