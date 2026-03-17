
-- workspace_users: team members within client sub-accounts
CREATE TABLE IF NOT EXISTS public.workspace_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  job_title text,
  department text,
  role_preset text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'pending_invite',
  manager_user_id uuid REFERENCES public.workspace_users(id) ON DELETE SET NULL,
  is_bookable_staff boolean NOT NULL DEFAULT false,
  commission_rate numeric,
  internal_notes text,
  tags text[],
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, email)
);

ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_users_select" ON public.workspace_users
  FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "workspace_users_insert" ON public.workspace_users
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "workspace_users_update" ON public.workspace_users
  FOR UPDATE TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "workspace_users_delete" ON public.workspace_users
  FOR DELETE TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- workspace_permissions: per-module access levels
CREATE TABLE IF NOT EXISTS public.workspace_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_user_id uuid NOT NULL REFERENCES public.workspace_users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  access_level text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_user_id, module_key)
);

ALTER TABLE public.workspace_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_permissions_select" ON public.workspace_permissions
  FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "workspace_permissions_all" ON public.workspace_permissions
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- calendar_user_access: granular calendar permissions per workspace user
CREATE TABLE IF NOT EXISTS public.calendar_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_user_id uuid NOT NULL REFERENCES public.workspace_users(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT false,
  can_be_booked boolean NOT NULL DEFAULT false,
  receives_notifications boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_user_id, calendar_id)
);

ALTER TABLE public.calendar_user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_user_access_all" ON public.calendar_user_access
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- training_user_access
CREATE TABLE IF NOT EXISTS public.training_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_user_id uuid NOT NULL REFERENCES public.workspace_users(id) ON DELETE CASCADE,
  training_scope text NOT NULL DEFAULT 'all',
  required_courses jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_user_id)
);

ALTER TABLE public.training_user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_user_access_all" ON public.training_user_access
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- meeting_intelligence_access
CREATE TABLE IF NOT EXISTS public.meeting_intelligence_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_user_id uuid NOT NULL REFERENCES public.workspace_users(id) ON DELETE CASCADE,
  can_view_recordings boolean NOT NULL DEFAULT false,
  can_view_transcripts boolean NOT NULL DEFAULT false,
  can_view_summaries boolean NOT NULL DEFAULT false,
  can_view_ai_actions boolean NOT NULL DEFAULT false,
  scope_type text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_user_id)
);

ALTER TABLE public.meeting_intelligence_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_intelligence_access_all" ON public.meeting_intelligence_access
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- user_notification_preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_user_id uuid NOT NULL REFERENCES public.workspace_users(id) ON DELETE CASCADE,
  booking_notifications boolean NOT NULL DEFAULT true,
  cancellation_notifications boolean NOT NULL DEFAULT true,
  lead_notifications boolean NOT NULL DEFAULT false,
  task_notifications boolean NOT NULL DEFAULT true,
  review_notifications boolean NOT NULL DEFAULT false,
  support_notifications boolean NOT NULL DEFAULT false,
  payroll_notifications boolean NOT NULL DEFAULT false,
  channel_in_app boolean NOT NULL DEFAULT true,
  channel_email boolean NOT NULL DEFAULT true,
  channel_sms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_user_id)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notification_preferences_all" ON public.user_notification_preferences
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- updated_at triggers
CREATE OR REPLACE TRIGGER workspace_users_updated_at BEFORE UPDATE ON public.workspace_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER workspace_permissions_updated_at BEFORE UPDATE ON public.workspace_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER training_user_access_updated_at BEFORE UPDATE ON public.training_user_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER meeting_intelligence_access_updated_at BEFORE UPDATE ON public.meeting_intelligence_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
