begin;
-- A preexisting bucket is an inspection requirement, never silently reconfigured.
insert into storage.buckets (id, name, public) values
  ('speaking-recordings', 'speaking-recordings', false),
  ('study-materials', 'study-materials', false);
create policy workbench_objects_select_own on storage.objects for select to authenticated
using (bucket_id in ('speaking-recordings', 'study-materials') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy workbench_objects_insert_own on storage.objects for insert to authenticated
with check (bucket_id in ('speaking-recordings', 'study-materials') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy workbench_objects_update_own on storage.objects for update to authenticated
using (bucket_id in ('speaking-recordings', 'study-materials') and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id in ('speaking-recordings', 'study-materials') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy workbench_objects_delete_own on storage.objects for delete to authenticated
using (bucket_id in ('speaking-recordings', 'study-materials') and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
