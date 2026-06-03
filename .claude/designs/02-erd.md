# DB設計（ER図・テーブル定義）

> Supabase (PostgreSQL) のテーブル設計。CLAUDE.md の20エンティティを網羅。
> Supabase の `auth.users` を拡張する形で `public.users` を持つ。

---

## テーブル一覧

| テーブル名 | エンティティ | 役割 |
|-----------|-------------|------|
| `users` | User | ユーザー情報（Supabase Auth連携） |
| `roles` | Role | 権限ロール定義 |
| `departments` | Department | 部門定義 |
| `ai_agents` | AiAgent | 部門AI設定・プロンプト |
| `tasks` | Task | タスク本体 |
| `task_checklist_items` | TaskChecklistItem | タスクのチェックリスト項目 |
| `task_scores` | TaskScore | タスク点数（仮・確定） |
| `task_progress_history` | TaskProgress | 進捗率更新履歴 |
| `task_transfers` | TaskTransfer | タスク移管の取引記録 |
| `task_market_listings` | TaskMarketListing | タスクマーケット出品情報 |
| `task_applications` | TaskApplication | 引き受け申請 |
| `projects` | Project | 案件情報 |
| `clients` | Client | 顧客情報 |
| `leads` | Lead | 見込み客・商談管理 |
| `invoices` | Invoice | 請求書 |
| `documents` | Document | AI生成文書・マニュアル |
| `reports` | Report | AI集約レポート |
| `comments` | Comment | タスク・案件へのコメント |
| `attachments` | Attachment | 添付ファイルメタデータ |
| `notifications` | Notification | ユーザー通知 |
| `audit_logs` | AuditLog | 監査ログ（不可変） |
| `payroll_estimates` | PayrollEstimate | 月間給与見込み |
| `score_history` | ScoreHistory | 点数変動履歴 |

---

## テーブル定義

### users
Supabase の `auth.users` を参照する拡張テーブル。

```sql
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role_id         UUID NOT NULL REFERENCES roles(id),
  department_id   UUID REFERENCES departments(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### roles
```sql
CREATE TABLE public.roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,   -- 'ceo' | 'admin' | 'employee' | 'viewer'
  display_name TEXT NOT NULL,
  permissions  JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 初期データ
INSERT INTO roles (name, display_name) VALUES
  ('ceo',      '社長'),
  ('admin',    '管理者'),
  ('employee', '社員'),
  ('viewer',   '閲覧者');
```

---

### departments
```sql
CREATE TABLE public.departments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,   -- 'development' | 'sales' | 'projects' | 'accounting' | 'operations'
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 初期データ
INSERT INTO departments (name, display_name) VALUES
  ('development', '開発'),
  ('sales',       '営業'),
  ('projects',    '案件管理'),
  ('accounting',  '経理・請求'),
  ('operations',  '事務・オペレーション');
```

---

### ai_agents
```sql
CREATE TABLE public.ai_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID REFERENCES departments(id),  -- NULLはAI秘書（全社）
  name            TEXT NOT NULL,
  system_prompt   TEXT NOT NULL,
  model           TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### projects（案件）
```sql
CREATE TABLE public.projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID REFERENCES clients(id),
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'on_hold' | 'cancelled'
  start_date     DATE,
  due_date       DATE,
  budget         DECIMAL(12,2),
  department_id  UUID REFERENCES departments(id),
  lead_member_id UUID REFERENCES users(id),
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### clients（顧客）
```sql
CREATE TABLE public.clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### leads（見込み客）
```sql
CREATE TABLE public.leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT NOT NULL,
  contact_name     TEXT,
  email            TEXT,
  phone            TEXT,
  temperature      TEXT NOT NULL DEFAULT 'cold',  -- 'hot' | 'warm' | 'cold'
  stage            TEXT NOT NULL DEFAULT 'initial',
                   -- 'initial' | 'meeting' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  assigned_to      UUID REFERENCES users(id),
  notes            TEXT,
  next_action      TEXT,
  next_action_date DATE,
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### tasks（タスク）
```sql
CREATE TABLE public.tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  project_id          UUID REFERENCES projects(id),
  department_id       UUID NOT NULL REFERENCES departments(id),
  assigned_to         UUID REFERENCES users(id),
  created_by          UUID NOT NULL REFERENCES users(id),
  ai_agent_id         UUID REFERENCES ai_agents(id),  -- どのAIが生成したか
  status              TEXT NOT NULL DEFAULT 'pending',
                      -- 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority            TEXT NOT NULL DEFAULT 'medium',
                      -- 'low' | 'medium' | 'high' | 'urgent'
  progress_rate       INTEGER NOT NULL DEFAULT 0 CHECK (progress_rate BETWEEN 0 AND 100),
  due_date            TIMESTAMPTZ,
  estimated_hours     DECIMAL(6,2),
  provisional_score   INTEGER,    -- AI算出の仮点数
  confirmed_score     INTEGER,    -- 管理者確定後の確定点数
  quality_rating      TEXT,       -- 'excellent' | 'good' | 'minor_revision' | 'major_revision' | 'incomplete'
  quality_coefficient DECIMAL(3,2),
  is_on_market        BOOLEAN NOT NULL DEFAULT false,
  skill_requirements  TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);
```

---

### task_checklist_items
```sql
CREATE TABLE public.task_checklist_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  weight     INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 100),  -- 全項目合計=100
  status     TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'completed'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### task_scores（点数詳細）
```sql
CREATE TABLE public.task_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  difficulty          INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  effort              INTEGER NOT NULL CHECK (effort BETWEEN 1 AND 5),
  contribution        INTEGER NOT NULL CHECK (contribution BETWEEN 1 AND 5),
  urgency             INTEGER NOT NULL CHECK (urgency BETWEEN 1 AND 5),
  quality_risk        INTEGER NOT NULL CHECK (quality_risk BETWEEN 1 AND 5),
  provisional_total   INTEGER NOT NULL,           -- 自動計算: difficulty×25 + effort×20 + ...
  confirmed_total     INTEGER,                     -- 品質係数適用後
  quality_coefficient DECIMAL(3,2),
  reviewed_by         UUID REFERENCES users(id),
  approved_by         UUID REFERENCES users(id),
  review_note         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### task_progress_history
```sql
CREATE TABLE public.task_progress_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  previous_progress INTEGER NOT NULL,
  new_progress      INTEGER NOT NULL,
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 更新・削除不可（履歴は不可変）
```

---

### task_transfers（タスク移管記録）
```sql
CREATE TABLE public.task_transfers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               UUID NOT NULL REFERENCES tasks(id),
  listing_id            UUID REFERENCES task_market_listings(id),
  from_user_id          UUID NOT NULL REFERENCES users(id),
  to_user_id            UUID NOT NULL REFERENCES users(id),
  progress_at_transfer  INTEGER NOT NULL,        -- 移管時の進捗率
  from_user_score_ratio DECIMAL(5,2) NOT NULL,   -- 元担当者の点数比率（%）
  to_user_score_ratio   DECIMAL(5,2) NOT NULL,   -- 引き受け者の点数比率（%）
  from_user_points      INTEGER NOT NULL,
  to_user_points        INTEGER NOT NULL,
  transfer_type         TEXT NOT NULL,           -- 'full' | 'partial' | 'collaborative'
  approved_by           UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### task_market_listings（タスクマーケット出品）
```sql
CREATE TABLE public.task_market_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID NOT NULL REFERENCES tasks(id),
  listed_by           UUID NOT NULL REFERENCES users(id),
  reason              TEXT NOT NULL,  -- 'busy' | 'skill_gap' | 'deadline' | 'other_priority'
  handover_note       TEXT NOT NULL,
  required_skills     TEXT[],
  preferred_conditions TEXT,
  progress_at_listing INTEGER NOT NULL,
  remaining_points    INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending_approval',
                      -- 'pending_approval' | 'open' | 'taken' | 'cancelled'
  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### task_applications（引き受け申請）
```sql
CREATE TABLE public.task_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES task_market_listings(id),
  applicant_id UUID NOT NULL REFERENCES users(id),
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'withdrawn'
  reviewed_by  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### invoices（請求書）
```sql
CREATE TABLE public.invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id),
  project_id     UUID REFERENCES projects(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount         DECIMAL(12,2) NOT NULL,
  tax_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount   DECIMAL(12,2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft',
                 -- 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date       DATE NOT NULL,
  issued_date    DATE,
  paid_date      DATE,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES users(id),
  approved_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### documents（AI生成文書）
```sql
CREATE TABLE public.documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  type             TEXT NOT NULL,
                   -- 'procedure' | 'template' | 'manual' | 'meeting_minutes' | 'proposal' | 'checklist'
  department_id    UUID REFERENCES departments(id),
  project_id       UUID REFERENCES projects(id),
  ai_agent_id      UUID REFERENCES ai_agents(id),
  created_by       UUID REFERENCES users(id),  -- NULLはAI自動生成
  is_ai_generated  BOOLEAN NOT NULL DEFAULT false,
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### reports（AI集約レポート）
```sql
CREATE TABLE public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  type          TEXT NOT NULL,  -- 'daily' | 'weekly' | 'monthly' | 'ad_hoc'
  department_id UUID REFERENCES departments(id),
  period_start  DATE,
  period_end    DATE,
  ai_agent_id   UUID REFERENCES ai_agents(id),
  status        TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### comments
```sql
CREATE TABLE public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  target_type TEXT NOT NULL,  -- 'task' | 'project' | 'document' | 'report'
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### attachments（添付ファイル）
```sql
CREATE TABLE public.attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,      -- Supabase Storage のパス
  file_size   INTEGER NOT NULL,
  mime_type   TEXT NOT NULL,
  target_type TEXT NOT NULL,      -- 'task' | 'project' | 'document' | 'invoice'
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### notifications
```sql
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL,
             -- 'task_assigned' | 'deadline_warning' | 'approval_required'
             -- | 'score_confirmed' | 'market_activity' | 'system'
  is_read    BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### audit_logs（監査ログ・不可変）
```sql
CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),  -- NULLはシステム操作
  action       TEXT NOT NULL,              -- 例: 'task.score.confirmed', 'invoice.approved'
  target_type  TEXT NOT NULL,
  target_id    UUID,
  before_value JSONB,
  after_value  JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLSポリシー: DELETE・UPDATE を全ロールで禁止
-- INSERT のみ許可（サービスロールキーからのみ）
```

---

### payroll_estimates（月間給与見込み）
```sql
CREATE TABLE public.payroll_estimates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  year             INTEGER NOT NULL,
  month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  base_salary      DECIMAL(12,2) NOT NULL DEFAULT 0,
  point_reward     DECIMAL(12,2) NOT NULL DEFAULT 0,
  quality_bonus    DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_estimate   DECIMAL(12,2) NOT NULL DEFAULT 0,
  confirmed_total  DECIMAL(12,2),         -- 社長承認後に確定
  total_score_points INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'reviewed' | 'approved'
  reviewed_by      UUID REFERENCES users(id),
  approved_by      UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);
```

---

### score_history（点数変動履歴）
```sql
CREATE TABLE public.score_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  task_id       UUID NOT NULL REFERENCES tasks(id),
  score_type    TEXT NOT NULL,  -- 'provisional' | 'confirmed' | 'adjusted' | 'transferred'
  points_before INTEGER NOT NULL,
  points_after  INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  changed_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 更新・削除不可
```

---

## リレーション図（主要）

```
auth.users (Supabase)
    └── users ─────┬── role_id → roles
                   ├── department_id → departments
                   ├── tasks (assigned_to / created_by)
                   ├── payroll_estimates
                   └── score_history

departments
    └── ai_agents
    └── tasks
    └── projects

projects ──── client_id → clients
    └── tasks
    └── invoices

tasks ─────┬── task_checklist_items
           ├── task_scores (1:1)
           ├── task_progress_history
           ├── task_market_listings
           │       └── task_applications
           ├── task_transfers
           ├── comments
           ├── attachments
           └── score_history
```

---

## RLSポリシー方針

| テーブル | CEO | Admin | Employee | Viewer |
|---------|-----|-------|----------|--------|
| `users` | 全件 | 全件 | 自分のみ | 自分のみ |
| `tasks` | 全件 | 全件 | 自分担当のみ | 読み取りのみ |
| `task_scores` | 全件 | 全件 | 自分タスクのみ | × |
| `payroll_estimates` | 全件 | 全件 | 自分のみ | × |
| `invoices` | 全件 | 全件 | × | × |
| `audit_logs` | 読み取りのみ | 読み取りのみ | × | × |
| `leads` | 全件 | 全件 | 担当分のみ | × |

---

*確定日: 2026-05-22*
