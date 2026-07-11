"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export interface DirectDirectiveInput {
  title: string;
  body: string;
  category?: string;
  targetManagerId: string;
  checkItems?: string[];
}

// 社長がAI秘書を介さず直接、マネージャーへタスク依頼(directive)を作成する。
export async function createDirectDirective(input: DirectDirectiveInput) {
  const user = await getApiUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "ceo") return { error: "この操作は社長のみ可能です" };

  if (!input.title.trim()) return { error: "件名を入力してください" };
  if (!input.body.trim()) return { error: "内容を入力してください" };
  if (!input.targetManagerId) return { error: "担当マネージャーを選択してください" };

  const { data: directive, error } = await adminSupabase
    .from("directives")
    .insert({
      raw_instruction: input.body.trim(),
      category: input.category?.trim() || null,
      organized_title: input.title.trim(),
      organized_summary: input.title.trim(),
      organized_body: input.body.trim(),
      check_items: (input.checkItems ?? []).filter((c) => c.trim()),
      target_manager_id: input.targetManagerId,
      created_by: user.id,
      status: "sent",
    })
    .select("id")
    .single();

  if (error || !directive) return { error: "タスク依頼の作成に失敗しました" };

  await createNotification({
    userId: input.targetManagerId,
    title: "社長から直接タスク依頼が届きました",
    message: input.title.trim(),
    type: "task_assigned",
    actionUrl: `/manager/inbox/${directive.id}`,
  });

  revalidatePath("/manager/inbox");
  return { success: true };
}
