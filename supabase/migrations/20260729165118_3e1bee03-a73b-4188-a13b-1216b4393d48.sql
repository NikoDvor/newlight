ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS onboarding_meeting_id uuid,
  ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_confirmation_sent boolean NOT NULL DEFAULT false;