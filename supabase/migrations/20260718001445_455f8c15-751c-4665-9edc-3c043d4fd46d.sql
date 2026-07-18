-- Remove policies that scope anon SELECT via a client-suppliable query parameter,
-- which allowed enumeration of any active form by iterating form_id.
-- The bdr_calendars-linked policies remain in place for legitimate public booking use.
DROP POLICY IF EXISTS "Public can read specific active form" ON public.forms;
DROP POLICY IF EXISTS "Public can read fields for specific active form" ON public.form_fields;