import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { getApiUser } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/supabase/admin";

// 在籍マネージャーの専門一覧を取得する（AIの振り分け候補）
async function getManagerSpecialties(): Promise<string[]> {
  const { data } = await adminSupabase
    .from("users")
    .select("specialty, roles!inner(name)")
    .eq("is_active", true)
    .eq("roles.name", "admin"); // 内部ロール 'admin' = マネージャー

  const set = new Set<string>();
  (data ?? []).forEach((u) => {
    const s = (u as { specialty?: string | null }).specialty;
    if (s) set.add(s);
  });
  return [...set];
}

function buildSystemPrompt(specialties: string[]): string {
  const list = specialties.length > 0 ? specialties.join(" / ") : "（マネージャー未登録）";
  return `あなたはIGNITERA Command Centerの「AI秘書」です。
社長（CEO）の自然言語の指示を受け取り、担当マネージャーが実行に移しやすいように整理する「伝言・整理役」です。
タスクの細分化や点数付けはしません。整理と振り分け先の判定だけを行います。

現在の担当マネージャーの専門: ${list}

以下のJSON形式のみで応答してください（前後に文章を付けない）:
{
  "category": "指示のカテゴリ（短く）",
  "targetSpecialty": "振り分け先の専門。必ず上記の専門一覧から最も適切なものを1つ選ぶ",
  "organizedTitle": "マネージャー向けの件名（1行）",
  "organizedSummary": "指示の要約（2〜3文）",
  "organizedBody": "マネージャーが動けるように整理した本文。背景・依頼内容・ゴールを箇条書き中心で",
  "checkItems": ["社長の判断が必要な確認事項の配列（なければ空配列）"]
}

制約:
- targetSpecialty は必ず上記の専門一覧の中から選ぶこと
- 感情的な応答は不要。業務的・具体的に
- 日本語で応答すること`;
}

function getKeyFromEnvFile(): string {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  // AI秘書への全社指示入力は社長のみ（マネージャー・社員は不可）
  const user = await getApiUser();
  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (user.role !== "ceo") {
    return Response.json({ error: "この操作は社長のみ可能です" }, { status: 403 });
  }

  const { messages } = await req.json();

  // 在籍マネージャーの専門を注入して、有効な振り分け先を選ばせる
  const specialties = await getManagerSpecialties();

  // システム環境変数が空文字で存在する場合、.env.local の値で上書きする
  const apiKey = process.env.ANTHROPIC_API_KEY || getKeyFromEnvFile();
  const anthropic = new Anthropic({ apiKey });

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: buildSystemPrompt(specialties),
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
