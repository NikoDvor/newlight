-- SECURITY FIX: get_employee_client_id must NOT fall back to a real client_id.
CREATE OR REPLACE FUNCTION public.get_employee_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT client_id FROM public.employee_profiles WHERE user_id = _user_id LIMIT 1),
    (SELECT client_id FROM public.workspace_users WHERE user_id = _user_id AND status = 'active' ORDER BY created_at LIMIT 1)
  );
$$;