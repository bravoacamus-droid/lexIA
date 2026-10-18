-- Planes de A-LexIA con bolsa de créditos (documento «PLANES DE A-LEXIA»
-- de César, 17/10/2026).
--
-- Antes: cuatro planes (free_trial, starter, pro, enterprise) con una
-- cuota mensual por función y solo por usuario. Ahora:
--   · seis planes: prueba, consulta, profesional, especialista, equipos y
--     organizaciones;
--   · una BOLSA común de créditos para todas las herramientas habilitadas,
--     que se renueva cada mes y no se acumula; las recargas la amplían;
--   · equipos: varios usuarios con cuentas individuales y una sola bolsa.
--
-- La bolsa es de un usuario o de un equipo, nunca de los dos. El consumo
-- se descuenta con una función que bloquea la fila, para que dos
-- pedidos simultáneos no gasten el mismo saldo.

-- ── Equipos ────────────────────────────────────────────────────────────
create table if not exists public.equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  propietario uuid not null references auth.users(id) on delete cascade,
  max_usuarios int not null default 5 check (max_usuarios between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.miembros_de_equipo (
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('propietario', 'miembro')),
  created_at timestamptz not null default now(),
  primary key (equipo_id, user_id)
);

create table if not exists public.invitaciones_de_equipo (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  token text not null unique,
  creada_por uuid not null references auth.users(id) on delete cascade,
  usada_por uuid references auth.users(id) on delete set null,
  usada_at timestamptz,
  expira_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- ── Bolsas de créditos ─────────────────────────────────────────────────
create table if not exists public.bolsas_de_creditos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  equipo_id uuid unique references public.equipos(id) on delete cascade,
  plan text not null check (plan in ('prueba', 'consulta', 'profesional', 'especialista', 'equipos', 'organizaciones')),
  modalidad text not null default 'mensual' check (modalidad in ('mensual', 'anual')),
  estado text not null default 'activo' check (estado in ('activo', 'suspendido')),
  creditos_mes int not null check (creditos_mes >= 0),
  periodo_inicio timestamptz not null default now(),
  periodo_fin timestamptz not null,
  -- Fin del acceso: la prueba a los 30 días; un plan pagado, al terminar
  -- lo pagado. Null = sin vencimiento (cuentas internas).
  vence_at timestamptz,
  usados_periodo int not null default 0 check (usados_periodo >= 0),
  saldo_recargas int not null default 0 check (saldo_recargas >= 0),
  updated_at timestamptz not null default now(),
  check ((user_id is null) <> (equipo_id is null))
);

create table if not exists public.movimientos_de_creditos (
  id bigserial primary key,
  bolsa_id uuid not null references public.bolsas_de_creditos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  -- 'consumo' resta; 'recarga', 'asignacion', 'reembolso' y 'ajuste' suman o corrigen.
  origen text not null check (origen in ('consumo', 'reembolso', 'recarga', 'asignacion', 'ajuste')),
  herramienta text,
  creditos int not null,
  detalle text,
  periodo_inicio timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_de_creditos_bolsa_idx on public.movimientos_de_creditos (bolsa_id, created_at desc);
create index if not exists movimientos_de_creditos_periodo_idx on public.movimientos_de_creditos (bolsa_id, periodo_inicio, herramienta);

-- ── RLS ────────────────────────────────────────────────────────────────
-- Se lee lo propio y lo del propio equipo; todas las escrituras van por
-- el servidor (service role) o por las funciones de abajo.
alter table public.equipos enable row level security;
alter table public.miembros_de_equipo enable row level security;
alter table public.invitaciones_de_equipo enable row level security;
alter table public.bolsas_de_creditos enable row level security;
alter table public.movimientos_de_creditos enable row level security;

create or replace function public.mi_equipo() returns uuid
language sql stable security definer set search_path = public as $$
  select equipo_id from public.miembros_de_equipo where user_id = auth.uid()
$$;

drop policy if exists "equipos: miembros leen" on public.equipos;
create policy "equipos: miembros leen" on public.equipos for select
  using (id = public.mi_equipo());

drop policy if exists "miembros: del mismo equipo" on public.miembros_de_equipo;
create policy "miembros: del mismo equipo" on public.miembros_de_equipo for select
  using (equipo_id = public.mi_equipo());

drop policy if exists "invitaciones: propietario lee" on public.invitaciones_de_equipo;
create policy "invitaciones: propietario lee" on public.invitaciones_de_equipo for select
  using (exists (select 1 from public.equipos e where e.id = equipo_id and e.propietario = auth.uid()));

drop policy if exists "bolsas: propia o del equipo" on public.bolsas_de_creditos;
create policy "bolsas: propia o del equipo" on public.bolsas_de_creditos for select
  using (user_id = auth.uid() or equipo_id = public.mi_equipo());

drop policy if exists "movimientos: de mi bolsa" on public.movimientos_de_creditos;
create policy "movimientos: de mi bolsa" on public.movimientos_de_creditos for select
  using (exists (
    select 1 from public.bolsas_de_creditos b
    where b.id = bolsa_id and (b.user_id = auth.uid() or b.equipo_id = public.mi_equipo())
  ));

-- ── Renovación del periodo ─────────────────────────────────────────────
-- Los créditos del mes se renuevan en el aniversario de la bolsa (no el
-- día 1), también en el plan anual. La prueba no se renueva.
create or replace function public.renovar_bolsa(b public.bolsas_de_creditos)
returns public.bolsas_de_creditos
language plpgsql as $$
begin
  if b.plan = 'prueba' then return b; end if;
  while b.periodo_fin <= now() and (b.vence_at is null or b.periodo_fin < b.vence_at) loop
    b.periodo_inicio := b.periodo_fin;
    b.periodo_fin := b.periodo_fin + interval '1 month';
    b.usados_periodo := 0;
  end loop;
  return b;
end $$;

-- ── Consumo atómico ────────────────────────────────────────────────────
-- Descuenta primero de los créditos del mes y luego de las recargas.
-- Devuelve {ok, motivo, disponibles, mes_restante, recargas}.
create or replace function public.consumir_creditos(
  p_bolsa uuid, p_user uuid, p_herramienta text, p_creditos int, p_detalle text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.bolsas_de_creditos;
  restante_mes int;
  del_mes int;
begin
  select * into b from public.bolsas_de_creditos where id = p_bolsa for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sin_bolsa'); end if;
  b := public.renovar_bolsa(b);
  if b.estado <> 'activo' then
    return jsonb_build_object('ok', false, 'motivo', 'suspendido');
  end if;
  if b.vence_at is not null and now() >= b.vence_at then
    return jsonb_build_object('ok', false, 'motivo', 'vencido');
  end if;
  restante_mes := greatest(b.creditos_mes - b.usados_periodo, 0);
  if restante_mes + b.saldo_recargas < p_creditos then
    update public.bolsas_de_creditos
      set periodo_inicio = b.periodo_inicio, periodo_fin = b.periodo_fin, usados_periodo = b.usados_periodo, updated_at = now()
      where id = p_bolsa;
    return jsonb_build_object('ok', false, 'motivo', 'sin_creditos', 'disponibles', restante_mes + b.saldo_recargas);
  end if;
  del_mes := least(p_creditos, restante_mes);
  update public.bolsas_de_creditos set
    periodo_inicio = b.periodo_inicio,
    periodo_fin = b.periodo_fin,
    usados_periodo = b.usados_periodo + del_mes,
    saldo_recargas = b.saldo_recargas - (p_creditos - del_mes),
    updated_at = now()
  where id = p_bolsa;
  insert into public.movimientos_de_creditos (bolsa_id, user_id, origen, herramienta, creditos, detalle, periodo_inicio)
    values (p_bolsa, p_user, 'consumo', p_herramienta, -p_creditos, p_detalle, b.periodo_inicio);
  return jsonb_build_object(
    'ok', true,
    'disponibles', restante_mes - del_mes + b.saldo_recargas - (p_creditos - del_mes),
    'mes_restante', restante_mes - del_mes,
    'recargas', b.saldo_recargas - (p_creditos - del_mes)
  );
end $$;

-- Devuelve créditos de una tarea que falló antes de entregar resultado.
create or replace function public.reembolsar_creditos(
  p_bolsa uuid, p_user uuid, p_herramienta text, p_creditos int, p_detalle text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bolsas_de_creditos;
  al_mes int;
begin
  select * into b from public.bolsas_de_creditos where id = p_bolsa for update;
  if not found then return; end if;
  al_mes := least(p_creditos, b.usados_periodo);
  update public.bolsas_de_creditos set
    usados_periodo = usados_periodo - al_mes,
    saldo_recargas = saldo_recargas + (p_creditos - al_mes),
    updated_at = now()
  where id = p_bolsa;
  insert into public.movimientos_de_creditos (bolsa_id, user_id, origen, herramienta, creditos, detalle, periodo_inicio)
    values (p_bolsa, p_user, 'reembolso', p_herramienta, p_creditos, p_detalle, b.periodo_inicio);
end $$;

revoke all on function public.consumir_creditos(uuid, uuid, text, int, text) from public, anon, authenticated;
revoke all on function public.reembolsar_creditos(uuid, uuid, text, int, text) from public, anon, authenticated;

-- ── Bolsas para los usuarios existentes ────────────────────────────────
-- Prueba vigente: 20 preguntas hasta su fecha de fin. Prueba vencida:
-- bolsa de prueba vencida. Cuentas «enterprise» (internas: el equipo de
-- A-LexIA y César): Especialista sin vencimiento y saldo amplio.
insert into public.bolsas_de_creditos (user_id, plan, creditos_mes, periodo_inicio, periodo_fin, vence_at)
select s.user_id,
       case when s.tier = 'enterprise' then 'especialista'
            when s.tier = 'pro' then 'profesional'
            when s.tier = 'starter' then 'consulta'
            else 'prueba' end,
       case when s.tier = 'enterprise' then 100000
            when s.tier = 'pro' then 500
            when s.tier = 'starter' then 200
            else 20 end,
       now(),
       case when s.tier in ('enterprise', 'pro', 'starter') then now() + interval '1 month'
            else coalesce(s.trial_ends_at, now()) end,
       case when s.tier = 'enterprise' then null
            when s.tier in ('pro', 'starter') then coalesce(s.current_period_end, now() + interval '1 month')
            else coalesce(s.trial_ends_at, now()) end
from public.subscriptions s
where not exists (select 1 from public.bolsas_de_creditos b where b.user_id = s.user_id);

-- ── Nuevos usuarios: Prueba A-LexIA ────────────────────────────────────
-- 20 preguntas o 30 días, lo que ocurra primero; una sola vez.
create or replace function public.crear_bolsa_de_prueba()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bolsas_de_creditos (user_id, plan, creditos_mes, periodo_inicio, periodo_fin, vence_at)
  values (new.user_id, 'prueba', 20, now(), now() + interval '30 days', now() + interval '30 days')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists bolsa_de_prueba_al_crear_suscripcion on public.subscriptions;
create trigger bolsa_de_prueba_al_crear_suscripcion
  after insert on public.subscriptions
  for each row execute function public.crear_bolsa_de_prueba();
