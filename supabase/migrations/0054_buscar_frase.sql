-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 54: buscar una frase literal y devolver documentos
-- distintos, no fragmentos parecidos
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (21/08/2026, reportado por César): pidió "al menos 10 casos
-- que resolvió el Tribunal respecto a los FACTORES DE EVALUACIÓN,
-- específicamente sobre la Integridad en la contratación pública". El
-- chat devolvió otras resoluciones y se dejó fuera cinco que él conoce
-- —01727-2026-S2, 06127-2026-S1, 04735-2026-S4, 03318-2026-S6 y
-- 04780-2026-S4—, todas en la biblioteca y todas sobre ese factor.
--
-- CAUSA: no es un fallo de ranking, es el ranking mismo. Medido sobre la
-- base real:
--
--   · esas cinco tratan el factor: sus fragmentos dicen literalmente
--     "Respecto del factor de evaluación 'Integridad en la contratación
--     pública'";
--   · pero hay al menos 184 documentos más que dicen lo mismo;
--   · con cuatro formulaciones distintas de la consulta y tres tamaños
--     de búsqueda —15, 60 y 200 fragmentos— solo UNA de las cinco
--     aparece, y en el top-200.
--
-- Ninguna mejora del orden por relevancia va a poner justo esas cinco
-- arriba, porque nada en el texto las distingue de las otras ciento
-- ochenta. Y hay un problema anterior: la búsqueda devuelve FRAGMENTOS
-- ordenados por parecido, y a una pregunta de "dame 10 casos" hay que
-- responder con DOCUMENTOS distintos.
--
-- Además, en un fragmento largo el término se diluye: las resoluciones
-- del Tribunal mezclan la experiencia del personal, la vigilancia
-- privada y el factor de integridad en el mismo párrafo, así que el
-- vector del fragmento no se parece a "integridad" tanto como uno corto
-- que solo hable de eso.
--
-- SOLUCIÓN: cuando el usuario nombra un tema con sus palabras exactas,
-- se busca la FRASE en dos pasos y se devuelve un documento por
-- resultado, del más reciente al más antiguo.
--
-- Los dos pasos no son un capricho. El índice de texto completo trabaja
-- con raíces, y en español "integradas" e "integridad" comparten la
-- raíz "integr". Como cada página de una resolución lleva el encabezado
-- "Tribunal de Contrataciones Públicas", cualquier párrafo que hable de
-- "bases integradas" casaba con "integridad en la contratación pública"
-- sin tener nada que ver. De ahí salían los 1 178 documentos: la mayoría
-- eran falsos.
--
-- Así que el índice se usa para lo que sirve —descartar deprisa los
-- millones de fragmentos que no pueden casar— y sobre los pocos
-- supervivientes se comprueba el texto literal.
--
-- Se devuelve también si hay más documentos de los que se piden, para
-- que la respuesta pueda decir "hay más" en vez de dar a entender que
-- son todos los que existen.
--
-- CUÁNTO CUESTA CADA COSA, medido en esta base:
--
--   · contar todos los documentos que contienen la frase: 27 s. La
--     búsqueda de frase obliga a comprobar posiciones, y el índice
--     devuelve 86 958 candidatos de los que descarta 83 377 leyendo
--     46 083 bloques de disco. Descartado.
--   · lo mismo sin exigir el orden de las palabras: 8,7 s. También
--     descartado.
--   · recorrer los documentos por fecha y parar al juntar los doce
--     pedidos: 435 ms. Este es el camino.
--
-- Por eso no se cuenta el total: se piden trece para saber si hay más de
-- doce. Saber "hay más" cuesta cero; saber "hay 1 178" cuesta 27 s, y no
-- vale 27 s.
--
-- Y por eso vive en la base y no en la aplicación: desde PostgREST hay
-- que traerse cientos de filas para agruparlas en memoria, lo que medido
-- tarda casi seis segundos y se corta por tiempo.
-- ════════════════════════════════════════════════════════════════════

begin;

drop function if exists public.buscar_frase(text, text, integer, integer);

create or replace function public.buscar_frase(
  frase text,
  filtro_tipo text default null,
  tope integer default 12,
  fragmentos_por_documento integer default 2
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  doc_title text,
  doc_type text,
  doc_number text,
  doc_date date,
  hay_mas boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with consulta as (
    select phraseto_tsquery('spanish', frase) as q
  ),
  -- Uno más de los pedidos: con eso se sabe si hay más sin contarlos.
  -- El recorrido va por fecha y para en cuanto los junta, así que el
  -- coste no depende de cuántos documentos traten el tema.
  candidatos as (
    select d.id, d.title, d.type, d.number, d.date
    from normative_documents d
    cross join consulta
    where (filtro_tipo is null or d.type = filtro_tipo)
      and exists (
        select 1
        from normative_chunks c
        where c.document_id = d.id
          and c.fts @@ consulta.q
          -- El índice propone; la cadena literal dispone.
          --
          -- Se comprueba con `position` y no con `ilike` por una razón
          -- de plan, no de estilo: con `ilike` el estimador cree que
          -- casi nada va a casar, deja de recorrer los documentos por
          -- fecha parando al juntar los pedidos y pasa a calcularlos
          -- todos para ordenarlos después. Medido: 27 s con `ilike`,
          -- 947 ms con `position`. Mismo resultado, otro plan.
          and position(lower(frase) in lower(c.content)) > 0
      )
    order by d.date desc nulls last, d.id
    limit greatest(tope, 1) + 1
  ),
  hay as (
    select count(*) > greatest(tope, 1) as mas from candidatos
  ),
  elegidos as (
    select * from candidatos
    order by date desc nulls last, id
    limit greatest(tope, 1)
  )
  select
    co.id as chunk_id,
    co.document_id,
    co.content,
    e.title as doc_title,
    e.type as doc_type,
    e.number as doc_number,
    e.date as doc_date,
    hay.mas as hay_mas
  from elegidos e
  cross join hay
  -- De cada documento, sus primeros fragmentos con la frase: en una
  -- resolución del Tribunal el factor discutido aparece en los
  -- antecedentes y otra vez en el análisis, y el primero suele bastar
  -- para saber de qué va el caso.
  join lateral (
    select c.id, c.document_id, c.content, c.chunk_index
    from normative_chunks c
    cross join consulta
    where c.document_id = e.id
      and c.fts @@ consulta.q
      and position(lower(frase) in lower(c.content)) > 0
    order by c.chunk_index
    limit greatest(fragmentos_por_documento, 1)
  ) co on true
  order by e.date desc nulls last, e.id, co.chunk_index;
$$;

comment on function public.buscar_frase is
  'Busca una frase literal en los fragmentos y devuelve un documento por resultado, del más reciente al más antiguo, con el total de documentos que la contienen. Para preguntas de tipo "dame N casos sobre X", donde la respuesta debe ser N documentos distintos y no N fragmentos parecidos.';

revoke all on function public.buscar_frase(text, text, integer, integer) from public;
grant execute on function public.buscar_frase(text, text, integer, integer) to anon, authenticated, service_role;

commit;
