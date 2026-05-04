
-- Add columns to nl_training_questions
ALTER TABLE public.nl_training_questions
  ADD COLUMN is_unlock_question BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN unlock_category TEXT,
  ADD COLUMN unlock_level TEXT;

-- Create nl_objection_unlocks table
CREATE TABLE public.nl_objection_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  objection_category TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  foundation_unlocked BOOLEAN NOT NULL DEFAULT true,
  intermediate_unlocked BOOLEAN NOT NULL DEFAULT false,
  advanced_unlocked BOOLEAN NOT NULL DEFAULT false,
  foundation_passed BOOLEAN NOT NULL DEFAULT false,
  intermediate_passed BOOLEAN NOT NULL DEFAULT false,
  advanced_passed BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, objection_category)
);

ALTER TABLE public.nl_objection_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks" ON public.nl_objection_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own unlocks" ON public.nl_objection_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own unlocks" ON public.nl_objection_unlocks FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_nl_objection_unlocks_user ON public.nl_objection_unlocks(user_id);

-- Trigger function: auto-create unlock at 50 objections
CREATE OR REPLACE FUNCTION public.check_objection_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obj_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO obj_count
  FROM public.nl_bdr_objections
  WHERE user_id = NEW.user_id AND objection_category = NEW.objection_category;

  IF obj_count >= 50 THEN
    INSERT INTO public.nl_objection_unlocks (user_id, objection_category, foundation_unlocked)
    VALUES (NEW.user_id, NEW.objection_category, true)
    ON CONFLICT (user_id, objection_category) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_objection_unlock
  AFTER INSERT ON public.nl_bdr_objections
  FOR EACH ROW EXECUTE FUNCTION public.check_objection_unlock();
