import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

export interface ApiUser {
  id: string;
  role: string;
}

// APIルート用: セッションを検証してユーザーIDとロールを返す。未認証なら null。
export async function getApiUser(): Promise<ApiUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await adminSupabase
    .from("users")
    .select("roles(name)")
    .eq("id", user.id)
    .single();

  const role = (data?.roles as { name?: string } | null)?.name ?? "employee";
  return { id: user.id, role };
}

export function isCeoOrAdmin(user: ApiUser): boolean {
  return user.role === "ceo" || user.role === "admin";
}

// Server Action用: セッションユーザーが引数のuserIdと一致することを検証する。
// クライアントから渡されたuserIdをそのまま信用しないための共通ガード。
// エラーメッセージを返す（問題なければnull）。
export async function verifyActor(userId: string): Promise<string | null> {
  const session = await getApiUser();
  if (!session) return "認証が必要です";
  if (session.id !== userId) return "権限がありません";
  return null;
}

// Server Action用: 社長・管理者ロールであることを検証する。
export async function verifyCeoOrAdmin(userId?: string): Promise<string | null> {
  const session = await getApiUser();
  if (!session) return "認証が必要です";
  if (!isCeoOrAdmin(session)) return "この操作は社長・管理者のみ可能です";
  if (userId && session.id !== userId) return "権限がありません";
  return null;
}
