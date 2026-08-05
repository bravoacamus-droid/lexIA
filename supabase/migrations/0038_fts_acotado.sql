-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 38: acotar la rama de texto de hybrid_search
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (04/08/2026): con la ingesta DETENIDA, "plazo para
-- perfeccionar el contrato" no devolvía nada —superaba el
-- statement_timeout— mientras otras consultas respondían en 300 ms. No
-- era contención: era esa consulta.
--
-- CAUSA: la rama de texto rankea TODAS las coincidencias con
-- ts_rank_cd, y el costo crece con el número de coincidencias. Con
-- 214 mil fragmentos, casi todos de resoluciones del Tribunal:
--
--   'plaz' & 'perfeccion' & 'contrat'      16,742 coincidencias  8,141 ms
--   'mult' & 'incumpl' & 'contrat'          3,249 coincidencias  1,762 ms
--   'sancion' & 'inhabilitacion' & 'proveedor'  21 coincidencias      5 ms
--
-- El problema empeora con cada resolución que entra, y golpea justo a
-- las preguntas más comunes del dominio: plazos, contratos, penalidades.
-- Son las que todo usuario hace.
--
-- Y la rama ya no servía para lo que existe: en "plazo para perfeccionar
-- el contrato" el top 75 por ts_rank_cd eran 75 RESOLUCIONES y CERO
-- fragmentos normativos, pese a que 312 fragmentos de la Ley, el
-- Reglamento y las directivas coincidían. La jurisprudencia ahogaba a la
-- norma.
--
-- SOLUCIÓN: separar la rama en dos.
--   · NORMATIVA (ley, reglamento, directiva, opinión, ...): se rankea
--     COMPLETA. Son ~12 mil fragmentos en total, es barato, y es donde
--     vive la calidad que se midió y ajustó.
--   · JURISPRUDENCIA (resoluciones del Tribunal): se acota a 1,500
--     candidatos. Cuando una consulta hace coincidir 16 mil
--     resoluciones, el orden por ts_rank_cd entre ellas ya es ruido; la
--     rama vectorial es la que discrimina de verdad.
--
-- Medido — tiempo de la rama de texto y fragmentos normativos del top 75
-- que se conservan:
--   "plazo para perfeccionar el contrato"   8,141 → 2,514 ms
--   "multa por incumplimiento"              1,762 →    57 ms   1/1
--   "ampliacion de plazo contractual"         296 →    24 ms  19/19
--   "penalidad por mora"                        8 →     6 ms   1/1
--   "sancion de inhabilitacion"                 5 →     8 ms
-- No se pierde ningún fragmento normativo; se ganan los que la
-- jurisprudencia desplazaba.
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
  -- Tope de resoluciones que entran a rankear por texto.
  tope_jurisprudencia integer := 1500;
begin
  -- El vector va interpolado como literal (format %L) para que el
  -- planificador lo conozca y use el índice HNSW; ver migración 0035.
  -- El texto de búsqueda sigue viajando como parámetro (USING), así que
  -- no hay riesgo de inyección.
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
    -- Normativa: se rankea completa.
    ft_normativa as (
      select c.id, c.document_id, c.content, d.title, d.type, d.number, c.fts
      from normative_chunks c
      join normative_documents d on d.id = c.document_id
      where c.fts @@ plainto_tsquery('spanish', $1)
        and d.type <> 'resolucion_tce'
        and ($2 is null or d.type = $2)
        and ($3 is null or array_length($3, 1) is null or d.applicable_law && $3)
    ),
    -- Jurisprudencia: acotada, para que no ahogue a la normativa ni
    -- dispare el costo del ranking.
    ft_jurisprudencia as (
      select c.id, c.document_id, c.content, d.title, d.type, d.number, c.fts
      from normative_chunks c
      join normative_documents d on d.id = c.document_id
      where c.fts @@ plainto_tsquery('spanish', $1)
        and d.type = 'resolucion_tce'
        and ($2 is null or d.type = $2)
        and ($3 is null or array_length($3, 1) is null or d.applicable_law && $3)
      limit %s
    ),
    fulltext as (
      select
        id as chunk_id, document_id, content,
        title as doc_title, type as doc_type, number as doc_number,
        ts_rank_cd(fts, plainto_tsquery('spanish', $1)) as score
      from (
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
  using query_text, filter_type, filter_law;
end;
$fn$;

grant execute on function public.hybrid_search(text, vector, integer, text, text[])
  to anon, authenticated, service_role;
