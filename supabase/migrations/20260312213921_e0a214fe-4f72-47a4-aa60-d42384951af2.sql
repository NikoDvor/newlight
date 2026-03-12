
-- Automation events table
CREATE TABLE public.automation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation events" ON public.automation_events FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users can view their events" ON public.automation_events FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));

-- Automations table
CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automations" ON public.automations FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users can view their automations" ON public.automations FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automation runs table
CREATE TABLE public.automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  result JSONB DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation runs" ON public.automation_runs FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users can view their runs" ON public.automation_runs FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));

-- Automation logs table
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  log_level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation logs" ON public.automation_logs FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users can view their logs" ON public.automation_logs FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));

-- Revenue opportunities table
CREATE TABLE public.revenue_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_missed_revenue NUMERIC(12,2),
  recommended_action TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue opportunities" ON public.revenue_opportunities FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users can view their opportunities" ON public.revenue_opportunities FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_revenue_opportunities_updated_at BEFORE UPDATE ON public.revenue_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
