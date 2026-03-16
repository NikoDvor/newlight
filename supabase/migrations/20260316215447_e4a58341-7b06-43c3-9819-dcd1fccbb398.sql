
-- Extend payroll_runs with missing columns
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS payroll_frequency text DEFAULT 'Biweekly';
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS gross_pay_total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS tax_withholding_total_placeholder numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS deductions_total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS bonus_total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS reimbursement_total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS net_pay_total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS run_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Extend payroll_line_items with missing columns
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS worker_id uuid REFERENCES public.workers(id) ON DELETE CASCADE;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS pay_type text DEFAULT 'Hourly';
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS overtime_hours numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS base_pay numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS overtime_pay numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS commission_pay numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS bonus_pay numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS reimbursement_pay numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS deduction_amount numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS net_pay numeric DEFAULT 0;
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft';
ALTER TABLE public.payroll_line_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  payout_method text NOT NULL DEFAULT 'Bank Transfer',
  payout_amount numeric NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'Pending',
  payout_reference text,
  initiated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_payroll_line_items_updated_at BEFORE UPDATE ON public.payroll_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS on payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payouts" ON public.payouts FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users manage own payouts" ON public.payouts FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Anon demo payouts" ON public.payouts FOR ALL TO anon
  USING (true) WITH CHECK (true);
