-- Life OS: one JSON document per user + Realtime sync
-- Enable Anonymous Sign-ins in Supabase Dashboard (Authentication > Providers) for seamless web sync.

create table if not exists public.life_state (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists life_state_updated_at_idx on public.life_state (updated_at desc);

alter table public.life_state enable row level security;

drop policy if exists "life_state_select_own" on public.life_state;
drop policy if exists "life_state_insert_own" on public.life_state;
drop policy if exists "life_state_update_own" on public.life_state;
drop policy if exists "life_state_delete_own" on public.life_state;

create policy "life_state_select_own"
  on public.life_state for select
  to authenticated
  using (auth.uid() = user_id);

create policy "life_state_insert_own"
  on public.life_state for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "life_state_update_own"
  on public.life_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "life_state_delete_own"
  on public.life_state for delete
  to authenticated
  using (auth.uid() = user_id);

-- Realtime broadcast for cross-tab / multi-device sync
alter publication supabase_realtime add table public.life_state;

create or replace function public.life_state_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists life_state_set_updated_at on public.life_state;
create trigger life_state_set_updated_at
  before insert or update on public.life_state
  for each row
  execute function public.life_state_set_updated_at();

-- Server cron audit (written only via service role from Vercel Cron)
create table if not exists public.cron_heartbeat (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  label text not null default 'vercel'
);

alter table public.cron_heartbeat enable row level security;

revoke all on public.cron_heartbeat from anon, authenticated;
