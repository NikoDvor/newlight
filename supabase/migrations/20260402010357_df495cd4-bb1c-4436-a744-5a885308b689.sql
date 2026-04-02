
-- Add lifecycle status columns to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proposal_status text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS agreement_status text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS implementation_status text NOT NULL DEFAULT 'not_started';

-- Create client_setup_items for granular setup tracking
CREATE TABLE public.client_setup_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_key text NOT NULL,
  item_label text NOT NULL,
  item_status text NOT NULL DEFAULT 'missing',
  notes text,
  submitted_by_client boolean NOT NULL DEFAULT false,
  client_value text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, item_key)
);

ALTER TABLE public.client_setup_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operators can manage all setup items"
  ON public.client_setup_items FOR ALL
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can view own setup items"
  ON public.client_setup_items FOR SELECT
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client team can update own submitted items"
  ON public.client_setup_items FOR UPDATE
  USING (public.user_has_client_access(auth.uid(), client_id) AND submitted_by_client = true);

CREATE INDEX idx_client_setup_items_client ON public.client_setup_items(client_id);

CREATE TRIGGER update_client_setup_items_updated_at
  BEFORE UPDATE ON public.client_setup_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
