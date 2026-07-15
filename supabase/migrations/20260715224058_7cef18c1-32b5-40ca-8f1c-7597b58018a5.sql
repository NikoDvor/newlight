
-- 1. Extend promoters
DO $$ BEGIN
  CREATE TYPE public.referral_category AS ENUM ('coi_cpa','coi_attorney','coi_other','existing_client','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.promoters
  ADD COLUMN IF NOT EXISTS is_referral_source boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_category public.referral_category;

-- 2. referral_attributions table
CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  crm_deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  referred_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  attributed_value numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_attr_promoter ON public.referral_attributions(promoter_id);
CREATE INDEX IF NOT EXISTS idx_referral_attr_contact ON public.referral_attributions(referred_contact_id);
CREATE INDEX IF NOT EXISTS idx_referral_attr_deal ON public.referral_attributions(crm_deal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_attributions TO authenticated;
GRANT ALL ON public.referral_attributions TO service_role;

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_attributions client access"
  ON public.referral_attributions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = referral_attributions.promoter_id
        AND public.user_can_access_client(auth.uid(), p.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.promoters p
      WHERE p.id = referral_attributions.promoter_id
        AND public.user_can_access_client(auth.uid(), p.client_id)
    )
  );

CREATE TRIGGER update_referral_attributions_updated_at
  BEFORE UPDATE ON public.referral_attributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Trigger on crm_deals: on transition to closed_won, populate any matching
-- referral_attributions row for the referred contact with the deal's value.
CREATE OR REPLACE FUNCTION public.apply_referral_attribution_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pipeline_stage = 'closed_won'
     AND (TG_OP = 'INSERT' OR OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
     AND NEW.contact_id IS NOT NULL THEN
    UPDATE public.referral_attributions
       SET crm_deal_id = NEW.id,
           attributed_value = COALESCE(NEW.deal_value, 0),
           updated_at = now()
     WHERE referred_contact_id = NEW.contact_id
       AND (crm_deal_id IS NULL OR crm_deal_id = NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS apply_referral_attribution_trg ON public.crm_deals;
CREATE TRIGGER apply_referral_attribution_trg
  AFTER INSERT OR UPDATE OF pipeline_stage ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.apply_referral_attribution_on_close();
