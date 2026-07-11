import "server-only";
import crypto from "crypto";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const SECRET = process.env.LINE_CHANNEL_SECRET;

// Webhookの署名検証（X-Line-Signature = HMAC-SHA256(channelSecret, body) のbase64）
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!SECRET || !signature) return false;
  const hash = crypto.createHmac("sha256", SECRET).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

// 友だちのプロフィール取得（friend added 時など）
export async function getLineProfile(userId: string): Promise<LineProfile | null> {
  if (!TOKEN) return null;
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as LineProfile;
}

// 本人へテキストをpush送信
export async function sendLinePush(userId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) return { ok: false, error: "LINEアクセストークンが未設定です" };
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) return { ok: false, error: `LINE送信に失敗しました (${res.status})` };
  return { ok: true };
}
