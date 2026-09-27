-- La búsqueda avanzada con TODAS las palabras.
--
-- César (27/09/2026, observación 1 del perfil Consulta): con los chips
-- «subsanación», «anexo n° 3», «falta» y «apelación» el buscador devolvía
-- documentos que traían una sola de las cuatro («1/4»). Lo que se pide
-- es lo contrario: solo los documentos que contienen todas, y en cada
-- uno los pasajes donde aparece cada palabra.
--
-- El buscador lanzaba una búsqueda semántica por palabra, tomaba los
-- ocho mejores fragmentos de cada una y los sumaba: casi nunca coincidían
-- en un mismo documento. Buscar cada palabra en los 369 mil fragmentos
-- con el índice que ya existe tarda de 2 a 10 segundos por palabra
-- (medido): cuatro palabras, veinte segundos.
--
-- Por eso una tabla con el vocabulario de cada documento entero: la
-- pregunta «¿tiene estas cuatro palabras?» se contesta con una sola
-- consulta al índice. Se guarda sin posiciones (strip) para que ocupe
-- un tercio; las frases («anexo n° 3») se comprueban después contra los
-- fragmentos, pero solo en los documentos que ya pasaron el primer filtro.

create table if not exists public.normative_document_texto (
  document_id uuid primary key references public.normative_documents(id) on delete cascade,
  lexemas tsvector not null default ''::tsvector,
  actualizado timestamptz not null default now()
);

create index if not exists normative_document_texto_lexemas_idx
  on public.normative_document_texto using gin (lexemas);

alter table public.normative_document_texto enable row level security;

drop policy if exists normative_document_texto_select on public.normative_document_texto;
create policy normative_document_texto_select on public.normative_document_texto
  for select
  using ((select auth.role()) = any (array['authenticated', 'anon']));
-- Nadie escribe a mano: la llenan los disparadores de normative_chunks.

-- ── Mantenerla al día ────────────────────────────────────────────────
-- Al insertar fragmentos se SUMA su vocabulario (barato: el actualizador
-- inserta de a diez). Al borrar o cambiar el texto se recalcula entero,
-- que es raro.

create or replace function public.texto_de_documento_sumar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into normative_document_texto (document_id, lexemas)
  select n.document_id, strip(to_tsvector('spanish', string_agg(n.content, ' ')))
  from nuevos n
  group by n.document_id
  on conflict (document_id) do update
    set lexemas = strip(normative_document_texto.lexemas || excluded.lexemas),
        actualizado = now();
  return null;
end;
$$;

create or replace function public.texto_de_documento_recalcular(p_documentos uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update normative_document_texto t
  set lexemas = coalesce(
        (select strip(to_tsvector('spanish', string_agg(c.content, ' ' order by c.chunk_index)))
         from normative_chunks c where c.document_id = t.document_id),
        ''::tsvector),
      actualizado = now()
  where t.document_id = any (p_documentos);
$$;

create or replace function public.texto_de_documento_al_borrar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform texto_de_documento_recalcular(array(select distinct document_id from viejos));
  return null;
end;
$$;

create or replace function public.texto_de_documento_al_cambiar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo si cambió el texto: rellenar embeddings también es un UPDATE.
  perform texto_de_documento_recalcular(array(
    select distinct n.document_id
    from nuevos n join viejos v on v.id = n.id
    where n.content is distinct from v.content or n.document_id is distinct from v.document_id
  ));
  return null;
end;
$$;

revoke execute on function public.texto_de_documento_recalcular(uuid[]) from public, anon, authenticated;

drop trigger if exists texto_de_documento_sumar on public.normative_chunks;
create trigger texto_de_documento_sumar
  after insert on public.normative_chunks
  referencing new table as nuevos
  for each statement execute function public.texto_de_documento_sumar();

drop trigger if exists texto_de_documento_al_borrar on public.normative_chunks;
create trigger texto_de_documento_al_borrar
  after delete on public.normative_chunks
  referencing old table as viejos
  for each statement execute function public.texto_de_documento_al_borrar();

drop trigger if exists texto_de_documento_al_cambiar on public.normative_chunks;
create trigger texto_de_documento_al_cambiar
  after update on public.normative_chunks
  referencing old table as viejos new table as nuevos
  for each statement execute function public.texto_de_documento_al_cambiar();

-- ── Las consultas ────────────────────────────────────────────────────
-- Cada término llega con sus variantes separadas por «|»
-- («subsanación|subsanacion»): el índice guarda las palabras tal como
-- vienen en el PDF, y las resoluciones escaneadas suelen venir sin tilde.

create or replace function public.consulta_de_termino(p_termino text, p_frase boolean)
returns tsquery
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
  q tsquery;
  r tsquery;
begin
  foreach v in array string_to_array(p_termino, '|') loop
    q := case when p_frase then phraseto_tsquery('spanish', v) else plainto_tsquery('spanish', v) end;
    if numnode(q) = 0 then continue; end if;
    r := case when r is null then q else r || q end;
  end loop;
  return r;
end;
$$;

create or replace function public.buscar_con_todas_las_palabras(
  p_terminos text[],
  p_tipo text default null,
  p_ley text default null,
  p_limite int default 20,
  p_desde int default 0
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
    -- Un término hecho solo de palabras vacías («de», «la») no filtra nada.
    if v_termino is null then continue; end if;
    v_doc := case when v_doc is null then v_termino else v_doc && v_termino end;
    v_frase := consulta_de_termino(t, true);
    -- Más de una palabra: además de estar todas, deben ir juntas.
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
      and not exists (
        select 1 from unnest(v_frases) f
        where not exists (
          select 1 from normative_chunks k where k.document_id = d.id and k.fts @@ f
        )
      )
    order by d.date desc nulls last, d.id
    limit greatest(1, least(p_limite, 50))
    offset greatest(0, p_desde);
end;
$$;

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
        from normative_chunks c
        where c.document_id = d.id and c.fts @@ q
        order by c.chunk_index
        limit greatest(1, least(p_por_termino, 6))
      ) k;
  end loop;
end;
$$;

grant execute on function public.buscar_con_todas_las_palabras(text[], text, text, int, int) to authenticated;
grant execute on function public.fragmentos_con_palabras(uuid[], text[], int) to authenticated;
