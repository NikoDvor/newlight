DROP POLICY IF EXISTS "Staff can view all client_forms" ON public.client_forms;
CREATE POLICY "Staff can view client_forms scoped"
  ON public.client_forms FOR SELECT TO authenticated
  USING (
    private.is_admin_or_operator(auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('marketing_staff'::app_role, 'support_staff'::app_role)
      )
      AND public.user_can_access_client(auth.uid(), client_id)
    )
  );