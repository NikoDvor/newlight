-- Scope website_content_blocks: anon can only read blocks for clients with a published site
DROP POLICY IF EXISTS "Public read website_content_blocks" ON public.website_content_blocks;

CREATE POLICY "Anon read published website_content_blocks"
ON public.website_content_blocks
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.website_sites ws
    WHERE ws.client_id = website_content_blocks.client_id
      AND ws.publish_status = 'published'
  )
);

-- Scope website_publish_snapshots: anon can only read snapshots for clients with a published site
DROP POLICY IF EXISTS "Public read website_publish_snapshots" ON public.website_publish_snapshots;

CREATE POLICY "Anon read published website_publish_snapshots"
ON public.website_publish_snapshots
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.website_sites ws
    WHERE ws.client_id = website_publish_snapshots.client_id
      AND ws.publish_status = 'published'
  )
);