ALTER TABLE public.nl_training_questions
ADD COLUMN IF NOT EXISTS quiz_level INT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nl_training_questions_quiz_level_check'
  ) THEN
    ALTER TABLE public.nl_training_questions
    ADD CONSTRAINT nl_training_questions_quiz_level_check
    CHECK (quiz_level IN (1, 2, 3));
  END IF;
END $$;

UPDATE public.nl_training_questions
SET quiz_level = 1
WHERE question_type = 'chapter_quiz'
  AND quiz_level IS DISTINCT FROM 1;

CREATE INDEX IF NOT EXISTS idx_nl_training_questions_chapter_level
ON public.nl_training_questions(chapter_id, quiz_level)
WHERE question_type = 'chapter_quiz';

CREATE TABLE IF NOT EXISTS public.nl_training_chapter_level_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL,
  module_id UUID NOT NULL,
  chapter_id UUID NOT NULL,
  quiz_level INT NOT NULL CHECK (quiz_level IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  score INT,
  attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id, quiz_level)
);

CREATE INDEX IF NOT EXISTS idx_nl_training_level_progress_user
ON public.nl_training_chapter_level_progress(user_id, module_id, chapter_id);

ALTER TABLE public.nl_training_chapter_level_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own chapter level progress" ON public.nl_training_chapter_level_progress;
CREATE POLICY "Users view own chapter level progress"
ON public.nl_training_chapter_level_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Users insert own chapter level progress" ON public.nl_training_chapter_level_progress;
CREATE POLICY "Users insert own chapter level progress"
ON public.nl_training_chapter_level_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Users update own chapter level progress" ON public.nl_training_chapter_level_progress;
CREATE POLICY "Users update own chapter level progress"
ON public.nl_training_chapter_level_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins delete chapter level progress" ON public.nl_training_chapter_level_progress;
CREATE POLICY "Admins delete chapter level progress"
ON public.nl_training_chapter_level_progress
FOR DELETE
TO authenticated
USING (public.is_admin_or_operator(auth.uid()));

DROP TRIGGER IF EXISTS update_nl_training_chapter_level_progress_updated_at
ON public.nl_training_chapter_level_progress;

CREATE TRIGGER update_nl_training_chapter_level_progress_updated_at
BEFORE UPDATE ON public.nl_training_chapter_level_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();