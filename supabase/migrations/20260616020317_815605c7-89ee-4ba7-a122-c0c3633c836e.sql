ALTER TABLE public.client_websites 
ADD COLUMN IF NOT EXISTS domain_checklist jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.client_websites.domain_checklist IS 
'Stores per-step domain connection status as {step_key: boolean}';