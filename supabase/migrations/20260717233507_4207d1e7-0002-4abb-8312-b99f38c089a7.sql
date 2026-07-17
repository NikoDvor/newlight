DROP POLICY IF EXISTS "Authenticated users can read seo_backlinks" ON public.seo_backlinks;
DROP POLICY IF EXISTS "Authenticated users can read seo_citation_listings" ON public.seo_citation_listings;
DROP POLICY IF EXISTS "Authenticated users can read seo_gbp_competitor_profiles" ON public.seo_gbp_competitor_profiles;
DROP POLICY IF EXISTS "Authenticated users can read seo_gbp_photos" ON public.seo_gbp_photos;
DROP POLICY IF EXISTS "Authenticated users can read seo_gbp_profile" ON public.seo_gbp_profile;
DROP POLICY IF EXISTS "Authenticated users can select all rows" ON public.seo_performance_scores;
DROP POLICY IF EXISTS "Allow authenticated users to select all seo_run_log rows" ON public.seo_run_log;