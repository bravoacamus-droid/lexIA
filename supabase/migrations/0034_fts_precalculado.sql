-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 34: precalcular el vector de texto completo
-- ════════════════════════════════════════════════════════════════════
-- PROBLEMA (detectado el 02/08/2026 durante la ingesta masiva de las
-- resoluciones del Tribunal): hybrid_search calculaba
-- `to_tsvector('spanish', c.content)` DOS veces por consulta y por cada
-- fila candidata — una en el WHERE (que sí usa el índice) y otra dentro
-- de ts_rank_cd para ordenar. Esa segunda evaluación no puede usar el
-- índice: reparsea el texto completo de cada fragmento que coincide.
--
-- Medición con 25 mil fragmentos:
--   · rama vectorial  :   195 ms
--   · rama de texto   : 1,000 ms  ← 96% en recalcular los tsvector
--   · total           : 1,196 ms
-- El chat lanza hasta 10 búsquedas en paralelo, así que la contención
-- hacía que varias superaran el statement_timeout de 8 s: el buscador
-- devolvía cero resultados y el chat y la voz quedaban sin fuentes.
--
-- El costo crece con las coincidencias, no con el match_count: al pasar
-- de 25 mil a 600 mil fragmentos la rama de texto tardaría ~24 s.
--
-- SOLUCIÓN: una columna generada y almacenada con el tsvector. Se
-- calcula una sola vez al insertar y ts_rank_cd la lee directamente.
-- Se aplica AHORA, con la tabla todavía pequeña: reescribirla con
-- 600 mil filas sería mucho más costoso.
-- ════════════════════════════════════════════════════════════════════

begin;

-- 1. Columna generada: Postgres la mantiene sola en cada insert/update.
alter table public.normative_chunks
  add column if not exists fts tsvector
  generated always as (to_tsvector('spanish', content)) stored;

-- 2. Índice sobre la columna ya materializada.
create index if not exists normative_chunks_fts_gen_idx
  on public.normative_chunks using gin (fts);

commit;

-- 3. hybrid_search usando la columna precalculada.
create or replace function public.hybrid_search(
  query_text text,
  query_embedding vector,
  match_count integer default 10,
  filter_type text default null,
  filter_law text[] default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  doc_title text,
  doc_type text,
  doc_number text,
  similarity double precision
)
language sql
stable
as $$
  with semantic as (
    select
      c.id as chunk_id,
      c.document_id,
      c.content,
      d.title as doc_title,
      d.type as doc_type,
      d.number as doc_number,
      d.applicable_law,
      1 - (c.embedding <=> query_embedding) as similarity_score
    from normative_chunks c
    join normative_documents d on d.id = c.document_id
    where (filter_type is null or d.type = filter_type)
      and (filter_law is null or array_length(filter_law, 1) is null or d.applicable_law && filter_law)
    order by c.embedding <=> query_embedding
    limit greatest(match_count * 5, 60)
  ),
  fulltext as (
    select
      c.id as chunk_id,
      c.document_id,
      c.content,
      d.title as doc_title,
      d.type as doc_type,
      d.number as doc_number,
      d.applicable_law,
      -- Lee el tsvector ya materializado en vez de recalcularlo.
      ts_rank_cd(c.fts, plainto_tsquery('spanish', query_text)) as ts_score
    from normative_chunks c
    join normative_documents d on d.id = c.document_id
    where c.fts @@ plainto_tsquery('spanish', query_text)
      and (filter_type is null or d.type = filter_type)
      and (filter_law is null or array_length(filter_law, 1) is null or d.applicable_law && filter_law)
    order by ts_score desc
    limit greatest(match_count * 5, 60)
  ),
  combined as (
    select chunk_id, document_id, content, doc_title, doc_type, doc_number,
           similarity_score as score, 'semantic' as src
    from semantic
    union all
    select chunk_id, document_id, content, doc_title, doc_type, doc_number,
           ts_score as score, 'fulltext' as src
    from fulltext
  ),
  ranked as (
    select
      chunk_id, document_id, content, doc_title, doc_type, doc_number,
      max(score) as similarity,
      count(*) as appearances,
      (case when position(lower(query_text) in lower(content)) > 0 then 0.15 else 0.0 end) as literal_bonus,
      (case when count(distinct src) > 1 then 0.10 else 0.0 end) as hybrid_bonus
    from combined
    group by chunk_id, document_id, content, doc_title, doc_type, doc_number
  )
  select
    chunk_id, document_id, content, doc_title, doc_type, doc_number,
    (similarity + literal_bonus + hybrid_bonus) as similarity
  from ranked
  order by appearances desc, (similarity + literal_bonus + hybrid_bonus) desc
  limit match_count;
$$;

-- 4. El índice de expresión anterior queda redundante.
drop index if exists public.normative_chunks_fts_idx;
