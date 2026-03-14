
-- Meeting reminders and notifications tracking
CREATE TABLE public.meeting_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL, -- booking_confirmation, asset_delivery, reminder_24h, reminder_3h, reminder_30m
  channel TEXT NOT NULL, -- sms, email, internal
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, skipped, cancelled
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  message_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting status tracking with cancellation support
CREATE TABLE public.meeting_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'booked', -- booked, confirmed, demo_ready, reminder_sent, cancelled, reschedule_requested, rescheduled, completed, no_show
  cancellation_reason TEXT,
  reschedule_requested BOOLEAN DEFAULT false,
  new_requested_date TIMESTAMP WITH TIME ZONE,
  cancellation_token TEXT UNIQUE,
  confirmation_sent BOOLEAN DEFAULT false,
  assets_sent BOOLEAN DEFAULT false,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_3h_sent BOOLEAN DEFAULT false,
  reminder_30m_sent BOOLEAN DEFAULT false,
  demo_app_ready BOOLEAN DEFAULT false,
  demo_website_ready BOOLEAN DEFAULT false,
  audit_ready BOOLEAN DEFAULT false,
  demo_app_link TEXT,
  demo_website_link TEXT,
  audit_link TEXT,
  assigned_salesman UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Message send log for all outbound communications
CREATE TABLE public.message_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- sms, email, internal
  template_name TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, delivered
  message_body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_send_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_reminders
CREATE POLICY "Admins manage meeting reminders" ON public.meeting_reminders
  FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Anon read meeting reminders" ON public.meeting_reminders
  FOR SELECT TO anon USING (true);

-- RLS policies for meeting_status
CREATE POLICY "Admins manage meeting status" ON public.meeting_status
  FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Anon read meeting status" ON public.meeting_status
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can update meeting status for cancellation" ON public.meeting_status
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- RLS policies for message_send_log
CREATE POLICY "Admins manage message log" ON public.message_send_log
  FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

CREATE POLICY "Anon insert message log" ON public.message_send_log
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read message log" ON public.message_send_log
  FOR SELECT TO anon USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_meeting_reminders_updated_at
  BEFORE UPDATE ON public.meeting_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_status_updated_at
  BEFORE UPDATE ON public.meeting_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
