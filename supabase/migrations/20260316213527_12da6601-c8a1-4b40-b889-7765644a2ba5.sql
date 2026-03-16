
-- Workers table
CREATE TABLE public.workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  worker_type TEXT NOT NULL DEFAULT 'Employee',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT,
  phone TEXT,
  role_title TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  pay_type TEXT NOT NULL DEFAULT 'Hourly',
  hourly_rate NUMERIC DEFAULT 0,
  salary_amount NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0,
  bonus_eligible BOOLEAN DEFAULT false,
  overtime_eligible BOOLEAN DEFAULT true,
  payroll_frequency TEXT DEFAULT 'biweekly',
  start_date DATE,
  end_date DATE,
  manager_user_id UUID,
  payout_method TEXT DEFAULT 'direct_deposit',
  payout_status TEXT DEFAULT 'active',
  default_cost_center TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries table
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  total_hours NUMERIC GENERATED ALWAYS AS (ROUND(total_minutes / 60.0, 2)) STORED,
  entry_method TEXT NOT NULL DEFAULT 'Manual Entry',
  entry_status TEXT NOT NULL DEFAULT 'Draft',
  note_summary TEXT,
  detailed_notes TEXT,
  linked_task_id UUID,
  linked_contact_id UUID,
  linked_company_id UUID,
  linked_deal_id UUID,
  linked_appointment_id UUID,
  linked_campaign_id UUID,
  linked_project_type TEXT,
  linked_module TEXT,
  labor_category TEXT,
  billable_status TEXT DEFAULT 'billable',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Workers RLS
CREATE POLICY "Admins manage workers" ON public.workers FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own workers" ON public.workers FOR ALL TO authenticated
  USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo workers" ON public.workers FOR ALL TO anon USING (true) WITH CHECK (true);

-- Time entries RLS
CREATE POLICY "Admins manage time_entries" ON public.time_entries FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own time_entries" ON public.time_entries FOR ALL TO authenticated
  USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo time_entries" ON public.time_entries FOR ALL TO anon USING (true) WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
