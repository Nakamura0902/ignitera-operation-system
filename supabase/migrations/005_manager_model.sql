-- ============================================================
-- 005: 部門廃止・マネージャーモデルへ移行
-- ============================================================
-- 変更概要:
--   - 部門(departments)という箱を廃止。マネージャーが専門(specialty)を
--     マイページで設定し、AIは実在するマネージャー本人へ指示を振り分ける。
--   - ロールは CEO / マネージャー / 社員 の3つ。
--     内部名は 'admin' をマネージャーとして流用し(display_nameのみ変更)、
--     既存RLS・アプリのisCeoOrAdminを壊さない。'viewer' は廃止。
--   - directives: 社長の指示をAIが整理してマネージャーに届けるブリーフ。
--   - push_subscriptions: Web Push の購読情報。
-- 本マイグレーションは追加のみ（既存データを壊さない）。
-- 部門テーブル・カラムの削除は破壊的なため 006 に分離した。
-- ============================================================

BEGIN;

-- --------------------------------------------------------
-- 1. ロール整理: admin→マネージャー表示、viewer廃止
-- --------------------------------------------------------
UPDATE public.roles SET display_name = 'マネージャー' WHERE name = 'admin';

UPDATE public.users
  SET role_id = (SELECT id FROM public.roles WHERE name = 'employee')
  WHERE role_id = (SELECT id FROM public.roles WHERE name = 'viewer');

DELETE FROM public.roles WHERE name = 'viewer';

-- --------------------------------------------------------
-- 2. マネージャーの専門(営業/開発 等)。マイページ設定で変更する
-- --------------------------------------------------------
ALTER TABLE public.users ADD COLUMN specialty TEXT;

-- --------------------------------------------------------
-- 3. directives: 社長 → (AI整理) → マネージャー宛ブリーフ
-- --------------------------------------------------------
CREATE TABLE public.directives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_instruction   TEXT NOT NULL,                 -- 社長の生の自然言語指示
  category          TEXT,                          -- AI判定カテゴリ
  organized_title   TEXT NOT NULL,                 -- AI整理: タイトル
  organized_summary TEXT NOT NULL,                 -- AI整理: 要約
  organized_body    TEXT NOT NULL,                 -- AI整理: マネージャー向け本文
  check_items       JSONB NOT NULL DEFAULT '[]',   -- 社長判断が必要な確認事項
  target_manager_id UUID REFERENCES public.users(id),  -- 振り分け先マネージャー
  created_by        UUID NOT NULL REFERENCES public.users(id),  -- 社長
  status            TEXT NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'in_progress', 'done')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.directives ENABLE ROW LEVEL SECURITY;

-- 社長は全件。マネージャーは自分宛のみ読み書き。(service roleはバイパス)
CREATE POLICY "directives_ceo" ON public.directives FOR ALL USING (
  public.get_current_role() = 'ceo'
);
CREATE POLICY "directives_manager_read" ON public.directives FOR SELECT USING (
  target_manager_id = auth.uid()
);
CREATE POLICY "directives_manager_update" ON public.directives FOR UPDATE USING (
  target_manager_id = auth.uid()
);

CREATE INDEX idx_directives_target_manager ON public.directives(target_manager_id);
CREATE INDEX idx_directives_status ON public.directives(status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.directives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------
-- 4. push_subscriptions: Web Push 購読情報
-- --------------------------------------------------------
CREATE TABLE public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_own" ON public.push_subscriptions FOR ALL USING (
  user_id = auth.uid()
);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- --------------------------------------------------------
-- 5. tasks に directive_id (マネージャーがブリーフから作ったタスクを紐付け)
-- --------------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN directive_id UUID REFERENCES public.directives(id);
CREATE INDEX idx_tasks_directive_id ON public.tasks(directive_id);

-- 部門廃止の先行措置: マネージャーがタスクを作れるよう NOT NULL を外す
-- （カラム自体の削除は 006 で行う）
ALTER TABLE public.tasks ALTER COLUMN department_id DROP NOT NULL;

-- 注: 部門(departments)テーブル・カラムの削除は破壊的なため 006 に分離した。
--     006 は部門表示を除去したコードと同時に適用する。

COMMIT;
