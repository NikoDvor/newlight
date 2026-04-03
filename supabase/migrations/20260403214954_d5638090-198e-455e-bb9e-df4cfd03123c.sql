-- Remove the blanket insert policy
DROP POLICY IF EXISTS "Anyone can insert signatures" ON public.proposal_signatures;

-- Allow signature insert only when the proposal exists, has a share_token, and is in a signable state
CREATE POLICY "Insert signature for valid shared proposal"
ON public.proposal_signatures
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id
      AND p.share_token IS NOT NULL
      AND p.proposal_status NOT IN ('accepted', 'rejected', 'expired')
  )
);