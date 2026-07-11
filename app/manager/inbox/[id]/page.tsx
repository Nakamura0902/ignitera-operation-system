import { notFound } from "next/navigation";
import { adminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/get-current-user";
import { formatJstDateTime } from "@/lib/format-date";
import BriefDetailClient from "./brief-detail-client";

export interface BriefTaskRow {
  id: string;
  title: string;
  priority: string;
  status: string;
  progress: number;
  dueDate: string | null;
  assignee: string;
  revenue: number;
}

export interface EmployeeOption {
  id: string;
  name: string;
  specialty: string | null;
}

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const { data: directive } = await adminSupabase
    .from("directives")
    .select("id, raw_instruction, category, organized_title, organized_summary, organized_body, check_items, status, target_manager_id, created_at")
    .eq("id", id)
    .maybeSingle();

  // 自分宛でなければ見せない
  if (!directive || directive.target_manager_id !== user.id) notFound();

  const [{ data: taskData }, { data: empData }] = await Promise.all([
    adminSupabase
      .from("tasks")
      .select("id, title, priority, status, progress_rate, due_date, revenue_amount, users!tasks_assigned_to_fkey ( full_name )")
      .eq("directive_id", id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("users")
      .select("id, full_name, specialty, roles!inner ( name )")
      .eq("is_active", true)
      .eq("roles.name", "employee"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks: BriefTaskRow[] = (taskData ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    progress: t.progress_rate ?? 0,
    dueDate: t.due_date ? formatJstDateTime(t.due_date) : null,
    assignee: t.users?.full_name ?? "未割り当て",
    revenue: Number(t.revenue_amount ?? 0),
  }));

  const employees: EmployeeOption[] = (empData ?? []).map((e) => ({
    id: e.id,
    name: (e as { full_name?: string }).full_name ?? "名称未設定",
    specialty: (e as { specialty?: string | null }).specialty ?? null,
  }));

  const checkItems = Array.isArray(directive.check_items)
    ? (directive.check_items as string[])
    : [];

  return (
    <BriefDetailClient
      brief={{
        id: directive.id,
        category: directive.category,
        title: directive.organized_title,
        summary: directive.organized_summary,
        body: directive.organized_body,
        rawInstruction: directive.raw_instruction,
        checkItems,
        status: directive.status as "sent" | "in_progress" | "done",
        receivedAt: formatJstDateTime(directive.created_at),
      }}
      tasks={tasks}
      employees={employees}
      managerSpecialty={user.specialty}
      userId={user.id}
    />
  );
}
