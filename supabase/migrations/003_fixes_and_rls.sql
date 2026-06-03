-- ============================================================
-- Migration 003: Fix get_current_role + notifications RLS + audit_logs RLS
-- ============================================================

-- Fix: add SECURITY DEFINER to break the circular RLS dependency
-- (get_current_role was calling users table while evaluating users RLS policy)
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_current_role() TO anon, authenticated;

-- notifications RLS policies
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- audit_logs: admins/ceo read all; others cannot read
CREATE POLICY "audit_logs_ceo_admin" ON public.audit_logs
  FOR SELECT USING (public.get_current_role() IN ('ceo', 'admin'));

-- audit_logs: only service role can insert (app code uses adminSupabase)
-- No INSERT policy needed — service role bypasses RLS
