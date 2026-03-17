
DO $$ BEGIN
  -- Booking links: anon read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_booking_links' AND tablename = 'calendar_booking_links') THEN
    CREATE POLICY anon_read_booking_links ON public.calendar_booking_links FOR SELECT TO anon USING (is_active = true AND is_public = true);
  END IF;
  -- Calendars: anon read active
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_calendars' AND tablename = 'calendars') THEN
    CREATE POLICY anon_read_calendars ON public.calendars FOR SELECT TO anon USING (is_active = true);
  END IF;
  -- Appointment types: anon read active
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_appt_types' AND tablename = 'calendar_appointment_types') THEN
    CREATE POLICY anon_read_appt_types ON public.calendar_appointment_types FOR SELECT TO anon USING (is_active = true);
  END IF;
  -- Availability: anon read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_availability' AND tablename = 'calendar_availability') THEN
    CREATE POLICY anon_read_availability ON public.calendar_availability FOR SELECT TO anon USING (is_active = true);
  END IF;
  -- Blackout dates: anon read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_blackouts' AND tablename = 'calendar_blackout_dates') THEN
    CREATE POLICY anon_read_blackouts ON public.calendar_blackout_dates FOR SELECT TO anon USING (true);
  END IF;
  -- Appointments: anon read for slot checking
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_appointments' AND tablename = 'appointments') THEN
    CREATE POLICY anon_read_appointments ON public.appointments FOR SELECT TO anon USING (true);
  END IF;
  -- Appointments: anon insert via booking
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_appointments' AND tablename = 'appointments') THEN
    CREATE POLICY anon_insert_appointments ON public.appointments FOR INSERT TO anon WITH CHECK (booking_source = 'booking_page');
  END IF;
  -- CRM contacts: anon select for dedup
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_contacts_booking' AND tablename = 'crm_contacts') THEN
    CREATE POLICY anon_read_contacts_booking ON public.crm_contacts FOR SELECT TO anon USING (true);
  END IF;
  -- CRM contacts: anon insert via booking
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_contacts_booking' AND tablename = 'crm_contacts') THEN
    CREATE POLICY anon_insert_contacts_booking ON public.crm_contacts FOR INSERT TO anon WITH CHECK (lead_source = 'booking_page');
  END IF;
  -- CRM contacts: anon update via booking
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_update_contacts_booking' AND tablename = 'crm_contacts') THEN
    CREATE POLICY anon_update_contacts_booking ON public.crm_contacts FOR UPDATE TO anon USING (true);
  END IF;
  -- Activities: anon insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_activities_booking' AND tablename = 'crm_activities') THEN
    CREATE POLICY anon_insert_activities_booking ON public.crm_activities FOR INSERT TO anon WITH CHECK (true);
  END IF;
  -- Audit logs: anon insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_audit_booking' AND tablename = 'audit_logs') THEN
    CREATE POLICY anon_insert_audit_booking ON public.audit_logs FOR INSERT TO anon WITH CHECK (true);
  END IF;
  -- Calendar users: anon read for round-robin
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_cal_users' AND tablename = 'calendar_users') THEN
    CREATE POLICY anon_read_cal_users ON public.calendar_users FOR SELECT TO anon USING (true);
  END IF;
  -- Reminder rules: anon read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_reminders' AND tablename = 'calendar_reminder_rules') THEN
    CREATE POLICY anon_read_reminders ON public.calendar_reminder_rules FOR SELECT TO anon USING (is_active = true);
  END IF;
END $$;
