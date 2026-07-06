import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/get-current-user";
import { getNotifications, markAllAsRead } from "@/lib/notifications";

const typeLabels: Record<string, string> = {
  task_assigned: "タスク割当",
  deadline_warning: "期限警告",
  approval_required: "承認待ち",
  score_confirmed: "点数確定",
  market_activity: "マーケット",
  system: "システム",
};

const typeBadgeColors: Record<string, string> = {
  task_assigned: "bg-blue-100 text-blue-700",
  deadline_warning: "bg-orange-100 text-orange-700",
  approval_required: "bg-red-100 text-red-700",
  score_confirmed: "bg-emerald-100 text-emerald-700",
  market_activity: "bg-purple-100 text-purple-700",
  system: "bg-slate-100 text-slate-600",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "たった今";
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays === 1) return "昨日";
  return `${diffDays}日前`;
}

function groupByDate(notifications: Awaited<ReturnType<typeof getNotifications>>) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  const groups: { label: string; items: typeof notifications }[] = [
    { label: "今日", items: [] },
    { label: "昨日", items: [] },
    { label: "それ以前", items: [] },
  ];

  for (const notification of notifications) {
    const dateStr = new Date(notification.created_at).toDateString();
    if (dateStr === todayStr) {
      groups[0].items.push(notification);
    } else if (dateStr === yesterdayStr) {
      groups[1].items.push(notification);
    } else {
      groups[2].items.push(notification);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  const notifications = await getNotifications(currentUser.id);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByDate(notifications);

  async function handleMarkAllAsRead() {
    "use server";
    const user = await getCurrentUser();
    await markAllAsRead(user.id);
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">お知らせ</h1>
          {unreadCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full font-bold">
              {unreadCount}件 未読
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <form action={handleMarkAllAsRead}>
            <button
              type="submit"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              すべて既読にする
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-500 font-medium">お知らせはありません</p>
          <p className="text-xs text-slate-400 mt-1">新しい通知が届いたらここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-bold text-slate-400 mb-2 px-1">{group.label}</p>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                {group.items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 flex items-start gap-3 ${!notification.is_read ? "bg-blue-50/40" : ""}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notification.is_read ? "bg-blue-500" : "bg-slate-200"}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeBadgeColors[notification.type] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {typeLabels[notification.type] ?? notification.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{notification.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(notification.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
