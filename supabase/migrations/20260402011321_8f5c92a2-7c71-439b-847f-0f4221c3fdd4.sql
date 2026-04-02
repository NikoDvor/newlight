
-- Add client submission tracking fields
ALTER TABLE public.client_setup_items
  ADD COLUMN IF NOT EXISTS client_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_file_url text;

-- Allow client team to insert setup items for their workspace
CREATE POLICY "Client team can insert own setup items"
  ON public.client_setup_items FOR INSERT
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));
