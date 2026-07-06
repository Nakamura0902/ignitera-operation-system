import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getApiUser } from "@/lib/api-auth";

const BUCKET = "task-attachments";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const taskId = formData.get("taskId") as string;

  if (!file || !taskId) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ファイルサイズは10MB以内にしてください" }, { status: 400 });
  }

  const filePath = `tasks/${taskId}/${Date.now()}_${file.name}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await adminSupabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }

  // attachmentsテーブルに記録（user_idはセッションから取得）
  const { data: row, error: dbError } = await adminSupabase
    .from("attachments")
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      target_type: "task",
      target_id: taskId,
    })
    .select("id, file_name, file_size, mime_type, created_at")
    .single();

  if (dbError) {
    // Storageは成功してもDBが失敗した場合はStorage側も削除
    await adminSupabase.storage.from(BUCKET).remove([filePath]);
    return NextResponse.json({ error: "ファイル情報の保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ attachment: row });
}

// ファイル一覧取得
export async function GET(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ attachments: [] });

  const { data } = await adminSupabase
    .from("attachments")
    .select("id, file_name, file_path, file_size, mime_type, created_at, user_id, users(full_name)")
    .eq("target_type", "task")
    .eq("target_id", taskId)
    .order("created_at", { ascending: false });

  // 署名付きURLを生成（保存時のfile_pathをそのまま使う）
  const attachments = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await adminSupabase.storage
        .from(BUCKET)
        .createSignedUrl(row.file_path, 3600);
      return {
        id: row.id,
        fileName: row.file_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        uploadedAt: row.created_at,
        uploaderName: (row.users as { full_name?: string } | null)?.full_name ?? "不明",
        url: signed?.signedUrl ?? "",
      };
    })
  );

  return NextResponse.json({ attachments });
}

// ファイル削除
export async function DELETE(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { attachmentId } = await req.json();
  if (!attachmentId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data: row } = await adminSupabase
    .from("attachments")
    .select("file_path, user_id")
    .eq("id", attachmentId)
    .single();

  if (!row) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  if (row.user_id !== user.id) return NextResponse.json({ error: "削除権限がありません" }, { status: 403 });

  await adminSupabase.storage.from(BUCKET).remove([row.file_path]);
  await adminSupabase.from("attachments").delete().eq("id", attachmentId);

  return NextResponse.json({ success: true });
}
