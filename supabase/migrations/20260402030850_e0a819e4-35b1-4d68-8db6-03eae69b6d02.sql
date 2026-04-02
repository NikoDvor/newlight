
-- Notification send log for all outbound setup communications
CREATE TABLE public.notification_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  setup_item_id UUID NULL,
  action_type TEXT NOT NULL DEFAULT 'request',
  channel TEXT NOT NULL DEFAULT 'portal',
  recipient_email TEXT NULL,
  recipient_phone TEXT NULL,
  subject TEXT NULL,
  body_preview TEXT NULL,
  send_status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT NULL,
  triggered_by UUID NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification logs"
  ON public.notification_send_log FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Clients can view own notification logs"
  ON public.notification_send_log FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE INDEX idx_notification_send_log_client ON public.notification_send_log(client_id);
CREATE INDEX idx_notification_send_log_item ON public.notification_send_log(setup_item_id);

-- Add notification preferences to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notification_channel TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS notification_fallback_channel TEXT NOT NULL DEFAULT 'portal',
  ADD COLUMN IF NOT EXISTS allow_sms BOOLEAN NOT NULL DEFAULT false;
