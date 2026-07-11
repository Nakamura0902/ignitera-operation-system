import { adminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/get-current-user";
import TaskMarketMonitorClient from "./task-market-monitor-client";

export interface MarketListing {
  id: string; taskId: string; taskTitle: string;
  lister: string; applicant: string | null;
  department: string; remainingPoints: number; progressAtListing: number;
  dueDate: string; daysUntilDue: number; reason: string;
  riskLevel: "high" | "medium" | "low";
  status: "pending_approval" | "open" | "taken" | "cancelled";
  applicantCount: number;
}

const reasonLabels: Record<string, string> = {
  busy: "業務過多",
  skill_gap: "スキル不足",
  deadline: "期限対応",
  other_priority: "優先度変更",
};

async function fetchMarketListings(): Promise<MarketListing[]> {
  const { data } = await adminSupabase
    .from("task_market_listings")
    .select(`
      id,
      task_id,
      remaining_points,
      progress_at_listing,
      reason,
      status,
      expires_at,
      users!task_market_listings_listed_by_fkey (full_name),
      tasks (
        title,
        due_date
      ),
      task_applications (
        id,
        status,
        users!task_applications_applicant_id_fkey (full_name)
      )
    `)
    .in("status", ["pending_approval", "open", "taken"])
    .order("created_at", { ascending: false });

  const now = new Date();

  return (data ?? []).map((row) => {
    const lister = row.users as { full_name?: string } | null;
    const task = row.tasks as {
      title?: string;
      due_date?: string;
      departments?: { display_name?: string } | null;
    } | null;
    const applications = row.task_applications as {
      id?: string;
      status?: string;
      users?: { full_name?: string } | null;
    }[] | null;

    const dueDate = task?.due_date ? new Date(task.due_date) : null;
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const riskLevel: MarketListing["riskLevel"] =
      daysUntilDue <= 1 ? "high" :
      daysUntilDue <= 3 ? "medium" : "low";

    const approvedApplicant = applications?.find((a) => a.status === "approved");
    const pendingApplicant = applications?.find((a) => a.status === "pending");
    const displayApplicant = approvedApplicant ?? pendingApplicant;

    return {
      id: row.id,
      taskId: row.task_id,
      taskTitle: task?.title ?? "タスク名不明",
      lister: lister?.full_name ?? "未設定",
      applicant: displayApplicant?.users?.full_name ?? null,
      department: "—",
      remainingPoints: row.remaining_points,
      progressAtListing: row.progress_at_listing,
      dueDate: task?.due_date ?? "",
      daysUntilDue,
      reason: reasonLabels[row.reason] ?? row.reason,
      riskLevel,
      status: row.status as MarketListing["status"],
      applicantCount: (applications ?? []).filter((a) => a.status === "pending").length,
    };
  });
}

export default async function TaskMarketMonitorPage() {
  const [marketListings, user] = await Promise.all([fetchMarketListings(), getCurrentUser()]);
  return <TaskMarketMonitorClient initialListings={marketListings} ceoId={user.id} />;
}
