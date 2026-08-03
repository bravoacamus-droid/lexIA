-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 36: contar los chips de la biblioteca en el servidor
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (03/08/2026, reportado por César sobre una captura): el chip
-- "Resolución TCE" mostraba 737 cuando la biblioteca ya tenía 3,553.
-- Todos los chips estaban mal, no solo ese.
--
-- CAUSA: la página de biblioteca traía TODAS las filas para contarlas en
-- JavaScript:
--     supabase.from('normative_documents').select('type, metadata')
-- El cliente de Supabase corta en 1,000 filas por omisión, así que
-- contaba sobre las primeras 1,000 de 3,841. Es el mismo tope que ya nos
-- mordió en el deduplicador de la ingesta el 02/08.
--
-- Medido antes de corregir — chips servidos vs. realidad:
--     resolucion_tce   737  →  3,553
--     pronunciamiento   86  →     96
--     opinion           46  →     48
--     directiva         50  →     60
--     resolucion         9  →     10
--     tupa               1  →      2
--     guia               9  →     10
-- Los años (2023-2026) salían bien de pura suerte: los cuatro aparecían
-- dentro de las primeras 1,000 filas.
--
-- SOLUCIÓN: agregar en Postgres y devolver un único objeto. Es una
-- consulta en vez de 3,841 filas por la red, y sigue siendo correcta
-- cuando el corpus llegue a las 15 mil resoluciones del censo.
--
-- No es SECURITY DEFINER a propósito: se ejecuta con los permisos de
-- quien llama, así que las políticas RLS de normative_documents siguen
-- aplicando y el conteo refleja lo que ese usuario puede ver.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.library_facets()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'tipos', coalesce(
      (
        select jsonb_object_agg(t.type, t.n)
        from (
          select type, count(*)::int as n
          from public.normative_documents
          group by type
        ) t
      ),
      '{}'::jsonb
    ),
    'anios', coalesce(
      (
        select jsonb_agg(a.anio order by a.anio desc)
        from (
          select distinct (metadata->>'anio')::int as anio
          from public.normative_documents
          where metadata->>'anio' ~ '^[0-9]{4}$'
        ) a
        where a.anio between 1990 and 2100
      ),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.library_facets() to anon, authenticated, service_role;
