
-- 1. Drop all existing anon proposal policies
DROP POLICY IF EXISTS "Public can view proposals by share_token" ON public.proposals;
DROP POLICY IF EXISTS "Public can update proposal status via token" ON public.proposals;
DROP POLICY IF EXISTS "Public can view proposal sections" ON public.proposal_sections;
DROP POLICY IF EXISTS "Public can view proposal line items" ON public.proposal_line_items;
DROP POLICY IF EXISTS "Insert signature for valid shared proposal" ON public.proposal_signatures;

-- 2. Create a helper function that extracts the share token from the x-proposal-token header
CREATE OR REPLACE FUNCTION public.get_proposal_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    current_setting('request.headers', true)::json->>'x-proposal-token',
    ''
  )
$$;

-- 3. Anon SELECT on proposals: only when share_token matches the provided header value
CREATE POLICY "anon_read_proposal_by_token"
ON public.proposals FOR SELECT TO anon
USING (
  share_token IS NOT NULL
  AND share_token = public.get_proposal_token()
);

-- 4. NO anon UPDATE on proposals at all (signing goes through edge function)
-- (no policy created = no access)

-- 5. Anon SELECT on proposal_sections: only for proposals with matching token
CREATE POLICY "anon_read_proposal_sections_by_token"
ON public.proposal_sections FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_sections.proposal_id
      AND p.share_token IS NOT NULL
      AND p.share_token = public.get_proposal_token()
  )
);

-- 6. Anon SELECT on proposal_line_items: only for proposals with matching token
CREATE POLICY "anon_read_proposal_line_items_by_token"
ON public.proposal_line_items FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_line_items.proposal_id
      AND p.share_token IS NOT NULL
      AND p.share_token = public.get_proposal_token()
  )
);

-- 7. Anon INSERT on proposal_signatures: only when token matches and proposal is signable
CREATE POLICY "anon_insert_signature_by_token"
ON public.proposal_signatures FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_signatures.proposal_id
      AND p.share_token IS NOT NULL
      AND p.share_token = public.get_proposal_token()
      AND p.proposal_status NOT IN ('accepted', 'declined', 'expired')
  )
);
