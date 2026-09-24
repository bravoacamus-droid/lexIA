-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 65: los acuerdos de Sala Plena del Tribunal
-- ════════════════════════════════════════════════════════════════════
-- DE DÓNDE SALE ESTO
--
-- En el documento «Estructura de A-LexIA» César pone los acuerdos de
-- Sala Plena entre las fuentes de la biblioteca. Había cero. No porque
-- no importen: las resoluciones del Tribunal que ya están en la
-- biblioteca los citan más de seiscientas veces —el 008-2021/TCE, el
-- 007-2021/TCE, el 002-2022/TCE, el 01-2026/TCP de las multas a las
-- mypes—, y el modelo leía la cita sin poder abrir el acuerdo.
--
-- Van como tipo propio y no como `resolucion_tce` porque no son lo
-- mismo: un acuerdo de Sala Plena fija un criterio que todas las salas
-- aplican, y la jerarquía (src/lib/ai/jerarquia.ts) ya le tenía
-- reservado su lugar —capa 2, delante de las resoluciones—. Lo que
-- faltaba era que la base de datos lo admitiera.
--
-- No crea tablas: amplía el CHECK de `normative_documents.type`, que
-- ya tiene RLS y sus policies.
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents
  drop constraint if exists normative_documents_type_check;

alter table public.normative_documents
  add constraint normative_documents_type_check check (
    type = any (array[
      'ley', 'reglamento', 'directiva', 'directiva_entidad', 'opinion',
      'pronunciamiento', 'resolucion_tce', 'manual_seace', 'tupa',
      'comunicado', 'guia', 'lineamiento', 'codigo_etica', 'resolucion',
      'bases_estandar', 'criterio_validado', 'acuerdo_sala_plena'
    ])
  );
