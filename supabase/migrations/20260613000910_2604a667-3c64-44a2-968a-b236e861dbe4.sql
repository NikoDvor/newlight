ALTER TABLE public.seo_content_opportunities
  ADD COLUMN IF NOT EXISTS brief text,
  ADD COLUMN IF NOT EXISTS brief_generated_at timestamptz;