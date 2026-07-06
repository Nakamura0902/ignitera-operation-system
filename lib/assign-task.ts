import { adminSupabase } from "@/lib/supabase/admin";

export async function assignTask(
  departmentId: string,
  projectId?: string
): Promise<string | null> {
  if (projectId) {
    const { data: project } = await adminSupabase
      .from("projects")
      .select("assigned_to")
      .eq("id", projectId)
      .single();

    if (project?.assigned_to) {
      return project.assigned_to;
    }
  }

  // 担当業務（user_departments）にこの部門を選んでいる社員を候補にする。
  // 未設定の社員のために users.department_id もフォールバックとして合算する。
  const [{ data: workMembers }, { data: legacyMembers }] = await Promise.all([
    adminSupabase
      .from("user_departments")
      .select("user_id, users!inner(id, is_active)")
      .eq("department_id", departmentId)
      .eq("users.is_active", true),
    adminSupabase
      .from("users")
      .select("id")
      .eq("department_id", departmentId)
      .eq("is_active", true),
  ]);

  const memberIds = new Set<string>();
  (workMembers ?? []).forEach((m) => memberIds.add(m.user_id));
  (legacyMembers ?? []).forEach((m) => memberIds.add(m.id));
  const members = [...memberIds].map((id) => ({ id }));

  if (members.length === 0) return null;

  const taskCounts = await Promise.all(
    members.map(async (member) => {
      const { count } = await adminSupabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", member.id)
        .in("status", ["pending", "in_progress"]);
      return { userId: member.id, count: count ?? 0 };
    })
  );

  taskCounts.sort((a, b) => a.count - b.count);
  const selectedUserId = taskCounts[0].userId;

  if (projectId) {
    await adminSupabase
      .from("projects")
      .update({ assigned_to: selectedUserId })
      .eq("id", projectId);
  }

  return selectedUserId;
}
