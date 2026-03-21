
-- Add missing carry-over columns to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS legal_business_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_contact_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_contact_email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_contact_phone text;

-- Add missing payment/billing columns to billing_accounts
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS setup_fee numeric;
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS monthly_fee numeric;
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS contract_term text;
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS wire_reference text;
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS payment_receipt_url text;
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS internal_payment_notes text;
ALTER TABLE public.billing_accounts ADD COLUMN IF NOT EXISTS service_package text;
