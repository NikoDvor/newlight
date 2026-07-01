CREATE POLICY "Staff can view all client_forms"
ON public.client_forms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('marketing_staff', 'support_staff', 'admin', 'operator')
  )
);