-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 39: índice de texto propio para la normativa
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (05/08/2026): tras ingerir 382 opiniones y pronunciamientos,
-- "plazo para perfeccionar el contrato" volvió a tardar 2.8 s y el
-- guardián detuvo la ingesta con el buscador en 4.9 s sostenidos.
--
-- La etapa 38 acotó la rama de jurisprudencia a 1,500 candidatos y eso
-- sigue funcionando. Lo que quedó caro es la rama de NORMATIVA, y no por
-- puntuar: para esa consulta solo 513 fragmentos normativos coinciden.
--
--   coincidencias   normativa 513 · jurisprudencia 21,044
--   tiempo de la rama normativa                     2,814 ms
--
-- CAUSA: el índice GIN cubre TODA la tabla. Para quedarse con los 513
-- normativos, Postgres recorre las 21,557 entradas que coinciden y va al
-- disco por cada fila —tabla de 2.1 GB— a leer su document_id y mirar el
-- tipo. El costo lo pone la jurisprudencia que después se descarta.
--
-- SOLUCIÓN: una tabla lateral con el tsvector de los fragmentos
-- normativos y su propio índice GIN. La rama de normativa recorre 24 mil
-- entradas en vez de 277 mil y no necesita mirar el tipo, porque en esa
-- tabla solo está lo suyo.
--
-- POR QUÉ UNA TABLA LATERAL Y NO UNA COLUMNA EN normative_chunks: se
-- intentó primero con una marca booleana y un índice parcial. Marcar
-- 24 mil filas exige un UPDATE, y cada UPDATE de normative_chunks
-- reescribe la fila y con ella su entrada en el índice HNSW de 919 MB.
-- Ni siquiera en lotes de 40 documentos terminaba dentro del
-- statement_timeout. Insertar esas mismas 24 mil filas en una tabla
-- nueva que solo tiene un GIN es barato.
--
-- El disparador la mantiene al día, y el borrado en cascada la limpia.
-- ════════════════════════════════════════════════════════════════════

-- Restos del intento anterior.
drop trigger if exists trg_marcar_fragmento_normativo on public.normative_chunks;
drop function if exists public.marcar_fragmento_normativo();
alter table public.normative_chunks drop column if exists es_normativo;

create table if not exists public.normative_chunks_norm (
  chunk_id uuid primary key references public.normative_chunks(id) on delete cascade,
  fts tsvector not null
);

comment on table public.normative_chunks_norm is
  'Espejo del tsvector de los fragmentos que NO son resoluciones del Tribunal. Existe para que la rama de texto de hybrid_search recorra un índice de 24 mil entradas en vez de 277 mil (migración 0039). Se mantiene sola por disparador.';

alter table public.normative_chunks_norm enable row level security;

drop policy if exists normative_chunks_norm_select on public.normative_chunks_norm;
create policy normative_chunks_norm_select
  on public.normative_chunks_norm for select
  using ((select auth.role()) = any (array['authenticated', 'anon', 'service_role']));

grant select on public.normative_chunks_norm to anon, authenticated, service_role;

-- Carga inicial.
insert into public.normative_chunks_norm (chunk_id, fts)
select c.id, c.fts
  from public.normative_chunks c
  join public.normative_documents d on d.id = c.document_id
 where d.type <> 'resolucion_tce'
on conflict (chunk_id) do nothing;

create index if not exists normative_chunks_norm_fts_idx
  on public.normative_chunks_norm using gin (fts);

-- Que se mantenga al día al ingerir normativa nueva.
create or replace function public.espejar_fragmento_normativo()
returns trigger
language plpgsql
as $$
declare
  tipo text;
begin
  select d.type into tipo
    from public.normative_documents d
   where d.id = new.document_id;
  if tipo is not null and tipo <> 'resolucion_tce' then
    insert into public.normative_chunks_norm (chunk_id, fts)
    values (new.id, new.fts)
    on conflict (chunk_id) do update set fts = excluded.fts;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_espejar_fragmento_normativo on public.normative_chunks;
create trigger trg_espejar_fragmento_normativo
  after insert on public.normative_chunks
  for each row execute function public.espejar_fragmento_normativo();

analyze public.normative_chunks_norm;
