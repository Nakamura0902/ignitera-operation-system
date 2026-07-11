import { adminSupabase } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

interface AiResult {
  category?: string;
  targetSpecialty?: string;
  organizedTitle?: string;
  organizedSummary?: string;
  organizedBody?: string;
  checkItems?: string[];
}

// AI秘書が整理した結果を「指示ブリーフ」としてマネージャーに配信する。社長のみ。
export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "認証が必要です" }, { status: 401 });
  if (user.role !== "ceo") {
    return Response.json({ error: "この操作は社長のみ可能です" }, { status: 403 });
  }

  const { instruction, result }: { instruction: string; result: AiResult } = await req.json();

  if (!result?.organizedTitle || !result?.organizedBody) {
    return Response.json({ error: "AIの整理結果が不正です" }, { status: 400 });
  }

  // targetSpecialty に一致する在籍マネージャー(内部ロール'admin')を探す
  let targetManagerId: string | null = null;
  let targetManagerName: string | null = null;
  if (result.targetSpecialty) {
    const { data: manager } = await adminSupabase
      .from("users")
      .select("id, full_name, roles!inner(name)")
      .eq("is_active", true)
      .eq("roles.name", "admin")
      .eq("specialty", result.targetSpecialty)
      .maybeSingle();
    if (manager) {
      targetManagerId = manager.id;
      targetManagerName = (manager as { full_name?: string }).full_name ?? null;
    }
  }

  const { data: directive, error } = await adminSupabase
    .from("directives")
    .insert({
      raw_instruction: instruction,
      category: result.category ?? null,
      organized_title: result.organizedTitle,
      organized_summary: result.organizedSummary ?? "",
      organized_body: result.organizedBody,
      check_items: result.checkItems ?? [],
      target_manager_id: targetManagerId,
      created_by: user.id,
      status: "sent",
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "ブリーフの作成に失敗しました", details: error.message }, { status: 500 });
  }

  // 振り分け先マネージャーに通知（アプリ内 + Web Push）
  if (targetManagerId) {
    await createNotification({
      userId: targetManagerId,
      title: "新しい指示ブリーフが届きました",
      message: result.organizedTitle,
      type: "task_assigned",
      actionUrl: `/manager/inbox/${directive.id}`,
    });
  }

  return Response.json({
    success: true,
    directive_id: directive.id,
    assigned: !!targetManagerId,
    manager_name: targetManagerName,
    specialty: result.targetSpecialty ?? null,
  });
}
