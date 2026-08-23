ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS lost_reason text;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS lost_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_deals_lost_reason_check') THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT crm_deals_lost_reason_check
      CHECK (lost_reason IS NULL OR lost_reason IN ('price','timing','no_show','chose_competitor','unresponsive','other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_deals_client_stage ON public.crm_deals (client_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_lost_at ON public.crm_deals (lost_at) WHERE lost_at IS NOT NULL;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS revenue_target numeric;