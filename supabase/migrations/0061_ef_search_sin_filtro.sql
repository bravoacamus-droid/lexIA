-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 61: el índice no puede devolver más de lo que explora
-- ════════════════════════════════════════════════════════════════════
-- La etapa 47 subió `hnsw.ef_search` solo cuando hay filtro, razonando
-- que sin filtro no hacía falta. Es al revés.
--
-- `ef_search` es cuántos candidatos recorre el índice HNSW, y su valor
-- por defecto es 40. La rama semántica pide `limite` filas, que nunca
-- baja de 60. Sin filtro, el índice se quedaba en 40 y devolvía SIEMPRE
-- cuarenta fragmentos, pidiera los que pidiera.
--
-- No es solo cantidad: esos cuarenta salen del primer vecindario que
-- encuentra la búsqueda voraz, así que vienen todos del mismo sitio.
-- Medido el 13/09/2026 con la pregunta de César sobre si es subsanable
-- omitir un literal del Anexo N° 3:
--
--   ef_search por defecto → 40 fragmentos, los 40 pronunciamientos,
--                           ninguna resolución del Tribunal
--   ef_search = 200       → 200 fragmentos, 13 resoluciones, y la mejor
--                           puntúa 0.787, por encima del mejor
--                           pronunciamiento (0.782)
--
-- Es decir: la jurisprudencia que responde la pregunta estaba en la
-- biblioteca —15,427 resoluciones— y la búsqueda no la alcanzaba nunca.
-- La respuesta salía construida sobre la Ley y doce pronunciamientos, y
-- las dos posiciones que pedía César quedaban razonadas en vez de
-- documentadas.
--
-- Ahora se sube siempre, proporcional a lo que se pide. Medido: sin
-- coste de tiempo apreciable (440-550 ms en los dos casos).
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
-- La etapa 51 lo hizo `security definer` y esta migración lo conserva:
-- sin él, las políticas RLS se evalúan sobre los 337.000 fragmentos en
-- cada consulta y el rol `authenticated` se come sus quince segundos.
security definer
set search_path = public
as $fn$
declare
  limite integer := greatest(match_count * 5, 60);
  tope_jurisprudencia integer := 1500;
  hay_filtro boolean := filter_type is not null
    or (exclude_types is not null and array_length(exclude_types, 1) > 0)
    or (filter_law is not null and array_length(filter_law, 1) > 0);
begin
  -- El índice no puede devolver más filas de las que explora, así que
  -- `ef_search` tiene que ir por delante de `limite` SIEMPRE, haya
  -- filtro o no. Con filtro, además, el recorte ocurre después de
  -- recorrerlo, y por eso se pide más margen.
  begin
    -- `set local` no admite expresiones; se pasa por set_config, que
    -- hace lo mismo con el tercer argumento en true.
    perform set_config(
      'hnsw.ef_search',
      greatest(limite * 2, case when hay_filtro then 400 else 200 end)::text,
      true
    );
  exception when others then
    -- La extensión aún no registró el parámetro en esta sesión.
    null;
  end;

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
