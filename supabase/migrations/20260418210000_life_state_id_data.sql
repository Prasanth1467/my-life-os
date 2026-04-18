-- life_state: id (text PK), data (jsonb), updated_at
-- Runs after 20260418195400. Drop policies before ALTER TYPE (policies bind to column).

-- Optional cloud migration objects
drop trigger if exists life_state_validate_payload on public.life_state;
drop function if exists public.life_state_validate_payload();

drop function if exists public.get_life_state();
drop function if exists public.update_life_state(jsonb);
drop function if exists public.merge_life_state(jsonb);

-- Policies must be dropped before renaming / changing column types
drop policy if exists "life_state_select_own" on public.life_state;
drop policy if exists "life_state_insert_own" on public.life_state;
drop policy if exists "life_state_update_own" on public.life_state;
drop policy if exists "life_state_delete_own" on public.life_state;

alter table public.life_state drop constraint if exists life_state_user_id_fkey;

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'life_state'
      and c.column_name = 'payload'
  ) then
    alter table public.life_state rename column payload to data;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'life_state'
      and c.column_name = 'user_id'
  ) then
    alter table public.life_state rename column user_id to id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'life_state'
      and c.column_name = 'id'
      and c.data_type = 'uuid'
  ) then
    alter table public.life_state alter column id type text using id::text;
  end if;
end $$;

create policy "life_state_select_own"
  on public.life_state for select
  to authenticated
  using (id = auth.uid()::text);

create policy "life_state_insert_own"
  on public.life_state for insert
  to authenticated
  with check (id = auth.uid()::text);

create policy "life_state_update_own"
  on public.life_state for update
  to authenticated
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

create policy "life_state_delete_own"
  on public.life_state for delete
  to authenticated
  using (id = auth.uid()::text);
