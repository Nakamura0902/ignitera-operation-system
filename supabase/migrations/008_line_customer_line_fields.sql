-- ============================================================
-- 008: line_customers にLINEユーザー識別情報を追加
-- ============================================================
-- LIFFで取得したLINE userId等を保存し、相談者を実LINEアカウントに紐づける。
-- Webhook(友だち追加)からの自動登録・CommandCenterからのpush送信に使う。
-- ============================================================

ALTER TABLE public.line_customers
  ADD COLUMN IF NOT EXISTS line_user_id      text,
  ADD COLUMN IF NOT EXISTS line_display_name text,
  ADD COLUMN IF NOT EXISTS line_picture_url  text;

CREATE INDEX IF NOT EXISTS idx_line_customers_line_user_id
  ON public.line_customers(line_user_id);
