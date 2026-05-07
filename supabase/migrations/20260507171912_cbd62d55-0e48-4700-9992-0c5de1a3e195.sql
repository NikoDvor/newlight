
CREATE TABLE public.nl_module_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  questions_snapshot JSONB DEFAULT '[]'::jsonb,
  answers_snapshot JSONB DEFAULT '[]'::jsonb,
  weak_chapters JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nl_module_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exams"
ON public.nl_module_exams
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exams"
ON public.nl_module_exams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_nl_module_exams_user_module ON public.nl_module_exams (user_id, module_id);
