-- Add client-scoping to three policies that previously granted marketing_staff
-- workspace-wide privileges. Admin retains cross-tenant access.

DROP POLICY IF EXISTS promoters_update ON public.promoters;
CREATE POLICY promoters_update ON public.promoters
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'marketing_staff'::app_role)
        AND public.user_can_access_client(auth.uid(), client_id))
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'marketing_staff'::app_role)
        AND public.user_can_access_client(auth.uid(), client_id))
  );

DROP POLICY IF EXISTS testimonials_delete ON public.testimonials;
CREATE POLICY testimonials_delete ON public.testimonials
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'marketing_staff'::app_role)
        AND public.user_can_access_client(auth.uid(), client_id))
  );

DROP POLICY IF EXISTS "marketing_versions reviewer update" ON public.marketing_material_versions;
CREATE POLICY "marketing_versions reviewer update" ON public.marketing_material_versions
  FOR UPDATE TO authenticated
  USING (
    (private.has_role(auth.uid(), 'admin'::app_role)
     OR private.has_role(auth.uid(), 'marketing_staff'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.marketing_materials m
      WHERE m.id = marketing_material_versions.material_id
        AND public.user_can_access_client(auth.uid(), m.client_id)
    )
  )
  WITH CHECK (
    (private.has_role(auth.uid(), 'admin'::app_role)
     OR private.has_role(auth.uid(), 'marketing_staff'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.marketing_materials m
      WHERE m.id = marketing_material_versions.material_id
        AND public.user_can_access_client(auth.uid(), m.client_id)
    )
  );