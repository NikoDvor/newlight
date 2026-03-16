
-- Create timesheets table (idempotent)
CREATE TABLE IF NOT EXISTS public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0,
  total_overtime_hours numeric NOT NULL DEFAULT 0,
  total_billable_hours numeric NOT NULL DEFAULT 0,
  total_nonbillable_hours numeric NOT NULL DEFAULT 0,
  total_notes_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  approval_comment text,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add timesheet_id to time_entries if missing
DO $$ BEGIN
  ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS timesheet_id uuid REFERENCES public.timesheets(id);
EXCEPTION WHEN others THEN NULL;
END $$;

-- Updated_at trigger
CREATE OR REPLACE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins manage timesheets"
  ON public.timesheets FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users manage own timesheets"
  ON public.timesheets FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Anon demo timesheets"
  ON public.timesheets FOR ALL TO anon
  USING (true) WITH CHECK (true);
