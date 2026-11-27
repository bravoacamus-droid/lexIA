-- ════════════════════════════════════════════════════════════════════
-- 0092 · Roles del equipo y herramientas por usuario
--
-- POR QUÉ
--
-- Reunión con César del 27/11/2026: las cuentas las crea el equipo (no se
-- registra cualquiera), cada una con su rol y sus permisos, y se entra con
-- correo y contraseña además de Google. Hasta ahora había un solo nivel
-- (`profiles.is_admin`: todo o nada) y las herramientas salían solo del
-- plan, así que para darle «consulta avanzada» a un usuario de Prueba
-- había que cambiarle el plan entero (pedido de César del 26/11).
--
-- QUÉ CAMBIA
--
-- 1. `permisos_de_usuario`: el rol administrativo de cada cuenta y las
--    herramientas que se le agregan o quitan sobre las de su plan. Sin
--    fila = rol «usuario» y solo su plan. La matriz rol → permisos vive
--    en `src/lib/auth/permisos.ts`; aquí solo se repite lo que necesitan
--    las políticas (quién atiende soporte).
-- 2. `registro_de_administracion`: quién creó, cambió o suspendió a quién.
-- 3. `profiles.is_admin` queda como reflejo de `rol = 'superadmin'` (lo
--    mantiene un disparador) para las políticas viejas del actualizador
--    (0011, 0069), que siguen siendo solo del equipo técnico.
-- 4. `es_admin()` (políticas de soporte, 0075) pasa a significar «atiende
--    soporte»: soporte, administrador o superadmin.
--
-- Ninguna de las dos tablas se escribe desde el navegador: las escribe el
-- servidor con service role después de comprobar el permiso del que pide.
--
-- Se puede aplicar ANTES del deploy: el código en producción no usa estas
-- tablas, y los que hoy tienen is_admin pasan a superadmin (mismo acceso).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.permisos_de_usuario (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  rol                   text not null default 'usuario'
                          check (rol in ('usuario', 'soporte', 'bibliotecario', 'administrador', 'superadmin')),
  -- Herramientas fuera de su plan que se le habilitan (siguen cobrando créditos).
  herramientas_extra    text[] not null default '{}',
  -- Herramientas de su plan que se le bloquean.
  herramientas_quitadas text[] not null default '{}',
  nota                  text check (char_length(nota) <= 500),
  actualizado_por       uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Los mismos nombres que `Herramienta` en src/lib/billing/creditos.ts.
  constraint permisos_herramientas_validas check (
    herramientas_extra <@ array[
      'consulta_texto', 'busqueda_avanzada', 'consulta_voz', 'requerimiento_menor',
      'requerimiento_seleccion', 'evaluacion_requerimiento_menor',
      'evaluacion_requerimiento_seleccion', 'evaluacion_bases', 'formulacion_consultas',
      'evaluacion_ofertas', 'documentos_ejecucion', 'absolucion_consultas'
    ]::text[]
    and herramientas_quitadas <@ array[
      'consulta_texto', 'busqueda_avanzada', 'consulta_voz', 'requerimiento_menor',
      'requerimiento_seleccion', 'evaluacion_requerimiento_menor',
      'evaluacion_requerimiento_seleccion', 'evaluacion_bases', 'formulacion_consultas',
      'evaluacion_ofertas', 'documentos_ejecucion', 'absolucion_consultas'
    ]::text[]
  )
);

create index if not exists permisos_de_usuario_rol_idx
  on public.permisos_de_usuario (rol) where rol <> 'usuario';

alter table public.permisos_de_usuario enable row level security;

-- Cada uno ve los suyos (el menú los usa); nadie los escribe desde el navegador.
drop policy if exists "permisos: ver los propios" on public.permisos_de_usuario;
create policy "permisos: ver los propios" on public.permisos_de_usuario
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.permisos_de_usuario from anon, authenticated;
grant select on public.permisos_de_usuario to authenticated;

-- ── Registro ─────────────────────────────────────────────────────────

create table if not exists public.registro_de_administracion (
  id         bigint generated always as identity primary key,
  actor      uuid references auth.users(id) on delete set null,
  accion     text not null,
  usuario    uuid references auth.users(id) on delete set null,
  detalle    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists registro_admin_usuario_idx
  on public.registro_de_administracion (usuario, created_at desc);
create index if not exists registro_admin_fecha_idx
  on public.registro_de_administracion (created_at desc);

alter table public.registro_de_administracion enable row level security;
-- Sin políticas: solo el servidor (service role) lo lee y escribe.
revoke all on public.registro_de_administracion from anon, authenticated;

-- ── is_admin como reflejo del rol ────────────────────────────────────

create or replace function public.reflejar_rol_en_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set is_admin = false where id = old.user_id;
    return old;
  end if;
  update public.profiles
     set is_admin = (new.rol = 'superadmin')
   where id = new.user_id
     and is_admin is distinct from (new.rol = 'superadmin');
  return new;
end;
$$;

revoke all on function public.reflejar_rol_en_perfil() from public, anon, authenticated;

drop trigger if exists permisos_reflejan_is_admin on public.permisos_de_usuario;
create trigger permisos_reflejan_is_admin
  after insert or update of rol or delete on public.permisos_de_usuario
  for each row execute function public.reflejar_rol_en_perfil();

-- Los administradores de hoy conservan su acceso como superadmin.
insert into public.permisos_de_usuario (user_id, rol)
select p.id, 'superadmin'
  from public.profiles p
 where p.is_admin = true
on conflict (user_id) do update set rol = 'superadmin', updated_at = now();

-- ── Quién atiende soporte ────────────────────────────────────────────

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.rol in ('soporte', 'administrador', 'superadmin')
       from public.permisos_de_usuario u
      where u.user_id = auth.uid()),
    -- Cuentas con is_admin anteriores a esta migración sin fila (no
    -- debería haber: el insert de arriba las pasa a superadmin).
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;
