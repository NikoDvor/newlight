ALTER TABLE public.nl_practice_recordings
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS content_type TEXT;

CREATE INDEX IF NOT EXISTS idx_nl_practice_recordings_user_created
ON public.nl_practice_recordings(user_id, created_at DESC);