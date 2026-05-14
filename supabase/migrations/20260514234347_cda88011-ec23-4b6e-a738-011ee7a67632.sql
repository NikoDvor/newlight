ALTER TABLE public.nl_bdr_leads ADD COLUMN IF NOT EXISTS list_name TEXT;
CREATE INDEX IF NOT EXISTS idx_nl_bdr_leads_user_list ON public.nl_bdr_leads(user_id, list_name);