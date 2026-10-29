-- Training rebuild (Oct 29, 2026). Applied directly via SQL; kept here as a record. Idempotent.

-- Module / chapter metadata used by the new training screens.
alter table public.nl_training_modules  add column if not exists has_quiz boolean not null default false;
alter table public.nl_training_modules  add column if not exists tagline text;
alter table public.nl_training_chapters add column if not exists audience text not null default 'all';
alter table public.nl_training_chapters add column if not exists est_minutes integer;

-- One row per user per day they trained (drives streaks).
create table if not exists public.nl_training_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.nl_training_activity_days enable row level security;
drop policy if exists "own activity days select" on public.nl_training_activity_days;
create policy "own activity days select" on public.nl_training_activity_days for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own activity days insert" on public.nl_training_activity_days;
create policy "own activity days insert" on public.nl_training_activity_days for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "admins read activity days" on public.nl_training_activity_days;
create policy "admins read activity days" on public.nl_training_activity_days for select to authenticated using (private.is_admin_or_operator(auth.uid()));

-- Module 9 "Your Why". PRIVATE: only the owner can read or write (no admin policy on purpose).
-- Old goals are kept: changing the goal or deadline archives the current row (is_current=false) and inserts a new one.
create table if not exists public.nl_my_why (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  goal_amount numeric,
  deadline date not null,
  dream_life text,
  quotes jsonb not null default '[]'::jsonb,   -- the user's own quotes (strings)
  favorite_quotes jsonb not null default '[]'::jsonb, -- built-in quote ids they kept
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists nl_my_why_one_current on public.nl_my_why(user_id) where is_current;
alter table public.nl_my_why enable row level security;
drop policy if exists "own why" on public.nl_my_why;
create policy "own why" on public.nl_my_why for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
