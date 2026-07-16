-- ============================================================
-- 011: Task Board（社内タスクボード）
-- ============================================================
-- 既存 tasks を単一の真実として拡張し、取得/移管/返却の履歴を新規テーブルに残す。
-- 移管は「受取人の同意のみ・100%移管」。既存 task_market とは別フロー。
-- ============================================================

-- tasks にボード用カラム
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority_rank   integer,          -- 未アサイン列の並び順(小さいほど上位)
  ADD COLUMN IF NOT EXISTS difficulty      smallint CHECK (difficulty BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS reward_points   integer NOT NULL DEFAULT 0,   -- 完了時に担当者へ付与する実績pt
  ADD COLUMN IF NOT EXISTS schedule_bucket text CHECK (schedule_bucket IN ('TODAY', 'TOMORROW_OR_LATER')),
  ADD COLUMN IF NOT EXISTS sort_order      integer NOT NULL DEFAULT 0;   -- 社員列内の並び替え用

CREATE INDEX IF NOT EXISTS idx_tasks_priority_rank ON public.tasks(priority_rank);

-- タスク割当・移管・返却などの不可逆な履歴（消さない）
CREATE TABLE IF NOT EXISTS public.task_assignment_history (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id                  uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  action                   text NOT NULL CHECK (action IN (
                             'CREATED','ACQUIRED','TRANSFER_REQUESTED','TRANSFER_ACCEPTED',
                             'TRANSFER_REJECTED','RETURNED','COMPLETED','FORCE_REASSIGNED')),
  from_member_id           uuid REFERENCES public.users(id),
  to_member_id             uuid REFERENCES public.users(id),
  reason                   text,
  progress_percent         integer,
  remaining_hours_at_action numeric(8,2),
  created_by_member_id     uuid NOT NULL REFERENCES public.users(id),
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task ON public.task_assignment_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_to ON public.task_assignment_history(to_member_id);

-- 移管申請（受取人の同意待ち）
CREATE TABLE IF NOT EXISTS public.task_transfer_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_member_id uuid NOT NULL REFERENCES public.users(id),
  to_member_id   uuid NOT NULL REFERENCES public.users(id),
  progress_percent integer NOT NULL DEFAULT 0,
  reason         text NOT NULL,
  completed_work text,
  remaining_work text,
  handover_notes text,
  status         text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_transfer_req_to ON public.task_transfer_requests(to_member_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_req_task ON public.task_transfer_requests(task_id);

-- RLS: 読み取りは全認証ユーザー、書き込みはサーバー(service role)経由のみ
ALTER TABLE public.task_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_transfer_requests  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_history_read" ON public.task_assignment_history FOR SELECT USING (true);
CREATE POLICY "transfer_req_read" ON public.task_transfer_requests  FOR SELECT USING (true);
