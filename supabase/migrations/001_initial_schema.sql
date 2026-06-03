-- ============================================================
-- IGNITERA Command Center — Initial Schema
-- ============================================================

-- --------------------------------------------------------
-- 1. roles
-- --------------------------------------------------------
CREATE TABLE public.roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  permissions  JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.roles (name, display_name) VALUES
  ('ceo',      '社長'),
  ('admin',    '管理者'),
  ('employee', '社員'),
  ('viewer',   '閲覧者');

-- --------------------------------------------------------
-- 2. departments
-- --------------------------------------------------------
CREATE TABLE public.departments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.departments (name, display_name) VALUES
  ('development', '開発'),
  ('sales',       '営業'),
  ('projects',    '案件管理'),
  ('accounting',  '経理・請求'),
  ('operations',  '事務・オペレーション');

-- --------------------------------------------------------
-- 3. users (extends auth.users)
-- --------------------------------------------------------
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  role_id       UUID NOT NULL REFERENCES public.roles(id),
  department_id UUID REFERENCES public.departments(id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 4. ai_agents
-- --------------------------------------------------------
CREATE TABLE public.ai_agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id),
  name          TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model         TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 5. clients
-- --------------------------------------------------------
CREATE TABLE public.clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 6. leads
-- --------------------------------------------------------
CREATE TABLE public.leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT NOT NULL,
  contact_name     TEXT,
  email            TEXT,
  phone            TEXT,
  temperature      TEXT NOT NULL DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold')),
  stage            TEXT NOT NULL DEFAULT 'initial'
                   CHECK (stage IN ('initial', 'meeting', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  assigned_to      UUID REFERENCES public.users(id),
  notes            TEXT,
  next_action      TEXT,
  next_action_date DATE,
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 7. projects
-- --------------------------------------------------------
CREATE TABLE public.projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID REFERENCES public.clients(id),
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  start_date     DATE,
  due_date       DATE,
  budget         DECIMAL(12,2),
  department_id  UUID REFERENCES public.departments(id),
  lead_member_id UUID REFERENCES public.users(id),
  created_by     UUID NOT NULL REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 8. tasks
-- --------------------------------------------------------
CREATE TABLE public.tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  project_id          UUID REFERENCES public.projects(id),
  department_id       UUID NOT NULL REFERENCES public.departments(id),
  assigned_to         UUID REFERENCES public.users(id),
  created_by          UUID NOT NULL REFERENCES public.users(id),
  ai_agent_id         UUID REFERENCES public.ai_agents(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
  priority            TEXT NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress_rate       INTEGER NOT NULL DEFAULT 0 CHECK (progress_rate BETWEEN 0 AND 100),
  due_date            TIMESTAMPTZ,
  estimated_hours     DECIMAL(6,2),
  provisional_score   INTEGER,
  confirmed_score     INTEGER,
  quality_rating      TEXT CHECK (quality_rating IN ('excellent', 'good', 'minor_revision', 'major_revision', 'incomplete')),
  quality_coefficient DECIMAL(3,2),
  is_on_market        BOOLEAN NOT NULL DEFAULT false,
  skill_requirements  TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

-- --------------------------------------------------------
-- 9. task_checklist_items
-- --------------------------------------------------------
CREATE TABLE public.task_checklist_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  weight     INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 100),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 10. task_scores
-- --------------------------------------------------------
CREATE TABLE public.task_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE CASCADE,
  difficulty          INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  effort              INTEGER NOT NULL CHECK (effort BETWEEN 1 AND 5),
  contribution        INTEGER NOT NULL CHECK (contribution BETWEEN 1 AND 5),
  urgency             INTEGER NOT NULL CHECK (urgency BETWEEN 1 AND 5),
  quality_risk        INTEGER NOT NULL CHECK (quality_risk BETWEEN 1 AND 5),
  provisional_total   INTEGER NOT NULL,
  confirmed_total     INTEGER,
  quality_coefficient DECIMAL(3,2),
  reviewed_by         UUID REFERENCES public.users(id),
  approved_by         UUID REFERENCES public.users(id),
  review_note         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 11. task_progress_history
-- --------------------------------------------------------
CREATE TABLE public.task_progress_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id),
  previous_progress INTEGER NOT NULL,
  new_progress      INTEGER NOT NULL,
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 12. task_market_listings
-- --------------------------------------------------------
CREATE TABLE public.task_market_listings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id              UUID NOT NULL REFERENCES public.tasks(id),
  listed_by            UUID NOT NULL REFERENCES public.users(id),
  reason               TEXT NOT NULL CHECK (reason IN ('busy', 'skill_gap', 'deadline', 'other_priority')),
  handover_note        TEXT NOT NULL,
  required_skills      TEXT[],
  preferred_conditions TEXT,
  progress_at_listing  INTEGER NOT NULL,
  remaining_points     INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending_approval'
                       CHECK (status IN ('pending_approval', 'open', 'taken', 'cancelled')),
  approved_by          UUID REFERENCES public.users(id),
  approved_at          TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 13. task_transfers
-- --------------------------------------------------------
CREATE TABLE public.task_transfers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               UUID NOT NULL REFERENCES public.tasks(id),
  listing_id            UUID REFERENCES public.task_market_listings(id),
  from_user_id          UUID NOT NULL REFERENCES public.users(id),
  to_user_id            UUID NOT NULL REFERENCES public.users(id),
  progress_at_transfer  INTEGER NOT NULL,
  from_user_score_ratio DECIMAL(5,2) NOT NULL,
  to_user_score_ratio   DECIMAL(5,2) NOT NULL,
  from_user_points      INTEGER NOT NULL,
  to_user_points        INTEGER NOT NULL,
  transfer_type         TEXT NOT NULL CHECK (transfer_type IN ('full', 'partial', 'collaborative')),
  approved_by           UUID NOT NULL REFERENCES public.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 14. task_applications
-- --------------------------------------------------------
CREATE TABLE public.task_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES public.task_market_listings(id),
  applicant_id UUID NOT NULL REFERENCES public.users(id),
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by  UUID REFERENCES public.users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 15. invoices
-- --------------------------------------------------------
CREATE TABLE public.invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES public.clients(id),
  project_id     UUID REFERENCES public.projects(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount         DECIMAL(12,2) NOT NULL,
  tax_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount   DECIMAL(12,2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date       DATE NOT NULL,
  issued_date    DATE,
  paid_date      DATE,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES public.users(id),
  approved_by    UUID REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 16. documents
-- --------------------------------------------------------
CREATE TABLE public.documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('procedure', 'template', 'manual', 'meeting_minutes', 'proposal', 'checklist')),
  department_id   UUID REFERENCES public.departments(id),
  project_id      UUID REFERENCES public.projects(id),
  ai_agent_id     UUID REFERENCES public.ai_agents(id),
  created_by      UUID REFERENCES public.users(id),
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 17. reports
-- --------------------------------------------------------
CREATE TABLE public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  type          TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'ad_hoc')),
  department_id UUID REFERENCES public.departments(id),
  period_start  DATE,
  period_end    DATE,
  ai_agent_id   UUID REFERENCES public.ai_agents(id),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 18. comments
-- --------------------------------------------------------
CREATE TABLE public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id),
  content     TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('task', 'project', 'document', 'report')),
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 19. attachments
-- --------------------------------------------------------
CREATE TABLE public.attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   INTEGER NOT NULL,
  mime_type   TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('task', 'project', 'document', 'invoice')),
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 20. notifications
-- --------------------------------------------------------
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL
             CHECK (type IN ('task_assigned', 'deadline_warning', 'approval_required', 'score_confirmed', 'market_activity', 'system')),
  is_read    BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 21. audit_logs (immutable)
-- --------------------------------------------------------
CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.users(id),
  action       TEXT NOT NULL,
  target_type  TEXT NOT NULL,
  target_id    UUID,
  before_value JSONB,
  after_value  JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 22. payroll_estimates
-- --------------------------------------------------------
CREATE TABLE public.payroll_estimates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.users(id),
  year               INTEGER NOT NULL,
  month              INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  base_salary        DECIMAL(12,2) NOT NULL DEFAULT 0,
  point_reward       DECIMAL(12,2) NOT NULL DEFAULT 0,
  quality_bonus      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_estimate     DECIMAL(12,2) NOT NULL DEFAULT 0,
  confirmed_total    DECIMAL(12,2),
  total_score_points INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved')),
  reviewed_by        UUID REFERENCES public.users(id),
  approved_by        UUID REFERENCES public.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- --------------------------------------------------------
-- 23. score_history (immutable)
-- --------------------------------------------------------
CREATE TABLE public.score_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  task_id       UUID NOT NULL REFERENCES public.tasks(id),
  score_type    TEXT NOT NULL CHECK (score_type IN ('provisional', 'confirmed', 'adjusted', 'transferred')),
  points_before INTEGER NOT NULL,
  points_after  INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  changed_by    UUID NOT NULL REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS: Enable Row Level Security
-- ============================================================
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_transfers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_estimates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: get current user's role name
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- roles: everyone can read
CREATE POLICY "roles_read_all" ON public.roles FOR SELECT USING (true);

-- departments: everyone can read
CREATE POLICY "departments_read_all" ON public.departments FOR SELECT USING (true);

-- ai_agents: ceo/admin read all, others read active only
CREATE POLICY "ai_agents_read" ON public.ai_agents FOR SELECT USING (
  is_active = true OR public.get_current_role() IN ('ceo', 'admin')
);

-- users: ceo/admin see all; employees/viewers see own row
CREATE POLICY "users_read" ON public.users FOR SELECT USING (
  public.get_current_role() IN ('ceo', 'admin') OR id = auth.uid()
);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

-- clients: ceo/admin full; others none
CREATE POLICY "clients_ceo_admin" ON public.clients FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);

-- leads: ceo/admin full; assigned employee read
CREATE POLICY "leads_ceo_admin" ON public.leads FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "leads_employee_read" ON public.leads FOR SELECT USING (
  assigned_to = auth.uid()
);

-- projects: ceo/admin full; employee read all
CREATE POLICY "projects_ceo_admin" ON public.projects FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "projects_employee_read" ON public.projects FOR SELECT USING (
  public.get_current_role() = 'employee'
);

-- tasks: ceo/admin full; employee read/update own
CREATE POLICY "tasks_ceo_admin" ON public.tasks FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "tasks_employee_read" ON public.tasks FOR SELECT USING (
  assigned_to = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "tasks_employee_update" ON public.tasks FOR UPDATE USING (
  assigned_to = auth.uid()
);

-- task_checklist_items: follow task access
CREATE POLICY "checklist_read" ON public.task_checklist_items FOR SELECT USING (
  public.get_current_role() IN ('ceo', 'admin') OR
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid()))
);
CREATE POLICY "checklist_ceo_admin_write" ON public.task_checklist_items FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);

-- task_scores: ceo/admin full; employee read own task
CREATE POLICY "task_scores_ceo_admin" ON public.task_scores FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "task_scores_employee_read" ON public.task_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
);

-- task_progress_history: ceo/admin full; employee insert/read own
CREATE POLICY "progress_ceo_admin" ON public.task_progress_history FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "progress_employee_insert" ON public.task_progress_history FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "progress_employee_read" ON public.task_progress_history FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_to = auth.uid())
);

-- task_market_listings: everyone can read open; ceo/admin full
CREATE POLICY "listings_read_open" ON public.task_market_listings FOR SELECT USING (
  status = 'open' OR public.get_current_role() IN ('ceo', 'admin') OR listed_by = auth.uid()
);
CREATE POLICY "listings_employee_insert" ON public.task_market_listings FOR INSERT WITH CHECK (
  listed_by = auth.uid()
);
CREATE POLICY "listings_ceo_admin_write" ON public.task_market_listings FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);

-- task_transfers: ceo/admin full; participants read
CREATE POLICY "transfers_ceo_admin" ON public.task_transfers FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "transfers_participant_read" ON public.task_transfers FOR SELECT USING (
  from_user_id = auth.uid() OR to_user_id = auth.uid()
);

-- task_applications: ceo/admin full; applicant insert/read own
CREATE POLICY "applications_ceo_admin" ON public.task_applications FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "applications_employee_insert" ON public.task_applications FOR INSERT WITH CHECK (
  applicant_id = auth.uid()
);
CREATE POLICY "applications_employee_read" ON public.task_applications FOR SELECT USING (
  applicant_id = auth.uid()
);

-- invoices: ceo/admin only
CREATE POLICY "invoices_ceo_admin" ON public.invoices FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);

-- documents: ceo/admin full; employee read
CREATE POLICY "documents_ceo_admin" ON public.documents FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "documents_read" ON public.documents FOR SELECT USING (true);

-- reports: ceo/admin full; others read published
CREATE POLICY "reports_ceo_admin" ON public.reports FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "reports_read_published" ON public.reports FOR SELECT USING (
  status = 'published'
);

-- comments: read all; write own
CREATE POLICY "comments_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE USING (user_id = auth.uid());

-- attachments: read related; write own
CREATE POLICY "attachments_read" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT WITH CHECK (user_id = auth.uid());

-- notifications: own only
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "notifications_service_insert" ON public.notifications FOR INSERT WITH CHECK (true);

-- audit_logs: ceo/admin read; no one deletes/updates (service role inserts)
CREATE POLICY "audit_logs_ceo_admin_read" ON public.audit_logs FOR SELECT USING (
  public.get_current_role() IN ('ceo', 'admin')
);

-- payroll_estimates: ceo/admin full; employee read own
CREATE POLICY "payroll_ceo_admin" ON public.payroll_estimates FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "payroll_employee_read" ON public.payroll_estimates FOR SELECT USING (
  user_id = auth.uid()
);

-- score_history: ceo/admin full; employee read own
CREATE POLICY "score_history_ceo_admin" ON public.score_history FOR ALL USING (
  public.get_current_role() IN ('ceo', 'admin')
);
CREATE POLICY "score_history_employee_read" ON public.score_history FOR SELECT USING (
  user_id = auth.uid()
);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
CREATE INDEX idx_users_role_id       ON public.users(role_id);
CREATE INDEX idx_users_department_id ON public.users(department_id);

CREATE INDEX idx_tasks_assigned_to   ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX idx_tasks_project_id    ON public.tasks(project_id);
CREATE INDEX idx_tasks_status        ON public.tasks(status);
CREATE INDEX idx_tasks_due_date      ON public.tasks(due_date);

CREATE INDEX idx_task_progress_task_id ON public.task_progress_history(task_id);
CREATE INDEX idx_task_scores_task_id   ON public.task_scores(task_id);

CREATE INDEX idx_listings_status     ON public.task_market_listings(status);
CREATE INDEX idx_listings_task_id    ON public.task_market_listings(task_id);

CREATE INDEX idx_applications_listing_id  ON public.task_applications(listing_id);
CREATE INDEX idx_applications_applicant   ON public.task_applications(applicant_id);

CREATE INDEX idx_invoices_client_id  ON public.invoices(client_id);
CREATE INDEX idx_invoices_status     ON public.invoices(status);
CREATE INDEX idx_invoices_due_date   ON public.invoices(due_date);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action     ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

CREATE INDEX idx_payroll_user_year_month ON public.payroll_estimates(user_id, year, month);
CREATE INDEX idx_score_history_user_id   ON public.score_history(user_id);
CREATE INDEX idx_score_history_task_id   ON public.score_history(task_id);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.task_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.task_market_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payroll_estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
