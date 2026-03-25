
-- website_sites: global site settings per workspace
CREATE TABLE public.website_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  site_name text DEFAULT '',
  tagline text DEFAULT '',
  favicon_url text DEFAULT '',
  primary_color text DEFAULT '#3B82F6',
  secondary_color text DEFAULT '#06B6D4',
  font_preset text DEFAULT 'modern',
  button_style text DEFAULT 'rounded',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  address text DEFAULT '',
  business_hours text DEFAULT '',
  social_facebook text DEFAULT '',
  social_instagram text DEFAULT '',
  social_linkedin text DEFAULT '',
  social_twitter text DEFAULT '',
  social_youtube text DEFAULT '',
  global_cta_text text DEFAULT 'Get Started',
  global_cta_url text DEFAULT '',
  nav_items jsonb DEFAULT '[]',
  footer_content jsonb DEFAULT '{}',
  custom_domain text DEFAULT '',
  publish_status text DEFAULT 'draft',
  last_published_at timestamptz,
  last_published_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id)
);

-- Enhance website_pages with CMS columns
ALTER TABLE public.website_pages
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS og_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS noindex boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publish_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS page_template text DEFAULT 'blank';

-- website_publish_snapshots for version history
CREATE TABLE public.website_publish_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  snapshot_data jsonb NOT NULL DEFAULT '{}',
  published_by uuid,
  published_at timestamptz DEFAULT now(),
  version_label text DEFAULT ''
);

-- RLS
ALTER TABLE public.website_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_publish_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own client website_sites" ON public.website_sites
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage own client publish snapshots" ON public.website_publish_snapshots
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Trigger for updated_at
CREATE TRIGGER website_sites_updated_at BEFORE UPDATE ON public.website_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for website media
INSERT INTO storage.buckets (id, name, public) VALUES ('website-media', 'website-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload website media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'website-media');

CREATE POLICY "Anyone can view website media" ON storage.objects
  FOR SELECT USING (bucket_id = 'website-media');

CREATE POLICY "Authenticated users can delete website media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'website-media');
