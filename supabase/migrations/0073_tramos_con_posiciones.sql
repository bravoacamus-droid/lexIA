-- Las frases de la búsqueda avanzada, sin leer los fragmentos.
--
-- La 0072 encuentra en menos de un segundo los documentos que tienen
-- todas las palabras. Pero un chip de varias palabras («anexo n° 3») pide
-- además que vayan juntas, y eso exige posiciones. Comprobarlo en
-- normative_chunks leía unos 18 mil fragmentos de una tabla de 6,6 GB:
-- once segundos (medido con subsanación + anexo n° 3 + falta + apelación).
--
-- Aquí va el vocabulario CON posiciones, por tramos de 20 fragmentos
-- consecutivos. Tramos y no el documento entero porque un tsvector no
-- guarda posiciones más allá de la 16 383, y 1 423 documentos pasan de
-- ese largo; 20 fragmentos son unas 9 000 palabras. El tramo de un
-- fragmento es chunk_index / 20, fijo: cuando entra o cambia un
-- fragmento se recalcula solo su tramo.

create table if not exists public.normative_document_tramos (
  document_id uuid not null references public.normative_documents(id) on delete cascade,
  tramo int not null,
  lexemas tsvector not null default ''::tsvector,
  primary key (document_id, tramo)
);

alter table public.normative_document_tramos enable row level security;

drop policy if exists normative_document_tramos_select on public.normative_document_tramos;
create policy normative_document_tramos_select on public.normative_document_tramos
  for select
  using ((select auth.role()) = any (array['authenticated', 'anon']));

create or replace function public.tramos_recalcular(p_pares jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- p_pares: [{"d": uuid, "t": tramo}, ...]
  delete from normative_document_tramos x
  using jsonb_to_recordset(p_pares) as p(d uuid, t int)
  where x.document_id = p.d and x.tramo = p.t;

  insert into normative_document_tramos (document_id, tramo, lexemas)
  select c.document_id, c.chunk_index / 20,
         to_tsvector('spanish', string_agg(c.content, ' ' order by c.chunk_index))
  from normative_chunks c
  join jsonb_to_recordset(p_pares) as p(d uuid, t int)
    on c.document_id = p.d and c.chunk_index / 20 = p.t
  group by c.document_id, c.chunk_index / 20
  on conflict (document_id, tramo) do update set lexemas = excluded.lexemas;
end;
$$;

revoke execute on function public.tramos_recalcular(jsonb) from public, anon, authenticated;

create or replace function public.tramos_al_insertar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform tramos_recalcular(coalesce(
    (select jsonb_agg(distinct jsonb_build_object('d', document_id, 't', chunk_index / 20)) from nuevos),
    '[]'::jsonb));
  return null;
end;
$$;

create or replace function public.tramos_al_borrar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform tramos_recalcular(coalesce(
    (select jsonb_agg(distinct jsonb_build_object('d', document_id, 't', chunk_index / 20)) from viejos),
    '[]'::jsonb));
  return null;
end;
$$;

create or replace function public.tramos_al_cambiar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform tramos_recalcular(coalesce(
    (select jsonb_agg(distinct x) from (
       select jsonb_build_object('d', n.document_id, 't', n.chunk_index / 20) x
       from nuevos n join viejos v on v.id = n.id
       where n.content is distinct from v.content
          or n.document_id is distinct from v.document_id
          or n.chunk_index is distinct from v.chunk_index
       union
       select jsonb_build_object('d', v.document_id, 't', v.chunk_index / 20)
       from nuevos n join viejos v on v.id = n.id
       where n.document_id is distinct from v.document_id
          or n.chunk_index is distinct from v.chunk_index
     ) s),
    '[]'::jsonb));
  return null;
end;
$$;

drop trigger if exists tramos_al_insertar on public.normative_chunks;
create trigger tramos_al_insertar
  after insert on public.normative_chunks
  referencing new table as nuevos
  for each statement execute function public.tramos_al_insertar();

drop trigger if exists tramos_al_borrar on public.normative_chunks;
create trigger tramos_al_borrar
  after delete on public.normative_chunks
  referencing old table as viejos
  for each statement execute function public.tramos_al_borrar();

drop trigger if exists tramos_al_cambiar on public.normative_chunks;
create trigger tramos_al_cambiar
  after update on public.normative_chunks
  referencing old table as viejos new table as nuevos
  for each statement execute function public.tramos_al_cambiar();

-- La búsqueda: igual que en la 0072, pero la frase se comprueba en los
-- tramos del candidato (una o dos filas) y no en sus fragmentos.
-- Con los filtros de la biblioteca (entidad, años, recientes): la
-- biblioteca también busca por chips y debe comportarse igual.
drop function if exists public.buscar_con_todas_las_palabras(text[], text, text, int, int);
create or replace function public.buscar_con_todas_las_palabras(
  p_terminos text[],
  p_tipo text default null,
  p_ley text default null,
  p_limite int default 20,
  p_desde int default 0,
  p_entidad text default null,
  p_anio_desde int default null,
  p_anio_hasta int default null,
  p_fecha_desde date default null
)
returns table (document_id uuid, total bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  t text;
  v_doc tsquery;
  v_termino tsquery;
  v_frase tsquery;
  v_frases tsquery[] := '{}';
begin
  foreach t in array coalesce(p_terminos, '{}') loop
    v_termino := consulta_de_termino(t, false);
    if v_termino is null then continue; end if;
    v_doc := case when v_doc is null then v_termino else v_doc && v_termino end;
    v_frase := consulta_de_termino(t, true);
    if position('<' in v_frase::text) > 0 then
      v_frases := v_frases || v_frase;
    end if;
  end loop;
  if v_doc is null then return; end if;

  return query
    select d.id, count(*) over ()
    from normative_document_texto x
    join normative_documents d on d.id = x.document_id
    where x.lexemas @@ v_doc
      and (p_tipo is null or d.type = p_tipo)
      and (p_ley is null or d.applicable_law @> array[p_ley])
      and (p_entidad is null or d.metadata->>'entidad' = p_entidad)
      and (p_anio_desde is null or d.metadata->>'anio' >= p_anio_desde::text)
      and (p_anio_hasta is null or d.metadata->>'anio' <= p_anio_hasta::text)
      and (p_fecha_desde is null or d.date >= p_fecha_desde)
      and not exists (
        select 1 from unnest(v_frases) f
        where not exists (
          select 1 from normative_document_tramos r
          where r.document_id = d.id and r.lexemas @@ f
        )
      )
    order by d.date desc nulls last, d.id
    limit greatest(1, least(p_limite, 50))
    offset greatest(0, p_desde);
end;
$$;

-- Los pasajes: se buscan solo en los fragmentos de los tramos donde la
-- palabra aparece, en vez de recorrer el documento entero.
create or replace function public.fragmentos_con_palabras(
  p_documentos uuid[],
  p_terminos text[],
  p_por_termino int default 3
)
returns table (document_id uuid, termino int, chunk_index int, fragmento text)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  i int;
  q tsquery;
begin
  for i in 1 .. coalesce(array_length(p_terminos, 1), 0) loop
    q := consulta_de_termino(p_terminos[i], true);
    if q is null then continue; end if;
    return query
      select k.document_id, i, k.chunk_index,
             ts_headline('spanish', k.content, q,
               'StartSel=⟦, StopSel=⟧, MaxFragments=2, MaxWords=32, MinWords=14, FragmentDelimiter=" … "')
      from unnest(p_documentos) as d(id)
      cross join lateral (
        select c.document_id, c.chunk_index, c.content
        from normative_document_tramos r
        join normative_chunks c
          on c.document_id = r.document_id
         and c.chunk_index between r.tramo * 20 and r.tramo * 20 + 19
        where r.document_id = d.id and r.lexemas @@ q and c.fts @@ q
        order by c.chunk_index
        limit greatest(1, least(p_por_termino, 6))
      ) k;
  end loop;
end;
$$;

grant execute on function public.buscar_con_todas_las_palabras(text[], text, text, int, int, text, int, int, date) to authenticated;
grant execute on function public.fragmentos_con_palabras(uuid[], text[], int) to authenticated;
