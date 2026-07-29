ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS revenue_webhook_token text NOT NULL DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX IF NOT EXISTS clients_revenue_webhook_token_key
  ON public.clients (revenue_webhook_token);

ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS revenue_auto_logged boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.auto_log_closed_won_revenue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pipeline_stage = 'closed_won'
     AND (TG_OP = 'INSERT' OR OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
     AND COALESCE(NEW.revenue_auto_logged, false) = false
     AND COALESCE(NEW.deal_value, 0) > 0 THEN

    INSERT INTO public.financial_adjustments (client_id, type, amount, reason, created_at)
    VALUES (NEW.client_id, 'revenue', NEW.deal_value,
            'Auto-logged: deal closed won — ' || COALESCE(NEW.deal_name, 'Untitled deal'),
            now());

    NEW.revenue_auto_logged := true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_log_closed_won_revenue ON public.crm_deals;
CREATE TRIGGER trg_auto_log_closed_won_revenue
  BEFORE INSERT OR UPDATE OF pipeline_stage ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_closed_won_revenue();