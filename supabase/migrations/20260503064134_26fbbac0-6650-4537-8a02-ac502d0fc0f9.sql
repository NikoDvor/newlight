
CREATE TABLE public.nl_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  questions_snapshot JSONB,
  answers_snapshot JSONB,
  weak_modules JSONB,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nl_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certifications"
  ON public.nl_certifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own certifications"
  ON public.nl_certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certifications"
  ON public.nl_certifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_nl_certifications_user ON public.nl_certifications(user_id);
