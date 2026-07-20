
-- Phase 1a: forms table schema for global scoping
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS form_slug text,
  ADD COLUMN IF NOT EXISTS external_route text,
  ADD COLUMN IF NOT EXISTS sequence_number int;

-- Make client_id nullable so global rows can exist without a tenant
ALTER TABLE public.forms ALTER COLUMN client_id DROP NOT NULL;

-- Enforce pairing: global rows must have NULL client_id; non-global must have a client_id
ALTER TABLE public.forms
  DROP CONSTRAINT IF EXISTS forms_global_client_pairing;
ALTER TABLE public.forms
  ADD CONSTRAINT forms_global_client_pairing
  CHECK ((is_global = true AND client_id IS NULL) OR (is_global = false AND client_id IS NOT NULL));

-- Unique slug for global forms only (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS forms_global_slug_key
  ON public.forms (form_slug) WHERE is_global = true;

-- Global-form policies
DROP POLICY IF EXISTS "Admins manage global forms" ON public.forms;
CREATE POLICY "Admins manage global forms" ON public.forms
  FOR ALL
  TO authenticated
  USING (is_global = true AND private.is_admin_or_operator(auth.uid()))
  WITH CHECK (is_global = true AND private.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read global forms" ON public.forms;
CREATE POLICY "Authenticated read global forms" ON public.forms
  FOR SELECT
  TO authenticated
  USING (is_global = true);

-- Phase 1b: seed the 5 registered global forms
INSERT INTO public.forms
  (client_id, form_name, form_type, description, is_active, is_global, form_slug, external_route, sequence_number,
   create_contact_on_submit, update_existing_contact, create_task_on_submit, show_logo, show_timezone, collect_notes)
VALUES
  (NULL, 'Meeting Cancel / Reschedule', 'utility',
   'Client-facing token page for a prospect to cancel or reschedule a booked meeting. Not part of the numbered onboarding sequence.',
   true, true, 'meeting-cancel', '/meeting/cancel/:token', NULL, false, false, false, false, false, false),
  (NULL, 'Form 1 — Discovery', 'booking',
   'Public BDR discovery-call booking form. Prospects submit business + contact info and pick a discovery slot.',
   true, true, 'discovery', '/bdr/book/:slug', 1, true, true, false, true, true, true),
  (NULL, 'Form 2 — Get Started (Close Prep)', 'internal',
   'Salesman-facing close prep. Locks in Initial Fee, Pricing Model, and generates the Proposal + Service Agreement envelope + Closing Meeting.',
   true, true, 'get-started', '/employee/close-prep/:leadId', 2, false, false, false, false, false, true),
  (NULL, 'Form 3 — Pay & Sign', 'external',
   'Client-facing page (opened from email after closing meeting) to pay the initial invoice and e-sign the Service Agreement in one flow.',
   true, true, 'pay-sign', '/pay-sign/:token', 3, false, false, false, true, false, false),
  (NULL, 'Form 4 — Activation', 'internal',
   'Unified admin activation entry point that consolidates Onboarding, Client Intake, Webinar Registration, and Master Activation Wizard.',
   true, true, 'activation', '/activation', 4, false, false, false, false, false, false)
ON CONFLICT DO NOTHING;

-- Phase 1c: crm_deals pay-sign wiring
ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS pay_sign_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS service_agreement_envelope_id uuid,
  ADD COLUMN IF NOT EXISTS payment_invoice_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='crm_deals_service_envelope_fk') THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT crm_deals_service_envelope_fk
      FOREIGN KEY (service_agreement_envelope_id) REFERENCES public.document_envelopes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='crm_deals_payment_invoice_fk') THEN
    ALTER TABLE public.crm_deals
      ADD CONSTRAINT crm_deals_payment_invoice_fk
      FOREIGN KEY (payment_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS crm_deals_service_envelope_idx ON public.crm_deals(service_agreement_envelope_id) WHERE service_agreement_envelope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_deals_payment_invoice_idx ON public.crm_deals(payment_invoice_id) WHERE payment_invoice_id IS NOT NULL;
