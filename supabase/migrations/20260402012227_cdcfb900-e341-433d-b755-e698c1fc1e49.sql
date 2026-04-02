
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS portal_invite_status text NOT NULL DEFAULT 'not_sent',
ADD COLUMN IF NOT EXISTS portal_last_invited_at timestamptz,
ADD COLUMN IF NOT EXISTS portal_last_login_at timestamptz,
ADD COLUMN IF NOT EXISTS portal_access_enabled boolean NOT NULL DEFAULT false;
