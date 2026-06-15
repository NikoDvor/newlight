ALTER TABLE public.calendars
ADD COLUMN IF NOT EXISTS worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS calendars_worker_id_idx ON public.calendars(worker_id);