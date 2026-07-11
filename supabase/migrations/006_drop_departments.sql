-- ============================================================
-- 006: 部門(departments)の廃止（破壊的）
-- ============================================================
-- 005 で新モデル(specialty/directives)を追加済み。本マイグレーションで
-- 旧・部門テーブルと関連カラムを削除する。
-- ⚠️ 破壊的: 部門表示を除去したコードと同時に適用すること。適用前に確認済み。
-- ============================================================

BEGIN;

ALTER TABLE public.tasks       DROP COLUMN IF EXISTS department_id;   -- was NOT NULL
ALTER TABLE public.projects    DROP COLUMN IF EXISTS department_id;
ALTER TABLE public.documents   DROP COLUMN IF EXISTS department_id;
ALTER TABLE public.reports     DROP COLUMN IF EXISTS department_id;
ALTER TABLE public.ai_agents   DROP COLUMN IF EXISTS department_id;

DROP TABLE IF EXISTS public.user_departments;   -- 004で追加した中間テーブル
ALTER TABLE public.users DROP COLUMN IF EXISTS department_id;
DROP TABLE IF EXISTS public.departments;

COMMIT;
