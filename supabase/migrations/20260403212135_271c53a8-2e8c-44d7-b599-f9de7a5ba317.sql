-- Remove the dangerous anon read policy
DROP POLICY IF EXISTS "Anon demo read prospects" ON public.prospects;

-- Ensure authenticated users with proper roles can read prospects (if not already covered by existing "Admins manage prospects" ALL policy)
-- The existing "Admins manage prospects" policy already covers SELECT for admin/operator, so no new policy needed.