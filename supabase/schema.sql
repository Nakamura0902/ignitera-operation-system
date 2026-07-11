-- LINE顧客管理 MVP — line_customers テーブル
-- 適用: supabase/migrations/007_line_customers.sql と同内容

create table if not exists line_customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  name text not null,
  company_name text,
  industry text,
  contact_method text,
  source text default 'LINE',

  form_type text not null,
  website_url text,
  sns_url text,

  current_tools text[],
  issues text[],
  interested_services text[],

  desired_timing text,
  budget text,
  message text,

  estimated_plan text default '未定',
  temperature text default '未設定',
  status text default '未対応',
  assignee text,
  next_action text,
  memo text
);
