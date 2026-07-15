
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS referred_by_promoter_id uuid
    REFERENCES public.promoters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_referred_by
  ON public.crm_contacts(referred_by_promoter_id);

CREATE OR REPLACE FUNCTION public.autocreate_referral_attribution_on_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by_promoter_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR OLD.referred_by_promoter_id IS DISTINCT FROM NEW.referred_by_promoter_id) THEN
    INSERT INTO public.referral_attributions (promoter_id, referred_contact_id)
    SELECT NEW.referred_by_promoter_id, NEW.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.referral_attributions
      WHERE promoter_id = NEW.referred_by_promoter_id
        AND referred_contact_id = NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS autocreate_referral_attribution_trg ON public.crm_contacts;
CREATE TRIGGER autocreate_referral_attribution_trg
  AFTER INSERT OR UPDATE OF referred_by_promoter_id ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.autocreate_referral_attribution_on_contact();
