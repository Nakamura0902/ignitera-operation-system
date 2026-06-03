# ディレクトリ構成設計

> IGNITERA Command Center のフォルダ構成。命名規則はケバブケース（`-`区切り）。

---

## 全体構成

```
ignitera-operation-system/
├── CLAUDE.md                           ← プロジェクト憲法
├── .claude/
│   └── designs/                        ← 設計書置き場
│       ├── 00-directory.md
│       ├── 01-techstack.md
│       ├── 02-erd.md
│       └── 03-screens.md
│
├── images/                             ← UI参考画像（既存）
│
├── app/                                ← Next.js App Router
│   ├── layout.tsx                      ← ルートレイアウト（フォント・共通設定）
│   ├── page.tsx                        ← ルートリダイレクト（ロール別ホームへ）
│   ├── globals.css
│   │
│   ├── (auth)/                         ← 認証ページ群（レイアウト非適用）
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (ceo)/                          ← 社長専用ページ群
│   │   ├── layout.tsx                  ← CEO ナビゲーション・権限ガード
│   │   ├── dashboard/
│   │   │   └── page.tsx               ← CEO ホームダッシュボード
│   │   ├── ai-secretary/
│   │   │   └── page.tsx               ← AI秘書 指示入力画面
│   │   ├── departments/
│   │   │   ├── development/
│   │   │   │   └── page.tsx           ← 開発ダッシュボード
│   │   │   ├── sales/
│   │   │   │   └── page.tsx           ← 営業ダッシュボード
│   │   │   ├── projects/
│   │   │   │   └── page.tsx           ← 案件ダッシュボード
│   │   │   ├── accounting/
│   │   │   │   └── page.tsx           ← 経理・請求ダッシュボード
│   │   │   └── operations/
│   │   │       └── page.tsx           ← 事務・オペレーションダッシュボード
│   │   ├── reports/
│   │   │   └── page.tsx               ← レポート画面
│   │   ├── task-scores/
│   │   │   └── page.tsx               ← タスク点数管理・承認画面
│   │   ├── task-market-monitor/
│   │   │   └── page.tsx               ← タスクマーケット監視画面
│   │   └── payroll-report/
│   │       └── page.tsx               ← 給与反映レポート・最終承認画面
│   │
│   ├── (employee)/                     ← 社員専用ページ群
│   │   ├── layout.tsx                  ← 社員ナビゲーション・権限ガード
│   │   ├── home/
│   │   │   └── page.tsx               ← 社員ホーム（今日のタスク）
│   │   ├── tasks/
│   │   │   ├── page.tsx               ← 自分のタスク一覧
│   │   │   └── [task-id]/
│   │   │       └── page.tsx           ← タスク詳細・進捗報告
│   │   ├── task-market/
│   │   │   ├── page.tsx               ← タスクマーケット一覧
│   │   │   ├── list/
│   │   │   │   └── page.tsx           ← タスク出品画面
│   │   │   ├── apply/
│   │   │   │   └── page.tsx           ← 引き受け申請画面
│   │   │   └── my-tasks/
│   │   │       └── page.tsx           ← 引き受け中タスク一覧
│   │   ├── my-department/
│   │   │   └── page.tsx               ← 所属部門ダッシュボード
│   │   ├── score-history/
│   │   │   └── page.tsx               ← 評価履歴・品質係数ログ
│   │   └── payroll-estimate/
│   │       └── page.tsx               ← 月間ポイント・給与見込み
│   │
│   └── api/                            ← APIルート（最小限）
│       └── ai-chat/
│           └── route.ts               ← AI秘書ストリーミングチャット（唯一のAPIルート）
│
├── components/                         ← Reactコンポーネント
│   ├── ui/                             ← shadcn/ui ベースコンポーネント（自動生成）
│   ├── ceo/                            ← CEO専用コンポーネント
│   │   ├── secretary-chat.tsx          ← AI秘書チャットUI
│   │   ├── kpi-card.tsx               ← KPIカード
│   │   ├── approval-list.tsx          ← 承認待ちリスト
│   │   └── department-summary.tsx     ← 部門サマリーカード
│   ├── employee/                       ← 社員専用コンポーネント
│   │   ├── task-card.tsx              ← タスクカード
│   │   ├── progress-update.tsx        ← 進捗更新フォーム
│   │   ├── market-listing-card.tsx    ← マーケット出品カード
│   │   └── score-badge.tsx            ← 点数・給与バッジ
│   └── shared/                         ← 全ロール共通
│       ├── progress-bar.tsx           ← 進捗率バー
│       ├── ai-output-card.tsx         ← AI出力カード（チャットではなくカード）
│       ├── audit-notice.tsx           ← 監査ログ通知
│       └── role-guard.tsx             ← 権限ガードコンポーネント
│
├── lib/                                ← ライブラリ・ユーティリティ
│   ├── supabase/
│   │   ├── client.ts                  ← ブラウザ用クライアント
│   │   └── server.ts                  ← サーバー用クライアント（Server Components用）
│   ├── claude/
│   │   └── client.ts                  ← Anthropic SDK クライアント（サーバー専用）
│   ├── auth/
│   │   └── get-user.ts                ← 現在ユーザー取得ヘルパー
│   ├── score/
│   │   └── calculator.ts              ← タスク点数計算ロジック
│   └── utils.ts                        ← 汎用ユーティリティ
│
├── types/
│   └── database.ts                     ← Supabase型自動生成ファイル
│
├── middleware.ts                        ← 認証・RBAC ルート保護
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local.example                  ← 環境変数テンプレート（値なし）
```

---

## 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| フォルダ | ケバブケース | `task-market/`, `ai-secretary/` |
| ファイル（コンポーネント） | ケバブケース | `task-card.tsx`, `progress-bar.tsx` |
| ファイル（ユーティリティ） | ケバブケース | `get-user.ts`, `calculator.ts` |
| 型定義 | ケバブケース | `database.ts` |
| Next.js 規約ファイル | キャメルケース | `layout.tsx`, `page.tsx`, `route.ts` |

---

## ルートグループの権限ガード

| グループ | アクセス可能ロール | ガード場所 |
|----------|------------------|-----------|
| `(auth)` | 全員（未ログイン） | `middleware.ts` |
| `(ceo)` | `ROLE_CEO` のみ | `middleware.ts` + `layout.tsx` |
| `(employee)` | `ROLE_EMPLOYEE`, `ROLE_ADMIN` | `middleware.ts` + `layout.tsx` |

---

*確定日: 2026-05-22*
