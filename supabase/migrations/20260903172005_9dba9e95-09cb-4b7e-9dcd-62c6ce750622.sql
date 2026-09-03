CREATE UNIQUE INDEX IF NOT EXISTS client_agreement_templates_one_active_per_client
  ON public.client_agreement_templates (client_id) WHERE is_active;