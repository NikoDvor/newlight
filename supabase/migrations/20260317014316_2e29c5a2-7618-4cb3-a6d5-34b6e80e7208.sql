
-- Extend existing calendars table with missing columns
ALTER TABLE public.calendars
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- CALENDAR_USERS
CREATE TABLE IF NOT EXISTS public.calendar_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','editor','member','viewer','booking_only')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calendar_id, user_id)
);
ALTER TABLE public.calendar_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with client access can manage calendar_users"
  ON public.calendar_users FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- CALENDAR_AVAILABILITY
CREATE TABLE IF NOT EXISTS public.calendar_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  timezone text DEFAULT 'America/Los_Angeles',
  slot_interval_minutes integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with client access can manage calendar_availability"
  ON public.calendar_availability FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- CALENDAR_BLACKOUT_DATES
CREATE TABLE IF NOT EXISTS public.calendar_blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_blackout_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with client access can manage calendar_blackout_dates"
  ON public.calendar_blackout_dates FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- CALENDAR_APPOINTMENT_TYPES
CREATE TABLE IF NOT EXISTS public.calendar_appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  buffer_before integer NOT NULL DEFAULT 0,
  buffer_after integer NOT NULL DEFAULT 0,
  location_type text NOT NULL DEFAULT 'virtual' CHECK (location_type IN ('virtual','in_person','phone','custom')),
  meeting_link_type text DEFAULT 'none' CHECK (meeting_link_type IN ('zoom','google_meet','phone','custom','none')),
  confirmation_message text,
  reminders_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_appointment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with client access can manage calendar_appointment_types"
  ON public.calendar_appointment_types FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- CALENDAR_BOOKING_LINKS
CREATE TABLE IF NOT EXISTS public.calendar_booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  slug text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, slug)
);
ALTER TABLE public.calendar_booking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with client access can manage calendar_booking_links"
  ON public.calendar_booking_links FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- CALENDAR_REMINDER_RULES
CREATE TABLE IF NOT EXISTS public.calendar_reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  reminder_type text NOT NULL DEFAULT 'before_appointment',
  offset_minutes integer NOT NULL DEFAULT 60,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','in_app')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_reminder_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with client access can manage calendar_reminder_rules"
  ON public.calendar_reminder_rules FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  appointment_type_id uuid REFERENCES public.calendar_appointment_types(id),
  contact_id uuid REFERENCES public.crm_contacts(id),
  company_id uuid REFERENCES public.crm_companies(id),
  assigned_user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text DEFAULT 'America/Los_Angeles',
  location text,
  booking_source text DEFAULT 'manual',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','rescheduled','no_show')),
  cancellation_reason text,
  reschedule_reason text,
  internal_notes text,
  customer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with client access can manage appointments"
  ON public.appointments FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- updated_at triggers
CREATE OR REPLACE TRIGGER trg_calendar_availability_updated BEFORE UPDATE ON public.calendar_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_calendar_blackout_dates_updated BEFORE UPDATE ON public.calendar_blackout_dates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_calendar_appointment_types_updated BEFORE UPDATE ON public.calendar_appointment_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_calendar_booking_links_updated BEFORE UPDATE ON public.calendar_booking_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_calendar_reminder_rules_updated BEFORE UPDATE ON public.calendar_reminder_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
