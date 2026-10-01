-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 81: lo que perdió vigencia sale de la biblioteca
-- ════════════════════════════════════════════════════════════════════
-- Documento 11 de César (30/09/2026): «debe leer la temporalidad de cada
-- norma, dado que hay norma que puede ser implementada por un año;
-- concluido ese año y perdida su vigencia, ya no debe ser considerada en
-- la biblioteca normativa».
--
-- La vigencia está en el acto (normative_acts.vigente_hasta, derogada),
-- tomada del Tablero normativo del OECE. Esta función oculta los textos
-- de los actos derogados o vencidos —la biblioteca no los lista y el
-- chat no los cita (ver src/lib/normativa/ocultos.ts)— y los vuelve a
-- mostrar si el dato cambia. Solo toca lo que ella misma ocultó
-- (metadata.motivo_oculto = 'vencida'): lo retirado a mano sigue oculto.
--
-- La corre el actualizador diario (src/app/api/scraping/run).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.actualizar_vigencias()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ocultados integer;
  repuestos integer;
begin
  with vencidos as (
    select clave from public.normative_acts
     where derogada or (vigente_hasta is not null and vigente_hasta < current_date)
  ), upd as (
    update public.normative_documents d
       set oculto = true,
           metadata = d.metadata || jsonb_build_object('motivo_oculto', 'vencida')
     where d.acto_clave in (select clave from vencidos) and not d.oculto
     returning 1
  )
  select count(*) into ocultados from upd;

  with repuestos_q as (
    update public.normative_documents d
       set oculto = false,
           metadata = d.metadata - 'motivo_oculto'
     where d.oculto
       and d.metadata->>'motivo_oculto' = 'vencida'
       and d.acto_clave in (
         select clave from public.normative_acts
          where not derogada and (vigente_hasta is null or vigente_hasta >= current_date)
       )
     returning 1
  )
  select count(*) into repuestos from repuestos_q;

  return jsonb_build_object('ocultados', ocultados, 'repuestos', repuestos);
end;
$$;

revoke all on function public.actualizar_vigencias() from public, anon, authenticated;
grant execute on function public.actualizar_vigencias() to service_role;
