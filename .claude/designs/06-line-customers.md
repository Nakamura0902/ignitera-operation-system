---
date: 2026-07-11
type: feature-spec
feature: line-customers-mvp
status: active
---

# LINE顧客管理 MVP — 機能設計書（CLAUDE）

> このドキュメントは「LINE顧客管理MVP」の憲法です。実装判断はここに戻って照合してください。
> プロジェクト全体の憲法は [`/CLAUDE.md`](../../CLAUDE.md)。本書はそのサブ機能仕様です。

---

## 1. プロジェクト概要

IGNITERA CommandCenter を「全ツールの入口」とし、その最初の実運用モジュールとして
**LINE公式アカウント / 各種フォームから流入した相談者を管理するCRM**を実装する。

将来的には インサイト / HP / SNS / MEO など全チャネルの顧客・案件を CommandCenter に集約する。
本MVPはその第一歩として「LINE顧客管理」に絞る。

---

## 2. MVPの目的

- LINEリッチメニュー → フォーム遷移 → 回答をSupabaseに保存できる
- CommandCenter内「LINE顧客管理」で相談者一覧を確認できる
- 顧客詳細で ステータス / 温度感 / 検討プラン / 担当者 / メモ / 次回対応 を編集できる

**今回やらないこと**: LINE Messaging API連携・認証連携・通知・請求管理・案件管理連携・自動リッチメニュー生成。

---

## 3. 実装対象ページ

| ルート | 種別 | アクセス | 目的 |
|--------|------|----------|------|
| `/command-center` | 内部 | 社長・マネージャー | 全ツールのハブ（LINE顧客管理のみ稼働、他はComing Soon） |
| `/command-center/line-customers` | 内部 | 社長・マネージャー | 相談者一覧・KPI・検索・絞り込み |
| `/command-center/line-customers/[id]` | 内部 | 社長・マネージャー | 顧客詳細・編集 |
| `/forms/set-plan` | 公開 | 誰でも（LINE流入） | セットプラン相談フォーム |
| `/forms/consultation` | 公開 | 誰でも（LINE流入） | まずは相談フォーム |

- `/forms/*` は **未認証で開ける公開ページ**（LINEユーザーがそのまま入力する）。
- `/command-center/*` は **ログイン必須・社長/マネージャーのみ**（middlewareで保護）。

---

## 4. データ設計

### line_customers テーブル

`supabase/schema.sql` および `supabase/migrations/007_line_customers.sql` に定義。

| カラム | 型 | 備考 |
|--------|----|----|
| id | uuid PK | gen_random_uuid() |
| created_at / updated_at | timestamptz | |
| name | text NOT NULL | お名前 |
| company_name / industry | text | |
| contact_method | text | 連絡方法（相談フォームのみ） |
| source | text | 既定 'LINE' |
| form_type | text NOT NULL | 'セットプラン相談' / 'まずは相談' |
| website_url / sns_url | text | |
| current_tools / issues / interested_services | text[] | 複数選択 |
| desired_timing / budget / message | text | |
| estimated_plan | text | 既定 '未定'（予算から簡易判定） |
| temperature | text | 既定 '未設定'（希望時期から簡易判定） |
| status | text | 既定 '未対応' |
| assignee / next_action / memo | text | 管理側で編集 |

RLSは有効化。**匿名ポリシーは付けない** → 読み書きはすべてサーバー側（service role）経由で行う。
フォーム送信・一覧・更新はServer Action / Server Componentで `adminSupabase` を使う。

### 候補値（`lib/line-customer-utils.ts` に定数化）

- status: 未対応 / 連絡済 / 相談予約済 / 提案中 / 受注 / 失注 / 保留
- temperature: 高 / 中 / 低 / 未設定
- estimated_plan: Starter / Growth / Business / Premium / 未定

### 簡易判定

**estimated_plan（予算 → プラン）**
- 〜1万円/月 → Starter ／ 1〜2万円/月 → Growth ／ 2〜3万円/月 → Business
- 3〜5万円/月・5万円以上/月 → Premium ／ それ以外 → 未定

**temperature（希望時期 → 温度感）**
- すぐ相談したい → 高 ／ 1ヶ月以内 → 中 ／ それ以外 → 低

---

## 5. デザイン方針

IGNITERAブランド = 信頼感・高級感・落ち着いたSaaS管理画面。

- ベース：白 `#ffffff` / `#f8fafc`
- 基調：ネイビー `#0f1b3a` 〜 `#1e2a4a`
- アクセント：ゴールド/ブロンズ `#b08d57`（`--gold`）
- 余白多め・角丸カード・視認性重視・情報を詰め込みすぎない
- **避ける**：派手なグラデーション / 安売り感 / ポップ / 絵文字多用 / 過密UI
- **レスポンシブ必須**：スマホで閲覧・操作できる（サイドバーはモバイルでドロワー、テーブルはカード表示に切替）

---

## 6. ディレクトリ構成（既存プロジェクトに統合）

既存は `src/` を使わず `app/` 直下・ルートグループ運用。本機能もそれに合わせる。

```
app/
├── command-center/
│   ├── layout.tsx                 # サイドバー+トップバー（レスポンシブ）
│   ├── page.tsx                   # ハブ
│   └── line-customers/
│       ├── page.tsx               # 一覧（Server Component）
│       ├── line-customers-client.tsx  # 検索・絞り込み・テーブル/カード
│       └── [id]/
│           ├── page.tsx           # 詳細（Server Component）
│           ├── customer-detail-client.tsx  # 編集フォーム
│           └── actions.ts         # updateLineCustomer
└── forms/
    ├── layout.tsx                 # 公開フォーム用の軽量ブランドレイアウト
    ├── actions.ts                 # createLineCustomer（共通）
    ├── set-plan/page.tsx + set-plan-form.tsx
    └── consultation/page.tsx + consultation-form.tsx

components/
├── command-center/sidebar.tsx
└── forms/                         # フォーム部品（テキスト/チェック群/ラジオ/送信完了）

types/line-customer.ts             # 型定義
lib/line-customer-utils.ts         # 定数・簡易判定・選択肢リスト
supabase/schema.sql                # 要求どおりのCREATE TABLE
supabase/migrations/007_line_customers.sql
```

---

## 7. 実装ルール

- Supabaseは既存の `@/lib/supabase/{admin,server,client}` を再利用（新規 `lib/supabase.ts` は作らない）。
  - 公開フォーム送信・管理側の読み書きは **Server Action / Server Component + `adminSupabase`**。
    匿名クライアントからの直挿しはしない（RLSに匿名ポリシーを開けない方針）。
- フォーム送信は ローディング表示 → 成功で完了画面 → 失敗でエラーメッセージ。
- 一覧・詳細は空状態の表示を必ず用意。
- 金額・複数選択は `text[]`。表示はチップ。
- 更新時は `updated_at` も更新。管理操作は `verifyCeoOrAdmin` で保護。
- `npm run lint` / `npm run build` が通ること。

---

## 8. 今回やらないこと

- LINE Messaging API / Webhook 連携（フォームは通常のWebフォーム）
- 認証とLINEアカウントの紐付け
- 通知・請求・案件管理との連携
- 顧客の削除UI（MVPは作成・閲覧・編集のみ）

---

## 9. 将来拡張方針

- CommandCenterを全ツールの単一入口にする（インサイト / HP / SNS / MEO / 案件 / 売上）。
- `source` を LINE以外（HP問い合わせ / Instagram / 紹介 等）に拡張。
- line_customers → 案件(projects)・請求(invoices)へ昇格するフロー。
- 担当者(assignee)を users テーブルと紐付け、通知・タスク化と連携。
- サイドバーの Coming Soon 項目（案件/タスク/売上/設定）を順次実装。
