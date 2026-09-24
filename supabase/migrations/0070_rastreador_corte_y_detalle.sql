-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 70: el actualizador trae de hoy en adelante y lo cuenta todo
-- ════════════════════════════════════════════════════════════════════
-- 1. Fecha de corte por fuente. Lo publicado antes lo carga la ingesta
--    masiva (con OCR y a su ritmo); el actualizador diario solo trae lo
--    nuevo, para no saturarse recorriendo el pasado. Un documento con
--    fecha anterior que aparezca en el índice no se ignora en silencio:
--    queda anotado como «anterior a la fecha de corte» para cargarlo a
--    mano.
-- 2. Contadores por corrida: cuántos ya estaban, cuántos fallaron,
--    cuántos esperan reintento y cuántos se omitieron por fecha. Con
--    solo «nuevos» y «status», una corrida donde todo falló se veía
--    igual que una donde no había nada nuevo (pasó el 24/09/2026).
-- ════════════════════════════════════════════════════════════════════

alter table public.scraping_sources
  add column if not exists publicados_desde date;

update public.scraping_sources
   set publicados_desde = date '2026-09-24'
 where publicados_desde is null;

alter table public.scraping_runs
  add column if not exists docs_existentes integer not null default 0,
  add column if not exists docs_fallidos integer not null default 0,
  add column if not exists docs_en_espera integer not null default 0,
  add column if not exists docs_omitidos integer not null default 0;

-- Los fallos que no se reintentan solos: los anteriores a la fecha de
-- corte y los que agotaron sus intentos. El panel los lista aparte.
alter table public.scraping_fallos
  add column if not exists tipo text not null default 'fallo'
    check (tipo in ('fallo', 'anterior_al_corte'));
