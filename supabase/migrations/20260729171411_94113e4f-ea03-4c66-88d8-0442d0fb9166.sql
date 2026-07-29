ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;

ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS period_start date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS period_end date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS failure_notification_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_commission_period_unique
  ON public.invoices (client_id, invoice_type, period_start, period_end)
  WHERE invoice_type = 'commission';