-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 45: poder EXCLUIR tipos en hybrid_search
-- ════════════════════════════════════════════════════════════════════
-- MOTIVO (09/08/2026): tras ingerir 2,400 pronunciamientos y 680
-- opiniones, la pregunta panorámica sobre contrataciones de emergencia
-- (Q6) bajó de 92% a 77%. Medido faceta por faceta:
--
--   "prevención y atención de emergencias"   0/12 normativos · 12 pron.
--   "entidades que pueden contratar"         0/12 normativos · 12 resol.
--   "pago por disponibilidad y activación"   0/12 normativos · 12 pron.
--   "acuerdos marco para preparación"        0/12 normativos · 12 pron.
--
-- Cuatro de seis facetas dejaron de ver la norma. El contenido SÍ está
-- —"pago por disponibilidad" aparece en 23 fragmentos, 20 de ellos
-- normativos— pero la jurisprudencia lo desplaza.
--
-- El rescate de fuente primaria ya existente no sirve aquí por dos
-- razones: opera sobre la consulta principal y no sobre las facetas, y
-- filtra a Ley y Reglamento, mientras que "pago por disponibilidad" vive
-- en bases estándar y manuales del SEACE.
--
-- Hace falta lo contrario: pedir "cualquier cosa MENOS jurisprudencia".
-- Por eso un parámetro de exclusión y no uno de inclusión.
--
-- Se DROPEA la versión anterior antes de crear esta: dejar ambas
-- conviviendo haría ambigua toda llamada con los cinco argumentos de
-- siempre, porque encajarían en las dos.
-- ════════════════════════════════════════════════════════════════════

drop function if exists public.hybrid_search(text, vector, integer, text, text[]);

create or replace function public.hybrid_search(
  query_text text,
  query_embedding vector,
  match_count integer default 10,
  filter_type text default null,
  filter_law text[] default null,
  exclude_types text[] default null
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
  tope_jurisprudencia integer := 1500;
begin
  -- El vector va interpolado como literal (format %L) para que el
  -- planificador lo conozca y use el índice HNSW; ver migración 0035.
  -- El texto y los filtros viajan como parámetros (USING).
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
        and ($4 is null or array_length($4, 1) is null or d.type <> all($4))
      order by c.embedding <=> %L::vector
      limit %s
    ),
    ft_normativa as (
      select
        c.id as chunk_id, c.document_id, c.content,
        d.title as doc_title, d.type as doc_type, d.number as doc_number,
        ts_rank_cd(n.fts, plainto_tsquery('spanish', $1)) as score
      from normative_chunks_norm n
      join normative_chunks c on c.id = n.chunk_id
      join normative_documents d on d.id = c.document_id
      where n.fts @@ plainto_tsquery('spanish', $1)
        and ($2 is null or d.type = $2)
        and ($3 is null or array_length($3, 1) is null or d.applicable_law && $3)
        and ($4 is null or array_length($4, 1) is null or d.type <> all($4))
    ),
    ft_jurisprudencia as (
      select
        c.id as chunk_id, c.document_id, c.content,
        d.title as doc_title, d.type as doc_type, d.number as doc_number,
        ts_rank_cd(c.fts, plainto_tsquery('spanish', $1)) as score
      from normative_chunks c
      join normative_documents d on d.id = c.document_id
      where c.fts @@ plainto_tsquery('spanish', $1)
        and d.type = 'resolucion_tce'
        and ($2 is null or d.type = $2)
        and ($3 is null or array_length($3, 1) is null or d.applicable_law && $3)
        and ($4 is null or array_length($4, 1) is null or d.type <> all($4))
      limit %s
    ),
    fulltext as (
      select * from (
        select * from ft_normativa
        union all
        select * from ft_jurisprudencia
      ) u
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
  $sql$, query_embedding, query_embedding, limite, tope_jurisprudencia, limite, match_count)
  using query_text, filter_type, filter_law, exclude_types;
end;
$fn$;

grant execute on function public.hybrid_search(text, vector, integer, text, text[], text[])
  to anon, authenticated, service_role;
