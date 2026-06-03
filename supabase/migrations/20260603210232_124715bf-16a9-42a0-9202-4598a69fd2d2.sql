
DROP POLICY IF EXISTS "Public can view bookable calendars by slug" ON public.bdr_calendars;
CREATE POLICY "Public can view active bookable calendars"
  ON public.bdr_calendars FOR SELECT
  TO anon, authenticated
  USING (booking_slug IS NOT NULL AND booking_active = true);

CREATE POLICY "Client users can view their automation action logs"
  ON public.automation_action_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.automation_runs ar
      WHERE ar.id = automation_action_logs.automation_run_id
        AND private.user_has_client_access(auth.uid(), ar.client_id)
    )
  );

CREATE POLICY "Client users can view their billing events"
  ON public.billing_events FOR SELECT
  TO authenticated
  USING (private.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Public read client logos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'client-logos');

CREATE POLICY "Public read website media"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'website-media');

CREATE POLICY "Workspace users update tax docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'tax-documents'
    AND private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
