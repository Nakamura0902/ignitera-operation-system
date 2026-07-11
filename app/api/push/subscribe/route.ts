import { adminSupabase } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/api-auth";

// この端末のPush購読を保存する（本人のみ）
export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "認証が必要です" }, { status: 401 });

  const sub = await req.json();
  const endpoint = sub?.endpoint as string | undefined;
  const p256dh = sub?.keys?.p256dh as string | undefined;
  const auth = sub?.keys?.auth as string | undefined;

  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "購読情報が不正です" }, { status: 400 });
  }

  // endpointはUNIQUE。同じ端末の再購読はupsertで更新する。
  const { error } = await adminSupabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth },
      { onConflict: "endpoint" }
    );

  if (error) return Response.json({ error: "保存に失敗しました" }, { status: 500 });
  return Response.json({ success: true });
}

// この端末のPush購読を削除する（本人のみ）
export async function DELETE(req: Request) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "認証が必要です" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return Response.json({ error: "endpointが必要です" }, { status: 400 });

  await adminSupabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  return Response.json({ success: true });
}
