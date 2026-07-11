import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/api-auth";
import { formatJstShortDateTime } from "@/lib/format-date";

// 指示履歴を取得（本人の履歴のみ。userIdはセッションから取得する）
export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { data } = await adminSupabase
    .from("reports")
    .select("id, title, content, created_at")
    .eq("created_by", user.id)
    .eq("type", "ad_hoc")
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (data ?? []).map((r) => ({
    id: r.id,
    text: r.title,
    date: formatJstShortDateTime(r.created_at),
    status: "完了",
    summary: (r.content as { summary?: string })?.summary ?? "",
  }));

  return NextResponse.json({ history });
}

// 指示履歴を保存
export async function POST(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { instruction, result } = await req.json();
  if (!instruction) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const title = instruction.length > 60 ? instruction.slice(0, 60) + "…" : instruction;

  const { error } = await adminSupabase.from("reports").insert({
    title,
    content: { instruction, result, summary: result?.organizedSummary ?? "" },
    type: "ad_hoc",
    status: "published",
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
