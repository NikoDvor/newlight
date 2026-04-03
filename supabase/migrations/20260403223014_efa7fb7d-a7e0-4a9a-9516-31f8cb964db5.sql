-- Fix notification recipient isolation
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  public.is_admin_or_operator(auth.uid())
  OR (
    public.user_has_client_access(auth.uid(), client_id)
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  )
);

-- Fix notification update isolation
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (
  public.is_admin_or_operator(auth.uid())
  OR (
    public.user_has_client_access(auth.uid(), client_id)
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  )
);