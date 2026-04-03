-- Remove overly permissive public read policy
DROP POLICY IF EXISTS "Public read website_sites" ON public.website_sites;

-- Replace with scoped policy: anon can only read published sites
CREATE POLICY "Anon read published website_sites"
ON public.website_sites
FOR SELECT
TO anon
USING (publish_status = 'published');

-- Authenticated users already covered by "Users can manage own client website_sites"