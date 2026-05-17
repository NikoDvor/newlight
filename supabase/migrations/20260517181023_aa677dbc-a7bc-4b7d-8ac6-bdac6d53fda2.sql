
-- 1. Ensure NewLight Internal client exists
INSERT INTO public.clients (id, business_name, workspace_slug, status)
VALUES ('00000000-0000-0000-0000-0000000000ff'::uuid, 'NewLight Internal', 'newlight-internal', 'active')
ON CONFLICT (workspace_slug) DO NOTHING;

-- 2. Add client_id columns
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.bdr_call_outcomes ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.bdr_calendars ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.bdr_calendar_events ADD COLUMN IF NOT EXISTS client_id uuid;

-- 3. Backfill
UPDATE public.employee_profiles SET client_id = '00000000-0000-0000-0000-0000000000ff'::uuid WHERE client_id IS NULL;
UPDATE public.bdr_call_outcomes SET client_id = '00000000-0000-0000-0000-0000000000ff'::uuid WHERE client_id IS NULL;
UPDATE public.bdr_calendars SET client_id = '00000000-0000-0000-0000-0000000000ff'::uuid WHERE client_id IS NULL;
UPDATE public.bdr_calendar_events SET client_id = '00000000-0000-0000-0000-0000000000ff'::uuid WHERE client_id IS NULL;
UPDATE public.nl_bdr_leads SET client_id = '00000000-0000-0000-0000-0000000000ff'::uuid WHERE client_id IS NULL;

-- 4. FKs + NOT NULL
ALTER TABLE public.employee_profiles
  ADD CONSTRAINT employee_profiles_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT,
  ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.bdr_call_outcomes
  ADD CONSTRAINT bdr_call_outcomes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT,
  ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.bdr_calendars
  ADD CONSTRAINT bdr_calendars_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT,
  ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.bdr_calendar_events
  ADD CONSTRAINT bdr_calendar_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT,
  ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE public.nl_bdr_leads ALTER COLUMN client_id SET NOT NULL;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_employee_profiles_client ON public.employee_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_bdr_call_outcomes_client ON public.bdr_call_outcomes(client_id, bdr_user_id);
CREATE INDEX IF NOT EXISTS idx_bdr_calendars_client ON public.bdr_calendars(client_id);
CREATE INDEX IF NOT EXISTS idx_bdr_calendar_events_client ON public.bdr_calendar_events(client_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_nl_bdr_leads_client ON public.nl_bdr_leads(client_id, user_id);

-- 6. Helper functions
CREATE OR REPLACE FUNCTION public.get_employee_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT client_id FROM public.employee_profiles WHERE user_id = _user_id LIMIT 1),
    (SELECT client_id FROM public.workspace_users WHERE user_id = _user_id AND status = 'active' ORDER BY created_at LIMIT 1),
    '00000000-0000-0000-0000-0000000000ff'::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Admin: full cross-tenant
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    -- Operator (Service Manager): only assigned clients (must have a workspace_users row, or no operator restriction => allow all)
    OR (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'operator')
      AND (
        NOT EXISTS (SELECT 1 FROM public.workspace_users WHERE user_id = _user_id)
        OR EXISTS (SELECT 1 FROM public.workspace_users WHERE user_id = _user_id AND client_id = _client_id)
      )
    )
    -- Otherwise must match employee's own client
    OR public.get_employee_client_id(_user_id) = _client_id;
$$;

-- 7. Replace RLS policies
-- nl_bdr_leads
DROP POLICY IF EXISTS "BDRs can view own leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "BDRs can insert own leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "BDRs can update own leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "BDRs can delete own leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Admins can view all leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Admins can update all leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Admins can delete all leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Users view their leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Users insert their leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Users update their leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Users delete their leads" ON public.nl_bdr_leads;

CREATE POLICY "tenant_select_leads" ON public.nl_bdr_leads FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_insert_leads" ON public.nl_bdr_leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_update_leads" ON public.nl_bdr_leads FOR UPDATE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id) AND (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid())));
CREATE POLICY "tenant_delete_leads" ON public.nl_bdr_leads FOR DELETE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id) AND (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid())));

-- bdr_call_outcomes
DROP POLICY IF EXISTS "BDRs can view own call outcomes" ON public.bdr_call_outcomes;
DROP POLICY IF EXISTS "BDRs can insert own call outcomes" ON public.bdr_call_outcomes;
DROP POLICY IF EXISTS "BDRs can delete own call outcomes" ON public.bdr_call_outcomes;

CREATE POLICY "tenant_select_call_outcomes" ON public.bdr_call_outcomes FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_insert_call_outcomes" ON public.bdr_call_outcomes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = bdr_user_id AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_delete_call_outcomes" ON public.bdr_call_outcomes FOR DELETE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id) AND (auth.uid() = bdr_user_id OR private.is_admin_or_operator(auth.uid())));

-- bdr_calendars
DROP POLICY IF EXISTS "Owner can view own calendar" ON public.bdr_calendars;
DROP POLICY IF EXISTS "Owner can insert own calendar" ON public.bdr_calendars;
DROP POLICY IF EXISTS "Owner can update own calendar" ON public.bdr_calendars;
DROP POLICY IF EXISTS "Admins can view all bdr calendars" ON public.bdr_calendars;
DROP POLICY IF EXISTS "Admins can update all bdr calendars" ON public.bdr_calendars;

CREATE POLICY "tenant_select_calendars" ON public.bdr_calendars FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_insert_calendars" ON public.bdr_calendars FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_update_calendars" ON public.bdr_calendars FOR UPDATE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id) AND (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid())));

-- bdr_calendar_events
DROP POLICY IF EXISTS "Owner can view own events" ON public.bdr_calendar_events;
DROP POLICY IF EXISTS "Owner can insert own events" ON public.bdr_calendar_events;
DROP POLICY IF EXISTS "Owner can update own events" ON public.bdr_calendar_events;
DROP POLICY IF EXISTS "Owner can delete own events" ON public.bdr_calendar_events;
DROP POLICY IF EXISTS "Admins can view all bdr events" ON public.bdr_calendar_events;
DROP POLICY IF EXISTS "Admins can update all bdr events" ON public.bdr_calendar_events;

CREATE POLICY "tenant_select_events" ON public.bdr_calendar_events FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_insert_events" ON public.bdr_calendar_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "tenant_update_events" ON public.bdr_calendar_events FOR UPDATE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id) AND (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid())));
CREATE POLICY "tenant_delete_events" ON public.bdr_calendar_events FOR DELETE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id) AND (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid())));
