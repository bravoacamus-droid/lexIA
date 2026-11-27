-- ════════════════════════════════════════════════════════════════════
-- 0093 · Dos tipos nuevos en la biblioteca: dictámenes e informes IVN
--
-- POR QUÉ
--
-- Reunión con César del 27/11/2026: «se crearían dictámenes y vicio de
-- nulidad». Mandó dos carpetas nuevas:
--   · dictamen — «EXPEDIENTE DIC N° …» de la Subdirección de Supervisión
--     de Procedimientos Competitivos del OECE: el contrato ya se firmó con
--     las fallas y se recomienda corregir y se remite al órgano de control.
--   · informe_vicio_nulidad — «INFORME IVN N.° …/DSAT» de la DSAT del
--     OECE: declara nulo el procedimiento y lo retrotrae («reformula tu
--     requerimiento y empieza de cero»).
--
-- Los dos resuelven un caso concreto, como los pronunciamientos, así que
-- entran en `es_casuistica()`: la búsqueda los trata con la rama de
-- casuística y no se copian a `normative_chunks_norm` (la rama normativa
-- queda con las reglas). Hoy no hay documentos de estos tipos, así que no
-- hay fragmentos que mover.
--
-- Aditiva: se puede aplicar antes del deploy.
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents drop constraint if exists normative_documents_type_check;
alter table public.normative_documents add constraint normative_documents_type_check check (
  type = any (array[
    'ley', 'reglamento', 'directiva', 'directiva_entidad', 'opinion', 'pronunciamiento',
    'resolucion_tce', 'manual_seace', 'tupa', 'comunicado', 'guia', 'lineamiento',
    'codigo_etica', 'resolucion', 'bases_estandar', 'criterio_validado', 'acuerdo_sala_plena',
    'preguntas_frecuentes', 'nota_tecnica', 'dictamen', 'informe_vicio_nulidad'
  ])
);

/** Tipos que resuelven un caso concreto y no enuncian la regla. */
create or replace function public.es_casuistica(tipo text)
returns boolean
language sql
immutable
as $$
  select tipo in ('resolucion_tce', 'pronunciamiento', 'opinion', 'dictamen', 'informe_vicio_nulidad');
$$;
