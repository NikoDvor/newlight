
CREATE TABLE public.nl_user_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL,
  field_key TEXT NOT NULL,
  field_value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id, field_key)
);

ALTER TABLE public.nl_user_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reflections"
  ON public.nl_user_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections"
  ON public.nl_user_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
  ON public.nl_user_reflections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_nl_user_reflections_updated_at
  BEFORE UPDATE ON public.nl_user_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
