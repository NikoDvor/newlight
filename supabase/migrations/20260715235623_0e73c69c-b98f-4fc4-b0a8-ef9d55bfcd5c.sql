
-- 1. Per-client webhook configs
CREATE TABLE public.meeting_notetaker_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vendor_name text NOT NULL DEFAULT 'other',
  webhook_secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);
CREATE INDEX idx_meeting_notetaker_configs_client ON public.meeting_notetaker_configs(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_notetaker_configs TO authenticated;
GRANT ALL ON public.meeting_notetaker_configs TO service_role;

ALTER TABLE public.meeting_notetaker_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operators manage notetaker configs"
  ON public.meeting_notetaker_configs FOR ALL
  TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE TRIGGER trg_meeting_notetaker_configs_updated_at
  BEFORE UPDATE ON public.meeting_notetaker_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Idempotency + vendor tracking on meeting_intelligence
ALTER TABLE public.meeting_intelligence
  ADD COLUMN IF NOT EXISTS external_meeting_id text,
  ADD COLUMN IF NOT EXISTS notetaker_vendor text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_meeting_intelligence_client_ext
  ON public.meeting_intelligence(client_id, external_meeting_id)
  WHERE external_meeting_id IS NOT NULL;
