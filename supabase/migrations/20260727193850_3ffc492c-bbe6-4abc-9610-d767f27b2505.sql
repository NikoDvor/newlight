GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_inperson_streets TO authenticated;
GRANT ALL ON public.nl_inperson_streets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_inperson_leads TO authenticated;
GRANT ALL ON public.nl_inperson_leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nl_inperson_outcomes TO authenticated;
GRANT ALL ON public.nl_inperson_outcomes TO service_role;
GRANT SELECT ON public.nl_inperson_master_prompt TO authenticated;
GRANT ALL ON public.nl_inperson_master_prompt TO service_role;

DROP POLICY IF EXISTS "Authenticated users can read master prompt" ON public.nl_inperson_master_prompt;
CREATE POLICY "Authenticated users can read master prompt"
ON public.nl_inperson_master_prompt
FOR SELECT
TO authenticated
USING (true);