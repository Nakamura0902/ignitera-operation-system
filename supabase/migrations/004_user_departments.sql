-- 担当業務（複数部門）の中間テーブル
-- 適用済み: 2026-07-05（MCP経由でリモートに適用済み）
CREATE TABLE public.user_departments (
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, department_id)
);

ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

-- 読み取りは全認証ユーザー、書き込みは本人のみ（service roleはバイパス）
CREATE POLICY "user_departments_read" ON public.user_departments
  FOR SELECT USING (true);
CREATE POLICY "user_departments_own_write" ON public.user_departments
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_user_departments_department ON public.user_departments(department_id);

-- 既存ユーザーのdepartment_idをバックフィル
INSERT INTO public.user_departments (user_id, department_id)
SELECT id, department_id FROM public.users WHERE department_id IS NOT NULL
ON CONFLICT DO NOTHING;
