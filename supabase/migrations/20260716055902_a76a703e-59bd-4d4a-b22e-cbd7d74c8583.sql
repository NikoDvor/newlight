
-- 1) Add Stripe card-on-file fields to billing_accounts
ALTER TABLE public.billing_accounts
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS card_last4 text,
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS card_saved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_billing_accounts_stripe_customer
  ON public.billing_accounts(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2) commission_billing_runs
CREATE TABLE IF NOT EXISTS public.commission_billing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pricing_model text NOT NULL CHECK (pricing_model IN ('retainer','commission')),
  revenue_base numeric(14,2),
  rate_applied numeric(6,3),
  amount_charged numeric(14,2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','skipped')),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.commission_billing_runs TO authenticated;
GRANT ALL ON public.commission_billing_runs TO service_role;

ALTER TABLE public.commission_billing_runs ENABLE ROW LEVEL SECURITY;

-- Admin/operator full access
CREATE POLICY "cbr_admin_operator_all"
  ON public.commission_billing_runs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','operator'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','operator'))
  );

-- Client users can read their own client's runs
CREATE POLICY "cbr_client_read_own"
  ON public.commission_billing_runs
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE INDEX IF NOT EXISTS idx_cbr_client ON public.commission_billing_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_cbr_period ON public.commission_billing_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_cbr_status ON public.commission_billing_runs(status);
