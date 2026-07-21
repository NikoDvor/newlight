
ALTER TABLE public.bdr_calendar_events
  ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT,
  ADD COLUMN IF NOT EXISTS zoom_join_url TEXT,
  ADD COLUMN IF NOT EXISTS zoom_start_url TEXT,
  ADD COLUMN IF NOT EXISTS zoom_transcript TEXT,
  ADD COLUMN IF NOT EXISTS zoom_transcript_fetched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bdr_events_zoom_meeting_id
  ON public.bdr_calendar_events(zoom_meeting_id)
  WHERE zoom_meeting_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.zoom_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  zoom_meeting_id TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.zoom_webhook_events TO service_role;
ALTER TABLE public.zoom_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zoom_webhook_events_admin_read" ON public.zoom_webhook_events
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_zoom_webhook_events_meeting
  ON public.zoom_webhook_events(zoom_meeting_id) WHERE zoom_meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zoom_webhook_events_type_created
  ON public.zoom_webhook_events(event_type, created_at DESC);
