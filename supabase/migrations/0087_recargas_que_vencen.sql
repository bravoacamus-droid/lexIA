-- Recargas que vencen y renovación mensual anclada al inicio del plan
-- (respuestas de César del 18/10/2026 a los «PLANES DE A-LEXIA»).
--
-- «Los créditos de recarga sí deben vencer cada mes (cumplido los 30 días
-- calendario) y deben renovarse de manera mensual para los que tienen
-- inscripción anual.»
--
-- Antes: `bolsas_de_creditos.saldo_recargas` era un solo número sin fecha.
-- Ahora cada recarga es un LOTE con su saldo y su vencimiento (30 días
-- calendario desde que se activa). El consumo se descuenta primero de los
-- créditos del mes y luego del lote que vence primero; el movimiento de
-- consumo guarda de dónde salió cada crédito (`desglose`), para que un
-- reembolso devuelva cada crédito a su sitio. Un lote vencido deja de
-- contar y su saldo se anota como «vencimiento».
--
-- La renovación mensual (también la del plan anual) se calcula desde el
-- inicio del plan (`inicio_plan` + n meses) y no sumando un mes al fin
-- del periodo anterior: sumando, un plan activado el 31 de enero pasaba a
-- renovarse el 28 de cada mes después de febrero.
--
-- No se borra nada: el saldo de recargas que hubiera pasa a un lote que
-- vence a los 30 días de hoy.

begin;

-- ── Lotes de recarga ───────────────────────────────────────────────────
create table if not exists public.recargas_de_creditos (
  id uuid primary key default gen_random_uuid(),
  bolsa_id uuid not null references public.bolsas_de_creditos(id) on delete cascade,
  creditos int not null check (creditos > 0),
  saldo int not null check (saldo >= 0),
  activada_at timestamptz not null default now(),
  vence_at timestamptz not null,
  detalle text,
  creada_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (saldo <= creditos),
  check (vence_at > activada_at)
);
create index if not exists recargas_de_creditos_bolsa_idx on public.recargas_de_creditos (bolsa_id, vence_at);

-- RLS: se leen los lotes de la bolsa propia o del propio equipo; todas
-- las escrituras van por el servidor (service role) o por las funciones
-- de abajo, como en las demás tablas de créditos (0086).
alter table public.recargas_de_creditos enable row level security;
drop policy if exists "recargas: de mi bolsa" on public.recargas_de_creditos;
create policy "recargas: de mi bolsa" on public.recargas_de_creditos for select
  using (exists (
    select 1 from public.bolsas_de_creditos b
    where b.id = bolsa_id and (b.user_id = auth.uid() or b.equipo_id = public.mi_equipo())
  ));

-- ── Movimientos: desglose, reembolso y vencimiento ─────────────────────
alter table public.movimientos_de_creditos
  add column if not exists desglose jsonb,
  add column if not exists reembolsado_at timestamptz,
  add column if not exists recarga_id uuid references public.recargas_de_creditos(id) on delete set null;
alter table public.movimientos_de_creditos drop constraint if exists movimientos_de_creditos_origen_check;
alter table public.movimientos_de_creditos add constraint movimientos_de_creditos_origen_check
  check (origen in ('consumo', 'reembolso', 'recarga', 'asignacion', 'ajuste', 'vencimiento'));

-- ── Ancla de la renovación ─────────────────────────────────────────────
alter table public.bolsas_de_creditos add column if not exists inicio_plan timestamptz;
update public.bolsas_de_creditos set inicio_plan = periodo_inicio where inicio_plan is null;
alter table public.bolsas_de_creditos alter column inicio_plan set default now();
alter table public.bolsas_de_creditos alter column inicio_plan set not null;

-- ── El saldo de recargas que hubiera pasa a un lote de 30 días ─────────
insert into public.recargas_de_creditos (bolsa_id, creditos, saldo, activada_at, vence_at, detalle)
select b.id, b.saldo_recargas, b.saldo_recargas, now(), now() + interval '30 days',
       'Saldo de recargas anterior al vencimiento por recarga (migración 0087)'
from public.bolsas_de_creditos b
where b.saldo_recargas > 0;
update public.bolsas_de_creditos set saldo_recargas = 0 where saldo_recargas > 0;
comment on column public.bolsas_de_creditos.saldo_recargas is
  'Obsoleta desde la migración 0087: el saldo de recargas vive en recargas_de_creditos (un lote por recarga, con vencimiento).';

-- ── Renovación del periodo ─────────────────────────────────────────────
-- Los créditos del mes se renuevan cada mes desde el inicio del plan,
-- también en el plan anual (12 renovaciones dentro del año pagado). La
-- prueba no se renueva.
create or replace function public.renovar_bolsa(b public.bolsas_de_creditos)
returns public.bolsas_de_creditos
language plpgsql as $$
declare
  k int := 0;
begin
  if b.plan = 'prueba' or b.periodo_fin > now() then return b; end if;
  -- Cuántos meses desde el inicio del plan hasta el fin del periodo guardado.
  while b.inicio_plan + make_interval(months => k) < b.periodo_fin loop
    k := k + 1;
  end loop;
  while b.periodo_fin <= now() and (b.vence_at is null or b.periodo_fin < b.vence_at) loop
    k := k + 1;
    b.periodo_inicio := b.periodo_fin;
    b.periodo_fin := b.inicio_plan + make_interval(months => k);
    b.usados_periodo := 0;
  end loop;
  return b;
end $$;

-- ── Vencimiento de lotes ───────────────────────────────────────────────
-- Anota como «vencimiento» el saldo de los lotes que ya vencieron y lo
-- deja en cero. Se llama con la bolsa bloqueada.
create or replace function public.vencer_recargas(p_bolsa uuid, p_periodo timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  total int := 0;
begin
  for r in
    select id, saldo, activada_at from public.recargas_de_creditos
    where bolsa_id = p_bolsa and saldo > 0 and vence_at <= now()
    for update
  loop
    update public.recargas_de_creditos set saldo = 0 where id = r.id;
    insert into public.movimientos_de_creditos (bolsa_id, user_id, origen, herramienta, creditos, detalle, periodo_inicio, recarga_id)
      values (p_bolsa, null, 'vencimiento', null, -r.saldo,
              'Venció la recarga del ' || to_char(r.activada_at at time zone 'America/Lima', 'DD/MM/YYYY') || ' (30 días)',
              p_periodo, r.id);
    total := total + r.saldo;
  end loop;
  return total;
end $$;

-- ── Recarga ────────────────────────────────────────────────────────────
-- Un lote nuevo que vence a los `p_dias` días calendario (30) de activado.
create or replace function public.recargar_creditos(
  p_bolsa uuid, p_user uuid, p_creditos int, p_detalle text, p_dias int default 30
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b public.bolsas_de_creditos;
  rid uuid;
begin
  if p_creditos is null or p_creditos < 1 then raise exception 'La recarga debe ser de al menos 1 crédito'; end if;
  select * into b from public.bolsas_de_creditos where id = p_bolsa for update;
  if not found then raise exception 'No existe la bolsa %', p_bolsa; end if;
  insert into public.recargas_de_creditos (bolsa_id, creditos, saldo, activada_at, vence_at, detalle, creada_por)
    values (p_bolsa, p_creditos, p_creditos, now(), now() + make_interval(days => greatest(p_dias, 1)), p_detalle, p_user)
    returning id into rid;
  insert into public.movimientos_de_creditos (bolsa_id, user_id, origen, herramienta, creditos, detalle, periodo_inicio, recarga_id)
    values (p_bolsa, p_user, 'recarga', null, p_creditos,
            coalesce(p_detalle, 'Recarga de ' || p_creditos || ' créditos'), b.periodo_inicio, rid);
  return rid;
end $$;

-- ── Consumo atómico ────────────────────────────────────────────────────
-- Descuenta primero de los créditos del mes y luego de los lotes de
-- recarga vigentes, del que vence primero al último.
-- Devuelve {ok, motivo, disponibles, mes_restante, recargas, movimiento}.
create or replace function public.consumir_creditos(
  p_bolsa uuid, p_user uuid, p_herramienta text, p_creditos int, p_detalle text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.bolsas_de_creditos;
  restante_mes int;
  del_mes int;
  vigentes int;
  falta int;
  toma int;
  r record;
  lotes jsonb := '[]'::jsonb;
  mov bigint;
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
  perform public.vencer_recargas(p_bolsa, b.periodo_inicio);
  select coalesce(sum(saldo), 0) into vigentes
    from public.recargas_de_creditos where bolsa_id = p_bolsa and saldo > 0 and vence_at > now();
  restante_mes := greatest(b.creditos_mes - b.usados_periodo, 0);
  if restante_mes + vigentes < p_creditos then
    update public.bolsas_de_creditos
      set periodo_inicio = b.periodo_inicio, periodo_fin = b.periodo_fin, usados_periodo = b.usados_periodo, updated_at = now()
      where id = p_bolsa;
    return jsonb_build_object('ok', false, 'motivo', 'sin_creditos', 'disponibles', restante_mes + vigentes);
  end if;
  del_mes := least(p_creditos, restante_mes);
  falta := p_creditos - del_mes;
  for r in
    select id, saldo from public.recargas_de_creditos
    where bolsa_id = p_bolsa and saldo > 0 and vence_at > now()
    order by vence_at, activada_at
    for update
  loop
    exit when falta <= 0;
    toma := least(falta, r.saldo);
    update public.recargas_de_creditos set saldo = saldo - toma where id = r.id;
    lotes := lotes || jsonb_build_array(jsonb_build_object('id', r.id, 'creditos', toma));
    falta := falta - toma;
  end loop;
  update public.bolsas_de_creditos set
    periodo_inicio = b.periodo_inicio,
    periodo_fin = b.periodo_fin,
    usados_periodo = b.usados_periodo + del_mes,
    updated_at = now()
  where id = p_bolsa;
  insert into public.movimientos_de_creditos (bolsa_id, user_id, origen, herramienta, creditos, detalle, periodo_inicio, desglose)
    values (p_bolsa, p_user, 'consumo', p_herramienta, -p_creditos, p_detalle, b.periodo_inicio,
            jsonb_build_object('mes', del_mes, 'lotes', lotes))
    returning id into mov;
  return jsonb_build_object(
    'ok', true,
    'movimiento', mov,
    'disponibles', restante_mes - del_mes + vigentes - (p_creditos - del_mes),
    'mes_restante', restante_mes - del_mes,
    'recargas', vigentes - (p_creditos - del_mes)
  );
end $$;

-- ── Reembolso ──────────────────────────────────────────────────────────
-- Devuelve los créditos de una tarea que falló antes de entregar
-- resultado, cada uno a su sitio: los del mes, si sigue el mismo
-- periodo; los de cada lote, si el lote sigue vigente (si ya venció, o
-- el mes ya se renovó, esos créditos se habrían perdido igual). Un
-- consumo se devuelve una sola vez.
-- Sin `p_movimiento` (o con un consumo anterior a 0087, sin desglose):
-- al mes lo que quepa y el resto como un lote nuevo de 30 días.
drop function if exists public.reembolsar_creditos(uuid, uuid, text, int, text);
create or replace function public.reembolsar_creditos(
  p_bolsa uuid, p_user uuid, p_herramienta text, p_creditos int, p_detalle text, p_movimiento bigint default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bolsas_de_creditos;
  m public.movimientos_de_creditos;
  al_mes int := 0;
  a_lotes int := 0;
  x jsonb;
  resto int;
begin
  select * into b from public.bolsas_de_creditos where id = p_bolsa for update;
  if not found then return; end if;
  b := public.renovar_bolsa(b);

  if p_movimiento is not null then
    select * into m from public.movimientos_de_creditos
      where id = p_movimiento and bolsa_id = p_bolsa and origen = 'consumo'
      for update;
    if not found or m.reembolsado_at is not null then return; end if;
  end if;

  if m.id is not null and m.desglose is not null then
    if m.periodo_inicio = b.periodo_inicio then
      al_mes := least(coalesce((m.desglose->>'mes')::int, 0), b.usados_periodo);
    end if;
    for x in select * from jsonb_array_elements(coalesce(m.desglose->'lotes', '[]'::jsonb)) loop
      update public.recargas_de_creditos
        set saldo = least(creditos, saldo + (x->>'creditos')::int)
        where id = (x->>'id')::uuid and bolsa_id = p_bolsa and vence_at > now();
      if found then a_lotes := a_lotes + (x->>'creditos')::int; end if;
    end loop;
  else
    al_mes := least(p_creditos, b.usados_periodo);
    resto := p_creditos - al_mes;
    if resto > 0 then
      insert into public.recargas_de_creditos (bolsa_id, creditos, saldo, activada_at, vence_at, detalle)
        values (p_bolsa, resto, resto, now(), now() + interval '30 days', 'Devolución de créditos');
      a_lotes := resto;
    end if;
  end if;

  update public.bolsas_de_creditos set
    periodo_inicio = b.periodo_inicio,
    periodo_fin = b.periodo_fin,
    usados_periodo = b.usados_periodo - al_mes,
    updated_at = now()
  where id = p_bolsa;
  if m.id is not null then
    update public.movimientos_de_creditos set reembolsado_at = now() where id = m.id;
  end if;
  insert into public.movimientos_de_creditos (bolsa_id, user_id, origen, herramienta, creditos, detalle, periodo_inicio)
    values (p_bolsa, p_user, 'reembolso', p_herramienta, al_mes + a_lotes, p_detalle, b.periodo_inicio);
end $$;

-- ── Puente con el código anterior ──────────────────────────────────────
-- Hasta que se publique el código nuevo, «Recargar» en /admin/planes
-- todavía suma a `saldo_recargas`. Lo que se sume ahí pasa a un lote de
-- 30 días, para que no quede un saldo que el consumo ya no mira.
create or replace function public.recarga_antigua_a_lote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.saldo_recargas > coalesce(old.saldo_recargas, 0) then
    insert into public.recargas_de_creditos (bolsa_id, creditos, saldo, activada_at, vence_at, detalle)
      values (new.id, new.saldo_recargas - coalesce(old.saldo_recargas, 0), new.saldo_recargas - coalesce(old.saldo_recargas, 0),
              now(), now() + interval '30 days', 'Recarga (registrada con la versión anterior)');
  end if;
  new.saldo_recargas := 0;
  return new;
end $$;
drop trigger if exists recarga_antigua_a_lote on public.bolsas_de_creditos;
create trigger recarga_antigua_a_lote
  before update of saldo_recargas on public.bolsas_de_creditos
  for each row when (new.saldo_recargas > 0)
  execute function public.recarga_antigua_a_lote();

revoke all on function public.consumir_creditos(uuid, uuid, text, int, text) from public, anon, authenticated;
revoke all on function public.reembolsar_creditos(uuid, uuid, text, int, text, bigint) from public, anon, authenticated;
revoke all on function public.recargar_creditos(uuid, uuid, int, text, int) from public, anon, authenticated;
revoke all on function public.vencer_recargas(uuid, timestamptz) from public, anon, authenticated;

commit;
