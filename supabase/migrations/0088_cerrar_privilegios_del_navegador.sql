-- ════════════════════════════════════════════════════════════════════
-- 0088 · Privilegios que el navegador ya no puede tocar
--
-- Auditoría del 26/11/2026. Una política UPDATE de RLS dice QUÉ filas, no
-- QUÉ columnas: con la anon key que viaja en el bundle, un usuario podía
-- cambiar columnas de su fila que el servidor usa para autorizar.
--
-- Esta parte no depende del código nuevo: se puede aplicar con el código
-- que ya está en producción. Lo que sí depende (evaluaciones, llamadas,
-- nota interna de soporte) va en la 0089, después del deploy.
--
-- OJO al agregar columnas a profiles: los permisos por columna no se
-- heredan. Una columna nueva que el usuario deba editar necesita su grant.
-- ════════════════════════════════════════════════════════════════════

-- ── profiles: el usuario edita sus datos, no sus privilegios ─────────
-- `is_admin` y `role` quedan fuera. Los escriben un administrador desde
-- el SQL Editor o el servidor con service role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (
  full_name,
  organization,
  organization_name,
  ruc,
  position_title,
  avatar_url,
  profile_role,
  onboarding_completed,
  profile_metadata
) on public.profiles to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── user_surveys: las escribe /api/surveys con service role ──────────
-- Con `for all`, poner `reward_granted = false` y volver a enviar la
-- encuesta daba otra bonificación.
drop policy if exists "user_surveys: owner all" on public.user_surveys;
drop policy if exists "user_surveys: owner select" on public.user_surveys;
create policy "user_surveys: owner select" on public.user_surveys
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.user_surveys from anon, authenticated;

-- ── Biblioteca y búsqueda: solo con sesión ───────────────────────────
-- Con la anon key se podía bajar todo el corpus (raw_text incluido) y
-- lanzar búsquedas pesadas contra una base pequeña. Ninguna página
-- pública consulta estas tablas.
drop policy if exists "normative_documents_select_authenticated" on public.normative_documents;
create policy "normative_documents_select_authenticated" on public.normative_documents
  for select to authenticated
  using (true);

drop policy if exists "normative_chunks_select_authenticated" on public.normative_chunks;
create policy "normative_chunks_select_authenticated" on public.normative_chunks
  for select to authenticated
  using (true);

drop policy if exists normative_acts_select on public.normative_acts;
create policy normative_acts_select on public.normative_acts
  for select to authenticated
  using (true);

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'hybrid_search', 'buscar_frase', 'buscar_con_todas_las_palabras',
        'fragmentos_con_palabras', 'documentos_que_tratan', 'library_facets',
        'find_related_documents', 'search_training_qa', 'consulta_de_termino',
        'documento_con_el_mismo_texto'
      )
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;

  -- Mantenimiento: las llama pg_cron, un script con service role o otra
  -- función. Nadie desde la API.
  for f in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('calentar_cache', 'documentos_sin_resumen', 'renovar_bolsa')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ── Créditos: el signo según el movimiento (defensa en profundidad) ──
-- `consumir_creditos` y `reembolsar_creditos` no validan el monto: solo
-- las llama el servidor, pero un consumo con monto negativo sumaría
-- créditos. Un consumo resta (<= 0) y un reembolso suma (>= 0); si no,
-- la función aborta. `not valid`: no se revisan las filas viejas.
alter table public.movimientos_de_creditos
  drop constraint if exists movimientos_signo_segun_origen;
alter table public.movimientos_de_creditos
  add constraint movimientos_signo_segun_origen check (
    (origen = 'consumo' and creditos <= 0)
    or (origen = 'reembolso' and creditos >= 0)
    or origen not in ('consumo', 'reembolso')
  ) not valid;
