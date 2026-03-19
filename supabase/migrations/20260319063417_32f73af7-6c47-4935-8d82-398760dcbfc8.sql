
-- Website Recommendations
CREATE TABLE IF NOT EXISTS public.website_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.website_pages(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL DEFAULT 'optimization',
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_recommendations_access" ON public.website_recommendations FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- SEO Content Opportunities
CREATE TABLE IF NOT EXISTS public.seo_content_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  topic_title text NOT NULL,
  target_keyword text,
  opportunity_type text NOT NULL DEFAULT 'blog_post',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_content_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_content_opportunities_access" ON public.seo_content_opportunities FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- SEO Local Visibility
CREATE TABLE IF NOT EXISTS public.seo_local_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  visibility_status text NOT NULL DEFAULT 'unknown',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_local_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_local_visibility_access" ON public.seo_local_visibility FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- Ad Performance Records
CREATE TABLE IF NOT EXISTS public.ad_performance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  spend_amount numeric DEFAULT 0,
  clicks integer DEFAULT 0,
  leads integer DEFAULT 0,
  cpl numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  conversions integer DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_performance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_performance_records_access" ON public.ad_performance_records FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- Ad Recommendations
CREATE TABLE IF NOT EXISTS public.ad_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL DEFAULT 'optimization',
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_recommendations_access" ON public.ad_recommendations FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));

-- Social Metrics
CREATE TABLE IF NOT EXISTS public.social_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  content_item_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  platform_name text NOT NULL,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  posts_count integer DEFAULT 0,
  reach integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_metrics_access" ON public.social_metrics FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_operator(auth.uid()) OR public.user_has_client_access(auth.uid(), client_id));
