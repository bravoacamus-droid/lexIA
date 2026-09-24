-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 66: el requerimiento se puede subir en Word
-- ════════════════════════════════════════════════════════════════════
-- La evaluación del requerimiento entrega ahora una versión mejorada:
-- los cambios marcados con control de cambios sobre el documento del
-- área usuaria, que solo se puede hacer sobre un Word. El bucket
-- `uploads` solo admitía PDF e imágenes, así que un .docx se rechazaba
-- al subirlo.
--
-- Solo se añade el tipo. Las políticas del bucket —cada usuario lee y
-- escribe únicamente en su carpeta— no cambian.
-- ════════════════════════════════════════════════════════════════════

update storage.buckets
   set allowed_mime_types = array[
     'application/pdf',
     'image/png',
     'image/jpeg',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   ]
 where id = 'uploads';
