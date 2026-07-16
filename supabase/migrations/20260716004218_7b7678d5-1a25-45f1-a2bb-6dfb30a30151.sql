ALTER TABLE public.marketing_materials
  ADD COLUMN IF NOT EXISTS compliance_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.scan_marketing_compliance_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phrases text[] := ARRAY[
    'guaranteed return','guaranteed returns','risk-free','risk free',
    'beat the market','outperform the market','no risk','can''t lose',
    'sure thing','guaranteed income'
  ];
  p text;
  hay text;
  flags jsonb := '[]'::jsonb;
BEGIN
  -- Only scan when transitioning into 'submitted' (on INSERT or UPDATE)
  IF NEW.status = 'submitted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN

    hay := lower(COALESCE(NEW.content_text, ''));
    IF length(hay) > 0 THEN
      FOREACH p IN ARRAY phrases LOOP
        IF position(lower(p) IN hay) > 0 THEN
          flags := flags || jsonb_build_array(
            jsonb_build_object('phrase', p, 'category', 'risky_claim')
          );
        END IF;
      END LOOP;
    END IF;

    NEW.compliance_flags := flags;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS scan_marketing_compliance_flags_trg ON public.marketing_materials;
CREATE TRIGGER scan_marketing_compliance_flags_trg
BEFORE INSERT OR UPDATE ON public.marketing_materials
FOR EACH ROW EXECUTE FUNCTION public.scan_marketing_compliance_flags();

CREATE OR REPLACE FUNCTION public.emit_risky_claim_flagged_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND jsonb_typeof(NEW.compliance_flags) = 'array'
     AND jsonb_array_length(NEW.compliance_flags) > 0 THEN
    INSERT INTO public.automation_events
      (client_id, event_type, event_key, event_name, related_type, related_id, event_data)
    VALUES (
      NEW.client_id,
      'risky_claim_flagged',
      'risky_claim_flagged',
      'Marketing Material Risky Claim Flagged',
      'marketing_material',
      NEW.id,
      jsonb_build_object(
        'material_id', NEW.id,
        'title', NEW.title,
        'flags', NEW.compliance_flags
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS emit_risky_claim_flagged_event_trg ON public.marketing_materials;
CREATE TRIGGER emit_risky_claim_flagged_event_trg
AFTER INSERT OR UPDATE ON public.marketing_materials
FOR EACH ROW EXECUTE FUNCTION public.emit_risky_claim_flagged_event();