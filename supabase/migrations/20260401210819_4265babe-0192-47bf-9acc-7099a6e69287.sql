
-- 1. Add lightweight columns to clients for booking-time storage
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS provisional_profile text,
  ADD COLUMN IF NOT EXISTS zoom_enabled_default boolean DEFAULT true;

-- 2. Create workspace_profiles table
CREATE TABLE IF NOT EXISTS public.workspace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profile_type text NOT NULL DEFAULT 'custom_hybrid',
  provisional_profile text,
  zoom_enabled boolean DEFAULT true,
  calendar_pack_applied boolean DEFAULT false,
  form_pack_applied boolean DEFAULT false,
  cadence_pack_applied boolean DEFAULT false,
  workflow_pack_applied boolean DEFAULT false,
  config_overrides jsonb DEFAULT '{}'::jsonb,
  applied_at timestamptz,
  applied_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_profiles_client_id_key UNIQUE (client_id)
);

ALTER TABLE public.workspace_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/operators can manage workspace_profiles"
  ON public.workspace_profiles FOR ALL
  TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Users can view own workspace profile"
  ON public.workspace_profiles FOR SELECT
  TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_workspace_profiles_updated_at
  BEFORE UPDATE ON public.workspace_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create workspace_automation_config table
CREATE TABLE IF NOT EXISTS public.workspace_automation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  zoom_enabled boolean DEFAULT true,
  reminder_channels jsonb DEFAULT '{"email": true, "sms": false}'::jsonb,
  module_flags jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_automation_config_client_id_key UNIQUE (client_id)
);

ALTER TABLE public.workspace_automation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/operators can manage workspace_automation_config"
  ON public.workspace_automation_config FOR ALL
  TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Users can view own workspace automation config"
  ON public.workspace_automation_config FOR SELECT
  TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_workspace_automation_config_updated_at
  BEFORE UPDATE ON public.workspace_automation_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
