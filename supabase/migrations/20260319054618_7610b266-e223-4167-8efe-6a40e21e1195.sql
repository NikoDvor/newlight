
-- Billing accounts
CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  billing_status text NOT NULL DEFAULT 'Pending Setup',
  billing_owner_user_id uuid,
  billing_email text,
  default_currency text DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  billing_account_id uuid REFERENCES public.billing_accounts(id) ON DELETE CASCADE NOT NULL,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  subscription_name text NOT NULL,
  service_package_type text,
  subscription_status text NOT NULL DEFAULT 'Draft',
  billing_frequency text NOT NULL DEFAULT 'Monthly',
  monthly_amount numeric DEFAULT 0,
  setup_fee_amount numeric DEFAULT 0,
  ad_spend_commitment_amount numeric DEFAULT 0,
  contract_length_months integer DEFAULT 6,
  contract_start_date date,
  contract_end_date date,
  auto_renew boolean DEFAULT false,
  next_invoice_date date,
  last_invoice_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  billing_account_id uuid REFERENCES public.billing_accounts(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_type text NOT NULL DEFAULT 'Subscription',
  invoice_status text NOT NULL DEFAULT 'Draft',
  subtotal_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  due_date date,
  issued_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  item_description text,
  item_type text DEFAULT 'service',
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payment records
CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  billing_account_id uuid REFERENCES public.billing_accounts(id) ON DELETE CASCADE NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_provider text DEFAULT 'manual',
  payment_method_type text DEFAULT 'Manual',
  payment_status text NOT NULL DEFAULT 'Pending',
  amount numeric DEFAULT 0,
  transaction_reference text,
  paid_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contract records
CREATE TABLE IF NOT EXISTS public.contract_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  contract_status text NOT NULL DEFAULT 'Draft',
  contract_length_months integer DEFAULT 6,
  start_date date,
  end_date date,
  auto_renew boolean DEFAULT false,
  signed_at timestamptz,
  enforcement_mode text DEFAULT 'Standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Billing events
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  related_type text,
  related_id uuid,
  event_type text NOT NULL,
  event_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at triggers
CREATE OR REPLACE TRIGGER update_billing_accounts_updated_at BEFORE UPDATE ON public.billing_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_invoice_line_items_updated_at BEFORE UPDATE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_contract_records_updated_at BEFORE UPDATE ON public.contract_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Admin/operator full access policies
CREATE POLICY "admin_billing_accounts" ON public.billing_accounts FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_line_items.invoice_id AND public.is_admin_or_operator(auth.uid())));
CREATE POLICY "admin_payment_records" ON public.payment_records FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_contract_records" ON public.contract_records FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "admin_billing_events" ON public.billing_events FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid()));

-- Client read-only access
CREATE POLICY "client_billing_accounts_read" ON public.billing_accounts FOR SELECT TO authenticated USING (public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "client_subscriptions_read" ON public.subscriptions FOR SELECT TO authenticated USING (public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "client_invoices_read" ON public.invoices FOR SELECT TO authenticated USING (public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "client_payment_records_read" ON public.payment_records FOR SELECT TO authenticated USING (public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "client_contract_records_read" ON public.contract_records FOR SELECT TO authenticated USING (public.user_has_client_access(auth.uid(), client_id));
