-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 35: que hybrid_search vuelva a usar el índice vectorial
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (02/08/2026, durante la ingesta de resoluciones): el chat y la
-- voz dejaron de recibir fuentes. hybrid_search superaba el
-- statement_timeout de 8 s del rol `authenticated` y devolvía error.
--
-- DIAGNÓSTICO — el tiempo escalaba con el tamaño del corpus, que es
-- justo lo que NO debe pasar con un índice HNSW:
--     filtrado a 'ley'            (~700 fragmentos):    513 ms
--     filtrado a 'resolucion_tce' (~4,000 fragmentos): 4,213 ms
--     sin filtro                  (~31,000 fragmentos): 7,589 ms
-- Ejecutada por conexión directa con el vector como literal, la misma
-- consulta tardaba 59 ms. La diferencia: PostgREST envía el vector como
-- PARÁMETRO, y al planificar sin conocer su valor Postgres descarta el
-- índice HNSW y recorre todos los vectores.
--
-- Se descartaron antes, con medición: tamaño del payload, forma de las
-- políticas RLS, plan_cache_mode, enable_seqscan y degradación del
-- índice (se reconstruyó y siguió igual).
--
-- SOLUCIÓN: la función pasa a plpgsql y arma la consulta con el vector
-- ya incorporado (format %L) antes de ejecutarla. Así el planificador
-- conoce el valor y elige el índice. El texto de búsqueda sigue viajando
-- como parámetro (USING), de modo que no hay riesgo de inyección.
-- ════════════════════════════════════════════════════════════════════

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
language plpgsql
stable
as $fn$
declare
  limite integer := greatest(match_count * 5, 60);
begin
  return query execute format($sql$
    with semantic as (
      select
        c.id as chunk_id, c.document_id, c.content,
        d.title as doc_title, d.type as doc_type, d.number as doc_number,
        1 - (c.embedding <=> %L::vector) as score
      from normative_chunks c
      join normative_documents d on d.id = c.document_id
      where ($2 is null or d.type = $2)
        and ($3 is null or array_length($3, 1) is null or d.applicable_law && $3)
      order by c.embedding <=> %L::vector
      limit %s
    ),
    fulltext as (
      select
        c.id as chunk_id, c.document_id, c.content,
        d.title as doc_title, d.type as doc_type, d.number as doc_number,
        ts_rank_cd(c.fts, plainto_tsquery('spanish', $1)) as score
      from normative_chunks c
      join normative_documents d on d.id = c.document_id
      where c.fts @@ plainto_tsquery('spanish', $1)
        and ($2 is null or d.type = $2)
        and ($3 is null or array_length($3, 1) is null or d.applicable_law && $3)
      order by score desc
      limit %s
    ),
    combinado as (
      select *, 'semantic' as src from semantic
      union all
      select *, 'fulltext' as src from fulltext
    ),
    rankeado as (
      select
        chunk_id, document_id, content, doc_title, doc_type, doc_number,
        max(score) as similarity,
        count(*) as apariciones,
        (case when position(lower($1) in lower(content)) > 0 then 0.15 else 0.0 end) as bonus_literal,
        (case when count(distinct src) > 1 then 0.10 else 0.0 end) as bonus_hibrido
      from combinado
      group by chunk_id, document_id, content, doc_title, doc_type, doc_number
    )
    select
      chunk_id, document_id, content, doc_title, doc_type, doc_number,
      (similarity + bonus_literal + bonus_hibrido)::double precision
    from rankeado
    order by apariciones desc, (similarity + bonus_literal + bonus_hibrido) desc
    limit %s
  $sql$, query_embedding, query_embedding, limite, limite, match_count)
  using query_text, filter_type, filter_law;
end;
$fn$;

grant execute on function public.hybrid_search(text, vector, integer, text, text[])
  to anon, authenticated, service_role;
