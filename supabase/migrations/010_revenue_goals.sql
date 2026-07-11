-- ============================================================
-- 010: 月次売上目標 と タスク売上額
-- ============================================================
-- CEOが毎月「目標売上」を設定し、完了タスクの売上合計で進捗を可視化する。
-- ============================================================

-- タスクごとの発生売上
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS revenue_amount numeric(12,2) NOT NULL DEFAULT 0;

-- 月次の目標売上（年月ごとに1件）
CREATE TABLE IF NOT EXISTS public.monthly_targets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year           integer NOT NULL,
  month          integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_revenue numeric(14,2) NOT NULL DEFAULT 0,
  set_by         uuid REFERENCES public.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;

-- 読み取りは全認証ユーザー、書き込みは社長のみ（service roleはバイパス）
CREATE POLICY "monthly_targets_read" ON public.monthly_targets FOR SELECT USING (true);
CREATE POLICY "monthly_targets_ceo_write" ON public.monthly_targets FOR ALL USING (
  public.get_current_role() = 'ceo'
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.monthly_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
