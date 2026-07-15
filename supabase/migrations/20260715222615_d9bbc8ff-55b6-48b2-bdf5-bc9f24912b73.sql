-- Server-side enforcement: block approving a testimonial-flagged material
-- unless the current version has at least one linked disclosure of type 'testimonial'.
CREATE OR REPLACE FUNCTION public.enforce_testimonial_disclosure_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_disclosure_ids uuid[];
  v_testimonial_count int;
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.has_testimonial = true THEN

    IF NEW.current_version_id IS NULL THEN
      RAISE EXCEPTION 'Approval denied: material is flagged as containing a testimonial but has no current version with a linked testimonial disclosure.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT disclosure_ids INTO v_disclosure_ids
    FROM public.marketing_material_versions
    WHERE id = NEW.current_version_id;

    IF v_disclosure_ids IS NULL OR array_length(v_disclosure_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'Approval denied: material is flagged as containing a testimonial but has no linked disclosures on its current version.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT count(*) INTO v_testimonial_count
    FROM public.marketing_disclosures
    WHERE id = ANY(v_disclosure_ids)
      AND disclosure_type = 'testimonial';

    IF v_testimonial_count = 0 THEN
      RAISE EXCEPTION 'Approval denied: material is flagged as containing a testimonial but no linked disclosure has disclosure_type = testimonial.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_testimonial_disclosure_gate_trg ON public.marketing_materials;
CREATE TRIGGER enforce_testimonial_disclosure_gate_trg
BEFORE INSERT OR UPDATE ON public.marketing_materials
FOR EACH ROW
EXECUTE FUNCTION public.enforce_testimonial_disclosure_gate();