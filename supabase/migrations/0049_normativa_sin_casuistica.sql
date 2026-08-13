-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 49: sacar la casuística de la rama sin acotar
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (10/08/2026): el chat respondió "en los fragmentos normativos
-- disponibles no se encuentra información" a una pregunta sobre
-- controversias, que la Ley regula en un título entero. No era falta de
-- contenido ni un fallo del rescate: hybrid_search superaba el
-- statement_timeout y el endpoint seguía adelante sin fuentes.
--
-- CAUSA: la tabla lateral normative_chunks_norm creció de 24,091 a
-- 82,827 filas (241 MB). Su disparador copia todo lo que no sea
-- resolución del Tribunal, así que absorbió los 2,422 pronunciamientos y
-- las 726 opiniones ingeridos después. Esa rama se rankea COMPLETA —ese
-- era el diseño de la etapa 39, porque era pequeña— y dejó de serlo:
--
--     "penalidad"    7,949 coincidencias
--     "controversia" 2,321 coincidencias · 641 ms solo esa rama
--
-- SOLUCIÓN: la tabla lateral vuelve a contener SOLO el núcleo normativo
-- —ley, reglamento, directiva, bases estándar, guías, manuales,
-- lineamientos—. Opiniones y pronunciamientos pasan a la rama acotada
-- junto con las resoluciones.
--
-- Es la misma distinción que apareció trabajando las facetas: los tres
-- tipos resuelven un CASO CONCRETO, mientras que la norma enuncia la
-- REGLA. Cuando una consulta hace coincidir miles de ellos, ordenarlos
-- entre sí por ts_rank_cd aporta poco y cuesta mucho; la rama vectorial
-- es la que discrimina.
-- ════════════════════════════════════════════════════════════════════

/** Tipos que resuelven un caso concreto y no enuncian la regla. */
create or replace function public.es_casuistica(tipo text)
returns boolean
language sql
immutable
as $$
  select tipo in ('resolucion_tce', 'pronunciamiento', 'opinion');
$$;

-- Fuera de la tabla lateral lo que ahora es casuística.
delete from public.normative_chunks_norm n
 using public.normative_chunks c
  join public.normative_documents d on d.id = c.document_id
 where n.chunk_id = c.id
   and public.es_casuistica(d.type);

-- El disparador deja de copiarlas.
create or replace function public.espejar_fragmento_normativo()
returns trigger
language plpgsql
as $$
declare
  tipo text;
begin
  select d.type into tipo
    from public.normative_documents d
   where d.id = new.document_id;
  if tipo is not null and not public.es_casuistica(tipo) then
    insert into public.normative_chunks_norm (chunk_id, fts)
    values (new.id, new.fts)
    on conflict (chunk_id) do update set fts = excluded.fts;
  end if;
  return null;
end;
$$;

vacuum analyze public.normative_chunks_norm;
