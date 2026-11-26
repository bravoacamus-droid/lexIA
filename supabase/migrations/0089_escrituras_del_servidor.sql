-- ════════════════════════════════════════════════════════════════════
-- 0089 · Lo que escribe el servidor, no el navegador
--
-- Auditoría del 26/11/2026 (sigue a la 0088). Las columnas que el servidor
-- confía en `evaluations` (rutas de archivos, estado) y `voice_calls`
-- (estado, duración, ruta del audio que borra el cron) pasan a escribirse
-- solo con service role, después de comprobar el dueño.
--
-- APLICAR DESPUÉS DE DESPLEGAR el código que acompaña a esta migración:
-- el código anterior creaba evaluaciones y llamadas con la sesión del
-- usuario y dejaría de funcionar.
--
-- OJO al agregar columnas a soporte_tickets: los permisos de lectura son
-- por columna y no se heredan; una columna nueva necesita su grant.
-- ════════════════════════════════════════════════════════════════════

-- ── evaluations: el usuario lee y borra; el servidor crea y avanza ───
-- Antes: `for all`. Se podía agregar ofertas tras pagar una, devolver el
-- estado a `pending` para re-ejecutar gratis o apuntar `bases_file_path`
-- a la carpeta de otro usuario (se descarga con service role).
drop policy if exists "evaluations_owner_all" on public.evaluations;
drop policy if exists "evaluations_owner_select" on public.evaluations;
drop policy if exists "evaluations_owner_delete" on public.evaluations;
create policy "evaluations_owner_select" on public.evaluations
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "evaluations_owner_delete" on public.evaluations
  for delete to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update on public.evaluations from anon, authenticated;

-- ── voice_calls: el servidor abre, cuenta y cierra la llamada ────────
-- Antes el usuario podía insertar llamadas `active` (y con eso pedir la
-- configuración de voz sin pasar por el control del plan), cerrarlas sin
-- duración (gratis) o cambiar `audio_storage_path` para que el cron de
-- retención borrara el audio de otra persona.
drop policy if exists "voice_calls_own_insert" on public.voice_calls;
drop policy if exists "voice_calls_own_update" on public.voice_calls;
drop policy if exists "voice_calls_own_delete" on public.voice_calls;
-- Una llamada en curso no se borra: se cierra primero (y se cobra).
create policy "voice_calls_own_delete" on public.voice_calls
  for delete to authenticated
  using ((select auth.uid()) = user_id and status <> 'active');
revoke insert, update on public.voice_calls from anon, authenticated;

-- ── soporte_tickets: la nota interna no la lee el usuario ────────────
-- El disparador de guarda ya impedía escribirla; leerla no: el dueño la
-- recibía con un `select *`. Se lee con service role en la vista del
-- equipo (src/lib/soporte/servidor.ts).
revoke select on public.soporte_tickets from anon, authenticated;
grant select (
  id, numero, user_id, asunto, categoria, prioridad, estado, pagina,
  contexto, iniciado_por_equipo, calificacion, ultimo_mensaje_at,
  ultimo_mensaje, leido_usuario_at, leido_equipo_at, resuelto_at,
  created_at, updated_at, resuelto_por
) on public.soporte_tickets to authenticated;
