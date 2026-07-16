ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS phone_type text,
  ADD COLUMN IF NOT EXISTS booking_link text,
  ADD COLUMN IF NOT EXISTS booking_link_is_owner boolean;

ALTER TABLE public.nl_bdr_leads
  DROP CONSTRAINT IF EXISTS nl_bdr_leads_phone_type_check;
ALTER TABLE public.nl_bdr_leads
  ADD CONSTRAINT nl_bdr_leads_phone_type_check
  CHECK (phone_type IS NULL OR phone_type IN ('owner','front_desk'));