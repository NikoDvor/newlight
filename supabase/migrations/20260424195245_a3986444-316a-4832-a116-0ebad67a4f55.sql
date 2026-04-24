-- Extend certifications with extra display + tracking fields
ALTER TABLE public.nl_training_certifications
  ADD COLUMN IF NOT EXISTS rep_name TEXT,
  ADD COLUMN IF NOT EXISTS total_questions INTEGER,
  ADD COLUMN IF NOT EXISTS certificate_number TEXT UNIQUE;

-- Exam attempts (for 48h cooldown)
CREATE TABLE IF NOT EXISTS public.nl_training_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  module_scores JSONB,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nl_training_exam_attempts_user
  ON public.nl_training_exam_attempts(user_id, attempted_at DESC);

ALTER TABLE public.nl_training_exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own attempts" ON public.nl_training_exam_attempts;
CREATE POLICY "Users view own attempts"
  ON public.nl_training_exam_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Users insert own attempts" ON public.nl_training_exam_attempts;
CREATE POLICY "Users insert own attempts"
  ON public.nl_training_exam_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));