
CREATE TABLE IF NOT EXISTS public.nl_health_check_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  total_chapters integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  chapters_under_threshold jsonb NOT NULL DEFAULT '[]'::jsonb,
  orphan_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  lock_chain_ok boolean NOT NULL DEFAULT true,
  overall_status text NOT NULL DEFAULT 'healthy',
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_nl_health_check_log_checked_at ON public.nl_health_check_log (checked_at DESC);

ALTER TABLE public.nl_health_check_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and operators read health logs" ON public.nl_health_check_log;
CREATE POLICY "Admins and operators read health logs"
  ON public.nl_health_check_log
  FOR SELECT
  TO authenticated
  USING (private.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins insert health logs" ON public.nl_health_check_log;
CREATE POLICY "Admins insert health logs"
  ON public.nl_health_check_log
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin_or_operator(auth.uid()));
