
CREATE TABLE public.nl_module_completion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  score_average NUMERIC(5,2) DEFAULT 0,
  UNIQUE (user_id, module_id)
);

ALTER TABLE public.nl_module_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own module completions"
ON public.nl_module_completion FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own module completions"
ON public.nl_module_completion FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own module completions"
ON public.nl_module_completion FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
