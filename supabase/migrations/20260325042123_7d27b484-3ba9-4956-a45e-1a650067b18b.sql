-- Allow anonymous/public read access for public site rendering
CREATE POLICY "Public read website_sites"
ON public.website_sites
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read website_content_blocks"
ON public.website_content_blocks
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read website_publish_snapshots"
ON public.website_publish_snapshots
FOR SELECT
TO anon, authenticated
USING (true);