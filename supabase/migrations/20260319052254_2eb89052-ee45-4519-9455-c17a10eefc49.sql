
-- Forms table
CREATE TABLE IF NOT EXISTS public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_name text NOT NULL,
  form_type text NOT NULL DEFAULT 'contact',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  linked_calendar_id uuid REFERENCES public.calendars(id) ON DELETE SET NULL,
  linked_appointment_type_id uuid REFERENCES public.calendar_appointment_types(id) ON DELETE SET NULL,
  linked_pipeline_stage_id text,
  linked_notification_owner_id uuid,
  create_contact_on_submit boolean NOT NULL DEFAULT true,
  update_existing_contact boolean NOT NULL DEFAULT true,
  create_task_on_submit boolean NOT NULL DEFAULT false,
  booking_mode text DEFAULT 'none',
  page_title text,
  intro_text text,
  button_text text DEFAULT 'Submit',
  confirmation_message text DEFAULT 'Thank you! We will be in touch soon.',
  show_logo boolean NOT NULL DEFAULT true,
  show_timezone boolean NOT NULL DEFAULT false,
  collect_notes boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Form fields
CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_label text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL DEFAULT 'short_text',
  placeholder_text text,
  help_text text,
  is_required boolean NOT NULL DEFAULT false,
  field_order integer NOT NULL DEFAULT 0,
  options_json jsonb,
  conditional_logic_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Form submissions
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  contact_id uuid,
  company_id uuid,
  appointment_id uuid,
  submission_data jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Form templates (global, not client-scoped)
CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  form_type text NOT NULL DEFAULT 'contact',
  is_active boolean NOT NULL DEFAULT true,
  template_config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Calendar integrations
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  connection_status text NOT NULL DEFAULT 'not_connected',
  account_email text,
  connected_by uuid,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User calendar integrations
CREATE TABLE IF NOT EXISTS public.user_calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_user_id uuid NOT NULL REFERENCES public.workspace_users(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  external_calendar_id text,
  connection_status text NOT NULL DEFAULT 'not_connected',
  sync_direction text NOT NULL DEFAULT 'read_only',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Calendar sync settings
CREATE TABLE IF NOT EXISTS public.calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  workspace_user_id uuid REFERENCES public.workspace_users(id) ON DELETE SET NULL,
  use_external_availability boolean NOT NULL DEFAULT true,
  push_bookings_to_external boolean NOT NULL DEFAULT false,
  sync_cancellations boolean NOT NULL DEFAULT false,
  sync_reschedules boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for forms
CREATE POLICY "Users can manage forms for their workspace" ON public.forms
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage form fields for their workspace" ON public.form_fields
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage form submissions for their workspace" ON public.form_submissions
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Form templates are global read
CREATE POLICY "Anyone can read form templates" ON public.form_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage form templates" ON public.form_templates
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- Calendar integration policies
CREATE POLICY "Users can manage calendar integrations for their workspace" ON public.calendar_integrations
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage user calendar integrations for their workspace" ON public.user_calendar_integrations
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage calendar sync settings for their workspace" ON public.calendar_sync_settings
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Public access for form submissions (customers submitting forms)
CREATE POLICY "Public can submit forms" ON public.form_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

-- Public can read active forms for booking pages
CREATE POLICY "Public can read active forms" ON public.forms
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Public can read form fields for active forms" ON public.form_fields
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.forms WHERE forms.id = form_fields.form_id AND forms.is_active = true));

-- Updated_at triggers
CREATE TRIGGER set_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_form_fields_updated_at BEFORE UPDATE ON public.form_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_form_submissions_updated_at BEFORE UPDATE ON public.form_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_calendar_integrations_updated_at BEFORE UPDATE ON public.calendar_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_user_calendar_integrations_updated_at BEFORE UPDATE ON public.user_calendar_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_calendar_sync_settings_updated_at BEFORE UPDATE ON public.calendar_sync_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed form templates
INSERT INTO public.form_templates (template_name, form_type, template_config) VALUES
('General Contact Form', 'contact', '{"fields":[{"label":"Full Name","key":"full_name","type":"short_text","required":true},{"label":"Email","key":"email","type":"email","required":true},{"label":"Phone","key":"phone","type":"phone","required":false},{"label":"Message","key":"message","type":"long_text","required":true}]}'),
('Booking Form', 'booking', '{"fields":[{"label":"Full Name","key":"full_name","type":"short_text","required":true},{"label":"Email","key":"email","type":"email","required":true},{"label":"Phone","key":"phone","type":"phone","required":true},{"label":"Notes","key":"notes","type":"long_text","required":false}]}'),
('Customer Intake Form', 'intake', '{"fields":[{"label":"Full Name","key":"full_name","type":"short_text","required":true},{"label":"Email","key":"email","type":"email","required":true},{"label":"Phone","key":"phone","type":"phone","required":true},{"label":"Company Name","key":"company","type":"short_text","required":false},{"label":"How did you hear about us?","key":"referral_source","type":"dropdown","required":false,"options":["Google","Social Media","Referral","Other"]},{"label":"Tell us about your needs","key":"needs","type":"long_text","required":true}]}'),
('Estimate / Quote Form', 'estimate', '{"fields":[{"label":"Full Name","key":"full_name","type":"short_text","required":true},{"label":"Email","key":"email","type":"email","required":true},{"label":"Phone","key":"phone","type":"phone","required":true},{"label":"Service Needed","key":"service","type":"dropdown","required":true,"options":["Consultation","Full Service","Custom Package"]},{"label":"Budget Range","key":"budget","type":"dropdown","required":false,"options":["Under $1,000","$1,000 - $5,000","$5,000 - $10,000","$10,000+"]},{"label":"Project Details","key":"details","type":"long_text","required":true}]}'),
('Support Request Form', 'support', '{"fields":[{"label":"Full Name","key":"full_name","type":"short_text","required":true},{"label":"Email","key":"email","type":"email","required":true},{"label":"Subject","key":"subject","type":"short_text","required":true},{"label":"Priority","key":"priority","type":"dropdown","required":true,"options":["Low","Medium","High","Urgent"]},{"label":"Description","key":"description","type":"long_text","required":true}]}')
ON CONFLICT DO NOTHING;
