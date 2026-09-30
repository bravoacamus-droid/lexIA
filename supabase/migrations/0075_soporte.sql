-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 75: soporte por chat (tickets de atención)
-- ════════════════════════════════════════════════════════════════════
-- César (29/09/2026): dentro de la plataforma, un botón flotante
-- «Ayuda» para que el usuario reporte errores o haga consultas en forma
-- de chat; César los recibe en su panel, ve quién escribe y le contesta.
--
-- Dos tablas:
--   · soporte_tickets   — la conversación: quién, de qué trata, en qué
--                         estado está y hasta dónde leyó cada lado.
--   · soporte_mensajes  — cada mensaje, del usuario o del equipo, con su
--                         captura adjunta si la hay.
--
-- Quién atiende: cualquier perfil con is_admin = true.
--
-- RLS en las dos, sin excepciones: el usuario ve y escribe solo en sus
-- tickets; el administrador ve y escribe en todos. Un usuario no puede
-- hacerse pasar por el equipo (de_equipo) ni tocar la prioridad o la
-- nota interna: lo impide el disparador de guarda.
-- ════════════════════════════════════════════════════════════════════

-- ¿Quien pregunta es administrador? security definer para que la
-- consulta a profiles no dependa de las políticas de esa tabla.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

create table if not exists public.soporte_tickets (
  id                 uuid primary key default gen_random_uuid(),
  -- Número correlativo para nombrarlo de palabra: «el ticket 12».
  numero             bigint generated always as identity,
  user_id            uuid not null references auth.users(id) on delete cascade,
  asunto             text not null check (char_length(asunto) between 1 and 160),
  categoria          text not null default 'consulta'
                       check (categoria in ('error', 'consulta', 'sugerencia', 'cuenta')),
  prioridad          text not null default 'normal' check (prioridad in ('normal', 'alta')),
  -- abierto: espera respuesta del equipo · respondido: espera al usuario
  -- · resuelto: cerrado por cualquiera de los dos (se reabre si alguien escribe).
  estado             text not null default 'abierto'
                       check (estado in ('abierto', 'respondido', 'resuelto')),
  -- Dónde estaba el usuario al escribir y con qué navegador.
  pagina             text,
  contexto           jsonb not null default '{}'::jsonb,
  -- Quién abrió la conversación: el usuario o el equipo.
  iniciado_por_equipo boolean not null default false,
  -- Nota privada del equipo; el usuario no la ve (la API no la envía).
  nota_interna       text,
  calificacion       smallint check (calificacion between 1 and 5),
  ultimo_mensaje_at  timestamptz not null default now(),
  ultimo_mensaje     text,
  leido_usuario_at   timestamptz not null default now(),
  leido_equipo_at    timestamptz not null default 'epoch',
  resuelto_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists soporte_tickets_numero_idx on public.soporte_tickets (numero);
create index if not exists soporte_tickets_user_idx on public.soporte_tickets (user_id, ultimo_mensaje_at desc);
create index if not exists soporte_tickets_estado_idx on public.soporte_tickets (estado, ultimo_mensaje_at desc);

create table if not exists public.soporte_mensajes (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.soporte_tickets(id) on delete cascade,
  autor_id     uuid not null references auth.users(id) on delete cascade,
  de_equipo    boolean not null default false,
  cuerpo       text not null default '' check (char_length(cuerpo) <= 5000),
  -- Ruta en el bucket `uploads`, dentro de la carpeta del dueño del ticket.
  adjunto_ruta text,
  adjunto_nombre text,
  created_at   timestamptz not null default now(),
  check (char_length(cuerpo) > 0 or adjunto_ruta is not null)
);

create index if not exists soporte_mensajes_ticket_idx on public.soporte_mensajes (ticket_id, created_at);

-- ── Guarda: lo que un usuario común no puede cambiar ────────────────
-- La actualización interna que hace el disparador de mensajes (marca
-- lexia.soporte_interno) sí pasa: mueve el estado y el último mensaje.

create or replace function public.soporte_tickets_guarda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.es_admin() or current_setting('lexia.soporte_interno', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.prioridad := 'normal';
    new.estado := 'abierto';
    new.nota_interna := null;
    new.iniciado_por_equipo := false;
    new.calificacion := null;
    new.leido_equipo_at := 'epoch';
    return new;
  end if;
  if new.user_id <> old.user_id
     or new.numero <> old.numero
     or new.prioridad <> old.prioridad
     or new.categoria <> old.categoria
     or new.asunto <> old.asunto
     or new.iniciado_por_equipo <> old.iniciado_por_equipo
     or new.nota_interna is distinct from old.nota_interna
     or new.leido_equipo_at <> old.leido_equipo_at
     or new.ultimo_mensaje_at <> old.ultimo_mensaje_at
     or new.ultimo_mensaje is distinct from old.ultimo_mensaje then
    raise exception 'No puedes modificar ese dato del ticket';
  end if;
  if new.calificacion is not null and new.estado <> 'resuelto' then
    raise exception 'Solo se califica una conversación resuelta';
  end if;
  return new;
end;
$$;

drop trigger if exists soporte_tickets_guarda on public.soporte_tickets;
create trigger soporte_tickets_guarda
  before insert or update on public.soporte_tickets
  for each row execute function public.soporte_tickets_guarda();

create or replace function public.soporte_tickets_fechas()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.estado = 'resuelto' and old.estado <> 'resuelto' then
    new.resuelto_at := now();
  elsif new.estado <> 'resuelto' then
    new.resuelto_at := null;
    new.calificacion := null;
  end if;
  return new;
end;
$$;

drop trigger if exists soporte_tickets_fechas on public.soporte_tickets;
create trigger soporte_tickets_fechas
  before update on public.soporte_tickets
  for each row execute function public.soporte_tickets_fechas();

-- ── Cada mensaje mueve el ticket ────────────────────────────────────
-- Un mensaje del usuario lo deja «abierto» (esperando al equipo), aunque
-- estuviera resuelto; uno del equipo lo deja «respondido». Quien escribe
-- ya leyó todo lo anterior. security definer: el usuario no puede tocar
-- estas columnas directamente (la guarda lo impide), el disparador sí.

create or replace function public.soporte_mensajes_guarda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.autor_id := auth.uid();
  -- Es del equipo si lo escribe un administrador en el ticket de otro.
  -- En su propio ticket (p. ej. probando el widget) escribe como usuario.
  new.de_equipo := public.es_admin() and not exists (
    select 1 from public.soporte_tickets t where t.id = new.ticket_id and t.user_id = auth.uid()
  );
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists soporte_mensajes_guarda on public.soporte_mensajes;
create trigger soporte_mensajes_guarda
  before insert on public.soporte_mensajes
  for each row execute function public.soporte_mensajes_guarda();

create or replace function public.soporte_mensajes_al_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resumen text := coalesce(nullif(left(regexp_replace(new.cuerpo, '\s+', ' ', 'g'), 160), ''), '📎 ' || coalesce(new.adjunto_nombre, 'Archivo adjunto'));
begin
  -- Se desactiva la guarda de columnas para esta actualización interna.
  perform set_config('lexia.soporte_interno', 'on', true);
  if new.de_equipo then
    update public.soporte_tickets
       set estado = 'respondido',
           ultimo_mensaje_at = new.created_at,
           ultimo_mensaje = resumen,
           leido_equipo_at = new.created_at
     where id = new.ticket_id;
  else
    update public.soporte_tickets
       set estado = 'abierto',
           ultimo_mensaje_at = new.created_at,
           ultimo_mensaje = resumen,
           leido_usuario_at = new.created_at
     where id = new.ticket_id;
  end if;
  perform set_config('lexia.soporte_interno', 'off', true);
  return new;
end;
$$;

drop trigger if exists soporte_mensajes_al_ticket on public.soporte_mensajes;
create trigger soporte_mensajes_al_ticket
  after insert on public.soporte_mensajes
  for each row execute function public.soporte_mensajes_al_ticket();

-- ── RLS ─────────────────────────────────────────────────────────────

alter table public.soporte_tickets enable row level security;
alter table public.soporte_mensajes enable row level security;

drop policy if exists soporte_tickets_select on public.soporte_tickets;
create policy soporte_tickets_select on public.soporte_tickets
  for select using (auth.uid() = user_id or public.es_admin());

-- El usuario abre tickets a su nombre; el equipo puede abrirlos a nombre
-- de cualquier usuario (para escribirle primero).
drop policy if exists soporte_tickets_insert on public.soporte_tickets;
create policy soporte_tickets_insert on public.soporte_tickets
  for insert with check (auth.uid() = user_id or public.es_admin());

drop policy if exists soporte_tickets_update on public.soporte_tickets;
create policy soporte_tickets_update on public.soporte_tickets
  for update using (auth.uid() = user_id or public.es_admin())
  with check (auth.uid() = user_id or public.es_admin());

-- Solo el equipo borra (conversaciones de prueba o spam).
drop policy if exists soporte_tickets_delete on public.soporte_tickets;
create policy soporte_tickets_delete on public.soporte_tickets
  for delete using (public.es_admin());

drop policy if exists soporte_mensajes_select on public.soporte_mensajes;
create policy soporte_mensajes_select on public.soporte_mensajes
  for select using (
    public.es_admin()
    or exists (select 1 from public.soporte_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

drop policy if exists soporte_mensajes_insert on public.soporte_mensajes;
create policy soporte_mensajes_insert on public.soporte_mensajes
  for insert with check (
    public.es_admin()
    or exists (select 1 from public.soporte_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- Los mensajes no se editan ni se borran: la conversación es el registro.
