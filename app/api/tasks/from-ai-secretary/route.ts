import { adminSupabase } from "@/lib/supabase/admin";
import { assignTask } from "@/lib/assign-task";
import { getApiUser, isCeoOrAdmin } from "@/lib/api-auth";

interface AiAction {
  label: string;
  dept: string;
  done: boolean;
}

interface AiResult {
  category: string;
  departments: string[];
  summary: string;
  actions: AiAction[];
  checkItems: string[];
}

function deptNameToSlug(aiDeptName: string): string {
  const n = aiDeptName;
  if (n.includes("案件")) return "projects";
  if (n.includes("営業")) return "sales";
  if (n.includes("開発")) return "development";
  if (n.includes("経理") || n.includes("請求")) return "accounting";
  if (n.includes("事務") || n.includes("オペレーション")) return "operations";
  return "development";
}

export async function POST(req: Request) {
  // タスク一括生成は社長・管理者のみ（社員は不可）
  const user = await getApiUser();
  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!isCeoOrAdmin(user)) {
    return Response.json({ error: "この操作は社長・管理者のみ可能です" }, { status: 403 });
  }
  const ceoId = user.id;

  const { instruction, result }: { instruction: string; result: AiResult } =
    await req.json();

  // 1. Fetch department slug→id map
  const { data: depts, error: deptsError } = await adminSupabase
    .from("departments")
    .select("id, name");

  if (deptsError || !depts) {
    return Response.json({ error: "部門情報の取得に失敗しました" }, { status: 500 });
  }

  const deptBySlug = Object.fromEntries(depts.map((d) => [d.name, d.id]));

  // 2. Save AI output as a report
  const { data: report, error: reportError } = await adminSupabase
    .from("reports")
    .insert({
      title: `AI秘書: ${result.category}`,
      content: { instruction, result },
      type: "ad_hoc",
      status: "published",
      created_by: ceoId,
    })
    .select("id")
    .single();

  if (reportError) {
    return Response.json({ error: "レポートの保存に失敗しました", details: reportError.message }, { status: 500 });
  }

  // 3. Create tasks for each action
  const tasksToInsert = await Promise.all(
    result.actions.map(async (action) => {
      const slug = deptNameToSlug(action.dept);
      const departmentId = deptBySlug[slug] ?? deptBySlug["development"];
      const assignedTo = await assignTask(departmentId);
      return {
        title: action.label,
        description: `【AI秘書指示】\n${instruction}\n\nカテゴリ: ${result.category}\n担当AI: ${action.dept}`,
        department_id: departmentId,
        created_by: ceoId,
        status: "pending" as const,
        priority: "high" as const,
        progress_rate: 0,
        provisional_score: 200,
        ...(assignedTo ? { assigned_to: assignedTo } : {}),
      };
    })
  );

  const { data: tasks, error: tasksError } = await adminSupabase
    .from("tasks")
    .insert(tasksToInsert)
    .select("id, title, department_id");

  if (tasksError) {
    return Response.json({ error: "タスク作成に失敗しました", details: tasksError.message }, { status: 500 });
  }

  // 4. Create task_scores for each task (provisional)
  if (tasks && tasks.length > 0) {
    const scores = tasks.map((t) => ({
      task_id: t.id,
      difficulty: 3,
      effort: 3,
      contribution: 3,
      urgency: 4,
      quality_risk: 3,
      provisional_total: 200,
    }));
    await adminSupabase.from("task_scores").insert(scores);
  }

  return Response.json({
    success: true,
    report_id: report.id,
    task_count: tasks?.length ?? 0,
    tasks: tasks?.map((t) => ({ id: t.id, title: t.title })),
  });
}
