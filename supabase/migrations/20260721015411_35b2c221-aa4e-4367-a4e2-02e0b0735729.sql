
-- Immutable normalizers for pre-research duplicate matching
CREATE OR REPLACE FUNCTION public.normalize_business_name(_n text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE s text;
BEGIN
  IF _n IS NULL THEN RETURN NULL; END IF;
  s := lower(_n);
  -- strip punctuation (keep alnum + space)
  s := regexp_replace(s, '[^a-z0-9 ]+', ' ', 'g');
  -- strip common suffixes / boilerplate as whole words
  s := regexp_replace(s, '\y(llc|inc|llp|lp|pc|pllc|corp|co|ltd|group|advisors|wealth management)\y', ' ', 'g');
  -- collapse whitespace
  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  IF s = '' THEN RETURN NULL; END IF;
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_city_name(_c text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE s text;
BEGIN
  IF _c IS NULL THEN RETURN NULL; END IF;
  s := lower(btrim(_c));
  -- strip trailing ", XX" state suffix
  s := regexp_replace(s, ',\s*[a-z]{2}\s*$', '', 'g');
  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  IF s = '' THEN RETURN NULL; END IF;
  RETURN s;
END $$;

ALTER TABLE public.nl_bdr_leads
  ADD COLUMN IF NOT EXISTS crd text,
  ADD COLUMN IF NOT EXISTS name_normalized text GENERATED ALWAYS AS (public.normalize_business_name(business_name)) STORED,
  ADD COLUMN IF NOT EXISTS city_normalized text GENERATED ALWAYS AS (public.normalize_city_name(city)) STORED;

CREATE INDEX IF NOT EXISTS nl_bdr_leads_crd_idx ON public.nl_bdr_leads (crd) WHERE crd IS NOT NULL;
CREATE INDEX IF NOT EXISTS nl_bdr_leads_name_city_idx ON public.nl_bdr_leads (name_normalized, city_normalized)
  WHERE name_normalized IS NOT NULL AND city_normalized IS NOT NULL;

-- Backfill CRD from any legacy notes containing "CRD: 12345"
UPDATE public.nl_bdr_leads
   SET crd = (regexp_match(notes, 'CRD:\s*(\d+)'))[1]
 WHERE crd IS NULL
   AND notes ~ 'CRD:\s*\d+';

-- Batch pre-research duplicate-check RPC
CREATE OR REPLACE FUNCTION public.check_sec_results_claimed(_rows jsonb)
RETURNS TABLE(crd text, match_type text, claimed_by_self boolean, claimed_by_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  is_priv boolean := private.is_admin_or_operator(caller);
  r jsonb;
  in_crd text; in_name text; in_city text;
  n_name text; n_city text;
  owner uuid;
  owner_name text;
  mtype text;
BEGIN
  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN RETURN; END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    in_crd  := NULLIF(btrim(COALESCE(r->>'crd','')), '');
    in_name := NULLIF(btrim(COALESCE(r->>'name','')), '');
    in_city := NULLIF(btrim(COALESCE(r->>'city','')), '');
    n_name  := public.normalize_business_name(in_name);
    n_city  := public.normalize_city_name(in_city);

    owner := NULL;
    mtype := 'none';

    -- Tier 1: exact CRD match (hard)
    IF in_crd IS NOT NULL THEN
      SELECT l.user_id INTO owner
      FROM public.nl_bdr_leads l
      WHERE l.crd = in_crd
      ORDER BY l.created_at ASC LIMIT 1;
      IF owner IS NOT NULL THEN mtype := 'hard_crd'; END IF;
    END IF;

    -- Tier 2: fuzzy name + city (soft)
    IF owner IS NULL AND n_name IS NOT NULL AND n_city IS NOT NULL THEN
      SELECT l.user_id INTO owner
      FROM public.nl_bdr_leads l
      WHERE l.name_normalized = n_name
        AND l.city_normalized = n_city
      ORDER BY l.created_at ASC LIMIT 1;
      IF owner IS NOT NULL THEN mtype := 'soft_name_city'; END IF;
    END IF;

    IF owner IS NULL THEN
      crd := in_crd; match_type := 'none';
      claimed_by_self := false; claimed_by_name := NULL;
      RETURN NEXT; CONTINUE;
    END IF;

    IF owner = caller THEN
      owner_name := 'You';
    ELSIF is_priv THEN
      SELECT COALESCE(
        (SELECT ep.full_name FROM public.employee_profiles ep WHERE ep.user_id = owner LIMIT 1),
        (SELECT wu.full_name FROM public.workspace_users wu WHERE wu.user_id = owner LIMIT 1),
        'another rep'
      ) INTO owner_name;
    ELSE
      owner_name := 'another rep';
    END IF;

    crd := in_crd;
    match_type := mtype;
    claimed_by_self := (owner = caller);
    claimed_by_name := owner_name;
    RETURN NEXT;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.check_sec_results_claimed(jsonb) TO authenticated;
