-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 79: los contadores de la biblioteca cuentan normas
-- ════════════════════════════════════════════════════════════════════
-- Documento 11 de César (30/09/2026). Los números de los chips de tipo:
--   · no cuentan lo oculto (derogado, vencido o retirado);
--   · cuentan cada acto normativo una vez, no cada pieza: una directiva
--     con su resolución, dos modificaciones y tres anexos es UNA
--     directiva. Los documentos sin acto se cuentan uno a uno.
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
          select type, count(distinct coalesce(acto_clave, id::text))::int as n
          from public.normative_documents
          where not oculto
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
          where metadata->>'anio' ~ '^[0-9]{4}$' and not oculto
        ) a
        where a.anio between 1990 and 2100
      ),
      '[]'::jsonb
    )
  );
$$;
