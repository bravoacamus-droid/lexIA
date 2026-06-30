-- ────────────────────────────────────────────────────────────────────
-- 0027_find_related_documents.sql
--
-- RPC para encontrar documentos normativos relacionados al actual,
-- usado en el panel "Relacionado con este documento" (imágenes 1-2
-- del Observaciones.docx de César, 28/06/2026).
--
-- Estrategia: tomar el chunk con menor chunk_index del documento
-- (suele ser intro/sumilla), buscar los chunks más cercanos por
-- cosine distance EXCLUYENDO los del propio documento, agrupar por
-- document_id y devolver los top N con su similitud máxima.
-- ────────────────────────────────────────────────────────────────────

create or replace function find_related_documents (
  p_document_id uuid,
  p_limit int default 5
) returns table (
  document_id uuid,
  doc_title text,
  doc_type text,
  doc_number text,
  similarity double precision
)
language sql stable
as $$
  with source_embedding as (
    -- Embedding del primer chunk del documento (suele ser introducción)
    select embedding
    from normative_chunks
    where document_id = p_document_id
    order by chunk_index asc
    limit 1
  ),
  candidates as (
    -- Top-50 chunks más cercanos EXCLUYENDO los del propio documento
    select
      c.document_id,
      1 - (c.embedding <=> (select embedding from source_embedding)) as similarity
    from normative_chunks c, source_embedding s
    where c.document_id != p_document_id
    order by c.embedding <=> s.embedding
    limit 50
  ),
  ranked as (
    -- Mejor similitud por documento
    select
      document_id,
      max(similarity) as similarity
    from candidates
    group by document_id
    order by max(similarity) desc
    limit p_limit
  )
  select
    r.document_id,
    d.title as doc_title,
    d.type as doc_type,
    d.number as doc_number,
    r.similarity
  from ranked r
  join normative_documents d on d.id = r.document_id
  order by r.similarity desc;
$$;

comment on function find_related_documents is
  'Devuelve los p_limit documentos más similares al especificado, basado en el embedding del primer chunk de cada uno. Usado por GET /api/normativa/[id]/related.';
