
CREATE OR REPLACE FUNCTION public.normalize_phone_last10(_p text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE d text;
BEGIN
  IF _p IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(_p, '\D', '', 'g');
  IF length(d) = 11 AND left(d,1) = '1' THEN RETURN right(d,10); END IF;
  IF length(d) >= 10 THEN RETURN right(d,10); END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_website_host(_w text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE s text;
BEGIN
  IF _w IS NULL OR btrim(_w) = '' THEN RETURN NULL; END IF;
  s := lower(btrim(_w));
  s := regexp_replace(s, '^https?://', '');
  s := regexp_replace(s, '^www\.', '');
  s := regexp_replace(s, '/.*$', '');
  IF s = '' THEN RETURN NULL; END IF;
  RETURN s;
END $$;

ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS website_host text,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- Backfill
UPDATE public.nl_bdr_leads
   SET phone_normalized = public.normalize_phone_last10(phone),
       website_host     = public.normalize_website_host(website)
 WHERE phone_normalized IS NULL AND website_host IS NULL;

-- Dedup existing conflicts: keep earliest per phone_normalized, clear the rest
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY phone_normalized ORDER BY created_at ASC, id ASC) AS rn
  FROM public.nl_bdr_leads
  WHERE phone_normalized IS NOT NULL AND length(phone_normalized) = 10
)
UPDATE public.nl_bdr_leads l
   SET phone_normalized = NULL
  FROM ranked r
 WHERE l.id = r.id AND r.rn > 1;

-- Trigger
CREATE OR REPLACE FUNCTION public.nl_bdr_leads_normalize()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE released_statuses text[] := ARRAY['dead','disqualified','not_interested','released'];
BEGIN
  IF NEW.status = ANY(released_statuses) THEN
    NEW.phone_normalized := NULL;
    NEW.website_host := NULL;
    IF NEW.released_at IS NULL THEN NEW.released_at := now(); END IF;
  ELSE
    NEW.phone_normalized := public.normalize_phone_last10(NEW.phone);
    NEW.website_host := public.normalize_website_host(NEW.website);
    NEW.released_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_nl_bdr_leads_normalize ON public.nl_bdr_leads;
CREATE TRIGGER trg_nl_bdr_leads_normalize
  BEFORE INSERT OR UPDATE OF phone, website, status
  ON public.nl_bdr_leads
  FOR EACH ROW EXECUTE FUNCTION public.nl_bdr_leads_normalize();

CREATE UNIQUE INDEX IF NOT EXISTS nl_bdr_leads_phone_normalized_uniq
  ON public.nl_bdr_leads(phone_normalized)
  WHERE phone_normalized IS NOT NULL AND length(phone_normalized) = 10;

CREATE INDEX IF NOT EXISTS nl_bdr_leads_website_host_idx
  ON public.nl_bdr_leads(website_host)
  WHERE website_host IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_lead_claimed(_phone text, _website text)
RETURNS TABLE(claimed boolean, claimed_by_self boolean, claimed_by_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p text := public.normalize_phone_last10(_phone);
  w text := public.normalize_website_host(_website);
  owner uuid;
  caller uuid := auth.uid();
  is_priv boolean := private.is_admin_or_operator(caller);
  owner_name text;
BEGIN
  IF p IS NULL AND w IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::text; RETURN;
  END IF;
  SELECT l.user_id INTO owner
  FROM public.nl_bdr_leads l
  WHERE (p IS NOT NULL AND l.phone_normalized = p)
     OR (p IS NULL AND w IS NOT NULL AND l.website_host = w)
  ORDER BY l.created_at ASC
  LIMIT 1;
  IF owner IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::text; RETURN;
  END IF;
  IF owner = caller THEN
    RETURN QUERY SELECT true, true, 'You'::text; RETURN;
  END IF;
  IF is_priv THEN
    SELECT COALESCE(
      (SELECT ep.full_name FROM public.employee_profiles ep WHERE ep.user_id = owner LIMIT 1),
      (SELECT wu.full_name FROM public.workspace_users wu WHERE wu.user_id = owner LIMIT 1),
      'another rep'
    ) INTO owner_name;
    RETURN QUERY SELECT true, false, owner_name; RETURN;
  END IF;
  RETURN QUERY SELECT true, false, 'another rep'::text;
END $$;
GRANT EXECUTE ON FUNCTION public.check_lead_claimed(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_lead_conflicts(_lead_ids uuid[])
RETURNS TABLE(lead_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT me.id
  FROM public.nl_bdr_leads me
  WHERE me.id = ANY(_lead_ids)
    AND me.phone_normalized IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.nl_bdr_leads other
      WHERE other.phone_normalized = me.phone_normalized
        AND other.user_id <> me.user_id
    );
$$;
GRANT EXECUTE ON FUNCTION public.list_lead_conflicts(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reassign_lead(_lead_id uuid, _new_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT private.is_admin_or_operator(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  UPDATE public.nl_bdr_leads
     SET user_id = _new_user, updated_at = now()
   WHERE id = _lead_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_reassign_lead(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_stale_bdr_leads(_days int DEFAULT 90)
RETURNS TABLE(released_count int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cnt int;
BEGIN
  WITH cutoff AS (SELECT now() - make_interval(days => _days) AS t)
  UPDATE public.nl_bdr_leads l
     SET status = 'released', updated_at = now()
   FROM cutoff
   WHERE l.phone_normalized IS NOT NULL
     AND COALESCE(l.updated_at, l.created_at) < cutoff.t
     AND (l.callback_at IS NULL OR l.callback_at < now())
     AND jsonb_array_length(COALESCE(l.outcome_history,'[]'::jsonb)) = 0
     AND COALESCE(l.status,'') NOT IN ('closed_won','meeting_booked','warm','hot','qualified');
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN QUERY SELECT cnt;
END $$;
GRANT EXECUTE ON FUNCTION public.release_stale_bdr_leads(int) TO service_role, authenticated;

DROP POLICY IF EXISTS "Users can view own leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Users can create own leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.nl_bdr_leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.nl_bdr_leads;
