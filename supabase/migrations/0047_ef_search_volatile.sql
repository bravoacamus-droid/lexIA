-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 47: ampliar la búsqueda del índice cuando hay filtro
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (09/08/2026): al estrenar el parámetro de exclusión de la
-- etapa 45, pedir "pago por disponibilidad y activación" excluyendo
-- pronunciamientos devolvía CERO filas. Sin exclusión devolvía 8
-- pronunciamientos, y el contenido normativo existe: 20 fragmentos de
-- bases estándar y manuales lo mencionan.
--
-- DIAGNÓSTICO: no era el parámetro. Es POST-FILTRADO del índice HNSW.
-- pgvector recorre el grafo y devuelve hnsw.ef_search candidatos —40 por
-- omisión— y el WHERE se aplica DESPUÉS, sobre esos 40. Si los 40 más
-- cercanos son todos pronunciamientos, al excluirlos no queda ninguno.
--
-- Se comprobó escribiendo la misma rama a mano: devolvía 60 filas,
-- porque con esa forma el planificador no usa el índice y filtra antes
-- de ordenar. Misma consulta, mismo vector, resultado opuesto según se
-- pase o no por el índice.
--
-- SOLUCIÓN: ampliar ef_search cuando hay filtro. Se piden 400 candidatos
-- en vez de 40, de modo que después de filtrar quede material suficiente.
-- Solo cuando hay filtro: subirlo siempre encarecería todas las
-- búsquedas sin necesidad, y la mayoría no filtra nada.
--
-- LA ETAPA 46 NO FUNCIONÓ: se dejó la función marcada como `stable` y
-- Postgres rechaza `SET` ahí — "SET is not allowed in a non-volatile
-- function". El error no se veía como error: la llamada devolvía cero
-- filas y parecía que el filtro no encontraba nada. Ahora es volatile,
-- que es lo que exige poder tocar un parámetro de sesión.
--
-- El SET va protegido: si la extensión vector no está cargada en la
-- sesión, hnsw.ef_search no existe todavía y el SET fallaría. En ese
-- caso se sigue sin ampliar, que es el comportamiento de antes.
--
-- Esto explica además una fragilidad que llevaba tiempo ahí sin que se
-- notara: el rescate de fuente primaria filtra por tipo 'ley' y
-- 'reglamento', que son 688 y pocos cientos de fragmentos entre 335 mil.
-- Venía sufriendo el mismo recorte silencioso.
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
