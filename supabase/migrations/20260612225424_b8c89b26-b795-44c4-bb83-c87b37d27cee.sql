CREATE TABLE IF NOT EXISTS public.seo_gbp_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  business_name_canonical text,
  address_canonical text,
  phone_canonical text,
  is_service_area_only boolean NOT NULL DEFAULT false,
  business_hours jsonb DEFAULT '{}',
  review_response_tone text DEFAULT 'professional',
  avoid_topics text,
  gbp_access_granted boolean NOT NULL DEFAULT false,
  gbp_access_granted_at timestamptz,
  gbp_invite_email text NOT NULL DEFAULT 'team@newlightgen.com',
  gsc_access_granted boolean NOT NULL DEFAULT false,
  gsc_access_granted_at timestamptz,
  gsc_invite_email text NOT NULL DEFAULT 'team@newlightgen.com',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

GRANT SELECT ON public.seo_gbp_profile TO authenticated;
GRANT ALL ON public.seo_gbp_profile TO service_role;
ALTER TABLE public.seo_gbp_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read seo_gbp_profile" ON public.seo_gbp_profile FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.seo_citation_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  directory_name text NOT NULL,
  listing_exists boolean,
  client_has_login boolean,
  listing_url text,
  login_email text,
  status text NOT NULL DEFAULT 'unknown',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_citation_listings TO authenticated;
GRANT ALL ON public.seo_citation_listings TO service_role;
ALTER TABLE public.seo_citation_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read seo_citation_listings" ON public.seo_citation_listings FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.seo_gbp_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_category text NOT NULL DEFAULT 'general',
  caption text,
  upload_status text NOT NULL DEFAULT 'pending',
  uploaded_to_gbp boolean NOT NULL DEFAULT false,
  uploaded_to_gbp_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_gbp_photos TO authenticated;
GRANT ALL ON public.seo_gbp_photos TO service_role;
ALTER TABLE public.seo_gbp_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read seo_gbp_photos" ON public.seo_gbp_photos FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.seo_backlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  source_name text,
  link_type text NOT NULL DEFAULT 'partner',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_backlinks TO authenticated;
GRANT ALL ON public.seo_backlinks TO service_role;
ALTER TABLE public.seo_backlinks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read seo_backlinks" ON public.seo_backlinks FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.seo_gbp_competitor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  gbp_url text,
  review_rating numeric(3,2),
  review_count integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_gbp_competitor_profiles TO authenticated;
GRANT ALL ON public.seo_gbp_competitor_profiles TO service_role;
ALTER TABLE public.seo_gbp_competitor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read seo_gbp_competitor_profiles" ON public.seo_gbp_competitor_profiles FOR SELECT TO authenticated USING (true);

ALTER TABLE public.seo_competitors ADD COLUMN IF NOT EXISTS gbp_profile_url text;
ALTER TABLE public.seo_competitors ADD COLUMN IF NOT EXISTS strengths text[];
ALTER TABLE public.seo_competitors ADD COLUMN IF NOT EXISTS weaknesses text[];