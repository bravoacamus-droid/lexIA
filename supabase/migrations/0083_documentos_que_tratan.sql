-- Los documentos que TRATAN una expresión, no los que la mencionan.
--
-- `buscar_frase` trae los más recientes que contienen la frase. Para
-- «¿se puede pedir ser partner?» eso no sirve: de 56 documentos con
-- «partner», los más recientes son resoluciones del Tribunal que la
-- nombran de paso, y los pronunciamientos que discuten la exigencia
-- quedaban fuera (César, 01/10/2026). Aquí se ordena por cuántos
-- fragmentos la contienen —quien discute la exigencia la repite en el
-- cuestionamiento, en el análisis y en lo que resuelve—, y de cada
-- documento se devuelven sus fragmentos con la frase (hasta diez), para
-- que quien llama elija los que contienen la decisión: en el 566-2026 el
-- primero solo enumera los cuestionamientos y el último transcribe las
-- bases con el texto suprimido, que tachado en el PDF se lee como
-- vigente; la supresión está en el del medio.
drop function if exists public.documentos_que_tratan(text, text[], integer);
create or replace function public.documentos_que_tratan(
  frase text,
  tipos text[] default null,
  tope integer default 12
)
returns table (
  document_id uuid,
  doc_type text,
  doc_number text,
  doc_title text,
  doc_date date,
  menciones integer,
  fragmentos jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with consulta as (
    select phraseto_tsquery('spanish', frase) as q
  ),
  casan as (
    select c.id, c.document_id, c.chunk_index, c.content
    from normative_chunks c
    cross join consulta
    where c.fts @@ consulta.q
      -- El índice propone; la cadena literal dispone (ver 0054).
      and position(lower(frase) in lower(c.content)) > 0
  ),
  por_documento as (
    select
      d.id,
      d.type,
      d.number,
      d.title,
      d.date,
      count(*)::integer as menciones
    from casan ca
    join normative_documents d on d.id = ca.document_id
    where not coalesce(d.oculto, false)
      and (tipos is null or d.type = any (tipos))
    group by d.id
    order by count(*) desc, d.date desc nulls last
    limit greatest(tope, 1)
  )
  select
    p.id,
    p.type,
    p.number,
    p.title,
    p.date,
    p.menciones,
    (
      select jsonb_agg(jsonb_build_object('id', f.id, 'indice', f.chunk_index, 'contenido', f.content) order by f.chunk_index)
      from (
        select ca.id, ca.chunk_index, ca.content
        from casan ca
        where ca.document_id = p.id
        order by ca.chunk_index
        limit 10
      ) f
    )
  from por_documento p
  order by p.menciones desc, p.date desc nulls last;
$$;

revoke all on function public.documentos_que_tratan(text, text[], integer) from public;
grant execute on function public.documentos_que_tratan(text, text[], integer) to authenticated, service_role;
