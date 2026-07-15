CREATE TYPE public.promoter_type AS ENUM ('client','non_client','employee','coi');
CREATE TYPE public.promoter_agreement_status AS ENUM ('draft','active','expired','terminated');
CREATE TYPE public.promoter_compensation_type AS ENUM ('cash','non_cash','none');
CREATE TYPE public.promoter_compensation_period AS ENUM ('one_time','monthly','annual');
CREATE TYPE public.testimonial_disclosure_method AS ENUM ('embedded','linked','verbal_disclosed');

CREATE TABLE public.promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  full_name text NOT NULL,
  promoter_type public.promoter_type NOT NULL DEFAULT 'client',
  is_ineligible_person boolean NOT NULL DEFAULT false,
  disciplinary_lookback_notes text,
  requires_written_agreement boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promoters TO authenticated;
GRANT ALL ON public.promoters TO service_role;
ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promoters_select" ON public.promoters FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "promoters_insert" ON public.promoters FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "promoters_update" ON public.promoters FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'marketing_staff'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'marketing_staff'::public.app_role));
CREATE POLICY "promoters_delete" ON public.promoters FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.promoter_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  agreement_url text,
  effective_date date,
  expiration_date date,
  compensation_type public.promoter_compensation_type NOT NULL DEFAULT 'none',
  compensation_amount numeric(12,2),
  compensation_period public.promoter_compensation_period,
  status public.promoter_agreement_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promoter_agreements TO authenticated;
GRANT ALL ON public.promoter_agreements TO service_role;
ALTER TABLE public.promoter_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promoter_agreements_access" ON public.promoter_agreements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.promoters p WHERE p.id = promoter_id AND public.user_can_access_client(auth.uid(), p.client_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.promoters p WHERE p.id = promoter_id AND public.user_can_access_client(auth.uid(), p.client_id)));

CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.marketing_materials(id) ON DELETE SET NULL,
  testimonial_text text NOT NULL,
  disclosed_client_status boolean NOT NULL DEFAULT false,
  disclosed_compensation boolean NOT NULL DEFAULT false,
  disclosed_conflicts boolean NOT NULL DEFAULT false,
  disclosure_delivered_at timestamptz,
  disclosure_method public.testimonial_disclosure_method,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_select" ON public.testimonials FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "testimonials_insert" ON public.testimonials FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "testimonials_update" ON public.testimonials FOR UPDATE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "testimonials_delete" ON public.testimonials FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'marketing_staff'::public.app_role));

CREATE TABLE public.promoter_compensation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  twelve_month_running_total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promoter_compensation_log TO authenticated;
GRANT ALL ON public.promoter_compensation_log TO service_role;
ALTER TABLE public.promoter_compensation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_log_access" ON public.promoter_compensation_log FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.promoters p WHERE p.id = promoter_id AND public.user_can_access_client(auth.uid(), p.client_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.promoters p WHERE p.id = promoter_id AND public.user_can_access_client(auth.uid(), p.client_id)));

CREATE TRIGGER promoters_updated_at BEFORE UPDATE ON public.promoters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER promoter_agreements_updated_at BEFORE UPDATE ON public.promoter_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER testimonials_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_testimonial_disclosure_completeness()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.material_id IS NOT NULL THEN
    IF NEW.disclosed_client_status IS NOT TRUE
       OR NEW.disclosed_compensation IS NOT TRUE
       OR NEW.disclosed_conflicts IS NOT TRUE THEN
      RAISE EXCEPTION 'Testimonial cannot be linked to a marketing material until all three disclosures (client status, compensation, conflicts) are confirmed.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER testimonials_enforce_disclosure_completeness
  BEFORE INSERT OR UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.enforce_testimonial_disclosure_completeness();

CREATE OR REPLACE FUNCTION public.recalc_promoter_comp_rollup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  running numeric(14,2);
  prev_running numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO running
  FROM public.promoter_compensation_log
  WHERE promoter_id = NEW.promoter_id
    AND paid_at >= (NEW.paid_at - interval '12 months')
    AND paid_at <= NEW.paid_at;
  running := running + NEW.amount;
  NEW.twelve_month_running_total := running;

  SELECT COALESCE(MAX(twelve_month_running_total),0) INTO prev_running
  FROM public.promoter_compensation_log
  WHERE promoter_id = NEW.promoter_id
    AND paid_at < NEW.paid_at;

  IF running >= 1000 AND prev_running < 1000 THEN
    UPDATE public.promoters
    SET requires_written_agreement = true, updated_at = now()
    WHERE id = NEW.promoter_id AND requires_written_agreement = false;
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER promoter_comp_log_rollup
  BEFORE INSERT ON public.promoter_compensation_log
  FOR EACH ROW EXECUTE FUNCTION public.recalc_promoter_comp_rollup();