import { notFound } from "next/navigation";
import { adminSupabase } from "@/lib/supabase/admin";
import type { LineCustomer } from "@/types/line-customer";
import CustomerDetailClient from "./customer-detail-client";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await adminSupabase
    .from("line_customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return <CustomerDetailClient customer={data as LineCustomer} />;
}
