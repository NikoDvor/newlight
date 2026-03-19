
-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_scope_type text NOT NULL DEFAULT 'client_workspace',
  conversation_type text NOT NULL DEFAULT 'General',
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  assigned_user_id uuid,
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Open',
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversation Messages
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id uuid,
  sender_type text NOT NULL DEFAULT 'Internal User',
  recipient_type text NOT NULL DEFAULT 'External Contact',
  direction text NOT NULL DEFAULT 'Outgoing',
  message_channel text NOT NULL DEFAULT 'InApp',
  subject text,
  message_body text NOT NULL DEFAULT '',
  delivery_status text NOT NULL DEFAULT 'Sent',
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Message Templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  template_scope_type text NOT NULL DEFAULT 'admin_global',
  template_name text NOT NULL,
  template_category text NOT NULL DEFAULT 'General',
  channel text NOT NULL DEFAULT 'Email',
  subject_template text,
  body_template text NOT NULL DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Follow-Up Queues
CREATE TABLE IF NOT EXISTS public.follow_up_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  related_type text,
  related_id uuid,
  queue_type text NOT NULL DEFAULT 'Sales Follow-Up',
  assigned_user_id uuid,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'Pending',
  priority text NOT NULL DEFAULT 'Medium',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contact Communication Preferences
CREATE TABLE IF NOT EXISTS public.contact_communication_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  preferred_channel text NOT NULL DEFAULT 'No Preference',
  allow_email boolean DEFAULT true,
  allow_sms boolean DEFAULT true,
  allow_inapp boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_communication_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_access" ON public.conversations FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR (client_id IS NOT NULL AND public.user_has_client_access(auth.uid(), client_id)));
CREATE POLICY "conv_messages_access" ON public.conversation_messages FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR (client_id IS NOT NULL AND public.user_has_client_access(auth.uid(), client_id)));
CREATE POLICY "templates_access" ON public.message_templates FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR (client_id IS NOT NULL AND public.user_has_client_access(auth.uid(), client_id)));
CREATE POLICY "followup_access" ON public.follow_up_queues FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR (client_id IS NOT NULL AND public.user_has_client_access(auth.uid(), client_id)));
CREATE POLICY "comm_prefs_access" ON public.contact_communication_preferences FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()) OR (client_id IS NOT NULL AND public.user_has_client_access(auth.uid(), client_id)));

-- Triggers
CREATE TRIGGER set_updated_at_conversations BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_conv_messages BEFORE UPDATE ON public.conversation_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_msg_templates BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_followup BEFORE UPDATE ON public.follow_up_queues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_comm_prefs BEFORE UPDATE ON public.contact_communication_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
