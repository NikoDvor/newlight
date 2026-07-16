ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS has_sales_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_compliance_requirements boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS clients_has_compliance_requirements_idx
  ON public.clients(has_compliance_requirements) WHERE has_compliance_requirements = true;