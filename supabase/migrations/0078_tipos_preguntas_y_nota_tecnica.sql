-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 78: dos tipos nuevos en la biblioteca
-- ════════════════════════════════════════════════════════════════════
-- Documento 11 de César (30/09/2026):
--   · preguntas_frecuentes — «deben ir en una carpeta independiente de
--     las guías».
--   · nota_tecnica — la Nota Técnica de la DGPMI (N° 0007-2025-EF/63.01),
--     «ingresar uno independiente».
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents drop constraint if exists normative_documents_type_check;
alter table public.normative_documents add constraint normative_documents_type_check check (
  type = any (array[
    'ley', 'reglamento', 'directiva', 'directiva_entidad', 'opinion', 'pronunciamiento',
    'resolucion_tce', 'manual_seace', 'tupa', 'comunicado', 'guia', 'lineamiento',
    'codigo_etica', 'resolucion', 'bases_estandar', 'criterio_validado', 'acuerdo_sala_plena',
    'preguntas_frecuentes', 'nota_tecnica'
  ])
);
