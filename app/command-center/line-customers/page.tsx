import { adminSupabase } from "@/lib/supabase/admin";
import type { LineCustomer } from "@/types/line-customer";
import LineCustomersClient from "./line-customers-client";

// 管理一覧は常に最新を取得する
export const dynamic = "force-dynamic";

export default async function LineCustomersPage() {
  const { data } = await adminSupabase
    .from("line_customers")
    .select("*")
    .order("created_at", { ascending: false });

  const customers = (data ?? []) as LineCustomer[];

  const kpi = {
    total: customers.length,
    unhandled: customers.filter((c) => c.status === "未対応").length,
    hot: customers.filter((c) => c.temperature === "高").length,
    reserved: customers.filter((c) => c.status === "相談予約済").length,
    proposing: customers.filter((c) => c.status === "提案中").length,
  };

  return <LineCustomersClient customers={customers} kpi={kpi} />;
}
