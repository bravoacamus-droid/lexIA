-- ════════════════════════════════════════════════════════════════════
-- Crear bucket "templates" para plantillas oficiales (.docx, .pdf)
-- accesibles desde la app en producción.
--
-- Hasta ahora los `source_path` de generator_templates apuntaban a
-- rutas locales del PC del desarrollador. En producción esos archivos
-- no existen. Las plantillas viven ahora en Supabase Storage.
--
-- También agregamos el slug 'bases_especiales' para registrar las
-- Bases Especiales del OECE (5 PDFs entregados por el cliente).
-- ════════════════════════════════════════════════════════════════════

-- 1. Bucket de plantillas (privado, requiere auth para descargar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'templates',
  'templates',
  false,
  10485760, -- 10 MB
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies: cualquier usuario autenticado puede LEER las plantillas
--    (necesario para que el generador las pueda usar). Solo admins
--    pueden escribir/eliminar (se hace via service role desde scripts).
drop policy if exists "templates_authenticated_select" on storage.objects;
create policy "templates_authenticated_select" on storage.objects
  for select using (
    bucket_id = 'templates' and auth.role() = 'authenticated'
  );

-- 3. Agregar slug nuevo para Bases Especiales OECE
alter type generator_slug add value if not exists 'bases_especiales';
