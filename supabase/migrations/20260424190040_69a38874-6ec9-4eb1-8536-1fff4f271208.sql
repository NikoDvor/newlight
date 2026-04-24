-- 1. Tracks
CREATE TABLE public.nl_training_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_key TEXT NOT NULL UNIQUE,
  track_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Modules
CREATE TABLE public.nl_training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE,
  module_number INT NOT NULL,
  module_title TEXT NOT NULL,
  module_description TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_training_modules_track ON public.nl_training_modules(track_id, module_number);

-- 3. Chapters
CREATE TABLE public.nl_training_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  chapter_title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_training_chapters_module ON public.nl_training_chapters(module_id, chapter_number);

-- 4. Questions
CREATE TABLE public.nl_training_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID REFERENCES public.nl_training_chapters(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('chapter_quiz','module_test','certification')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_training_questions_module ON public.nl_training_questions(module_id);
CREATE INDEX idx_nl_training_questions_chapter ON public.nl_training_questions(chapter_id);

-- 5. Progress
CREATE TABLE public.nl_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL,
  module_id UUID NOT NULL,
  chapter_id UUID,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  score INT,
  attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_training_progress_user ON public.nl_training_progress(user_id);
CREATE INDEX idx_nl_training_progress_user_module ON public.nl_training_progress(user_id, module_id);

-- 6. Certifications
CREATE TABLE public.nl_training_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL,
  track_key TEXT NOT NULL,
  score INT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_training_certifications_user ON public.nl_training_certifications(user_id);

-- Enable RLS
ALTER TABLE public.nl_training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_certifications ENABLE ROW LEVEL SECURITY;

-- TRACKS policies
CREATE POLICY "Tracks viewable by authenticated users"
  ON public.nl_training_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/operators manage tracks"
  ON public.nl_training_tracks FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- MODULES policies
CREATE POLICY "Modules viewable by authenticated users"
  ON public.nl_training_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/operators manage modules"
  ON public.nl_training_modules FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- CHAPTERS policies
CREATE POLICY "Chapters viewable by authenticated users"
  ON public.nl_training_chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/operators manage chapters"
  ON public.nl_training_chapters FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- QUESTIONS policies
CREATE POLICY "Questions viewable by authenticated users"
  ON public.nl_training_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/operators manage questions"
  ON public.nl_training_questions FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- PROGRESS policies
CREATE POLICY "Users view own progress"
  ON public.nl_training_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users insert own progress"
  ON public.nl_training_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users update own progress"
  ON public.nl_training_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Admins delete progress"
  ON public.nl_training_progress FOR DELETE TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

-- CERTIFICATIONS policies
CREATE POLICY "Users view own certifications"
  ON public.nl_training_certifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users insert own certifications"
  ON public.nl_training_certifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Admins manage certifications"
  ON public.nl_training_certifications FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- Seed BDR track + 10 modules
DO $$
DECLARE
  v_track_id UUID;
BEGIN
  INSERT INTO public.nl_training_tracks (track_key, track_name, description)
  VALUES ('bdr', 'BDR Training Track', 'Complete certification program for Business Development Representatives at NewLight Marketing')
  RETURNING id INTO v_track_id;

  INSERT INTO public.nl_training_modules (track_id, module_number, module_title, is_locked) VALUES
    (v_track_id, 1, 'The BDR Role & Mindset', false),
    (v_track_id, 2, 'Lead Generation & Prospecting', true),
    (v_track_id, 3, 'Sales Fundamentals', true),
    (v_track_id, 4, 'Paraverbal & Body Language', true),
    (v_track_id, 5, 'Script Mastery', true),
    (v_track_id, 6, 'Objection Handling', true),
    (v_track_id, 7, 'Closing Techniques', true),
    (v_track_id, 8, 'Mining & Discovery', true),
    (v_track_id, 9, 'Product Knowledge', true),
    (v_track_id, 10, 'KPIs & Daily Accountability', true);
END $$;