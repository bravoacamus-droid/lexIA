-- ════════════════════════════════════════════════════════════════════
-- Amplía la taxonomía de tipos normativos.
--
-- Antes: ley, reglamento, directiva, opinion, pronunciamiento,
--        resolucion_tce.
--
-- Ahora: + manual_seace (manuales operativos del SEACE — NO normativos)
--        + tupa (Texto Único de Procedimientos Administrativos del OECE)
--        + comunicado (comunicados oficiales OECE/PERUCOMPRAS)
--        + guia (guías, tableros, FAQ — material orientativo)
--
-- Motivo: el scraper anterior depositaba todo bajo 'directiva' porque
-- la URL fuente del OECE mezcla manuales, TUPA, comunicados, guías y
-- directivas reales en la misma colección. Eso hacía que el chat
-- citara "según la Directiva X" cuando en realidad era un manual
-- operativo del SEACE — riesgoso para uso legal.
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
    'guia'::text
  ]));

-- ════════════════════════════════════════════════════════════════════
-- Reclasificar los documentos mal etiquetados como 'directiva'.
-- Patrones aplicados sobre la columna `number`:
--
--   "Manual%"       → manual_seace
--   "%TUPA%"        → tupa (cubre "Modificación del TUPA")
--   "FAQ%" /        → guia
--   "Guía%" /
--   "Tablero%"
--   "Comunicado%" / → comunicado
--   "ROF%"
-- ════════════════════════════════════════════════════════════════════

update public.normative_documents
   set type = 'manual_seace'
 where type = 'directiva' and number ilike 'Manual%';

update public.normative_documents
   set type = 'tupa'
 where type = 'directiva' and number ilike '%TUPA%';

update public.normative_documents
   set type = 'guia'
 where type = 'directiva'
   and (
     number ilike 'FAQ%'
     or number ilike 'Guía%'
     or number ilike 'Guia%'
     or number ilike 'Tablero%'
     or number ilike 'Preguntas%'
   );

update public.normative_documents
   set type = 'comunicado'
 where type = 'directiva'
   and (
     number ilike 'Comunicado%'
     or number ilike 'ROF%'
     or number ilike '%PERUCOMPRAS%'
   );

-- También sincronizar el doc_type en scraping_sources (catálogo) para
-- que el bot futuro deposite cada tipo donde corresponde. Mantenemos
-- la fuente "directiva" pero ajustamos la nota.
update public.scraping_sources
   set notes = 'IMPORTANTE: esta colección del OECE mezcla manuales, ' ||
               'TUPA, comunicados y guías junto con las directivas reales. ' ||
               'El ingestador debe clasificar por patrón de nombre antes de ' ||
               'insertar. Solo los documentos -OECE-CD son directivas.'
 where doc_type = 'directiva';
