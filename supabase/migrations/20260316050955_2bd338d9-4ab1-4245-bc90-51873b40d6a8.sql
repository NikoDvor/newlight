
-- Add crm_mode to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS crm_mode text NOT NULL DEFAULT 'native';

-- Add missing columns to crm_contacts
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS external_crm_contact_id text;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS secondary_phone text;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS contact_status text NOT NULL DEFAULT 'lead';
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS customer_value numeric DEFAULT 0;

-- Add missing columns to crm_companies
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS external_crm_company_id text;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS owner_contact_id uuid REFERENCES public.crm_contacts(id);

-- Add missing columns to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS external_crm_lead_id text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS pipeline_stage_id uuid;

-- Add missing columns to crm_deals
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS external_crm_deal_id text;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS close_date date;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS pipeline_stage_id uuid;

-- Add missing columns to crm_tasks
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Add missing columns to crm_activities
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id);
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.crm_companies(id);

-- Pipeline stages table
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pipeline_type text NOT NULL DEFAULT 'lead',
  stage_name text NOT NULL,
  stage_order integer NOT NULL DEFAULT 0,
  color text DEFAULT '#3B82F6',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pipeline_stages" ON public.pipeline_stages FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own pipeline_stages" ON public.pipeline_stages FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo pipeline_stages" ON public.pipeline_stages FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM Notes table
CREATE TABLE public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id),
  company_id uuid REFERENCES public.crm_companies(id),
  deal_id uuid REFERENCES public.crm_deals(id),
  content text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_notes" ON public.crm_notes FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_notes" ON public.crm_notes FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_notes" ON public.crm_notes FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM connections (external CRM)
CREATE TABLE public.crm_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  crm_provider_name text NOT NULL,
  connection_status text NOT NULL DEFAULT 'disconnected',
  external_workspace_id text,
  connected_by uuid,
  connected_at timestamp with time zone,
  last_synced_at timestamp with time zone,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_connections" ON public.crm_connections FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_connections" ON public.crm_connections FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_connections" ON public.crm_connections FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM sync logs
CREATE TABLE public.crm_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  crm_connection_id uuid REFERENCES public.crm_connections(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'full',
  sync_status text NOT NULL DEFAULT 'running',
  records_processed integer DEFAULT 0,
  error_message text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);
ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_sync_logs" ON public.crm_sync_logs FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own crm_sync_logs" ON public.crm_sync_logs FOR SELECT TO authenticated USING (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_sync_logs" ON public.crm_sync_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM field mappings
CREATE TABLE public.crm_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  crm_connection_id uuid REFERENCES public.crm_connections(id) ON DELETE CASCADE,
  external_field_name text NOT NULL,
  internal_field_name text NOT NULL,
  mapping_type text NOT NULL DEFAULT 'auto',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_field_mappings" ON public.crm_field_mappings FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_field_mappings" ON public.crm_field_mappings FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_field_mappings" ON public.crm_field_mappings FOR ALL TO anon USING (true) WITH CHECK (true);

-- Email threads table
CREATE TABLE public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.email_connections(id),
  contact_id uuid REFERENCES public.crm_contacts(id),
  subject text,
  last_message_at timestamp with time zone,
  message_count integer DEFAULT 1,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email_threads" ON public.email_threads FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own email_threads" ON public.email_threads FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo email_threads" ON public.email_threads FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add FK from pipeline_stage_id columns
ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_pipeline_stage_id_fkey FOREIGN KEY (pipeline_stage_id) REFERENCES public.pipeline_stages(id);
ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_pipeline_stage_id_fkey FOREIGN KEY (pipeline_stage_id) REFERENCES public.pipeline_stages(id);
