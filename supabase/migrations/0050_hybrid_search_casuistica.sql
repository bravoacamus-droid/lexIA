-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 50: la rama acotada cubre toda la casuística
-- ════════════════════════════════════════════════════════════════════
-- Acompaña a la migración 0049, que sacó opiniones y pronunciamientos de
-- la tabla lateral de normativa. Sin este cambio quedarían fuera de la
-- búsqueda por texto: ya no están en ft_normativa y la otra rama solo
-- miraba resoluciones del Tribunal.
--
-- Ahora ft_jurisprudencia cubre los tres tipos que resuelven un caso
-- concreto —resolución, pronunciamiento y opinión— con el mismo tope de
-- 1,500 candidatos. La normativa, que enuncia la regla, se sigue
-- rankeando completa porque vuelve a ser pequeña: 5,291 fragmentos
-- frente a los 82,827 a los que había llegado.
--
-- Se conserva todo lo demás: el vector como literal para que use el
-- índice HNSW (etapa 35), la ampliación de ef_search cuando hay filtro
-- (etapa 47) y el parámetro de exclusión (etapa 45).
-- ════════════════════════════════════════════════════════════════════

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
volatile
as $fn$
declare
  limite integer := greatest(match_count * 5, 60);
  tope_jurisprudencia integer := 1500;
  hay_filtro boolean := filter_type is not null
    or (exclude_types is not null and array_length(exclude_types, 1) > 0)
    or (filter_law is not null and array_length(filter_law, 1) > 0);
begin
  -- Con filtro, el índice tiene que ofrecer más candidatos porque el
  -- recorte ocurre después de recorrerlo. Sin filtro no hace falta.
  if hay_filtro then
    begin
      set local hnsw.ef_search = 400;
    exception when others then
      -- La extensión aún no registró el parámetro en esta sesión.
      null;
    end;
  end if;

  -- El vector va interpolado como literal (format %L) para que el
  -- planificador lo conozca y use el índice HNSW; ver migración 0035.
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
        and public.es_casuistica(d.type)
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
