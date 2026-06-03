import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

// 指示履歴を取得
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  if (!userId) return NextResponse.json({ history: [] });

  const { data } = await adminSupabase
    .from("reports")
    .select("id, title, content, created_at")
    .eq("created_by", userId)
    .eq("type", "ad_hoc")
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (data ?? []).map((r) => ({
    id: r.id,
    text: r.title,
    date: new Date(r.created_at).toLocaleString("ja-JP", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
    status: "完了",
    summary: (r.content as { summary?: string })?.summary ?? "",
  }));

  return NextResponse.json({ history });
}

// 指示履歴を保存
export async function POST(req: NextRequest) {
  const { userId, instruction, result } = await req.json();
  if (!userId || !instruction) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const title = instruction.length > 60 ? instruction.slice(0, 60) + "…" : instruction;

  const { error } = await adminSupabase.from("reports").insert({
    title,
    content: { instruction, result, summary: result?.summary ?? "" },
    type: "ad_hoc",
    status: "published",
    created_by: userId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
