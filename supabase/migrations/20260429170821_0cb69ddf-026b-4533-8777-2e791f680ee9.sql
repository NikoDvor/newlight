CREATE TABLE IF NOT EXISTS public.nl_practice_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.nl_training_chapters(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  recording_type TEXT NOT NULL CHECK (recording_type IN ('audio','video','upload')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nl_practice_recordings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_nl_practice_recordings_user_chapter
ON public.nl_practice_recordings(user_id, chapter_id, created_at DESC);

DROP POLICY IF EXISTS "Users view own practice recordings" ON public.nl_practice_recordings;
CREATE POLICY "Users view own practice recordings"
ON public.nl_practice_recordings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own practice recordings" ON public.nl_practice_recordings;
CREATE POLICY "Users create own practice recordings"
ON public.nl_practice_recordings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own practice recordings" ON public.nl_practice_recordings;
CREATE POLICY "Users update own practice recordings"
ON public.nl_practice_recordings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own practice recordings" ON public.nl_practice_recordings;
CREATE POLICY "Users delete own practice recordings"
ON public.nl_practice_recordings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_nl_practice_recordings_updated_at ON public.nl_practice_recordings;
CREATE TRIGGER update_nl_practice_recordings_updated_at
BEFORE UPDATE ON public.nl_practice_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-recordings', 'practice-recordings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users view own practice recording files" ON storage.objects;
CREATE POLICY "Users view own practice recording files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'practice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users upload own practice recording files" ON storage.objects;
CREATE POLICY "Users upload own practice recording files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own practice recording files" ON storage.objects;
CREATE POLICY "Users update own practice recording files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'practice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'practice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own practice recording files" ON storage.objects;
CREATE POLICY "Users delete own practice recording files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'practice-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);