ALTER TABLE public.nl_training_progress
DROP CONSTRAINT IF EXISTS nl_training_progress_status_check;

ALTER TABLE public.nl_training_progress
ADD CONSTRAINT nl_training_progress_status_check
CHECK (status IN ('not_started', 'in_progress', 'completed', 'drill_completed'));
