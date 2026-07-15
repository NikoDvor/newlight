
-- Enums
DO $$ BEGIN
  CREATE TYPE public.household_review_cadence AS ENUM ('quarterly','semi_annual','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.household_relationship_role AS ENUM ('head_of_household','spouse','dependent','beneficiary','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Households
CREATE TABLE IF NOT EXISTS public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  household_name text NOT NULL,
  primary_advisor_user_id uuid,
  review_cadence public.household_review_cadence NOT NULL DEFAULT 'annual',
  last_review_completed_at timestamptz,
  next_review_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_households_client ON public.households(client_id);
CREATE INDEX IF NOT EXISTS idx_households_next_review ON public.households(next_review_due_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "households client access"
  ON public.households FOR ALL TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Household members
CREATE TABLE IF NOT EXISTS public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  relationship_role public.household_relationship_role NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, contact_id)
);

-- A contact can only be head_of_household in at most one household.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_household_member_head
  ON public.household_members(contact_id)
  WHERE relationship_role = 'head_of_household';

CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_contact ON public.household_members(contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_members via household access"
  ON public.household_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_members.household_id
        AND public.user_can_access_client(auth.uid(), h.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_members.household_id
        AND public.user_can_access_client(auth.uid(), h.client_id)
    )
  );

-- Denormalized household_id on crm_contacts
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS household_id uuid
    REFERENCES public.households(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_household ON public.crm_contacts(household_id);

-- next_review_due_at auto-compute
CREATE OR REPLACE FUNCTION public.compute_household_next_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  months int;
  base timestamptz;
BEGIN
  months := CASE NEW.review_cadence
    WHEN 'quarterly' THEN 3
    WHEN 'semi_annual' THEN 6
    WHEN 'annual' THEN 12
  END;
  base := COALESCE(NEW.last_review_completed_at, NEW.created_at, now());
  NEW.next_review_due_at := base + (months || ' months')::interval;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS compute_household_next_review_trg ON public.households;
CREATE TRIGGER compute_household_next_review_trg
  BEFORE INSERT OR UPDATE OF review_cadence, last_review_completed_at ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.compute_household_next_review();

-- Sync household_id on crm_contacts from household_members
CREATE OR REPLACE FUNCTION public.sync_contact_household_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.crm_contacts SET household_id = NEW.household_id WHERE id = NEW.contact_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id
       OR NEW.household_id IS DISTINCT FROM OLD.household_id THEN
      -- Clear the old contact if it no longer has any membership row
      IF NOT EXISTS (
        SELECT 1 FROM public.household_members
        WHERE contact_id = OLD.contact_id AND id <> OLD.id
      ) THEN
        UPDATE public.crm_contacts SET household_id = NULL WHERE id = OLD.contact_id;
      END IF;
      UPDATE public.crm_contacts SET household_id = NEW.household_id WHERE id = NEW.contact_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.household_members
      WHERE contact_id = OLD.contact_id AND id <> OLD.id
    ) THEN
      UPDATE public.crm_contacts SET household_id = NULL WHERE id = OLD.contact_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS sync_contact_household_id_trg ON public.household_members;
CREATE TRIGGER sync_contact_household_id_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_contact_household_id();
