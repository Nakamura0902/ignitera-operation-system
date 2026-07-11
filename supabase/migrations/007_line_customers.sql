-- ============================================================
-- 007: LINE顧客管理 MVP — line_customers
-- ============================================================
-- LINE/フォームから流入した相談者を管理するCRM。
-- 読み書きはサーバー側(service role)経由のみ。匿名ポリシーは開けない。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.line_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  name text NOT NULL,
  company_name text,
  industry text,
  contact_method text,
  source text DEFAULT 'LINE',

  form_type text NOT NULL,
  website_url text,
  sns_url text,

  current_tools text[],
  issues text[],
  interested_services text[],

  desired_timing text,
  budget text,
  message text,

  estimated_plan text DEFAULT '未定',
  temperature text DEFAULT '未設定',
  status text DEFAULT '未対応',
  assignee text,
  next_action text,
  memo text
);

ALTER TABLE public.line_customers ENABLE ROW LEVEL SECURITY;
-- ポリシーは付けない = 匿名/一般ユーザーからは不可。service roleのみ(バイパス)。

CREATE INDEX IF NOT EXISTS idx_line_customers_created_at ON public.line_customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_customers_status ON public.line_customers(status);
CREATE INDEX IF NOT EXISTS idx_line_customers_temperature ON public.line_customers(temperature);

-- updated_at 自動更新（既存の set_updated_at() を再利用）
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.line_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
