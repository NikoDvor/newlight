ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS callback_at timestamptz,
  ADD COLUMN IF NOT EXISTS callback_set_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_nl_bdr_leads_user_callback
  ON public.nl_bdr_leads (user_id, callback_at)
  WHERE callback_at IS NOT NULL;