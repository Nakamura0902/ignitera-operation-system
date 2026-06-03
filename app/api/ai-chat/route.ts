import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

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
  const { messages, systemPrompt } = await req.json();

  // システム環境変数が空文字で存在する場合、.env.local の値で上書きする
  const apiKey = process.env.ANTHROPIC_API_KEY || getKeyFromEnvFile();
  const anthropic = new Anthropic({ apiKey });

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt ?? defaultSystemPrompt,
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

const defaultSystemPrompt = `あなたはIGNITERA Command Centerの「AI秘書」です。
社長（CEO）からの指示を受け取り、以下の形式でJSON応答してください。

応答はJSON形式で、次のフィールドを含めること:
{
  "category": "指示のカテゴリ（例: 案件優先度の整理 × 収益計画）",
  "departments": ["関係する部門名の配列"],
  "summary": "指示の要約（2〜3文）",
  "actions": [
    { "label": "アクション内容", "dept": "担当AI名（例: 案件管理AI）", "done": false }
  ],
  "checkItems": ["社長の判断が必要な確認事項の配列"]
}

役割と制約:
- 社長の自然言語指示を構造化し、部門AIへの振り分けを行う
- 感情的な応答は不要。業務的・具体的に応答する
- 不明点は確認事項として checkItems に含める
- 日本語で応答すること`;
