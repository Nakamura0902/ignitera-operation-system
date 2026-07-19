-- ============================================================
-- 012: タスクの売上タイプ（なし / 単発 / 月額）
-- ============================================================
-- none      : 売上なし
-- one_time  : 単発。完了した月に達成売上へ計上
-- monthly   : 月額制。キャンセルされるまで毎月の達成売上へ計上
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS revenue_type text NOT NULL DEFAULT 'one_time'
    CHECK (revenue_type IN ('none', 'one_time', 'monthly'));
