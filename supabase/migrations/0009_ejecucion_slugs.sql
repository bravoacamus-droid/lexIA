-- ════════════════════════════════════════════════════════
-- LexIA v2 · Etapa 8 — Slugs de Ejecución Contractual
-- ════════════════════════════════════════════════════════

begin;

alter type public.generator_slug add value if not exists 'cambio_personal_clave';
alter type public.generator_slug add value if not exists 'resolucion_contrato';
alter type public.generator_slug add value if not exists 'cambio_bienes';
alter type public.generator_slug add value if not exists 'descargo_penalidades';
alter type public.generator_slug add value if not exists 'solicitud_sancion';

commit;
