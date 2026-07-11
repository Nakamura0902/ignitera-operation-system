"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { verifyCeoOrAdmin } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";
import type { LineCustomerEditable } from "@/types/line-customer";

// 顧客詳細の編集は社長・マネージャーのみ
export async function updateLineCustomer(id: string, patch: LineCustomerEditable) {
  const authError = await verifyCeoOrAdmin();
  if (authError) return { error: authError };

  const { error } = await adminSupabase
    .from("line_customers")
    .update({
      status: patch.status,
      temperature: patch.temperature,
      estimated_plan: patch.estimated_plan,
      assignee: patch.assignee.trim() || null,
      memo: patch.memo.trim() || null,
      next_action: patch.next_action.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: "更新に失敗しました" };

  revalidatePath(`/command-center/line-customers/${id}`);
  revalidatePath("/command-center/line-customers");
  return { success: true };
}
