import { adminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/get-current-user";
import { formatJstDate } from "@/lib/format-date";
import ApprovalCenterClient from "./approval-center-client";

export interface ApprovalItem {
  id: string;
  urgency: "urgent" | "high" | "medium" | "low";
  type: "task_score" | "market" | "payroll";
  typeLabel: string;
  title: string;
  detail: string;
  amount?: number;
  submittedBy: string;
  submittedAt: string;
}

async function fetchApprovalItems(): Promise<ApprovalItem[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [{ data: pendingScores }, { data: pendingListings }, { data: draftPayrolls }] =
    await Promise.all([
      adminSupabase
        .from("task_scores")
        .select(`
          id,
          provisional_total,
          created_at,
          tasks (
            title,
            priority,
            due_date,
            users!tasks_assigned_to_fkey (full_name)
          )
        `)
        .is("confirmed_total", null)
        .is("approved_by", null)
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("task_market_listings")
        .select(`
          id,
          remaining_points,
          created_at,
          expires_at,
          reason,
          tasks (
            title,
            priority,
            due_date
          ),
          users!task_market_listings_listed_by_fkey (full_name)
        `)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("payroll_estimates")
        .select(`
          id,
          total_estimate,
          created_at,
          users (full_name)
        `)
        .eq("status", "draft")
        .eq("year", year)
        .eq("month", month)
        .order("created_at", { ascending: false }),
    ]);

  const items: ApprovalItem[] = [];

  for (const score of pendingScores ?? []) {
    const task = score.tasks as {
      title?: string;
      priority?: string;
      due_date?: string;
      users?: { full_name?: string } | null;
    } | null;

    const dueDate = task?.due_date ? new Date(task.due_date) : null;
    const daysLeft = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const urgency: ApprovalItem["urgency"] =
      task?.priority === "urgent" || daysLeft <= 1 ? "urgent" :
      task?.priority === "high" || daysLeft <= 3 ? "high" :
      task?.priority === "medium" ? "medium" : "low";

    items.push({
      id: score.id,
      urgency,
      type: "task_score",
      typeLabel: "タスク点数",
      title: task?.title ?? "タスク名不明",
      detail: `担当: ${task?.users?.full_name ?? "未設定"} · 仮${score.provisional_total}pt`,
      submittedBy: task?.users?.full_name ?? "未設定",
      submittedAt: formatJstDate(score.created_at),
    });
  }

  for (const listing of pendingListings ?? []) {
    const task = listing.tasks as {
      title?: string;
      priority?: string;
      due_date?: string;
    } | null;
    const lister = listing.users as { full_name?: string } | null;

    const dueDate = task?.due_date ? new Date(task.due_date) : null;
    const daysLeft = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const urgency: ApprovalItem["urgency"] =
      daysLeft <= 1 ? "urgent" : daysLeft <= 3 ? "high" : "medium";

    items.push({
      id: listing.id,
      urgency,
      type: "market",
      typeLabel: "マーケット",
      title: task?.title ?? "タスク名不明",
      detail: `残${listing.remaining_points}pt · 期日まで${daysLeft}日`,
      submittedBy: lister?.full_name ?? "未設定",
      submittedAt: formatJstDate(listing.created_at),
    });
  }

  for (const payroll of draftPayrolls ?? []) {
    const user = payroll.users as { full_name?: string } | null;

    items.push({
      id: payroll.id,
      urgency: "medium",
      type: "payroll",
      typeLabel: "給与反映",
      title: `${user?.full_name ?? "不明"} の給与見込み承認`,
      detail: `支給見込み ¥${Number(payroll.total_estimate).toLocaleString()}`,
      amount: Number(payroll.total_estimate),
      submittedBy: user?.full_name ?? "未設定",
      submittedAt: formatJstDate(payroll.created_at),
    });
  }

  // urgencyでソート
  const urgencyOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return items;
}

export default async function ApprovalCenterPage() {
  const [approvalItems, user] = await Promise.all([fetchApprovalItems(), getCurrentUser()]);
  return <ApprovalCenterClient initialItems={approvalItems} ceoId={user.id} />;
}
