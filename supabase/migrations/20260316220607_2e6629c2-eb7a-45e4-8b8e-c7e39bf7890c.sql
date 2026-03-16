
-- Create labor_cost_records table
CREATE TABLE IF NOT EXISTS public.labor_cost_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE SET NULL,
  linked_module text,
  linked_record_id uuid,
  labor_category text,
  hourly_cost_rate numeric NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  total_labor_cost numeric NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create commission_records table
CREATE TABLE IF NOT EXISTS public.commission_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  linked_deal_id uuid,
  revenue_source_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_earned numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  payroll_line_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger for commission_records
DO $$ BEGIN
  CREATE TRIGGER update_commission_records_updated_at BEFORE UPDATE ON public.commission_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS for labor_cost_records
ALTER TABLE public.labor_cost_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage labor_cost_records" ON public.labor_cost_records FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users manage own labor_cost_records" ON public.labor_cost_records FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Anon demo labor_cost_records" ON public.labor_cost_records FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- RLS for commission_records
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commission_records" ON public.commission_records FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users manage own commission_records" ON public.commission_records FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Anon demo commission_records" ON public.commission_records FOR ALL TO anon
  USING (true) WITH CHECK (true);
