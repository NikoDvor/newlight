
ALTER TABLE public.meeting_intelligence
  ADD COLUMN IF NOT EXISTS scanned_for_opportunities boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_meeting_intelligence_unscanned
  ON public.meeting_intelligence (client_id) WHERE scanned_for_opportunities = false;

CREATE OR REPLACE FUNCTION public.scan_meeting_intelligence_for_opportunities(_client_id uuid)
RETURNS TABLE(meeting_id uuid, matched_keyword text, opportunity_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  kw text;
  kws text[] := ARRAY[
    '401k','401(k)','old employer','former employer','rollover',
    'another advisor','other advisor','inheritance','inherited','brokerage account'
  ];
  haystack text;
  idx int;
  snippet text;
  new_opp_id uuid;
BEGIN
  IF NOT (private.is_admin_or_operator(auth.uid()) OR private.user_has_client_access(auth.uid(), _client_id)) THEN
    RAISE EXCEPTION 'Not authorized to scan meetings for this client' USING ERRCODE = '42501';
  END IF;

  FOR m IN
    SELECT id, title, transcript, summary,
           COALESCE(next_steps::text,'') AS next_steps_text,
           COALESCE(interests::text,'') AS interests_text
    FROM public.meeting_intelligence
    WHERE client_id = _client_id
      AND scanned_for_opportunities = false
  LOOP
    haystack := lower(
      COALESCE(m.transcript,'') || E'\n' ||
      COALESCE(m.summary,'')    || E'\n' ||
      COALESCE(m.next_steps_text,'') || E'\n' ||
      COALESCE(m.interests_text,'')
    );

    FOREACH kw IN ARRAY kws LOOP
      idx := position(lower(kw) IN haystack);
      IF idx > 0 THEN
        snippet := substr(haystack, GREATEST(1, idx - 80), LEAST(240, length(haystack) - GREATEST(1, idx - 80) + 1));

        INSERT INTO public.upsell_opportunities
          (client_id, opportunity_type, title, description, status)
        VALUES (
          _client_id,
          'money_in_motion',
          'Possible held-away assets — ' || kw,
          'Detected "' || kw || '" in meeting "' || COALESCE(m.title,'(untitled)')
            || '" (id ' || m.id::text || ').' || E'\n\nSnippet: …' || snippet || '…',
          'Open'
        )
        RETURNING id INTO new_opp_id;

        meeting_id := m.id; matched_keyword := kw; opportunity_id := new_opp_id;
        RETURN NEXT;
        EXIT; -- one opportunity per meeting
      END IF;
    END LOOP;

    UPDATE public.meeting_intelligence SET scanned_for_opportunities = true WHERE id = m.id;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.scan_meeting_intelligence_for_opportunities(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_meeting_intelligence_for_opportunities(uuid) TO authenticated, service_role;
