CREATE TABLE public.sec_adv_services (
  crd text PRIMARY KEY,
  firm_name text,
  sec_number text,
  focus_label text,
  services text[] NOT NULL DEFAULT '{}',
  source_file text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_adv_services TO authenticated;
GRANT ALL ON public.sec_adv_services TO service_role;
ALTER TABLE public.sec_adv_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read SEC services" ON public.sec_adv_services FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_sec_adv_services_updated_at BEFORE UPDATE ON public.sec_adv_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();