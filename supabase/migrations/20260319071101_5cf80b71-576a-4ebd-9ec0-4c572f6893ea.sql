
-- Client Health Records
CREATE TABLE IF NOT EXISTS public.client_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  health_score_total integer DEFAULT 0,
  adoption_score integer DEFAULT 0,
  engagement_score integer DEFAULT 0,
  billing_health_score integer DEFAULT 0,
  support_health_score integer DEFAULT 0,
  review_health_score integer DEFAULT 0,
  booking_health_score integer DEFAULT 0,
  retention_health_score integer DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client Success Milestones
CREATE TABLE IF NOT EXISTS public.client_success_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  milestone_key text NOT NULL,
  milestone_name text NOT NULL,
  milestone_status text NOT NULL DEFAULT 'Not Started',
  due_date timestamptz,
  completed_at timestamptz,
  assigned_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client Risk Records
CREATE TABLE IF NOT EXISTS public.client_risk_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  risk_type text NOT NULL DEFAULT 'low_adoption',
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Open',
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client Success Playbook Runs
CREATE TABLE IF NOT EXISTS public.client_success_playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  playbook_key text NOT NULL,
  playbook_name text NOT NULL,
  run_status text NOT NULL DEFAULT 'Pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Renewal Records
CREATE TABLE IF NOT EXISTS public.renewal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  subscription_id uuid REFERENCES public.subscriptions(id),
  contract_record_id uuid REFERENCES public.contract_records(id),
  renewal_status text NOT NULL DEFAULT 'Not Started',
  renewal_date timestamptz,
  months_remaining integer,
  renewal_owner_user_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Upsell Opportunities
CREATE TABLE IF NOT EXISTS public.upsell_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  opportunity_type text NOT NULL DEFAULT 'crm_upgrade',
  title text NOT NULL,
  description text,
  estimated_value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  created_by_user_id uuid,
  ticket_subject text NOT NULL,
  ticket_description text,
  ticket_category text NOT NULL DEFAULT 'Other',
  ticket_priority text NOT NULL DEFAULT 'Medium',
  ticket_status text NOT NULL DEFAULT 'New',
  assigned_user_id uuid,
  resolution_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Support Comments
CREATE TABLE IF NOT EXISTS public.support_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.clients(id),
  author_user_id uuid,
  is_internal boolean DEFAULT false,
  comment_body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_success_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_risk_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_success_playbook_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_all_health" ON public.client_health_records FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "admin_all_milestones" ON public.client_success_milestones FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "admin_all_risks" ON public.client_risk_records FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_all_playbooks" ON public.client_success_playbook_runs FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_all_renewals" ON public.renewal_records FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_all_upsells" ON public.upsell_opportunities FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "tickets_access" ON public.support_tickets FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "comments_access" ON public.support_comments FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()) OR (public.user_has_client_access(auth.uid(), client_id) AND is_internal = false));

-- Updated_at triggers
CREATE TRIGGER set_updated_at_health BEFORE UPDATE ON public.client_health_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_milestones BEFORE UPDATE ON public.client_success_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_risks BEFORE UPDATE ON public.client_risk_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_playbooks BEFORE UPDATE ON public.client_success_playbook_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_renewals BEFORE UPDATE ON public.renewal_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_upsells BEFORE UPDATE ON public.upsell_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_tickets BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
