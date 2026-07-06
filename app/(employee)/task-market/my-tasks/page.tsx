import { getCurrentUser } from "@/lib/get-current-user";
import { adminSupabase } from "@/lib/supabase/admin";
import { formatJstDate } from "@/lib/format-date";
import MyAcceptedTasksClient from "./my-accepted-tasks-client";

interface AcceptedTask {
  id: string; taskId: string; title: string; originalAssignee: string; department: string;
  progress: number; dueDate: string; remainingPoints: number;
  status: "in_progress" | "completed"; acceptedAt: string; confirmedPoints?: number;
}

export interface IncomingApplication {
  applicationId: string;
  listingId: string;
  taskTitle: string;
  applicantName: string;
  message: string;
  appliedAt: string;
  status: "pending" | "approved" | "rejected";
}

async function fetchMyMarketActivity(userId: string) {
  // 自分が申請して承認されたタスク
  const { data: applications } = await adminSupabase
    .from("task_applications")
    .select(`
      id, status, created_at,
      task_market_listings (
        id, task_id,
        tasks (
          id, title, progress_rate, due_date, provisional_score, status,
          departments ( display_name ),
          users!tasks_assigned_to_fkey ( full_name )
        )
      )
    `)
    .eq("applicant_id", userId)
    .eq("status", "approved");

  const acceptedTasks: AcceptedTask[] = (applications ?? []).map((app) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listing = app.task_market_listings as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = listing?.tasks as any;
    const score = task?.provisional_score ?? 0;
    const progress = task?.progress_rate ?? 0;
    const remainingPoints = Math.round(score * (1 - progress / 100));
    const isCompleted = task?.status === "completed";

    return {
      id: app.id,
      taskId: task?.id ?? "",
      title: task?.title ?? "不明なタスク",
      originalAssignee: task?.users?.full_name ?? "不明",
      department: task?.departments?.display_name ?? "未分類",
      progress,
      dueDate: task?.due_date ?? "",
      remainingPoints,
      status: isCompleted ? "completed" : "in_progress",
      acceptedAt: formatJstDate(app.created_at),
      confirmedPoints: isCompleted ? remainingPoints : undefined,
    };
  });

  // 自分が出品したリスト
  const { data: myListings } = await adminSupabase
    .from("task_market_listings")
    .select(`
      id, status, created_at,
      tasks ( id, title, progress_rate, due_date )
    `)
    .eq("listed_by", userId)
    .order("created_at", { ascending: false });

  const myListingsFormatted = (myListings ?? []).map((listing) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = listing.tasks as any;
    return {
      id: listing.id,
      taskTitle: task?.title ?? "不明なタスク",
      status: listing.status as string,
      createdAt: formatJstDate(listing.created_at),
      progress: task?.progress_rate ?? 0,
      dueDate: task?.due_date ?? "",
    };
  });

  // 自分の出品への申請一覧（pending のみ）
  const listingIds = (myListings ?? []).map((l) => l.id);
  let incomingApplications: IncomingApplication[] = [];

  if (listingIds.length > 0) {
    const { data: incoming } = await adminSupabase
      .from("task_applications")
      .select(`
        id, message, status, created_at,
        listing_id,
        task_market_listings ( tasks ( title ) ),
        users!task_applications_applicant_id_fkey ( full_name )
      `)
      .in("listing_id", listingIds)
      .in("status", ["pending"])
      .order("created_at", { ascending: false });

    incomingApplications = (incoming ?? []).map((app) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listing = app.task_market_listings as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const applicant = app.users as any;
      return {
        applicationId: app.id,
        listingId: app.listing_id,
        taskTitle: listing?.tasks?.title ?? "不明なタスク",
        applicantName: applicant?.full_name ?? "不明",
        message: app.message ?? "",
        appliedAt: formatJstDate(app.created_at),
        status: app.status as "pending" | "approved" | "rejected",
      };
    });
  }

  return { acceptedTasks, myListingsFormatted, incomingApplications };
}

export default async function MyAcceptedTasksPage() {
  const user = await getCurrentUser();
  const { acceptedTasks, myListingsFormatted, incomingApplications } = await fetchMyMarketActivity(user.id);

  return (
    <MyAcceptedTasksClient
      acceptedTasks={acceptedTasks}
      myListings={myListingsFormatted}
      incomingApplications={incomingApplications}
      userId={user.id}
    />
  );
}
