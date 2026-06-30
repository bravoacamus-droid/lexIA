-- ────────────────────────────────────────────────────────────────────
-- 0026_ai_summary.sql
--
-- Agrega resumen ejecutivo generado por IA a normative_documents.
-- Petición de César en Observaciones.docx (28/06/2026):
--
--   "Cada documento normativo debe tener como un resumen para saber de
--    qué trata y poner como pestañas sobre los temas que aborda la
--    fuente."
--
-- Estructura del JSON:
--   {
--     "de_que_trata": string corto (1 línea, máx ~100 chars),
--     "que_establece": string (1-2 oraciones),
--     "a_quien_afecta": string (1 oración),
--     "que_criterio_establece": string (1-2 oraciones),
--     "temas": string[]  // 3-6 tags (Acreditación, Subsanación, etc.)
--   }
--
-- Generación lazy: la primera vez que un usuario abre el documento, si
-- ai_summary es null, se dispara el endpoint POST /api/normativa/[id]/
-- summary que llama a Gemini Flash y guarda el resultado. Subsecuentes
-- lecturas son instantáneas. Costo estimado: ~$0.0005 USD por doc.
--
-- Metadata adicional en columnas separadas para queries:
--   ai_summary_generated_at: timestamp
--   ai_summary_model: 'gemini-2.5-flash'
-- ────────────────────────────────────────────────────────────────────

alter table normative_documents
  add column if not exists ai_summary jsonb,
  add column if not exists ai_summary_generated_at timestamptz,
  add column if not exists ai_summary_model text;

comment on column normative_documents.ai_summary is
  'Resumen ejecutivo generado por IA con sub-secciones: de_que_trata, que_establece, a_quien_afecta, que_criterio_establece, temas[].';

-- Índice GIN sobre temas para queries de filtrado por tag.
-- Notar: usamos jsonb_path_ops para más velocidad que el default.
create index if not exists idx_normative_documents_ai_summary_temas
  on normative_documents using gin ((ai_summary -> 'temas'));
