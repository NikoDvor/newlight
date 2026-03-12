
-- 1. Fix RLS on clients: drop existing policies and recreate with proper INSERT support
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Client users can view their own client" ON public.clients;

-- Admin full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins full access on clients" ON public.clients FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

-- Client users read-only
CREATE POLICY "Client users read own client" ON public.clients FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), id));

-- 2. Fix RLS on provision_queue, fix_now_items, client_integrations for INSERT
DROP POLICY IF EXISTS "Admins can manage provision queue" ON public.provision_queue;
CREATE POLICY "Admins manage provision queue" ON public.provision_queue FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage fix now items" ON public.fix_now_items;
CREATE POLICY "Admins manage fix now items" ON public.fix_now_items FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage integrations" ON public.client_integrations;
CREATE POLICY "Admins manage integrations" ON public.client_integrations FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

-- 3. Client branding table
CREATE TABLE public.client_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#06B6D4',
  company_name TEXT,
  welcome_message TEXT DEFAULT 'Welcome to your business dashboard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage branding" ON public.client_branding FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own branding" ON public.client_branding FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));
CREATE TRIGGER update_client_branding_updated_at BEFORE UPDATE ON public.client_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Onboarding progress table
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  business_info BOOLEAN NOT NULL DEFAULT false,
  website_connected BOOLEAN NOT NULL DEFAULT false,
  google_business_connected BOOLEAN NOT NULL DEFAULT false,
  review_platform_connected BOOLEAN NOT NULL DEFAULT false,
  ad_account_connected BOOLEAN NOT NULL DEFAULT false,
  crm_setup BOOLEAN NOT NULL DEFAULT false,
  team_setup BOOLEAN NOT NULL DEFAULT false,
  launch_ready BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage onboarding" ON public.onboarding_progress FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own onboarding" ON public.onboarding_progress FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON public.onboarding_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Client health scores table
CREATE TABLE public.client_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  overall_score INTEGER NOT NULL DEFAULT 0,
  website_score INTEGER NOT NULL DEFAULT 0,
  seo_score INTEGER NOT NULL DEFAULT 0,
  leads_score INTEGER NOT NULL DEFAULT 0,
  reviews_score INTEGER NOT NULL DEFAULT 0,
  social_score INTEGER NOT NULL DEFAULT 0,
  automation_score INTEGER NOT NULL DEFAULT 0,
  ads_score INTEGER NOT NULL DEFAULT 0,
  conversion_score INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage health scores" ON public.client_health_scores FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own health" ON public.client_health_scores FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));
CREATE TRIGGER update_health_scores_updated_at BEFORE UPDATE ON public.client_health_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. AI business insights table
CREATE TABLE public.ai_business_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  explanation TEXT,
  estimated_revenue NUMERIC(12,2),
  recommended_action TEXT,
  category TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_business_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage insights" ON public.ai_business_insights FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own insights" ON public.ai_business_insights FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));
CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON public.ai_business_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Meeting intelligence table
CREATE TABLE public.meeting_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  transcript TEXT,
  summary TEXT,
  action_items JSONB DEFAULT '[]',
  sentiment TEXT DEFAULT 'neutral',
  objections JSONB DEFAULT '[]',
  interests JSONB DEFAULT '[]',
  next_steps JSONB DEFAULT '[]',
  follow_up_date TIMESTAMPTZ,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage meetings" ON public.meeting_intelligence FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own meetings" ON public.meeting_intelligence FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));
CREATE TRIGGER update_meeting_intelligence_updated_at BEFORE UPDATE ON public.meeting_intelligence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Growth projections table
CREATE TABLE public.growth_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  projected_30d NUMERIC(12,2),
  projected_60d NUMERIC(12,2),
  projected_90d NUMERIC(12,2),
  trend TEXT DEFAULT 'stable',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.growth_projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage projections" ON public.growth_projections FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users view own projections" ON public.growth_projections FOR SELECT TO authenticated
  USING (user_has_client_access(auth.uid(), client_id));
CREATE TRIGGER update_growth_projections_updated_at BEFORE UPDATE ON public.growth_projections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
