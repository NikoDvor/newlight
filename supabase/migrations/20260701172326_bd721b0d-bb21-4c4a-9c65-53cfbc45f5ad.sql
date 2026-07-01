CREATE POLICY "Anon can read client_forms linked to active BDR calendars"
ON public.client_forms
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.bdr_calendars c
    WHERE c.booking_form_id = client_forms.id
      AND c.booking_active = true
  )
);

GRANT SELECT ON public.client_forms TO anon;