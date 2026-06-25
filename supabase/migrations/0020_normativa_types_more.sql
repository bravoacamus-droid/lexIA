-- ════════════════════════════════════════════════════════════════════
-- Amplía la taxonomía de tipos normativos (segunda iteración).
--
-- En migración 0019 agregamos: manual_seace, tupa, comunicado, guia.
-- Ahora agregamos 3 tipos más detectados al analizar la carpeta
-- "DIRECTIVAS, LINEAMIENTOS Y OTROS" que el cliente proporcionó:
--
--   - lineamiento     (orientativo, emite OECE/Perú Compras)
--   - codigo_etica    (regla de conducta, fuerza similar a directiva)
--   - resolucion      (resoluciones directorales/jefaturales que
--                      aprueban otras normas; distinto a resolucion_tce
--                      que son del Tribunal Sancionador)
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents
  drop constraint if exists normative_documents_type_check;

alter table public.normative_documents
  add constraint normative_documents_type_check
  check (type = any (array[
    'ley'::text,
    'reglamento'::text,
    'directiva'::text,
    'opinion'::text,
    'pronunciamiento'::text,
    'resolucion_tce'::text,
    'manual_seace'::text,
    'tupa'::text,
    'comunicado'::text,
    'guia'::text,
    -- agregados en 0020
    'lineamiento'::text,
    'codigo_etica'::text,
    'resolucion'::text
  ]));
