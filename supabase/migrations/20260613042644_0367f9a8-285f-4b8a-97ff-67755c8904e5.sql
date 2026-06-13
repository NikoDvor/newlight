ALTER TABLE public.seo_keywords
ADD COLUMN clicks integer,
ADD COLUMN last_synced_at timestamptz;