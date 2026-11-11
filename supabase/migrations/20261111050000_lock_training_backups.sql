-- Security finding: three training backup tables had no row-level security. Lock every training backup table
-- (no policies = only the service role can read them). The app never reads these.
do $$ declare t text; begin
for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname like 'nl_training%backup%' or c.relname like 'nl_training%bak%') loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from anon, authenticated', t);
end loop; end $$;
