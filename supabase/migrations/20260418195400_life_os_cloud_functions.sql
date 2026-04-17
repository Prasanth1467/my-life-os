-- Life OS: RPCs, deep merge, payload validation, analytics tables, cron cleanup helpers

-- ---------------------------------------------------------------------------
-- Deep JSON merge (objects recurse; arrays / scalars replaced when patch sets key)
-- ---------------------------------------------------------------------------
create or replace function public.jsonb_merge_deep(a jsonb, b jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  k text;
  va jsonb;
  vb jsonb;
  out jsonb := '{}'::jsonb;
begin
  if b is null or b = 'null'::jsonb then
    return coalesce(a, '{}'::jsonb);
  end if;
  if jsonb_typeof(b) <> 'object' then
    return b;
  end if;
  if a is null or jsonb_typeof(a) <> 'object' then
    return b;
  end if;

  for k in
    select distinct x from (
      select jsonb_object_keys(a) as x
      union
      select jsonb_object_keys(b) as x
    ) s
  loop
    va := a -> k;
    vb := b -> k;
    if not (b ? k) then
      out := out || jsonb_build_object(k, va);
    elsif va is null or jsonb_typeof(va) <> 'object' or jsonb_typeof(vb) <> 'object' then
      out := out || jsonb_build_object(k, vb);
    else
      out := out || jsonb_build_object(k, public.jsonb_merge_deep(va, vb));
    end if;
  end loop;

  return out;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payload sanity check (trigger + RPC)
-- ---------------------------------------------------------------------------
create or replace function public.life_state_assert_valid(p jsonb)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'life_state payload must be a JSON object';
  end if;
  if (p ->> 'schemaVersion') is distinct from '1' then
    raise exception 'life_state invalid schemaVersion';
  end if;
  if (p -> 'createdAt') is null or jsonb_typeof(p -> 'createdAt') <> 'number' then
    raise exception 'life_state invalid createdAt';
  end if;
  if (p -> 'updatedAt') is null or jsonb_typeof(p -> 'updatedAt') <> 'number' then
    raise exception 'life_state invalid updatedAt';
  end if;
  if (p ->> 'startDate') is null then
    raise exception 'life_state invalid startDate';
  end if;
  if jsonb_typeof(p -> 'daily') <> 'object' then
    raise exception 'life_state invalid daily';
  end if;
  if jsonb_typeof(p -> 'gamification') <> 'object' then
    raise exception 'life_state invalid gamification';
  end if;
  if jsonb_typeof(p -> 'settings') <> 'object' then
    raise exception 'life_state invalid settings';
  end if;
end;
$$;

create or replace function public.life_state_validate_payload()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.life_state_assert_valid(new.payload);
  return new;
end;
$$;

drop trigger if exists life_state_validate_payload on public.life_state;
create trigger life_state_validate_payload
  before insert or update on public.life_state
  for each row
  execute function public.life_state_validate_payload();

-- ---------------------------------------------------------------------------
-- RPC: read / replace / merge (atomic, RLS via invoker)
-- ---------------------------------------------------------------------------
create or replace function public.get_life_state()
returns table (payload jsonb, updated_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select l.payload, l.updated_at
  from public.life_state l
  where l.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.update_life_state(p_payload jsonb)
returns table (payload jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform public.life_state_assert_valid(p_payload);

  insert into public.life_state (user_id, payload)
  values (uid, p_payload)
  on conflict (user_id) do update
    set payload = excluded.payload;

  return query
  select l.payload, l.updated_at from public.life_state l where l.user_id = uid;
end;
$$;

create or replace function public.merge_life_state(p_patch jsonb)
returns table (payload jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur jsonb;
  merged jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select ls.payload into cur from public.life_state ls where ls.user_id = uid;
  merged := public.jsonb_merge_deep(coalesce(cur, '{}'::jsonb), coalesce(p_patch, '{}'::jsonb));
  perform public.life_state_assert_valid(merged);

  insert into public.life_state (user_id, payload)
  values (uid, merged)
  on conflict (user_id) do update
    set payload = excluded.payload;

  return query
  select l.payload, l.updated_at from public.life_state l where l.user_id = uid;
end;
$$;

grant execute on function public.get_life_state() to authenticated;
grant execute on function public.update_life_state(jsonb) to authenticated;
grant execute on function public.merge_life_state(jsonb) to authenticated;
-- merge_life_state calls jsonb_merge_deep; invoker must be able to execute helper
grant execute on function public.jsonb_merge_deep(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Analytics (optional; RLS: own rows only)
-- ---------------------------------------------------------------------------
create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  day text not null,
  xp_delta integer not null default 0,
  kind text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists xp_events_user_occurred_idx on public.xp_events (user_id, occurred_at desc);

alter table public.xp_events enable row level security;

drop policy if exists "xp_events_select_own" on public.xp_events;
drop policy if exists "xp_events_insert_own" on public.xp_events;
drop policy if exists "xp_events_delete_own" on public.xp_events;

create policy "xp_events_select_own"
  on public.xp_events for select
  to authenticated
  using (auth.uid() = user_id);

create policy "xp_events_insert_own"
  on public.xp_events for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "xp_events_delete_own"
  on public.xp_events for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.daily_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  day text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists daily_metrics_user_updated_idx on public.daily_metrics (user_id, updated_at desc);

alter table public.daily_metrics enable row level security;

drop policy if exists "daily_metrics_select_own" on public.daily_metrics;
drop policy if exists "daily_metrics_insert_own" on public.daily_metrics;
drop policy if exists "daily_metrics_update_own" on public.daily_metrics;
drop policy if exists "daily_metrics_delete_own" on public.daily_metrics;

create policy "daily_metrics_select_own"
  on public.daily_metrics for select
  to authenticated
  using (auth.uid() = user_id);

create policy "daily_metrics_insert_own"
  on public.daily_metrics for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "daily_metrics_update_own"
  on public.daily_metrics for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_metrics_delete_own"
  on public.daily_metrics for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Cron: retention helper (called from Vercel with service role)
-- ---------------------------------------------------------------------------
create or replace function public.cron_maintenance_cleanup(p_heartbeat_days integer default 90)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cron_heartbeat
  where ran_at < now() - (p_heartbeat_days::text || ' days')::interval;
end;
$$;

revoke all on function public.cron_maintenance_cleanup(integer) from public;
grant execute on function public.cron_maintenance_cleanup(integer) to service_role;
