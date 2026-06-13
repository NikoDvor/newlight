-- Fix RLS policies on seo_competitor_gaps
DROP POLICY IF EXISTS "Authenticated users can read competitor gaps" ON public.seo_competitor_gaps;

CREATE POLICY "admins_seo_competitor_gaps" ON public.seo_competitor_gaps
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "clients_seo_competitor_gaps" ON public.seo_competitor_gaps
  FOR ALL TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

-- Fix RLS policies on client_oauth_connections
DROP POLICY IF EXISTS "Authenticated users can read all rows" ON public.client_oauth_connections;

CREATE POLICY "admins_client_oauth_connections" ON public.client_oauth_connections
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "clients_client_oauth_connections" ON public.client_oauth_connections
  FOR ALL TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

-- Fix RLS policies on seo_performance_scores
DROP POLICY IF EXISTS "Authenticated users can read performance scores" ON public.seo_performance_scores;
DROP POLICY IF EXISTS "Admins can insert performance scores" ON public.seo_performance_scores;

CREATE POLICY "admins_seo_performance_scores" ON public.seo_performance_scores
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "clients_seo_performance_scores" ON public.seo_performance_scores
  FOR ALL TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

-- Fix RLS policies on seo_run_log
DROP POLICY IF EXISTS "Authenticated users can read run log" ON public.seo_run_log;

CREATE POLICY "admins_seo_run_log" ON public.seo_run_log
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));