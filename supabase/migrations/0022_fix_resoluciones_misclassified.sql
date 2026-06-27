-- ════════════════════════════════════════════════════════════════════
-- Corrige clasificación de Resoluciones aprobatorias.
--
-- Bug reportado por César el 26/06/2026: en la biblioteca aparecen mezcladas
-- directivas con "resoluciones directorales/jefaturales" bajo el filtro
-- de Resoluciones.
--
-- Causa raíz: durante la ingesta de la carpeta del cliente
-- "DIRECTIVAS, LINEAMIENTOS Y OTROS/" (commit 24e757e), las resoluciones
-- aprobatorias que vinieron dentro de las carpetas-paquete de cada
-- directiva (Directiva N° XXX/Resolución que aprueba.pdf) quedaron
-- clasificadas como type='directiva' porque defaultTypeFromPath usaba
-- el nombre de la carpeta padre, y el classifier no tenía regla
-- prioritaria para "Resolución que aprueba" / "Resolución de modificación".
--
-- Estos 25 documentos son técnicamente Resoluciones (Directorales /
-- Jefaturales / Pre-OECE) que sirven como acto formal de aprobación
-- de la directiva. El documento en sí es una resolución, no una directiva.
--
-- Reclasificación: type='directiva' → type='resolucion' cuando el campo
-- number contiene patrones de resolución.
-- ════════════════════════════════════════════════════════════════════

update public.normative_documents
   set type = 'resolucion'
 where type = 'directiva'
   and (
     number ilike '%resoluci%' or
     number ilike '%jefatural%' or
     number ilike '%directoral%'
   );
