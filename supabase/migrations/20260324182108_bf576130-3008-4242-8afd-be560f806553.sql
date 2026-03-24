ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS email_delivery_status text DEFAULT 'not_attempted',
  ADD COLUMN IF NOT EXISTS sms_delivery_status text DEFAULT 'not_attempted',
  ADD COLUMN IF NOT EXISTS last_handoff_sent_at timestamptz;