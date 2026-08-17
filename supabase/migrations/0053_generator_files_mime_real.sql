-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 53: el MIME que se envía a Gemini deja de ser el del
-- archivo que subió el usuario
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (17/08/2026, reportado por César): al adjuntar un Word en el
-- chat del Generador, cualquier pregunta devuelve
-- "[generator-chat] Request contains an invalid argument". Con PDF
-- funciona. Los archivos de julio, todos PDF, nunca fallaron.
--
-- CAUSA: Gemini no procesa .docx, así que la ruta de subida extrae el
-- texto con mammoth y lo sube a la Files API como text/plain. Pero al
-- registrar el archivo guardaba el MIME ORIGINAL:
--
--     uploadMime = 'text/plain';   -- lo que se subió
--     ...
--     mime_type: mimeType,          -- lo que se guardó: el .docx
--
-- Después el chat construye la parte del mensaje con ese MIME guardado,
-- de modo que le dice a Gemini "este fileUri es un documento de Word"
-- cuando en realidad apunta a un texto plano. URI y MIME no concuerdan
-- y la API responde 400 INVALID_ARGUMENT. Con PDF los dos valores
-- coinciden y por eso nunca se notó.
--
-- SOLUCIÓN: dos columnas con dos propósitos distintos.
--   · mime_type        — el del archivo que subió el usuario. Sirve para
--                        mostrarlo y para saber qué tenía en la mano.
--   · gemini_mime_type — el que realmente se envió a la Files API. Es el
--                        único que puede viajar en la petición.
--
-- Guardar solo uno obligaba a elegir entre perder trazabilidad o romper
-- la llamada.
-- ════════════════════════════════════════════════════════════════════

begin;

alter table public.generator_files
  add column if not exists gemini_mime_type text;

-- Los .docx ya registrados se subieron como texto plano: su URI apunta a
-- un text/plain aunque la fila diga otra cosa.
update public.generator_files
set gemini_mime_type = 'text/plain'
where gemini_mime_type is null
  and mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

-- El resto (PDF, imágenes, texto) se subió tal cual.
update public.generator_files
set gemini_mime_type = mime_type
where gemini_mime_type is null;

comment on column public.generator_files.gemini_mime_type is
  'MIME con el que el archivo fue subido a la Gemini Files API. Difiere de mime_type cuando hubo conversión (.docx → text/plain). Es el que debe viajar en la petición: si no coincide con el contenido real del URI, Gemini responde INVALID_ARGUMENT.';

commit;
