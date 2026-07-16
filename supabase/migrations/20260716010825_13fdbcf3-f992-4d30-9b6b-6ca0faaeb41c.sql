
DO $$ BEGIN
  CREATE TYPE public.risk_tolerance_level AS ENUM (
    'conservative','moderate_conservative','moderate','moderate_aggressive','aggressive'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.client_risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  risk_tolerance public.risk_tolerance_level,
  time_horizon_years integer,
  net_worth_range text,
  annual_income_range text,
  primary_goals text[] NOT NULL DEFAULT '{}',
  existing_accounts_notes text,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_risk_profiles_contact ON public.client_risk_profiles(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_risk_profiles_client ON public.client_risk_profiles(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_risk_profiles TO authenticated;
GRANT ALL ON public.client_risk_profiles TO service_role;

ALTER TABLE public.client_risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/operators manage risk profiles" ON public.client_risk_profiles
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()) OR private.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (private.is_admin_or_operator(auth.uid()) OR private.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_client_risk_profiles_updated_at
  BEFORE UPDATE ON public.client_risk_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add contact scoping to meeting_intelligence for manual notes entry
ALTER TABLE public.meeting_intelligence
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_intelligence_contact ON public.meeting_intelligence(contact_id);
