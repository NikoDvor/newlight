-- Add request/reminder tracking fields to client_setup_items
ALTER TABLE public.client_setup_items
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_request_note text,
  ADD COLUMN IF NOT EXISTS client_response_note text,
  ADD COLUMN IF NOT EXISTS target_due_date date,
  ADD COLUMN IF NOT EXISTS returned_for_revision_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;