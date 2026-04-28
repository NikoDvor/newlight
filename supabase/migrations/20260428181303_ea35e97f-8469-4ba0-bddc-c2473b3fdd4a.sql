CREATE TABLE IF NOT EXISTS public.nl_training_flashcards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_key text NOT NULL CHECK (track_key IN ('bdr', 'sdr')),
  category text NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nl_training_flashcard_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  flashcard_id uuid NOT NULL REFERENCES public.nl_training_flashcards(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'mastered')),
  times_seen integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, flashcard_id)
);

CREATE INDEX IF NOT EXISTS idx_nl_training_flashcards_track_category ON public.nl_training_flashcards(track_key, category);
CREATE INDEX IF NOT EXISTS idx_nl_training_flashcards_difficulty ON public.nl_training_flashcards(difficulty);
CREATE INDEX IF NOT EXISTS idx_nl_training_flashcard_progress_user ON public.nl_training_flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_nl_training_flashcard_progress_card ON public.nl_training_flashcard_progress(flashcard_id);

ALTER TABLE public.nl_training_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_flashcard_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view flashcards" ON public.nl_training_flashcards;
DROP POLICY IF EXISTS "Admins and operators can manage flashcards" ON public.nl_training_flashcards;
DROP POLICY IF EXISTS "Users can view their own flashcard progress" ON public.nl_training_flashcard_progress;
DROP POLICY IF EXISTS "Users can create their own flashcard progress" ON public.nl_training_flashcard_progress;
DROP POLICY IF EXISTS "Users can update their own flashcard progress" ON public.nl_training_flashcard_progress;
DROP POLICY IF EXISTS "Users can delete their own flashcard progress" ON public.nl_training_flashcard_progress;

CREATE POLICY "Authenticated users can view flashcards"
ON public.nl_training_flashcards
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and operators can manage flashcards"
ON public.nl_training_flashcards
FOR ALL
TO authenticated
USING (private.is_admin_or_operator(auth.uid()))
WITH CHECK (private.is_admin_or_operator(auth.uid()));

CREATE POLICY "Users can view their own flashcard progress"
ON public.nl_training_flashcard_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard progress"
ON public.nl_training_flashcard_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard progress"
ON public.nl_training_flashcard_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard progress"
ON public.nl_training_flashcard_progress
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);