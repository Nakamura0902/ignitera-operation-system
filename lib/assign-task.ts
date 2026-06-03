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

  const { data: members } = await adminSupabase
    .from("users")
    .select("id")
    .eq("department_id", departmentId)
    .eq("is_active", true);

  if (!members || members.length === 0) return null;

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
