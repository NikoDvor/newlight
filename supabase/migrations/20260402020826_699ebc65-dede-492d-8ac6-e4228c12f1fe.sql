-- Add provisioning workflow fields to workspace_users
ALTER TABLE public.workspace_users
  ADD COLUMN IF NOT EXISTS provisioning_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS modules_requested text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS calendar_assignment text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS invite_now_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz;

-- Create index for provisioning queries
CREATE INDEX IF NOT EXISTS idx_workspace_users_provisioning ON public.workspace_users (client_id, provisioning_status);