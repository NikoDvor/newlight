CREATE TABLE IF NOT EXISTS public.nl_training_glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.nl_training_chapters(id) ON DELETE CASCADE,
  category text NOT NULL,
  term text NOT NULL,
  definition text NOT NULL,
  usage_example text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, term)
);

ALTER TABLE public.nl_training_glossary_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view glossary terms" ON public.nl_training_glossary_terms;
CREATE POLICY "Authenticated users can view glossary terms"
ON public.nl_training_glossary_terms
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and operators manage glossary terms" ON public.nl_training_glossary_terms;
CREATE POLICY "Admins and operators manage glossary terms"
ON public.nl_training_glossary_terms
FOR ALL
TO authenticated
USING (private.is_admin_or_operator(auth.uid()))
WITH CHECK (private.is_admin_or_operator(auth.uid()));

DROP TRIGGER IF EXISTS update_nl_training_glossary_terms_updated_at ON public.nl_training_glossary_terms;
CREATE TRIGGER update_nl_training_glossary_terms_updated_at
BEFORE UPDATE ON public.nl_training_glossary_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();