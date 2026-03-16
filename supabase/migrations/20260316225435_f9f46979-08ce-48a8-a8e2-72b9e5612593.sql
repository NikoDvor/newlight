
-- Multi-calendar tables
CREATE TABLE IF NOT EXISTS public.calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_name text NOT NULL,
  calendar_type text NOT NULL DEFAULT 'general',
  owner_user_id uuid,
  description text,
  timezone text DEFAULT 'America/New_York',
  status text NOT NULL DEFAULT 'active',
  default_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  access_role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  slug text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add calendar_id to calendar_events if not exists
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS calendar_id uuid REFERENCES public.calendars(id) ON DELETE SET NULL;

-- Add color and stage_order to pipeline_stages if not present
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS stage_order int DEFAULT 0;

-- RLS
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage calendars" ON public.calendars FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage calendar access" ON public.calendar_access FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage blackout dates" ON public.blackout_dates FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage booking links" ON public.booking_links FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));
