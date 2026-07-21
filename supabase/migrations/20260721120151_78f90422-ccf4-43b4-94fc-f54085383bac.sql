-- 1. close_prep_links: use standard admin/operator helper
DROP POLICY IF EXISTS "Admins can delete close prep links" ON public.close_prep_links;
DROP POLICY IF EXISTS "Users can insert their own close prep links" ON public.close_prep_links;
DROP POLICY IF EXISTS "Users can update their own close prep links" ON public.close_prep_links;
DROP POLICY IF EXISTS "Users can view their own close prep links" ON public.close_prep_links;

CREATE POLICY "close_prep_links select" ON public.close_prep_links
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid()));

CREATE POLICY "close_prep_links insert" ON public.close_prep_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid()));

CREATE POLICY "close_prep_links update" ON public.close_prep_links
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR private.is_admin_or_operator(auth.uid()));

CREATE POLICY "close_prep_links delete" ON public.close_prep_links
  FOR DELETE TO authenticated
  USING (private.is_admin_or_operator(auth.uid()));

-- 2. Rate limit table for anon public-booking uploads
CREATE TABLE IF NOT EXISTS public.public_upload_rate_limit (
  bucket_window timestamptz PRIMARY KEY,
  count integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.public_upload_rate_limit TO service_role;
ALTER TABLE public.public_upload_rate_limit ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER function below touches it.

CREATE OR REPLACE FUNCTION public.check_and_increment_public_booking_upload()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_start timestamptz := date_trunc('hour', now());
  new_count integer;
  max_per_hour integer := 20;
BEGIN
  INSERT INTO public.public_upload_rate_limit (bucket_window, count)
  VALUES (window_start, 1)
  ON CONFLICT (bucket_window)
  DO UPDATE SET count = public.public_upload_rate_limit.count + 1
  RETURNING count INTO new_count;

  -- Best-effort cleanup of stale rows
  DELETE FROM public.public_upload_rate_limit
  WHERE bucket_window < now() - interval '24 hours';

  RETURN new_count <= max_per_hour;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_and_increment_public_booking_upload() TO anon, authenticated;

-- 3. Harden anon public-booking upload policy: MIME/extension whitelist + size cap + rate limit
DROP POLICY IF EXISTS "Public booking logo upload" ON storage.objects;
CREATE POLICY "Public booking logo upload"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (storage.foldername(name))[1] = 'public-booking'
    AND lower(name) ~ '\.(png|jpe?g|svg|webp)$'
    AND COALESCE((metadata->>'size')::bigint, 0) <= 5242880
    AND public.check_and_increment_public_booking_upload()
  );