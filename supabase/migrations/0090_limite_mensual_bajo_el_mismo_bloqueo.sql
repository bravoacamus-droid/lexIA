-- ════════════════════════════════════════════════════════════════════
-- 0090 · El límite mensual del plan se cuenta bajo el mismo bloqueo
--
-- Consulta admite 3 operaciones al mes de requerimientos de contratos
-- menores y Profesional 3 análisis de ofertas (César, 18/10/2026). El
-- servidor contaba los consumos del mes y, en otra petición, llamaba a
-- `consumir_creditos`: tres pedidos a la vez veían «2 usados» y pasaban
-- los tres (auditoría del 26/11/2026, B3).
--
-- Esta función bloquea la bolsa, cuenta y consume en la misma
-- transacción: el segundo pedido espera al primero y ya ve su consumo.
-- Solo agrega funciones (esta y la de invitaciones, abajo): se aplica
-- ANTES del deploy, porque el código nuevo ya las llama.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.consumir_creditos_con_limite(
  p_bolsa uuid,
  p_user uuid,
  p_herramienta text,
  p_creditos int,
  p_detalle text,
  p_herramientas text[],
  p_desde timestamptz,
  p_tope int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  usados int;
begin
  -- El mismo candado que toma `consumir_creditos`: dentro de la misma
  -- transacción, volver a tomarlo no espera.
  perform 1 from public.bolsas_de_creditos where id = p_bolsa for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sin_bolsa'); end if;

  select
    count(*) filter (where origen = 'consumo') - count(*) filter (where origen = 'reembolso')
    into usados
  from public.movimientos_de_creditos
  where bolsa_id = p_bolsa
    and origen in ('consumo', 'reembolso')
    and herramienta = any (p_herramientas)
    and created_at >= p_desde;

  if usados >= p_tope then
    return jsonb_build_object('ok', false, 'motivo', 'limite', 'usados', usados);
  end if;
  return public.consumir_creditos(p_bolsa, p_user, p_herramienta, p_creditos, p_detalle);
end $$;

revoke all on function public.consumir_creditos_con_limite(uuid, uuid, text, int, text, text[], timestamptz, int)
  from public, anon, authenticated;
grant execute on function public.consumir_creditos_con_limite(uuid, uuid, text, int, text, text[], timestamptz, int)
  to service_role;

-- ── Aceptar una invitación de equipo, de una vez ─────────────────────
-- Antes: leer la invitación, contar los miembros, insertar y marcarla
-- usada, en cuatro pasos. Dos cuentas con el mismo enlace a la vez
-- entraban las dos, y dos invitaciones aceptadas a la vez pasaban el tope
-- de usuarios del equipo (auditoría del 26/11/2026, B5). Aquí la
-- invitación y el equipo quedan bloqueados hasta terminar.
create or replace function public.aceptar_invitacion_de_equipo(p_token text, p_user uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv public.invitaciones_de_equipo;
  ya uuid;
  maximo int;
  n int;
begin
  select * into inv from public.invitaciones_de_equipo where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;

  select equipo_id into ya from public.miembros_de_equipo where user_id = p_user;
  if ya is not null then
    if ya = inv.equipo_id then return jsonb_build_object('ok', true, 'ya_era', true); end if;
    return jsonb_build_object('ok', false, 'motivo', 'otro_equipo');
  end if;
  if inv.usada_at is not null then return jsonb_build_object('ok', false, 'motivo', 'usada'); end if;
  if inv.expira_at < now() then return jsonb_build_object('ok', false, 'motivo', 'vencida'); end if;

  select max_usuarios into maximo from public.equipos where id = inv.equipo_id for update;
  select count(*) into n from public.miembros_de_equipo where equipo_id = inv.equipo_id;
  if n >= coalesce(maximo, 5) then return jsonb_build_object('ok', false, 'motivo', 'lleno'); end if;

  insert into public.miembros_de_equipo (equipo_id, user_id, rol) values (inv.equipo_id, p_user, 'miembro');
  update public.invitaciones_de_equipo set usada_por = p_user, usada_at = now() where id = inv.id;
  return jsonb_build_object('ok', true, 'ya_era', false);
end $$;

revoke all on function public.aceptar_invitacion_de_equipo(text, uuid) from public, anon, authenticated;
grant execute on function public.aceptar_invitacion_de_equipo(text, uuid) to service_role;
