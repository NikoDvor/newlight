ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_staff';

CREATE TABLE IF NOT EXISTS public.employee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  job_title TEXT,
  employee_role public.app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view their own profile" ON public.employee_profiles;
CREATE POLICY "Employees can view their own profile"
ON public.employee_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and operators can view employee profiles" ON public.employee_profiles;
CREATE POLICY "Admins and operators can view employee profiles"
ON public.employee_profiles
FOR SELECT
TO authenticated
USING (public.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins and operators can create employee profiles" ON public.employee_profiles;
CREATE POLICY "Admins and operators can create employee profiles"
ON public.employee_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Admins and operators can update employee profiles" ON public.employee_profiles;
CREATE POLICY "Admins and operators can update employee profiles"
ON public.employee_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_operator(auth.uid()))
WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE TRIGGER update_employee_profiles_updated_at
BEFORE UPDATE ON public.employee_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();