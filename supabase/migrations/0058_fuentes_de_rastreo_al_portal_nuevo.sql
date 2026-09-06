-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 58: la biblioteca dejó de crecer el 10 de agosto
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (02/09/2026): un sistema de la competencia citaba seis
-- resoluciones del Tribunal —7671, 7815, 7840, 7982, 8032 y 8129 de
-- 2026— que nosotros no teníamos. Al mirar la biblioteca, las nuestras
-- se cortan en la 7564 y el último documento entró el 10 de agosto.
-- Veintisiete días sin actualizarse, con un cron semanal configurado.
--
-- CAUSA: el OSCE pasó a llamarse OECE y gob.pe reasignó los
-- identificadores de colección. Las cuatro fuentes apuntaban al portal
-- viejo:
--
--   · resoluciones (16005) y directivas (16004) → HTTP 404;
--   · opiniones (16002) y pronunciamientos (16001) → redirigen a la
--     colección 16002 de ELECTROPUNO, una empresa eléctrica. Si el cron
--     hubiera llegado a ejecutarse, habría ingerido documentos de otra
--     institución.
--
-- Y hay un segundo cambio: el índice ya no enlaza el PDF. Ahora enlaza
-- una ficha por documento y el PDF está dentro de ella, así que el
-- descubrimiento necesita dos niveles. De ahí la columna nueva.
--
-- Los parámetros de la URL no son adorno: sin `per_page` y `sheet` el
-- servidor devuelve la página sin la lista —la pinta el navegador— y el
-- rastreador no ve ni un solo documento. Con ellos vienen cien por
-- página, ya ordenados por fecha de publicación descendente, que es lo
-- que interesa para traer primero lo nuevo.
--
-- Las directivas quedan desactivadas: su colección nueva (66212) es una
-- colección de colecciones y necesita otro recorrido. Se deja anotado
-- en vez de dejarla apuntando a una URL muerta.
-- ════════════════════════════════════════════════════════════════════

alter table public.scraping_sources
  add column if not exists pdf_selector text;

comment on column public.scraping_sources.pdf_selector is
  'Selector CSS del enlace al PDF DENTRO de la ficha. Si es nulo, el índice enlaza el PDF directamente y basta con un nivel.';

update public.scraping_sources
   set url = 'https://www.gob.pe/institucion/oece/colecciones/68030-resoluciones-del-tribunal-de-contrataciones-publicas?filter%5Border%5D=publication_desc&filter%5Bper_page%5D=100&sheet=1',
       link_selector = 'a[href*="/normas-legales/"]',
       link_filter_regex = '/normas-legales/[0-9]+-',
       pdf_selector = 'a[href*=".pdf"]'
 where doc_type = 'resolucion_tce';

update public.scraping_sources
   set url = 'https://www.gob.pe/institucion/oece/colecciones/2033-pronunciamientos-del-oece?filter%5Border%5D=publication_desc&filter%5Bper_page%5D=100&sheet=1',
       link_selector = 'a[href*="/informes-publicaciones/"]',
       link_filter_regex = '/informes-publicaciones/[0-9]+-',
       pdf_selector = 'a[href*=".pdf"]'
 where doc_type = 'pronunciamiento';

update public.scraping_sources
   set url = 'https://www.gob.pe/institucion/oece/colecciones/66839-opiniones-de-la-direccion-tecnico-normativa-oece?filter%5Border%5D=publication_desc&filter%5Bper_page%5D=100&sheet=1',
       link_selector = 'a[href*="/informes-publicaciones/"]',
       link_filter_regex = '/informes-publicaciones/[0-9]+-',
       pdf_selector = 'a[href*=".pdf"]'
 where doc_type = 'opinion';

update public.scraping_sources
   set active = false
 where doc_type = 'directiva';
