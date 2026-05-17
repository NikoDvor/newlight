ALTER TABLE public.client_training_sop
  ADD COLUMN IF NOT EXISTS is_demo_shell boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bdr_training_enabled boolean NOT NULL DEFAULT false;