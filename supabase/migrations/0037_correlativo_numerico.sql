-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 37: ordenar el correlativo como número, no como texto
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (03/08/2026): al abrir el chip "Resolución TCE" la lista
-- empezaba así, con el correlativo supuestamente ascendente:
--     18536-2026, 3120-2026, 3121-2026, 3122-2026 ...
--
-- CAUSA: el orden se hacía sobre metadata->>'correlativo', que es TEXTO.
-- En orden lexicográfico "18536" va antes que "3120" porque compara
-- carácter por carácter y '1' < '3'.
--
-- Hasta ahora no se notaba porque todos los tipos traían el correlativo
-- rellenado a 4 dígitos ("0001", "0284"), y con ancho fijo el orden de
-- texto coincide con el numérico. Las resoluciones del Tribunal son el
-- primer tipo que mezcla anchos — 4 y 5 dígitos — porque en un mismo año
-- pasan del 999 al 18000. Auditoría del corpus:
--     directiva, lineamiento, opinion,
--     pronunciamiento, resolucion   → ancho 4       ✅
--     resolucion_tce                → anchos 4 y 5  ❌
--
-- SOLUCIÓN: una columna generada que guarda el correlativo ya convertido
-- a entero. Se ordena por ella y el ancho deja de importar. Se prefirió
-- esto a rellenar metadata con ceros porque:
--   · no hay que reescribir los 4,400 documentos ya ingeridos,
--   · no hay que reiniciar la ingesta en curso para que los nuevos
--     entren con el formato correcto,
--   · y no vuelve a romperse cuando aparezca un tipo con 6 dígitos.
--
-- Los documentos sin correlativo quedan en null y siguen yendo al final.
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents
  add column if not exists correlativo_num integer
  generated always as (
    nullif(regexp_replace(coalesce(metadata->>'correlativo', ''), '[^0-9]', '', 'g'), '')::integer
  ) stored;

-- El orden de la biblioteca es (año desc, correlativo asc): índice que
-- cubre exactamente eso.
create index if not exists normative_documents_orden_idx
  on public.normative_documents ((metadata->>'anio') desc, correlativo_num asc);
