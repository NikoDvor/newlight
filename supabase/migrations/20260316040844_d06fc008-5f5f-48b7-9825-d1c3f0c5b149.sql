
-- Add missing fields to calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS booking_source text DEFAULT 'manual';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reschedule_reason text;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES crm_contacts(id);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES crm_companies(id);

-- Email connections table
CREATE TABLE IF NOT EXISTS email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gmail',
  email_address text,
  display_name text,
  status text NOT NULL DEFAULT 'not_started',
  config jsonb DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email_connections" ON email_connections FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own email_connections" ON email_connections FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo email_connections" ON email_connections FOR ALL TO anon USING (true) WITH CHECK (true);

-- Email messages table
CREATE TABLE IF NOT EXISTS email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES email_connections(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id),
  message_id_header text,
  thread_id text,
  subject text,
  from_address text,
  from_name text,
  to_address text,
  body_text text,
  body_html text,
  direction text NOT NULL DEFAULT 'inbound',
  folder text NOT NULL DEFAULT 'inbox',
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email_messages" ON email_messages FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid())) WITH CHECK (is_admin_or_operator(auth.uid()));
CREATE POLICY "Client users manage own email_messages" ON email_messages FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id)) WITH CHECK (user_has_client_access(auth.uid(), client_id));
CREATE POLICY "Anon demo email_messages" ON email_messages FOR ALL TO anon USING (true) WITH CHECK (true);
