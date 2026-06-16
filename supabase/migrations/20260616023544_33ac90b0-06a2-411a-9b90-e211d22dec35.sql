ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_status text DEFAULT 'none'
    CHECK (stripe_status IN ('none','active','past_due','cancelled','trialing'));

CREATE INDEX IF NOT EXISTS clients_stripe_customer_idx ON public.clients(stripe_customer_id);