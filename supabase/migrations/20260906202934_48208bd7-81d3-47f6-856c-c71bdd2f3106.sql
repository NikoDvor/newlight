ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS next_charge_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_for timestamptz;

CREATE INDEX IF NOT EXISTS idx_crm_deals_next_charge_at
  ON public.crm_deals (next_charge_at)
  WHERE next_charge_at IS NOT NULL;