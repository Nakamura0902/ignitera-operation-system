import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const userId = req.nextUrl.searchParams.get("userId") ?? "";

  if (!q || !userId) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await adminSupabase
    .from("tasks")
    .select(`
      id, title, status, priority, progress_rate,
      departments ( display_name )
    `)
    .eq("assigned_to", userId)
    .ilike("title", `%${q}%`)
    .not("status", "eq", "cancelled")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    return NextResponse.json({ results: [] });
  }

  const results = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    progress_rate: row.progress_rate,
    department_name: (row.departments as { display_name?: string } | null)?.display_name ?? "未分類",
  }));

  return NextResponse.json({ results });
}
