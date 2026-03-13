
CREATE TABLE public.client_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'weekly',
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reports" ON public.client_reports
  FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own reports" ON public.client_reports
  FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));

CREATE TABLE public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'weekly',
  enabled boolean NOT NULL DEFAULT true,
  send_email boolean NOT NULL DEFAULT false,
  recipients text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, report_type)
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage schedules" ON public.report_schedules
  FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users view own schedules" ON public.report_schedules
  FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_client_reports_updated_at
  BEFORE UPDATE ON public.client_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
