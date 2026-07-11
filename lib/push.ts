import "server-only";
import webpush from "web-push";
import { adminSupabase } from "@/lib/supabase/admin";

// VAPID設定（未設定ならプッシュ送信はスキップされる）
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@ignitera.local";

let configured = false;
if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  message: string;
  url?: string;
}

// 指定ユーザーの全端末にWeb Pushを送信する。
// 失効した購読(404/410)はDBから削除する。VAPID未設定なら何もしない。
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configured) return;

  const { data: subs } = await adminSupabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    message: payload.message,
    url: payload.url ?? "/",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await adminSupabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[push] send error:", statusCode ?? err);
        }
      }
    })
  );
}
