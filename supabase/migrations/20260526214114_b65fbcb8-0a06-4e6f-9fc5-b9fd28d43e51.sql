
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_status_check') THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_status_check CHECK (status IN ('active','suspended'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  device_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_client ON public.user_sessions(client_id);
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "us_insert_own" ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "us_update_own" ON public.user_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "us_select_own" ON public.user_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "us_select_admin" ON public.user_sessions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "us_select_workspace_mgr" ON public.user_sessions FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.client_id = user_sessions.client_id
        AND ur.role IN ('project_manager'::public.app_role, 'client_owner'::public.app_role)
    )
  );

CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID,
  action TEXT NOT NULL,
  target TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ual_user ON public.user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ual_client ON public.user_activity_log(client_id);
GRANT SELECT, INSERT ON public.user_activity_log TO authenticated;
GRANT ALL ON public.user_activity_log TO service_role;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ual_insert_own" ON public.user_activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ual_select_own" ON public.user_activity_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ual_select_admin" ON public.user_activity_log FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "ual_select_workspace_mgr" ON public.user_activity_log FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.client_id = user_activity_log.client_id
        AND ur.role IN ('project_manager'::public.app_role, 'client_owner'::public.app_role)
    )
  );
