
-- CRM: Contacts
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  company_id uuid,
  contact_owner uuid,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_contacts" ON public.crm_contacts FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_contacts" ON public.crm_contacts FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_contacts" ON public.crm_contacts FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM: Companies
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  website text,
  industry text,
  address text,
  primary_contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_companies" ON public.crm_companies FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_companies" ON public.crm_companies FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_companies" ON public.crm_companies FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM: Leads
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id),
  company_id uuid REFERENCES public.crm_companies(id),
  source text,
  lead_status text NOT NULL DEFAULT 'new_lead',
  estimated_value numeric DEFAULT 0,
  assigned_user uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_leads" ON public.crm_leads FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_leads" ON public.crm_leads FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_leads" ON public.crm_leads FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM: Deals
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id),
  company_id uuid REFERENCES public.crm_companies(id),
  deal_name text NOT NULL,
  pipeline_stage text NOT NULL DEFAULT 'new_lead',
  deal_value numeric DEFAULT 0,
  close_probability integer DEFAULT 0,
  expected_close_date date,
  status text NOT NULL DEFAULT 'open',
  assigned_user uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_deals" ON public.crm_deals FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_deals" ON public.crm_deals FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_deals" ON public.crm_deals FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM: Tasks
CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  related_type text,
  related_id uuid,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  status text NOT NULL DEFAULT 'open',
  assigned_user uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_tasks" ON public.crm_tasks FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_tasks" ON public.crm_tasks FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_tasks" ON public.crm_tasks FOR ALL TO anon USING (true) WITH CHECK (true);

-- CRM: Activities
CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  related_type text,
  related_id uuid,
  activity_type text NOT NULL,
  activity_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm_activities" ON public.crm_activities FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own crm_activities" ON public.crm_activities FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo crm_activities" ON public.crm_activities FOR ALL TO anon USING (true) WITH CHECK (true);

-- Reviews: Review Requests
CREATE TABLE public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  channel text NOT NULL DEFAULT 'sms',
  platform text DEFAULT 'google',
  status text NOT NULL DEFAULT 'sent',
  rating integer,
  feedback_text text,
  public_review_left boolean DEFAULT false,
  recovery_needed boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  feedback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage review_requests" ON public.review_requests FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own review_requests" ON public.review_requests FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo review_requests" ON public.review_requests FOR ALL TO anon USING (true) WITH CHECK (true);

-- Reviews: Templates
CREATE TABLE public.review_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  template_body text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage review_templates" ON public.review_templates FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own review_templates" ON public.review_templates FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo review_templates" ON public.review_templates FOR ALL TO anon USING (true) WITH CHECK (true);

-- Reviews: Recovery Tasks
CREATE TABLE public.review_recovery_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  review_request_id uuid REFERENCES public.review_requests(id),
  status text NOT NULL DEFAULT 'open',
  assigned_user uuid,
  notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_recovery_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage review_recovery_tasks" ON public.review_recovery_tasks FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own review_recovery_tasks" ON public.review_recovery_tasks FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo review_recovery_tasks" ON public.review_recovery_tasks FOR ALL TO anon USING (true) WITH CHECK (true);

-- Website: Pages
CREATE TABLE public.website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  page_name text NOT NULL,
  page_url text,
  page_type text DEFAULT 'page',
  visits integer DEFAULT 0,
  conversions integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  leads_generated integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage website_pages" ON public.website_pages FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own website_pages" ON public.website_pages FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo website_pages" ON public.website_pages FOR ALL TO anon USING (true) WITH CHECK (true);

-- Website: Issues
CREATE TABLE public.website_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  issue_title text NOT NULL,
  description text,
  severity text DEFAULT 'medium',
  status text DEFAULT 'open',
  page_id uuid REFERENCES public.website_pages(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage website_issues" ON public.website_issues FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own website_issues" ON public.website_issues FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo website_issues" ON public.website_issues FOR ALL TO anon USING (true) WITH CHECK (true);

-- Website: Traffic Sources
CREATE TABLE public.website_traffic_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  visits integer DEFAULT 0,
  percentage numeric DEFAULT 0,
  period text DEFAULT 'monthly',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_traffic_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage website_traffic_sources" ON public.website_traffic_sources FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own website_traffic_sources" ON public.website_traffic_sources FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo website_traffic_sources" ON public.website_traffic_sources FOR ALL TO anon USING (true) WITH CHECK (true);

-- SEO: Tracked Keywords
CREATE TABLE public.seo_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  position integer,
  previous_position integer,
  search_volume integer DEFAULT 0,
  difficulty integer DEFAULT 0,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo_keywords" ON public.seo_keywords FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own seo_keywords" ON public.seo_keywords FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo seo_keywords" ON public.seo_keywords FOR ALL TO anon USING (true) WITH CHECK (true);

-- SEO: Competitors
CREATE TABLE public.seo_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  domain text NOT NULL,
  authority_score integer DEFAULT 0,
  keywords_count integer DEFAULT 0,
  estimated_traffic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo_competitors" ON public.seo_competitors FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own seo_competitors" ON public.seo_competitors FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo seo_competitors" ON public.seo_competitors FOR ALL TO anon USING (true) WITH CHECK (true);

-- SEO: Issues
CREATE TABLE public.seo_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  issue_title text NOT NULL,
  category text DEFAULT 'technical',
  severity text DEFAULT 'medium',
  status text DEFAULT 'open',
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo_issues" ON public.seo_issues FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own seo_issues" ON public.seo_issues FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo seo_issues" ON public.seo_issues FOR ALL TO anon USING (true) WITH CHECK (true);

-- Social: Accounts
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  handle text,
  status text DEFAULT 'disconnected',
  followers integer DEFAULT 0,
  profile_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social_accounts" ON public.social_accounts FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own social_accounts" ON public.social_accounts FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo social_accounts" ON public.social_accounts FOR ALL TO anon USING (true) WITH CHECK (true);

-- Social: Posts
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platforms text[] DEFAULT '{}',
  caption text,
  media_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  status text DEFAULT 'draft',
  approval_status text DEFAULT 'pending',
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  reach integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social_posts" ON public.social_posts FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own social_posts" ON public.social_posts FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo social_posts" ON public.social_posts FOR ALL TO anon USING (true) WITH CHECK (true);
