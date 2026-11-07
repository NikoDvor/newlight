-- Add "Too much risk" as a pipeline lost reason (matches the meeting-outcome taxonomy's too_risky).
ALTER TABLE public.crm_deals DROP CONSTRAINT IF EXISTS crm_deals_lost_reason_check;
ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_lost_reason_check
  CHECK (lost_reason IS NULL OR lost_reason = ANY (ARRAY['price','too_risky','timing','no_show','chose_competitor','unresponsive','other']));
