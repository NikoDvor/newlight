
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS sms_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'invite_not_attempted';
