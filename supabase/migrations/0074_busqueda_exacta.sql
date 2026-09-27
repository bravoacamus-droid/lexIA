-- La búsqueda por chips, con las palabras tal como se escriben.
--
-- La 0072/0073 usaban el diccionario 'spanish', que reduce cada palabra
-- a su raíz. Para buscar por significado sirve; para lo que César pidió
-- —documentos que contengan las palabras que él escribe— no: probando
-- «penalidad» + «mora» salían pasajes con «penales» y «More», porque
-- «penalidad» y «penales» comparten la raíz «penal», y «mora» y «More»
-- la raíz «mor».
--
-- es_exacto guarda cada palabra tal cual (en minúsculas) y descarta las
-- vacías del español («de», «la», «y»). Las variantes que sí importan
-- —con y sin tilde, singular y plural— las arma la aplicación
-- (src/lib/busqueda/todas-las-palabras.ts), a la vista y sin adivinar.
--
-- Tras aplicarla hay que volver a llenar las dos tablas.

do $$
begin
  if not exists (select 1 from pg_ts_dict where dictname = 'es_exacto_dic') then
    create text search dictionary public.es_exacto_dic (template = simple, stopwords = spanish);
  end if;
  if not exists (select 1 from pg_ts_config where cfgname = 'es_exacto') then
    create text search configuration public.es_exacto (copy = simple);
    alter text search configuration public.es_exacto
      alter mapping for asciiword, word, numword, asciihword, hword, numhword,
                        hword_part, hword_asciipart, hword_numpart
      with public.es_exacto_dic;
  end if;
end $$;

create or replace function public.texto_de_documento_sumar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into normative_document_texto (document_id, lexemas)
  select n.document_id, strip(to_tsvector('public.es_exacto', string_agg(n.content, ' ')))
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
        (select strip(to_tsvector('public.es_exacto', string_agg(c.content, ' ' order by c.chunk_index)))
         from normative_chunks c where c.document_id = t.document_id),
        ''::tsvector),
      actualizado = now()
  where t.document_id = any (p_documentos);
$$;

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
         to_tsvector('public.es_exacto', string_agg(c.content, ' ' order by c.chunk_index))
  from normative_chunks c
  join jsonb_to_recordset(p_pares) as p(d uuid, t int)
    on c.document_id = p.d and c.chunk_index / 20 = p.t
  group by c.document_id, c.chunk_index / 20
  on conflict (document_id, tramo) do update set lexemas = excluded.lexemas;
end;
$$;

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
    q := case when p_frase then phraseto_tsquery('public.es_exacto', v) else plainto_tsquery('public.es_exacto', v) end;
    if numnode(q) = 0 then continue; end if;
    r := case when r is null then q else r || q end;
  end loop;
  return r;
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
             ts_headline('public.es_exacto', k.content, q,
               'StartSel=⟦, StopSel=⟧, MaxFragments=2, MaxWords=32, MinWords=14, FragmentDelimiter=" … "')
      from unnest(p_documentos) as d(id)
      cross join lateral (
        select c.document_id, c.chunk_index, c.content
        from normative_document_tramos r
        join normative_chunks c
          on c.document_id = r.document_id
         and c.chunk_index between r.tramo * 20 and r.tramo * 20 + 19
        where r.document_id = d.id and r.lexemas @@ q
          and to_tsvector('public.es_exacto', c.content) @@ q
        order by c.chunk_index
        limit greatest(1, least(p_por_termino, 6))
      ) k;
  end loop;
end;
$$;

truncate public.normative_document_texto;
truncate public.normative_document_tramos;
