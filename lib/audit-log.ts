"use server";

import { adminSupabase } from "@/lib/supabase/admin";

export async function writeAuditLog(params: {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  const { error } = await adminSupabase.from("audit_logs").insert({
    user_id: params.userId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    before_value: params.before ?? null,
    after_value: params.after ?? null,
  });
  if (error) console.error("[audit_log] error:", error);
}
