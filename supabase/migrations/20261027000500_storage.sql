insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('evidence', 'evidence', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('incident-files', 'incident-files', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp']);

create policy evidence_own on storage.objects for all to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy incident_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'incident-files' and public.is_reporter(((storage.foldername(name))[1])::uuid));
create policy incident_files_read on storage.objects for select to authenticated
  using (bucket_id = 'incident-files' and (
    public.is_reporter(((storage.foldername(name))[1])::uuid)
    or exists (select 1 from public.incidents i where i.id = ((storage.foldername(name))[1])::uuid
               and public.has_org_role(i.org_id, '{investigator}'))));
