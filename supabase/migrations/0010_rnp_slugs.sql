-- ════════════════════════════════════════════════════════
-- LexIA v2 · Etapa 9 — Slugs de Trámites RNP
-- ════════════════════════════════════════════════════════

begin;

alter type public.generator_slug add value if not exists 'rnp_aumento_cmc';
alter type public.generator_slug add value if not exists 'rnp_actualizacion_financiera';

commit;
