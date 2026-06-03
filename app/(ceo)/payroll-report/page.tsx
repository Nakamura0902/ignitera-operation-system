import { adminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/get-current-user";
import PayrollReportClient from "./payroll-report-client";

export interface PayrollRow {
  id: string;
  userId: string;
  name: string;
  employeeId: string;
  department: string;
  confirmedPoints: number;
  pendingPoints: number;
  baseSalary: number;
  pointReward: number;
  qualityBonus: number;
  totalEstimate: number;
  minSalaryMet: boolean;
  status: "draft" | "reviewed" | "approved";
}

async function fetchPayrollRows(): Promise<PayrollRow[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: estimates } = await adminSupabase
    .from("payroll_estimates")
    .select(`
      id,
      user_id,
      base_salary,
      point_reward,
      quality_bonus,
      total_estimate,
      total_score_points,
      status,
      users (
        full_name,
        employee_id,
        departments (display_name)
      )
    `)
    .eq("year", year)
    .eq("month", month)
    .order("created_at", { ascending: true });

  if (estimates && estimates.length > 0) {
    return estimates.map((row) => {
      const user = row.users as {
        full_name?: string;
        employee_id?: string;
        departments?: { display_name?: string } | null;
      } | null;

      return {
        id: row.id,
        userId: row.user_id,
        name: user?.full_name ?? "不明",
        employeeId: user?.employee_id ?? "",
        department: user?.departments?.display_name ?? "部門不明",
        confirmedPoints: row.total_score_points,
        pendingPoints: 0,
        baseSalary: Number(row.base_salary),
        pointReward: Number(row.point_reward),
        qualityBonus: Number(row.quality_bonus),
        totalEstimate: Number(row.total_estimate),
        minSalaryMet: Number(row.total_estimate) > 0,
        status: row.status as PayrollRow["status"],
      };
    });
  }

  // payroll_estimatesがない場合はusersから計算
  const { data: users } = await adminSupabase
    .from("users")
    .select(`
      id,
      full_name,
      employee_id,
      departments (display_name)
    `)
    .eq("is_active", true);

  if (!users) return [];

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

  const rows = await Promise.all(
    users.map(async (user) => {
      const { data: scoreHistory } = await adminSupabase
        .from("score_history")
        .select("points_after")
        .eq("user_id", user.id)
        .eq("score_type", "confirmed")
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      const totalPoints = (scoreHistory ?? []).reduce(
        (sum, h) => sum + (h.points_after ?? 0),
        0
      );
      const pointReward = totalPoints * 5;

      const dept = user.departments as { display_name?: string } | null;

      return {
        id: user.id,
        userId: user.id,
        name: user.full_name ?? "不明",
        employeeId: (user as { employee_id?: string }).employee_id ?? "",
        department: dept?.display_name ?? "部門不明",
        confirmedPoints: totalPoints,
        pendingPoints: 0,
        baseSalary: 0,
        pointReward,
        qualityBonus: 0,
        totalEstimate: pointReward,
        minSalaryMet: true,
        status: "draft" as const,
      };
    })
  );

  return rows;
}

export default async function PayrollReportPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [payrollRows, user] = await Promise.all([fetchPayrollRows(), getCurrentUser()]);
  return <PayrollReportClient payrollRows={payrollRows} year={year} month={month} ceoId={user.id} />;
}
