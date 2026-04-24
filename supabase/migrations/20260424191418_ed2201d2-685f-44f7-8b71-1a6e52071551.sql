
-- Two partial unique indexes since chapter_id is nullable
CREATE UNIQUE INDEX IF NOT EXISTS nl_training_progress_user_chapter_uidx
  ON public.nl_training_progress (user_id, module_id, chapter_id)
  WHERE chapter_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS nl_training_progress_user_module_uidx
  ON public.nl_training_progress (user_id, module_id)
  WHERE chapter_id IS NULL;
