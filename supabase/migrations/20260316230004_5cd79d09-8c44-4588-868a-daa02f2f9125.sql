
-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recipient_user_id uuid,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text,
  linked_type text,
  linked_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Chat threads table
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  thread_type text NOT NULL DEFAULT 'team',
  thread_name text,
  linked_type text,
  linked_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access chat threads"
  ON public.chat_threads FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_name text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access chat messages"
  ON public.chat_messages FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Chat participants table
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access chat participants"
  ON public.chat_participants FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

-- Enable realtime for chat and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
