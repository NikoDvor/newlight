
-- Add workspace_access_url to clients for easy link sharing
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS workspace_access_url text;

-- Add booking_source_appointment_id to track which booking created the workspace
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS source_appointment_id uuid;
