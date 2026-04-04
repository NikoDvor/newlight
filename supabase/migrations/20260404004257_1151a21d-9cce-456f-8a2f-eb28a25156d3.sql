
-- =============================================
-- 1. FIX ANON BOOKING INJECTION (appointments)
-- =============================================
DROP POLICY IF EXISTS "anon_insert_appointments" ON public.appointments;
CREATE POLICY "anon_insert_appointments" ON public.appointments
  FOR INSERT TO anon
  WITH CHECK (
    booking_source = 'booking_page'
    AND EXISTS (
      SELECT 1 FROM public.calendars c
      JOIN public.calendar_booking_links bl ON bl.calendar_id = c.id
      WHERE c.id = appointments.calendar_id
        AND c.client_id = appointments.client_id
        AND c.is_active = true
        AND bl.is_active = true
        AND bl.is_public = true
    )
  );

-- =============================================
-- 2. FIX ANON CRM CONTACT INJECTION
-- =============================================
DROP POLICY IF EXISTS "anon_insert_contacts_booking" ON public.crm_contacts;
CREATE POLICY "anon_insert_contacts_booking" ON public.crm_contacts
  FOR INSERT TO anon
  WITH CHECK (
    lead_source = 'booking_page'
    AND EXISTS (
      SELECT 1 FROM public.calendars c
      JOIN public.calendar_booking_links bl ON bl.calendar_id = c.id
      WHERE c.client_id = crm_contacts.client_id
        AND c.is_active = true
        AND bl.is_active = true
        AND bl.is_public = true
    )
  );

-- =============================================
-- 3. FIX ANON FORM SUBMISSIONS (validate form_id + client_id match)
-- =============================================
DROP POLICY IF EXISTS "Public can submit forms" ON public.form_submissions;
CREATE POLICY "Public can submit forms" ON public.form_submissions
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_submissions.form_id
        AND f.client_id = form_submissions.client_id
        AND f.is_active = true
    )
  );

-- =============================================
-- 4. FIX ANON PROSPECT SUBMISSIONS (restrict to website source only)
-- =============================================
DROP POLICY IF EXISTS "Public can submit prospects" ON public.prospects;
CREATE POLICY "Public can submit prospects" ON public.prospects
  FOR INSERT TO anon
  WITH CHECK (
    source = 'website'
    AND status = 'new_lead'
  );

-- =============================================
-- 5. FIX PUBLIC FORMS CROSS-CLIENT EXPOSURE
-- =============================================
DROP POLICY IF EXISTS "Public can read active forms" ON public.forms;
CREATE POLICY "Public can read specific active form" ON public.forms
  FOR SELECT TO anon
  USING (
    is_active = true
    AND id::text = coalesce(current_setting('request.query_params', true)::json->>'form_id', '')
  );

DROP POLICY IF EXISTS "Public can read form fields for active forms" ON public.form_fields;
CREATE POLICY "Public can read fields for specific active form" ON public.form_fields
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_fields.form_id
        AND f.is_active = true
        AND f.id::text = coalesce(current_setting('request.query_params', true)::json->>'form_id', '')
    )
  );

-- =============================================
-- 6. FIX STORAGE: REMOVE ANON UPLOAD TO client-logos
-- =============================================
DROP POLICY IF EXISTS "Anon upload logos" ON storage.objects;
