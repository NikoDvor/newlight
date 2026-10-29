-- Meeting recordings vault (Oct 29, 2026). Applied directly via SQL; kept here as a record. Idempotent.
-- One row per recorded meeting. Zoom meetings on NewLight's account arrive automatically (zoom-webhook,
-- recording.completed → video + audio + transcript copied into storage). Anyone can upload a recording
-- of a meeting held elsewhere. client_id = the workspace (NewLight internal or a client sub-account).

create table if not exists public.nl_meeting_recordings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.bdr_calendar_events(id) on delete set null,
  lead_id uuid references public.nl_bdr_leads(id) on delete set null,
  source text not null default 'upload' check (source in ('zoom','upload')),
  title text,
  meeting_kind text,
  zoom_meeting_id text,
  zoom_uuid text,
  started_at timestamptz,
  duration_minutes integer,
  video_path text,
  audio_path text,
  transcript text,
  zoom_share_url text,
  zoom_share_password text,
  size_bytes bigint,
  status text not null default 'ready' check (status in ('processing','ready','partial','failed')),
  error text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists nl_meeting_recordings_zoom_uuid on public.nl_meeting_recordings(zoom_uuid) where zoom_uuid is not null;
create index if not exists nl_meeting_recordings_owner on public.nl_meeting_recordings(owner_user_id, started_at desc);
create index if not exists nl_meeting_recordings_client on public.nl_meeting_recordings(client_id, started_at desc);
create index if not exists nl_meeting_recordings_lead on public.nl_meeting_recordings(lead_id);

-- Workspace owners (client_owner) see their whole team; NewLight admins/operators see everything; everyone sees their own.
create or replace function private.can_view_recordings_of(_user uuid, _client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_admin_or_operator(_user)
      or exists (select 1 from public.user_roles r where r.user_id = _user and r.client_id = _client and r.role = 'client_owner');
$$;

alter table public.nl_meeting_recordings enable row level security;
drop policy if exists "recordings select" on public.nl_meeting_recordings;
create policy "recordings select" on public.nl_meeting_recordings for select to authenticated
  using (owner_user_id = auth.uid() or private.can_view_recordings_of(auth.uid(), client_id));
drop policy if exists "recordings insert own upload" on public.nl_meeting_recordings;
create policy "recordings insert own upload" on public.nl_meeting_recordings for insert to authenticated
  with check (owner_user_id = auth.uid() and source = 'upload' and private.user_has_client_access(auth.uid(), client_id));
drop policy if exists "recordings update" on public.nl_meeting_recordings;
create policy "recordings update" on public.nl_meeting_recordings for update to authenticated
  using (owner_user_id = auth.uid() or private.can_view_recordings_of(auth.uid(), client_id))
  with check (owner_user_id = auth.uid() or private.can_view_recordings_of(auth.uid(), client_id));
drop policy if exists "recordings delete" on public.nl_meeting_recordings;
create policy "recordings delete" on public.nl_meeting_recordings for delete to authenticated
  using (private.can_view_recordings_of(auth.uid(), client_id));
grant select, insert, update, delete on public.nl_meeting_recordings to authenticated;

-- Storage: private bucket, path = <client_id>/<owner_user_id>/<file>
insert into storage.buckets (id, name, public) values ('meeting-recordings', 'meeting-recordings', false)
on conflict (id) do nothing;

drop policy if exists "meeting recordings read" on storage.objects;
create policy "meeting recordings read" on storage.objects for select to authenticated using (
  bucket_id = 'meeting-recordings' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or private.can_view_recordings_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);
drop policy if exists "meeting recordings upload own" on storage.objects;
create policy "meeting recordings upload own" on storage.objects for insert to authenticated with check (
  bucket_id = 'meeting-recordings'
  and (storage.foldername(name))[2] = auth.uid()::text
  and private.user_has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
drop policy if exists "meeting recordings delete" on storage.objects;
create policy "meeting recordings delete" on storage.objects for delete to authenticated using (
  bucket_id = 'meeting-recordings' and private.can_view_recordings_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
