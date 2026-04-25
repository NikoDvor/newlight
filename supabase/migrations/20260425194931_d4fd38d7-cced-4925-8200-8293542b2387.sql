DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'client_agreements',
        'lifecycle_send_logs',
        'implementation_tasks',
        'client_setup_items',
        'recommended_services',
        'service_recommendation_signals',
        'revenue_projection_models'
      )
      AND roles = ARRAY['public']::name[]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "Admin/operator full access on agreements"
ON public.client_agreements
AS PERMISSIVE
FOR ALL
TO authenticated
USING (is_admin_or_operator(auth.uid()))
WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can view own agreements"
ON public.client_agreements
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins and operators can manage all setup items"
ON public.client_setup_items
AS PERMISSIVE
FOR ALL
TO authenticated
USING (is_admin_or_operator(auth.uid()))
WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can insert own setup items"
ON public.client_setup_items
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client team can update own submitted items"
ON public.client_setup_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (user_has_client_access(auth.uid(), client_id) AND submitted_by_client = true)
WITH CHECK (user_has_client_access(auth.uid(), client_id) AND submitted_by_client = true);

CREATE POLICY "Client team can view own setup items"
ON public.client_setup_items
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Admin/operator full access on impl tasks"
ON public.implementation_tasks
AS PERMISSIVE
FOR ALL
TO authenticated
USING (is_admin_or_operator(auth.uid()))
WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can view own impl tasks"
ON public.implementation_tasks
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Admin/operator full access on send logs"
ON public.lifecycle_send_logs
AS PERMISSIVE
FOR ALL
TO authenticated
USING (is_admin_or_operator(auth.uid()))
WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can view own send logs"
ON public.lifecycle_send_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Admin/operator full access on recommended_services"
ON public.recommended_services
AS PERMISSIVE
FOR ALL
TO authenticated
USING (is_admin_or_operator(auth.uid()))
WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own recommended_services"
ON public.recommended_services
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Admin/operator full access on service_recommendation_signals"
ON public.service_recommendation_signals
AS PERMISSIVE
FOR ALL
TO authenticated
USING (is_admin_or_operator(auth.uid()))
WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own signals"
ON public.service_recommendation_signals
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Admin/operator full access on revenue_projection_models"
ON public.revenue_projection_models
AS PERMISSIVE
FOR ALL
TO authenticated
USING (is_admin_or_operator(auth.uid()))
WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own revenue_projection_models"
ON public.revenue_projection_models
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Users upload own tax docs" ON storage.objects;
DROP POLICY IF EXISTS "Users view own tax docs" ON storage.objects;
DROP POLICY IF EXISTS "Workspace users upload tax docs" ON storage.objects;
DROP POLICY IF EXISTS "Workspace users view tax docs" ON storage.objects;
DROP POLICY IF EXISTS "Workspace users delete tax docs" ON storage.objects;

CREATE POLICY "Workspace users view tax docs"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Workspace users upload tax docs"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tax-documents'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Workspace users delete tax docs"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND public.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);