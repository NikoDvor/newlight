-- The email queue helpers are SECURITY DEFINER and were executable by anon/authenticated: anyone could enqueue or read mail
-- sent from our domain. Only the service role (edge functions) may call them.
revoke execute on function public.delete_email(text, bigint), public.enqueue_email(text, jsonb),
  public.move_to_dlq(text, text, bigint, jsonb), public.read_email_batch(text, integer, integer) from public, anon, authenticated;
