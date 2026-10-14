-- Additive migration. Inspect existing remote schema before applying.
begin;
create table public.workbench_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  schema_version integer not null check (schema_version > 0),
  revision bigint not null check (revision > 0 and revision <= 9007199254740991),
  base_revision bigint not null check (base_revision >= 0 and base_revision < revision),
  device_id text not null check (length(device_id) between 1 and 200),
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workbench_snapshots enable row level security;
create policy snapshots_select_own on public.workbench_snapshots for select to authenticated using (user_id = (select auth.uid()));
create policy snapshots_insert_own on public.workbench_snapshots for insert to authenticated with check (user_id = (select auth.uid()));
create policy snapshots_update_own on public.workbench_snapshots for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy snapshots_delete_own on public.workbench_snapshots for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.workbench_snapshots from anon;
grant select, insert, update, delete on public.workbench_snapshots to authenticated;

-- Enforce CAS even for direct REST updates, not only callers of the RPC.
create function public.workbench_snapshot_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.base_revision <> 0 then raise exception 'revision_conflict' using errcode = '40001'; end if;
  else
    if NEW.user_id <> OLD.user_id or NEW.id <> OLD.id then raise exception 'snapshot_identity_immutable'; end if;
    if NEW.base_revision <> OLD.revision or NEW.revision <= OLD.revision then
      raise exception 'revision_conflict' using errcode = '40001';
    end if;
    NEW.created_at := OLD.created_at;
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;
create trigger workbench_snapshot_guard before insert or update on public.workbench_snapshots
for each row execute function public.workbench_snapshot_guard();

create function public.push_workbench_snapshot(
  expected_revision bigint, next_revision bigint, snapshot_schema integer,
  source_device text, snapshot_checksum text, snapshot_state jsonb
) returns setof public.workbench_snapshots
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if expected_revision = 0 then
    return query insert into public.workbench_snapshots
      (user_id, schema_version, revision, base_revision, device_id, checksum, state)
      values (auth.uid(), snapshot_schema, next_revision, 0, source_device, snapshot_checksum, snapshot_state)
      on conflict (user_id) do nothing returning *;
  else
    return query update public.workbench_snapshots set
      schema_version = snapshot_schema, revision = next_revision, base_revision = expected_revision,
      device_id = source_device, checksum = snapshot_checksum, state = snapshot_state
      where user_id = auth.uid() and revision = expected_revision returning *;
  end if;
  if not found then raise exception 'revision_conflict' using errcode = '40001'; end if;
end;
$$;
revoke all on function public.push_workbench_snapshot(bigint,bigint,integer,text,text,jsonb) from public, anon;
grant execute on function public.push_workbench_snapshot(bigint,bigint,integer,text,text,jsonb) to authenticated;
commit;
