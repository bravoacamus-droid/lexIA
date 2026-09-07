-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 60: las directivas vuelven al rastreo
-- ════════════════════════════════════════════════════════════════════
-- En la etapa 58 esta fuente se apagó porque su colección nueva (66212)
-- devolvía una colección de colecciones: al pedirla salían enlaces de
-- navegación —«Todos los compendios», «Acuerdo», «Convenio»— y ni una
-- directiva. Se dejó anotado en vez de apuntando a una URL muerta.
--
-- El problema era el enlace, no la colección. El identificador 66212 es
-- correcto, pero necesita su nombre completo:
-- «66212-directivas-vigentes-ley-n-32069». Con él, y con los mismos
-- parámetros que el resto de fuentes, devuelve veintitrés fichas —las
-- directivas vigentes bajo la Ley N° 32069— y cada ficha expone su PDF.
--
-- Comprobado el 07/09/2026 contra el portal: 23 fichas, la primera
-- resuelve a «Directiva N.° 010-2025-OECE-CD».
-- ════════════════════════════════════════════════════════════════════

update public.scraping_sources
   set url = 'https://www.gob.pe/institucion/oece/colecciones/66212-directivas-vigentes-ley-n-32069?filter%5Border%5D=publication_desc&filter%5Bper_page%5D=100&sheet=1',
       link_selector = 'a[href*="/normas-legales/"]',
       link_filter_regex = '/normas-legales/[0-9]+-',
       pdf_selector = 'a[href*=".pdf"]',
       active = true
 where doc_type = 'directiva';
