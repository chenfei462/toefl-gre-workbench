-- Intentional CAS conflicts must return HTTP 409. PostgREST 14 retries SQLSTATE
-- 40001 as a transient serialization failure instead of returning the conflict.
-- Replace only these function bodies; existing table, trigger and RLS stay intact.
begin;
create or replace function public.workbench_snapshot_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.base_revision <> 0 then raise exception 'revision_conflict' using errcode = 'PT409'; end if;
  else
    if NEW.user_id <> OLD.user_id or NEW.id <> OLD.id then raise exception 'snapshot_identity_immutable'; end if;
    if NEW.base_revision <> OLD.revision or NEW.revision <= OLD.revision then
      raise exception 'revision_conflict' using errcode = 'PT409';
    end if;
    NEW.created_at := OLD.created_at;
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;

create or replace function public.push_workbench_snapshot(
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
  if not found then raise exception 'revision_conflict' using errcode = 'PT409'; end if;
end;
$$;
revoke all on function public.push_workbench_snapshot(bigint,bigint,integer,text,text,jsonb) from public, anon;
grant execute on function public.push_workbench_snapshot(bigint,bigint,integer,text,text,jsonb) to authenticated;
commit;
