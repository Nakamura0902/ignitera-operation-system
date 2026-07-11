import { adminSupabase } from "@/lib/supabase/admin";
import { verifyLineSignature, getLineProfile } from "@/lib/line";

// LINE Messaging API Webhook。署名検証 → 友だち追加で自動登録、テキスト受信をメモに記録。
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(raw, signature)) {
    return new Response("invalid signature", { status: 401 });
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  for (const ev of body.events ?? []) {
    const userId = ev.source?.userId;
    if (!userId) continue;

    if (ev.type === "follow") {
      // 未登録の友だちのみ最小レコードを作成（取りこぼし防止）
      const { data: existing } = await adminSupabase
        .from("line_customers")
        .select("id")
        .eq("line_user_id", userId)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const profile = await getLineProfile(userId);
        await adminSupabase.from("line_customers").insert({
          name: profile?.displayName ?? "LINEユーザー",
          source: "LINE",
          form_type: "友だち追加",
          status: "未対応",
          line_user_id: userId,
          line_display_name: profile?.displayName ?? null,
          line_picture_url: profile?.pictureUrl ?? null,
        });
      }
    } else if (ev.type === "message" && ev.message?.type === "text") {
      // 該当顧客（最新）のメモに受信メッセージを追記
      const { data: row } = await adminSupabase
        .from("line_customers")
        .select("id, memo")
        .eq("line_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (row) {
        const stamp = new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
        });
        const entry = `[LINE受信 ${stamp}] ${ev.message.text}`;
        const newMemo = row.memo ? `${row.memo}\n${entry}` : entry;
        await adminSupabase.from("line_customers").update({ memo: newMemo }).eq("id", row.id);
      }
    }
  }

  return new Response("ok", { status: 200 });
}

interface LineEvent {
  type: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
}
