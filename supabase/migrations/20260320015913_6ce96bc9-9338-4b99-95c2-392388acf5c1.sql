
-- Allow authenticated users with client access to insert/update recommended_services
CREATE POLICY "Client users can insert recommended_services"
  ON public.recommended_services FOR INSERT TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client users can update recommended_services"
  ON public.recommended_services FOR UPDATE TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- Allow authenticated users with client access to insert/update signals
CREATE POLICY "Client users can insert signals"
  ON public.service_recommendation_signals FOR INSERT TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client users can update signals"
  ON public.service_recommendation_signals FOR UPDATE TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- Allow authenticated users with client access to insert/update projection models
CREATE POLICY "Client users can insert projection models"
  ON public.revenue_projection_models FOR INSERT TO authenticated
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "Client users can update projection models"
  ON public.revenue_projection_models FOR UPDATE TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));
