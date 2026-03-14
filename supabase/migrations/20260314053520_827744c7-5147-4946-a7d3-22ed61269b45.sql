
-- Team members (employees/contractors) for payroll
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'employee',
  pay_type TEXT NOT NULL DEFAULT 'salary',
  hourly_rate NUMERIC DEFAULT 0,
  salary_amount NUMERIC DEFAULT 0,
  payroll_frequency TEXT DEFAULT 'biweekly',
  active_status BOOLEAN NOT NULL DEFAULT true,
  payment_method_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll runs
CREATE TABLE public.payroll_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payroll_status TEXT NOT NULL DEFAULT 'draft',
  total_gross_pay NUMERIC DEFAULT 0,
  total_adjustments NUMERIC DEFAULT 0,
  total_final_pay NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Payroll line items
CREATE TABLE public.payroll_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hours_worked NUMERIC DEFAULT 0,
  gross_pay NUMERIC DEFAULT 0,
  adjustments NUMERIC DEFAULT 0,
  final_pay NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial adjustments (manual modifications)
CREATE TABLE public.financial_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'revenue',
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Calendar events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  location TEXT,
  booking_link TEXT,
  assigned_user UUID,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  calendar_status TEXT NOT NULL DEFAULT 'scheduled',
  reminder_status TEXT DEFAULT 'pending',
  cancellation_reason TEXT,
  original_start_time TIMESTAMPTZ,
  intake_answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event types
CREATE TABLE public.event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  booking_link TEXT,
  intake_questions JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Availability settings
CREATE TABLE public.availability_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_settings ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins manage team_members" ON public.team_members FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own team_members" ON public.team_members FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on team_members" ON public.team_members FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage payroll_runs" ON public.payroll_runs FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own payroll_runs" ON public.payroll_runs FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on payroll_runs" ON public.payroll_runs FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage payroll_line_items" ON public.payroll_line_items FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own payroll_line_items" ON public.payroll_line_items FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on payroll_line_items" ON public.payroll_line_items FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage financial_adjustments" ON public.financial_adjustments FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own financial_adjustments" ON public.financial_adjustments FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on financial_adjustments" ON public.financial_adjustments FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage calendar_events" ON public.calendar_events FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own calendar_events" ON public.calendar_events FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Client users insert own calendar_events" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on calendar_events" ON public.calendar_events FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage event_types" ON public.event_types FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own event_types" ON public.event_types FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on event_types" ON public.event_types FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage availability_settings" ON public.availability_settings FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own availability_settings" ON public.availability_settings FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo access on availability_settings" ON public.availability_settings FOR ALL TO anon USING (true) WITH CHECK (true);
