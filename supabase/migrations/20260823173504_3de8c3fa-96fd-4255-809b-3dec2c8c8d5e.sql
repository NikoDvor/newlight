ALTER TABLE public.employee_profiles
  ADD CONSTRAINT employee_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;