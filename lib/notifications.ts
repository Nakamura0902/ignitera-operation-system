"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";

// Type values that match the DB CHECK constraint
export type NotificationType =
  | "task_assigned"
  | "deadline_warning"
  | "approval_required"
  | "score_confirmed"
  | "market_activity"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

/**
 * 通知を作成する。
 *   Step 1: notifications テーブルに保存（アプリ内通知）
 *   Step 2: Web Push を送信（購読端末があれば。lib/push.ts）
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
}) {
  const { error } = await adminSupabase.from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    action_url: params.actionUrl ?? null,
    is_read: false,
  });

  if (error) console.error("[notification] insert error:", error);

  // アプリ内通知に加えてWeb Pushを送信（購読があれば）
  await sendPushToUser(params.userId, {
    title: params.title,
    message: params.message,
    url: params.actionUrl,
  });
}

export async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const { data } = await adminSupabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await adminSupabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

export async function markAsRead(notificationId: string) {
  await adminSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

export async function markAllAsRead(userId: string) {
  await adminSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}
