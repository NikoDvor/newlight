
-- 1. Extend existing tables
ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS urgency_level text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS qualification_status text DEFAULT 'unqualified',
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS interest_type text,
  ADD COLUMN IF NOT EXISTS assigned_operator_user_id uuid,
  ADD COLUMN IF NOT EXISTS proposal_id_current uuid,
  ADD COLUMN IF NOT EXISTS meeting_id_latest uuid,
  ADD COLUMN IF NOT EXISTS notes_summary text;

ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id),
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.crm_companies(id),
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.crm_deals(id),
  ADD COLUMN IF NOT EXISTS proposal_id uuid,
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS task_category text DEFAULT 'general';

ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS assigned_salesman_user_id uuid;

-- 2. Sales Meetings
CREATE TABLE public.sales_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  contact_id uuid REFERENCES public.crm_contacts(id),
  company_id uuid REFERENCES public.crm_companies(id),
  deal_id uuid REFERENCES public.crm_deals(id),
  prospect_id uuid REFERENCES public.prospects(id),
  assigned_salesman_user_id uuid,
  meeting_type text NOT NULL DEFAULT 'discovery_call',
  source_type text DEFAULT 'internal',
  source_calendar_id uuid,
  title text NOT NULL,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text DEFAULT 'America/New_York',
  location text,
  status text NOT NULL DEFAULT 'scheduled',
  meeting_outcome text DEFAULT 'pending',
  summary_notes text,
  action_items text,
  attended boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sales_meetings" ON public.sales_meetings FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 3. Proposals
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  contact_id uuid REFERENCES public.crm_contacts(id),
  company_id uuid REFERENCES public.crm_companies(id),
  deal_id uuid REFERENCES public.crm_deals(id),
  prospect_id uuid REFERENCES public.prospects(id),
  proposal_title text NOT NULL,
  proposal_type text NOT NULL DEFAULT 'service_proposal',
  template_id uuid,
  proposal_status text NOT NULL DEFAULT 'draft',
  version_number integer DEFAULT 1,
  setup_fee numeric DEFAULT 0,
  monthly_fee numeric DEFAULT 0,
  contract_term text DEFAULT '12 months',
  offer_summary text,
  internal_summary text,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  assigned_salesman_user_id uuid,
  assigned_operator_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_proposals" ON public.proposals FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 4. Proposal Sections
CREATE TABLE public.proposal_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  section_title text NOT NULL,
  section_order integer DEFAULT 0,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_proposal_sections" ON public.proposal_sections FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 5. Proposal Templates
CREATE TABLE public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  proposal_type text DEFAULT 'service_proposal',
  industry_scope text,
  service_package text,
  is_active boolean DEFAULT true,
  default_setup_fee numeric DEFAULT 0,
  default_monthly_fee numeric DEFAULT 0,
  default_contract_term text DEFAULT '12 months',
  template_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_proposal_templates" ON public.proposal_templates FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 6. Proposal Recipients
CREATE TABLE public.proposal_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role_label text,
  delivery_type text DEFAULT 'email',
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposal_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_proposal_recipients" ON public.proposal_recipients FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 7. Email Delivery Records
CREATE TABLE public.email_delivery_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  related_type text,
  related_id uuid,
  contact_id uuid,
  company_id uuid,
  deal_id uuid,
  proposal_id uuid,
  recipient_email text NOT NULL,
  sender_user_id uuid,
  email_subject text,
  email_body_preview text,
  delivery_status text NOT NULL DEFAULT 'draft',
  delivery_channel text DEFAULT 'internal',
  sent_at timestamptz,
  opened_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_delivery_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_email_delivery" ON public.email_delivery_records FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 8. Trigger Profiles
CREATE TABLE public.trigger_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text NOT NULL UNIQUE,
  profile_name text NOT NULL,
  scope_type text DEFAULT 'admin',
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trigger_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_trigger_profiles" ON public.trigger_profiles FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 9. Seed trigger profiles
INSERT INTO public.trigger_profiles (profile_key, profile_name, scope_type, config) VALUES
  ('admin_sales_call_intake', 'Sales Call Intake', 'admin', '{"actions":["create_contact","create_company","create_deal","assign_salesman","create_meeting"]}'),
  ('admin_inbound_booking', 'Inbound Booking', 'admin', '{"actions":["create_contact","create_deal","create_meeting","notify_salesman"]}'),
  ('meeting_completed_qualified', 'Meeting Completed — Qualified', 'admin', '{"actions":["update_deal_stage","create_proposal_draft","create_review_task"]}'),
  ('proposal_ready_internal', 'Proposal Ready for Send', 'admin', '{"actions":["update_proposal_status","create_send_task"]}'),
  ('proposal_sent_external', 'Proposal Sent', 'admin', '{"actions":["update_deal_stage","log_delivery","notify_salesman"]}'),
  ('deal_closed_won', 'Deal Closed Won', 'admin', '{"actions":["update_deal_status","create_setup_tasks","prepare_activation"]}'),
  ('deal_closed_lost', 'Deal Closed Lost', 'admin', '{"actions":["update_deal_status","log_reason","stop_automations"]}'),
  ('workspace_activation_pending', 'Workspace Activation Pending', 'admin', '{"actions":["create_activation_tasks","notify_operator"]}');

-- 10. Seed proposal templates
INSERT INTO public.proposal_templates (template_name, proposal_type, industry_scope, service_package, default_setup_fee, default_monthly_fee, default_contract_term, template_config) VALUES
  ('Lead Generation Proposal', 'service_proposal', NULL, 'lead_generation', 1500, 1997, '6 months', '{"sections":["overview","problem","solution","pricing","timeline","terms"]}'),
  ('Appointment Generation Proposal', 'service_proposal', NULL, 'appointment_generation', 2000, 2497, '6 months', '{"sections":["overview","problem","solution","pricing","timeline","terms"]}'),
  ('Local Visibility Proposal', 'service_proposal', NULL, 'local_visibility', 1000, 1497, '6 months', '{"sections":["overview","audit_summary","solution","pricing","timeline","terms"]}'),
  ('Website + CRM Proposal', 'hybrid_proposal', NULL, 'website_crm', 3500, 997, '12 months', '{"sections":["overview","website_scope","crm_scope","pricing","timeline","terms"]}'),
  ('Full Growth System Proposal', 'service_proposal', NULL, 'full_growth', 5000, 3997, '12 months', '{"sections":["overview","audit_summary","strategy","channels","pricing","timeline","terms","guarantee"]}');

-- 11. FK constraints on crm_deals
ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_proposal_id_current_fkey FOREIGN KEY (proposal_id_current) REFERENCES public.proposals(id);
ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_meeting_id_latest_fkey FOREIGN KEY (meeting_id_latest) REFERENCES public.sales_meetings(id);

-- 12. Updated_at triggers
CREATE TRIGGER update_sales_meetings_updated_at BEFORE UPDATE ON public.sales_meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposal_sections_updated_at BEFORE UPDATE ON public.proposal_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_delivery_records_updated_at BEFORE UPDATE ON public.email_delivery_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trigger_profiles_updated_at BEFORE UPDATE ON public.trigger_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposal_templates_updated_at BEFORE UPDATE ON public.proposal_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
