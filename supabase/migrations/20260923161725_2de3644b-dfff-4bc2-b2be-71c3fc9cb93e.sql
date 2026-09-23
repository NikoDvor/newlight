CREATE TABLE public.fl_insurance_licensees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number text NOT NULL,
  license_tycl text,
  business_name text NOT NULL,
  npn text,
  residency_type text,
  license_type text,
  license_status text,
  license_issue_date date,
  email text,
  phone text,
  address1 text,
  address2 text,
  city text,
  state text,
  zip text,
  county text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_number, license_tycl)
);

GRANT SELECT ON public.fl_insurance_licensees TO authenticated;
GRANT ALL ON public.fl_insurance_licensees TO service_role;

ALTER TABLE public.fl_insurance_licensees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read FL insurance licensees"
ON public.fl_insurance_licensees
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_fl_ins_city ON public.fl_insurance_licensees (upper(city));
CREATE INDEX idx_fl_ins_name ON public.fl_insurance_licensees (upper(business_name) text_pattern_ops);

CREATE TRIGGER update_fl_insurance_licensees_updated_at
BEFORE UPDATE ON public.fl_insurance_licensees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();