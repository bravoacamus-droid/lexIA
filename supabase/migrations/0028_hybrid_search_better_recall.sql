-- ────────────────────────────────────────────────────────────────────
-- 0028_hybrid_search_better_recall.sql
--
-- Mejora el recall del hybrid_search para queries específicas donde
-- el chunk correcto no entraba al top-N por diferencias sutiles de
-- similitud coseno.
--
-- Caso real detectado 29/06/2026: César preguntó "plazo de difusión
-- del requerimiento en licitación pública para bienes" y el sistema
-- respondió "no encuentro". El chunk correcto de la Directiva
-- N.° 007-2025-OECE-CD tenía similitud ~0.70 pero quedaba fuera del
-- top-10 porque otros chunks tangenciales de la Ley 32069 y
-- pronunciamientos tenían ~0.72.
--
-- Cambios respecto a 0024:
-- 1. Aumenta candidate pool de max(match_count*3, 30) a
--    max(match_count*5, 60). Con match_count=15 esto da 75 candidatos
--    semánticos y 75 candidatos FTS = 150 en total antes de dedup.
-- 2. Ordenación mejorada: prioriza chunks que aparecen en AMBOS
--    (semantic + FTS), luego por similitud, luego por número de
--    veces que aparecen. Esto trae al top chunks que son a la vez
--    semánticamente similares Y tienen match textual — más señal.
-- 3. Bonus a chunks donde el texto exacto de la query aparece: es
--    un heurístico simple pero efectivo cuando la query es de tipo
--    "plazo de X" o "requisitos de Y" (frases operativas comunes).
-- ────────────────────────────────────────────────────────────────────

drop function if exists hybrid_search(text, vector, int, text, text[]);

create or replace function hybrid_search (
  query_text text,
  query_embedding vector(1024),
  match_count int default 10,
  filter_type text default null,
  filter_law text[] default null
) returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  doc_title text,
  doc_type text,
  doc_number text,
  similarity double precision
)
language sql stable
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
      ts_rank_cd(
        to_tsvector('spanish', c.content),
        plainto_tsquery('spanish', query_text)
      ) as ts_score
    from normative_chunks c
    join normative_documents d on d.id = c.document_id
    where to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', query_text)
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
      -- Bonus si el texto de la query aparece literalmente en el chunk
      (case when position(lower(query_text) in lower(content)) > 0 then 0.15 else 0.0 end) as literal_bonus,
      -- Bonus si el chunk aparece EN AMBOS (semántico + FTS)
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

comment on function hybrid_search(text, vector, int, text, text[]) is
  'Búsqueda híbrida (semantic + FTS) sobre normative_chunks con recall mejorado v3 (2026-06-29). Filtros opcionales por tipo de documento y ley aplicable. Ranking prioriza chunks que aparecen en AMBOS retrievals y aquellos con match textual literal. Candidate pool = match_count × 5 (min 60).';
