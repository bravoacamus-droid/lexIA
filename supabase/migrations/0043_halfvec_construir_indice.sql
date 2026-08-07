-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 43: construir el índice HNSW de halfvec
-- ════════════════════════════════════════════════════════════════════
-- La tabla normative_chunks_h ya tiene los 277,225 vectores en media
-- precisión (etapa 42). Falta su índice.
--
-- Se construye desde pg_cron y no desde la API de gestión porque esa
-- corta cualquier sentencia a los 2 minutos —comprobado— y una
-- construcción sobre 277 mil vectores no cabe ahí ni de lejos. Un
-- trabajo programado corre en su propia sesión, sin ese límite.
--
-- Parámetros IGUALES a los del índice actual (m=16, ef_construction=64,
-- que son los de por defecto): si se cambiaran, la comparación contra la
-- línea base mediría dos cosas a la vez y no sabríamos cuál explicó la
-- diferencia.
--
-- El trabajo se da de baja solo al terminar. Toma un cerrojo consultivo
-- para que dos ejecuciones superpuestas no intenten construirlo dos
-- veces.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.construir_indice_halfvec()
returns void
language plpgsql
security definer
set search_path = public
-- Sin esto no termina nunca: la base impone 2 minutos por sentencia y
-- los trabajos de pg_cron lo heredan igual que la API de gestión. Las
-- dos primeras ejecuciones murieron exactamente a los 2 minutos.
-- Se desactiva solo para esta función, que construye un índice una vez.
set statement_timeout = 0
as $$
begin
  -- Ya está: nada que hacer, y se retira el trabajo.
  if exists (
    select 1 from pg_class where relname = 'normative_chunks_h_embedding_idx'
  ) then
    perform cron.unschedule('construir-indice-halfvec')
      where exists (select 1 from cron.job where jobname = 'construir-indice-halfvec');
    return;
  end if;

  -- Si otra ejecución ya lo está construyendo, esta se retira.
  if not pg_try_advisory_lock(4243) then
    return;
  end if;

  -- Memoria de construcción por encima de los 64 MB de fábrica, pero sin
  -- pasarse: la instancia tiene 1 GB en total y hay que dejarle aire al
  -- resto.
  set local maintenance_work_mem = '160MB';

  create index normative_chunks_h_embedding_idx
    on public.normative_chunks_h
    using hnsw (embedding halfvec_cosine_ops);

  perform pg_advisory_unlock(4243);

  perform cron.unschedule('construir-indice-halfvec')
    where exists (select 1 from cron.job where jobname = 'construir-indice-halfvec');
end;
$$;

select cron.unschedule('construir-indice-halfvec')
 where exists (select 1 from cron.job where jobname = 'construir-indice-halfvec');

-- Cada 5 minutos hasta que lo consiga; se retira solo.
select cron.schedule(
  'construir-indice-halfvec',
  '*/5 * * * *',
  'select public.construir_indice_halfvec();'
);
