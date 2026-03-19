
-- Extend automations table with new columns
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS workspace_scope_type text DEFAULT 'client_workspace',
  ADD COLUMN IF NOT EXISTS automation_key text,
  ADD COLUMN IF NOT EXISTS automation_category text DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Extend automation_runs with related record tracking
ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS related_type text,
  ADD COLUMN IF NOT EXISTS related_id uuid,
  ADD COLUMN IF NOT EXISTS trigger_payload jsonb;

-- Extend automation_events with structured fields
ALTER TABLE public.automation_events
  ADD COLUMN IF NOT EXISTS event_key text,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS related_type text,
  ADD COLUMN IF NOT EXISTS related_id uuid;

-- Create automation_action_logs table
CREATE TABLE IF NOT EXISTS public.automation_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_run_id uuid REFERENCES public.automation_runs(id) ON DELETE CASCADE NOT NULL,
  action_key text NOT NULL,
  action_type text NOT NULL,
  action_status text NOT NULL DEFAULT 'Pending',
  result_summary text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_automation_action_logs" ON public.automation_action_logs FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
