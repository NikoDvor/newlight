CREATE OR REPLACE FUNCTION public.expire_stale_pipeline_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.nl_bdr_leads l
    SET pipeline_stage = 'expired_no_close_prep',
        status = 'inactive',
        updated_at = now()
    WHERE l.crm_deal_id IS NULL
      AND (l.pipeline_stage IS DISTINCT FROM 'expired_no_close_prep')
      AND EXISTS (
        SELECT 1 FROM public.bdr_calendar_events e
        WHERE e.lead_id = l.id
          AND (e.metadata ->> 'meeting_kind') = 'discovery'
          AND e.starts_at < now() - interval '24 hours'
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_pipeline_leads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_pipeline_leads() TO postgres, service_role;