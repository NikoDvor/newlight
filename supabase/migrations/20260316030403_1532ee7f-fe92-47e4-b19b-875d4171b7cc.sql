
-- Add missing CRM contact fields
ALTER TABLE public.crm_contacts 
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_contact_date timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_interaction_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS number_of_appointments integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS number_of_purchases integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'new_lead';
