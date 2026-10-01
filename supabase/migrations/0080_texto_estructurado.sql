-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 80: el texto de la norma con su estructura
-- ════════════════════════════════════════════════════════════════════
-- Documento 11 de César (30/09/2026): «debe reproducir fielmente el texto
-- oficial, respetando su estructura (títulos, capítulos, artículos,
-- numerales, literales y tablas), evitando textos concatenados».
--
-- raw_text es el texto plano de la ingesta: lo usan la búsqueda y el
-- chat y no se toca. texto_estructurado es lo que se LEE en el visor:
-- Markdown armado desde el PDF oficial (scripts/texto-estructurado.py),
-- con títulos, artículos, numerales, literales y tablas. Si no existe,
-- el visor sigue dando formato a raw_text como hasta ahora.
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents
  add column if not exists texto_estructurado text,
  add column if not exists texto_estructurado_at timestamptz;
