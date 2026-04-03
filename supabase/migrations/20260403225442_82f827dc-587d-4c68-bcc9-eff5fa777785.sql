-- 1. Drop anon read on reminder rules (internal config, never needed publicly)
DROP POLICY IF EXISTS "anon_read_reminders" ON public.calendar_reminder_rules;

-- 2. Tighten anon read on calendars: only active calendars that have a public booking link
DROP POLICY IF EXISTS "anon_read_calendars" ON public.calendars;
CREATE POLICY "anon_read_bookable_calendars"
ON public.calendars FOR SELECT TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.calendar_booking_links bl
    WHERE bl.calendar_id = id AND bl.is_active = true AND bl.is_public = true
  )
);

-- 3. Tighten anon read on appointment types: only active types on bookable calendars
DROP POLICY IF EXISTS "anon_read_appt_types" ON public.calendar_appointment_types;
CREATE POLICY "anon_read_bookable_appt_types"
ON public.calendar_appointment_types FOR SELECT TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.calendar_booking_links bl
    WHERE bl.calendar_id = calendar_appointment_types.calendar_id
      AND bl.is_active = true AND bl.is_public = true
  )
);

-- 4. Tighten anon read on availability: only active availability on bookable calendars
DROP POLICY IF EXISTS "anon_read_availability" ON public.calendar_availability;
CREATE POLICY "anon_read_bookable_availability"
ON public.calendar_availability FOR SELECT TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.calendar_booking_links bl
    WHERE bl.calendar_id = calendar_availability.calendar_id
      AND bl.is_active = true AND bl.is_public = true
  )
);

-- 5. Booking links: keep anon read but already scoped to active+public — no change needed
-- (existing policy: is_active = true AND is_public = true)