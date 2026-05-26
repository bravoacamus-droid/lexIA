-- ════════════════════════════════════════════════════════
-- Función hybrid_search — semantic + FTS con Reciprocal Rank Fusion
-- ════════════════════════════════════════════════════════
create or replace function public.hybrid_search(
  query_text text,
  query_embedding vector(1024),
  match_count int default 10,
  filter_type text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  doc_title text,
  doc_type text,
  doc_number text,
  similarity float
)
language sql stable
as $$
with semantic as (
  select c.id, c.document_id, c.content,
         1 - (c.embedding <=> query_embedding) as sim,
         row_number() over (order by c.embedding <=> query_embedding) as rank
  from public.normative_chunks c
  join public.normative_documents d on d.id = c.document_id
  where c.embedding is not null
    and (filter_type is null or d.type = filter_type)
  order by c.embedding <=> query_embedding
  limit greatest(match_count * 3, 30)
),
fulltext as (
  select c.id, c.document_id, c.content,
         ts_rank(to_tsvector('spanish', c.content),
                 plainto_tsquery('spanish', query_text)) as sim,
         row_number() over (
           order by ts_rank(
             to_tsvector('spanish', c.content),
             plainto_tsquery('spanish', query_text)
           ) desc
         ) as rank
  from public.normative_chunks c
  join public.normative_documents d on d.id = c.document_id
  where length(coalesce(query_text,'')) > 0
    and to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', query_text)
    and (filter_type is null or d.type = filter_type)
  limit greatest(match_count * 3, 30)
),
combined as (
  select
    coalesce(s.id, f.id) as chunk_id,
    coalesce(s.document_id, f.document_id) as document_id,
    coalesce(s.content, f.content) as content,
    coalesce(1.0 / (50 + s.rank), 0)
      + coalesce(1.0 / (50 + f.rank), 0) as score
  from semantic s
  full outer join fulltext f on s.id = f.id
)
select
  c.chunk_id,
  c.document_id,
  c.content,
  d.title as doc_title,
  d.type as doc_type,
  d.number as doc_number,
  c.score as similarity
from combined c
join public.normative_documents d on d.id = c.document_id
order by c.score desc
limit match_count;
$$;

-- Permisos
grant execute on function public.hybrid_search(text, vector, int, text) to anon, authenticated;
