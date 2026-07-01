-- ────────────────────────────────────────────────────────────────────
-- 0029_add_bases_estandar_type.sql
--
-- Agrega 'bases_estandar' al check constraint de type en
-- normative_documents. Cesar solicito en la llamada del 30/06/2026
-- cargar las Bases Estandar oficiales de la DGA como fuente para el
-- RAG, para que el chat y la voz puedan citarlas.
-- ────────────────────────────────────────────────────────────────────

alter table normative_documents
  drop constraint if exists normative_documents_type_check;

alter table normative_documents
  add constraint normative_documents_type_check
  check (
    type = any (
      array[
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
        'lineamiento'::text,
        'codigo_etica'::text,
        'resolucion'::text,
        'bases_estandar'::text
      ]
    )
  );
