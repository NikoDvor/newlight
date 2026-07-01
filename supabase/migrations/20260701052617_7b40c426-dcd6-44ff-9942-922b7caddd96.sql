
CREATE POLICY "Public can read forms linked to active bdr calendars"
ON public.forms
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.bdr_calendars c
    WHERE c.booking_form_id = forms.id
      AND c.booking_active = true
  )
);

CREATE POLICY "Public can read form fields linked to active bdr calendars"
ON public.form_fields
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.forms f
    JOIN public.bdr_calendars c ON c.booking_form_id = f.id
    WHERE f.id = form_fields.form_id
      AND f.is_active = true
      AND c.booking_active = true
  )
);
