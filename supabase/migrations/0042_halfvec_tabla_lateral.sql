-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 42: vectores en halfvec, en tabla lateral
-- ════════════════════════════════════════════════════════════════════
-- MOTIVO (05/08/2026): Supabase avisó que el proyecto agota su
-- presupuesto de disco. La instancia es Micro —1 GB de RAM— y el índice
-- vectorial HNSW pesa 2,155 MB: el doble que toda la memoria. Cada
-- búsqueda lo recorre desde disco.
--
-- halfvec guarda cada dimensión en 16 bits en vez de 32, así que el
-- índice queda en la mitad.
--
-- Nota sobre una recomendación anterior: el 03/08 desaconsejé halfvec
-- comparando el ahorro en almacenamiento —US$0.63 al mes—, que era la
-- métrica equivocada. Lo que importa no es lo que cuesta el disco sino
-- cuánto disco hay que leer en cada consulta.
--
-- POR QUÉ TABLA LATERAL Y NO CONVERTIR LA COLUMNA:
--   · Cambiar el tipo reescribe los 5 GB de la tabla y reconstruye el
--     índice en una sola operación, sin vuelta atrás.
--   · Con tabla lateral el índice viejo sigue en servicio hasta que el
--     nuevo esté medido. Si no convence, se borra la tabla.
--   · Mismo patrón que la etapa 39 para el índice de texto.
--
-- ORDEN DE TRABAJO — cargar primero, indexar después:
-- El primer intento creó el índice vacío y fue insertando, para que cada
-- sentencia fuera corta. No sirve: insertar en un HNSW obliga a recorrer
-- el grafo por cada vector, y ni un lote de 2,000 terminaba dentro del
-- statement_timeout. Cargar sin índice es barato, y construirlo de una
-- vez sobre la tabla ya llena es además mejor grafo que armarlo
-- incrementalmente.
--
-- El índice se construye desde pg_cron, no desde la API de gestión: la
-- API corta las sentencias largas y una construcción sobre 277 mil
-- vectores no cabe. Un trabajo programado corre en su propia sesión y
-- termina tranquilo.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.normative_chunks_h (
  chunk_id uuid primary key references public.normative_chunks(id) on delete cascade,
  embedding halfvec(1024) not null
);

comment on table public.normative_chunks_h is
  'Espejo del vector de cada fragmento en media precisión (halfvec). Existe para que el índice HNSW pese la mitad y quepa en memoria (migración 0042). Se mantiene sola por disparador.';

alter table public.normative_chunks_h enable row level security;

drop policy if exists normative_chunks_h_select on public.normative_chunks_h;
create policy normative_chunks_h_select
  on public.normative_chunks_h for select
  using ((select auth.role()) = any (array['authenticated', 'anon', 'service_role']));

grant select on public.normative_chunks_h to anon, authenticated, service_role;

-- El índice NO se crea aquí: primero se carga la tabla.
drop index if exists public.normative_chunks_h_embedding_idx;

-- Copia por lotes, reanudable. Cada CALL avanza un tramo y confirma, así
-- que si la llamada se corta por tiempo lo copiado se conserva.
create or replace procedure public.copiar_halfvec(tam integer default 20000)
language plpgsql
as $$
declare
  ultimo uuid;
  tope uuid;
begin
  -- Postgres no tiene max() para uuid: se toma el mayor ordenando.
  select chunk_id into ultimo
    from public.normative_chunks_h order by chunk_id desc limit 1;
  ultimo := coalesce(ultimo, '00000000-0000-0000-0000-000000000000'::uuid);

  loop
    select id into tope from (
      select id from public.normative_chunks
       where id > ultimo order by id limit tam
    ) x order by id desc limit 1;
    exit when tope is null;

    insert into public.normative_chunks_h (chunk_id, embedding)
    select id, embedding::halfvec(1024)
      from public.normative_chunks
     where id > ultimo and id <= tope
    on conflict (chunk_id) do nothing;

    commit;
    ultimo := tope;
  end loop;
end;
$$;

-- Que los fragmentos nuevos entren solos.
create or replace function public.espejar_halfvec()
returns trigger
language plpgsql
as $$
begin
  insert into public.normative_chunks_h (chunk_id, embedding)
  values (new.id, new.embedding::halfvec(1024))
  on conflict (chunk_id) do update set embedding = excluded.embedding;
  return null;
end;
$$;

drop trigger if exists trg_espejar_halfvec on public.normative_chunks;
create trigger trg_espejar_halfvec
  after insert on public.normative_chunks
  for each row execute function public.espejar_halfvec();
