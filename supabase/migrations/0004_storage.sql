-- ════════════════════════════════════════════════════════
-- Storage buckets
-- ════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('uploads', 'uploads', false, 26214400, array['application/pdf', 'image/png', 'image/jpeg']),
  ('normativa', 'normativa', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policies para 'uploads' (cada usuario su carpeta)
drop policy if exists "uploads_user_select" on storage.objects;
create policy "uploads_user_select" on storage.objects
  for select using (
    bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "uploads_user_insert" on storage.objects;
create policy "uploads_user_insert" on storage.objects
  for insert with check (
    bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "uploads_user_delete" on storage.objects;
create policy "uploads_user_delete" on storage.objects
  for delete using (
    bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies para 'normativa' (lectura pública para autenticados)
drop policy if exists "normativa_authenticated_select" on storage.objects;
create policy "normativa_authenticated_select" on storage.objects
  for select using (bucket_id = 'normativa' and auth.role() = 'authenticated');
