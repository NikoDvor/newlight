CREATE TABLE public.client_training_sop (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  company_intro text NOT NULL DEFAULT '',
  sales_process text NOT NULL DEFAULT '',
  core_offer text NOT NULL DEFAULT '',
  scripts text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_training_sop ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all client SOPs"
ON public.client_training_sop
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Employees read their own client SOP"
ON public.client_training_sop
FOR SELECT
TO authenticated
USING (public.get_employee_client_id(auth.uid()) = client_id);

CREATE TRIGGER update_client_training_sop_updated_at
BEFORE UPDATE ON public.client_training_sop
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();