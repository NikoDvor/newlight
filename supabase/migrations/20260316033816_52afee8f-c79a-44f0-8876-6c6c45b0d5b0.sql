
-- Autopilot rules table
CREATE TABLE public.autopilot_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL DEFAULT 'review_request',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  action_config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  runs_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.autopilot_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage autopilot_rules" ON public.autopilot_rules FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own autopilot_rules" ON public.autopilot_rules FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo autopilot_rules" ON public.autopilot_rules FOR ALL TO anon USING (true) WITH CHECK (true);

-- Marketing campaigns table
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'draft',
  target_audience TEXT,
  message_template TEXT,
  subject_line TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing_campaigns" ON public.marketing_campaigns FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own marketing_campaigns" ON public.marketing_campaigns FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo marketing_campaigns" ON public.marketing_campaigns FOR ALL TO anon USING (true) WITH CHECK (true);
