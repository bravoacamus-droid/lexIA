-- ────────────────────────────────────────────────────────────────────
-- 0024_applicable_law.sql
--
-- Agrega la dimensión "ley aplicable" a normative_documents y al
-- hybrid_search RPC, para que el usuario pueda filtrar opiniones,
-- pronunciamientos y resoluciones según se refieran a la Ley N° 30225
-- (anterior, vigente hasta 24-abr-2025) o la Ley N° 32069 (nueva,
-- vigente desde 24-abr-2025).
--
-- Petición del cliente César Huamán Oré en Observaciones.docx
-- bloque "Sugerencia: el buscador previo a la consulta debe preguntar
-- por cuál de estas normas se realizará la pregunta".
--
-- Un documento puede aplicar a ambas leyes (text[]). Backfill se hace
-- por heurística: menciones textuales en raw_text con fallback por
-- fecha. La Ley 32069 (LCEP) se publicó 24-jun-2024 pero su entrada en
-- vigencia operativa fue 24-abr-2025 con el DS 009-2025-EF.
-- ────────────────────────────────────────────────────────────────────

-- 1. Columna applicable_law: array de strings 'ley_30225' | 'ley_32069'
alter table normative_documents
  add column if not exists applicable_law text[] not null default '{ley_32069}';

create index if not exists idx_normative_documents_applicable_law
  on normative_documents using gin (applicable_law);

comment on column normative_documents.applicable_law is
  'Cuál(es) de las dos leyes de contrataciones aplica este documento. Valores: ley_30225 (LCE, anterior), ley_32069 (LCEP, vigente). Un documento puede aplicar a ambas si su contenido es jurisprudencia general o principios.';

-- 2. Heurística de backfill: examinar raw_text para mencionar de cada
--    ley. Si solo menciona una, esa es. Si menciona ambas, ambas.
--    Si no menciona ninguna explícitamente, fallback por fecha.

with classified as (
  select
    id,
    case
      when raw_text is null or raw_text = '' then false
      else raw_text ~* '\m(ley\s*(n\.?°|n°|num|número)?\s*32\.?\s*069|ley\s*32069|ley\s*general\s*de\s*contrataciones\s*p[uú]blicas|lcep)\M'
    end as menciona_32069,
    case
      when raw_text is null or raw_text = '' then false
      else raw_text ~* '\m(ley\s*(n\.?°|n°|num|número)?\s*30\.?\s*225|ley\s*30225|ley\s*de\s*contrataciones\s*del\s*estado)\M'
        and not (raw_text ~* '\m(ley\s*general\s*de\s*contrataciones|nueva\s*ley\s*de\s*contrataciones|lcep)\M')
    end as menciona_30225,
    date
  from normative_documents
)
update normative_documents nd
set applicable_law = case
  -- Menciona ambas explícitamente
  when c.menciona_30225 and c.menciona_32069 then '{ley_30225,ley_32069}'::text[]
  -- Solo 30225 (texto explícito)
  when c.menciona_30225 and not c.menciona_32069 then '{ley_30225}'::text[]
  -- Solo 32069 (texto explícito)
  when c.menciona_32069 and not c.menciona_30225 then '{ley_32069}'::text[]
  -- Ninguna explícita: fallback por fecha
  when c.date is null then '{ley_32069}'::text[]
  when c.date < '2025-04-24'::date then '{ley_30225}'::text[]
  else '{ley_32069}'::text[]
end
from classified c
where nd.id = c.id;

-- 3. hybrid_search v2: ahora acepta filter_law (text[]) opcional.
--    Drop la versión anterior primero porque la firma cambia (Postgres
--    trata el nuevo parámetro como sobrecarga distinta y CREATE OR
--    REPLACE no la sustituye).

drop function if exists hybrid_search(text, vector, int, text);

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
    limit greatest(match_count * 3, 30)
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
    limit greatest(match_count * 3, 30)
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
    select chunk_id, document_id, content, doc_title, doc_type, doc_number,
           max(score) as similarity,
           count(*) as appearances
    from combined
    group by chunk_id, document_id, content, doc_title, doc_type, doc_number
  )
  select chunk_id, document_id, content, doc_title, doc_type, doc_number, similarity
  from ranked
  order by appearances desc, similarity desc
  limit match_count;
$$;

comment on function hybrid_search(text, vector, int, text, text[]) is
  'Búsqueda híbrida (semantic + FTS) sobre normative_chunks. Soporta filtros opcionales por tipo de documento (filter_type) y por ley aplicable (filter_law). Si filter_law es null o array vacío, no se aplica filtro.';
