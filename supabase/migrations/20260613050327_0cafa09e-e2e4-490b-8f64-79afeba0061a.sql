CREATE TABLE IF NOT EXISTS public.seo_gbp_profile (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 business_name_canonical text, address_canonical text, phone_canonical text,
 is_service_area_only boolean NOT NULL DEFAULT false,
 business_hours jsonb DEFAULT '{}', review_response_tone text DEFAULT 'professional', avoid_topics text,
 gbp_access_granted boolean NOT NULL DEFAULT false, gbp_access_granted_at timestamptz,
 gbp_invite_email text NOT NULL DEFAULT 'team@newlightgen.com',
 gsc_access_granted boolean NOT NULL DEFAULT false, gsc_access_granted_at timestamptz,
 gsc_invite_email text NOT NULL DEFAULT 'team@newlightgen.com',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_gbp_profile TO authenticated;
GRANT ALL ON public.seo_gbp_profile TO service_role;
ALTER TABLE public.seo_gbp_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_seo_gbp_profile" ON public.seo_gbp_profile;
CREATE POLICY "admins_seo_gbp_profile" ON public.seo_gbp_profile FOR ALL TO authenticated USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));
DROP POLICY IF EXISTS "clients_seo_gbp_profile" ON public.seo_gbp_profile;
CREATE POLICY "clients_seo_gbp_profile" ON public.seo_gbp_profile FOR ALL TO authenticated USING (private.user_has_client_access(auth.uid(), client_id)) WITH CHECK (private.user_has_client_access(auth.uid(), client_id));
DROP TRIGGER IF EXISTS seo_gbp_profile_updated_at ON public.seo_gbp_profile;
CREATE TRIGGER seo_gbp_profile_updated_at BEFORE UPDATE ON public.seo_gbp_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.seo_citation_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 directory_name text NOT NULL, listing_exists boolean, client_has_login boolean,
 listing_url text, login_email text, status text NOT NULL DEFAULT 'unknown', notes text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_citation_listings TO authenticated;
GRANT ALL ON public.seo_citation_listings TO service_role;
ALTER TABLE public.seo_citation_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_seo_citations" ON public.seo_citation_listings;
CREATE POLICY "admins_seo_citations" ON public.seo_citation_listings FOR ALL TO authenticated USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));
DROP POLICY IF EXISTS "clients_seo_citations" ON public.seo_citation_listings;
CREATE POLICY "clients_seo_citations" ON public.seo_citation_listings FOR ALL TO authenticated USING (private.user_has_client_access(auth.uid(), client_id)) WITH CHECK (private.user_has_client_access(auth.uid(), client_id));
DROP TRIGGER IF EXISTS seo_citation_listings_updated_at ON public.seo_citation_listings;
CREATE TRIGGER seo_citation_listings_updated_at BEFORE UPDATE ON public.seo_citation_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.seo_gbp_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 photo_url text NOT NULL, photo_category text NOT NULL DEFAULT 'general', caption text,
 upload_status text NOT NULL DEFAULT 'pending',
 uploaded_to_gbp boolean NOT NULL DEFAULT false, uploaded_to_gbp_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_gbp_photos TO authenticated;
GRANT ALL ON public.seo_gbp_photos TO service_role;
ALTER TABLE public.seo_gbp_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_seo_gbp_photos" ON public.seo_gbp_photos;
CREATE POLICY "admins_seo_gbp_photos" ON public.seo_gbp_photos FOR ALL TO authenticated USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));
DROP POLICY IF EXISTS "clients_seo_gbp_photos" ON public.seo_gbp_photos;
CREATE POLICY "clients_seo_gbp_photos" ON public.seo_gbp_photos FOR ALL TO authenticated USING (private.user_has_client_access(auth.uid(), client_id)) WITH CHECK (private.user_has_client_access(auth.uid(), client_id));
DROP TRIGGER IF EXISTS seo_gbp_photos_updated_at ON public.seo_gbp_photos;
CREATE TRIGGER seo_gbp_photos_updated_at BEFORE UPDATE ON public.seo_gbp_photos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.seo_backlinks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 source_url text NOT NULL, source_name text,
 link_type text NOT NULL DEFAULT 'partner', status text NOT NULL DEFAULT 'active', notes text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_backlinks TO authenticated;
GRANT ALL ON public.seo_backlinks TO service_role;
ALTER TABLE public.seo_backlinks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_seo_backlinks" ON public.seo_backlinks;
CREATE POLICY "admins_seo_backlinks" ON public.seo_backlinks FOR ALL TO authenticated USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));
DROP POLICY IF EXISTS "clients_seo_backlinks" ON public.seo_backlinks;
CREATE POLICY "clients_seo_backlinks" ON public.seo_backlinks FOR ALL TO authenticated USING (private.user_has_client_access(auth.uid(), client_id)) WITH CHECK (private.user_has_client_access(auth.uid(), client_id));
DROP TRIGGER IF EXISTS seo_backlinks_updated_at ON public.seo_backlinks;
CREATE TRIGGER seo_backlinks_updated_at BEFORE UPDATE ON public.seo_backlinks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.seo_gbp_competitor_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 business_name text NOT NULL, gbp_url text,
 review_rating numeric(3,2), review_count integer DEFAULT 0, notes text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_gbp_competitor_profiles TO authenticated;
GRANT ALL ON public.seo_gbp_competitor_profiles TO service_role;
ALTER TABLE public.seo_gbp_competitor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_seo_gbp_competitors" ON public.seo_gbp_competitor_profiles;
CREATE POLICY "admins_seo_gbp_competitors" ON public.seo_gbp_competitor_profiles FOR ALL TO authenticated USING (private.is_admin_or_operator(auth.uid())) WITH CHECK (private.is_admin_or_operator(auth.uid()));
DROP POLICY IF EXISTS "clients_seo_gbp_competitors" ON public.seo_gbp_competitor_profiles;
CREATE POLICY "clients_seo_gbp_competitors" ON public.seo_gbp_competitor_profiles FOR ALL TO authenticated USING (private.user_has_client_access(auth.uid(), client_id)) WITH CHECK (private.user_has_client_access(auth.uid(), client_id));
DROP TRIGGER IF EXISTS seo_gbp_competitor_profiles_updated_at ON public.seo_gbp_competitor_profiles;
CREATE TRIGGER seo_gbp_competitor_profiles_updated_at BEFORE UPDATE ON public.seo_gbp_competitor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.seo_competitors ADD COLUMN IF NOT EXISTS gbp_profile_url text;
ALTER TABLE public.seo_competitors ADD COLUMN IF NOT EXISTS strengths text[];
ALTER TABLE public.seo_competitors ADD COLUMN IF NOT EXISTS weaknesses text[];