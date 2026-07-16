
CREATE TYPE public.text_message_direction AS ENUM ('outbound', 'inbound');

CREATE TABLE public.client_text_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  direction public.text_message_direction NOT NULL,
  phone_number text NOT NULL,
  message_body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  twilio_message_sid text,
  send_status text NOT NULL DEFAULT 'sent',
  error_note text,
  sent_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ctm_contact ON public.client_text_messages(contact_id, sent_at DESC);
CREATE INDEX idx_ctm_client ON public.client_text_messages(client_id, sent_at DESC);

GRANT SELECT, INSERT ON public.client_text_messages TO authenticated;
GRANT ALL ON public.client_text_messages TO service_role;

ALTER TABLE public.client_text_messages ENABLE ROW LEVEL SECURITY;

-- Append-only: SELECT + INSERT only for authenticated tenants. No UPDATE, no DELETE policy => blocked.
CREATE POLICY "Tenant can read own text messages"
  ON public.client_text_messages FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Tenant can insert own text messages"
  ON public.client_text_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
