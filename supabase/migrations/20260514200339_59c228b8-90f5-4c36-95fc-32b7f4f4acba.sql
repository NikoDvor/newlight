
-- Create bdr_call_outcomes table for the BDR Dialer
CREATE TABLE public.bdr_call_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bdr_user_id uuid NOT NULL,
  lead_id uuid,
  outcome text NOT NULL,
  objection_type text,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bdr_call_outcomes_user ON public.bdr_call_outcomes(bdr_user_id);
CREATE INDEX idx_bdr_call_outcomes_objection ON public.bdr_call_outcomes(bdr_user_id, objection_type);

ALTER TABLE public.bdr_call_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BDRs can view own call outcomes"
  ON public.bdr_call_outcomes FOR SELECT
  TO authenticated
  USING (auth.uid() = bdr_user_id);

CREATE POLICY "BDRs can insert own call outcomes"
  ON public.bdr_call_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = bdr_user_id);

CREATE POLICY "BDRs can delete own call outcomes"
  ON public.bdr_call_outcomes FOR DELETE
  TO authenticated
  USING (auth.uid() = bdr_user_id);

-- When an outcome with an objection_type is logged, mirror it into nl_bdr_objections
-- so the existing 50-threshold unlock trigger fires and unlocks the training module.
CREATE OR REPLACE FUNCTION public.mirror_call_outcome_to_objection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.objection_type IS NOT NULL AND NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.nl_bdr_objections (user_id, lead_id, objection_category, outcome_logged)
    VALUES (NEW.bdr_user_id, NEW.lead_id, NEW.objection_type, NEW.outcome);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mirror_call_outcome_to_objection
AFTER INSERT ON public.bdr_call_outcomes
FOR EACH ROW EXECUTE FUNCTION public.mirror_call_outcome_to_objection();
