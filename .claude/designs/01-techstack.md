# 技術スタック設計

> IGNITERA Command Center の技術選定と理由。Phase 0 確定済み。

---

## 選定サマリー

| レイヤー | 採用技術 | 理由 |
|----------|----------|------|
| フレームワーク | **Next.js 15 (App Router)** | Vercelと最相性。Server Actions でAPI不要になる |
| スタイリング | **Tailwind CSS v4** | ユーティリティクラスで高速UI構築 |
| UIコンポーネント | **shadcn/ui** | SaaSダッシュボードに必要なコンポーネントが揃っている |
| データベース | **Supabase (PostgreSQL)** | 指定。RLS・リアルタイム・Auth・Storageが一体 |
| ORM / DBクライアント | **Supabase JS SDK** + 型生成 | Prismaは不要。Supabaseの型生成で十分 |
| 認証 | **Supabase Auth** | Supabaseと一体化。RBACをDBで管理 |
| AI連携 | **Anthropic SDK (`@anthropic-ai/sdk`)** | Claude Code と同じAnthropicアカウントのAPIを使用 |
| ファイルストレージ | **Supabase Storage** | 添付ファイルの保存場所 |
| デプロイ | **Vercel** | 指定。Next.jsと完全統合 |
| 言語 | **TypeScript** | 型安全必須（点数・給与・権限は特に） |
| 環境変数管理 | **Vercel Environment Variables** | APIキーをサーバーサイドのみに閉じる |

---

## AIチャット連携の仕組み

```
ブラウザ → /api/ai-chat (Next.js Route Handler)
               ↓
         Anthropic SDK (サーバーサイド)
               ↓
         Claude API (claude-sonnet-4-6)
               ↓
         ストリーミングレスポンス → ブラウザ
```

**重要**: `ANTHROPIC_API_KEY` は Vercel の環境変数に設定し、絶対にフロントエンドに露出させない。
Claude Code と同じアカウントのAPIキーを使うことで、同じClaudeモデルが応答する。

---

## APIルートは1本のみ

Next.js + Supabase の構成では、ほとんどの操作を Server Actions または Supabase クライアントで直接処理できる。
別途バックエンドAPIサーバーは不要。

| 操作 | 方法 |
|------|------|
| データ取得（一覧・詳細） | Supabase クライアント（Server Component） |
| データ更新（タスク・進捗） | Next.js Server Actions |
| AIチャット（ストリーミング） | `/api/ai-chat` Route Handler（唯一のAPIルート） |
| ファイルアップロード | Supabase Storage SDK |
| リアルタイム更新 | Supabase Realtime |

---

## パッケージ一覧（主要のみ）

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "@anthropic-ai/sdk": "^0.x",
    "tailwindcss": "^4.0.0",
    "shadcn/ui": "コンポーネント単位で追加",
    "typescript": "^5.x",
    "zod": "^3.x",
    "lucide-react": "最新"
  }
}
```

---

## 環境変数（必須）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       ← サーバーサイドのみ

# Anthropic
ANTHROPIC_API_KEY=               ← サーバーサイドのみ（NEXT_PUBLIC_ をつけない）

# App
NEXT_PUBLIC_APP_URL=             ← Vercelのデプロイ先URL
```

---

*確定日: 2026-05-22*
