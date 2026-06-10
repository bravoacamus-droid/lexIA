-- ════════════════════════════════════════════════════════
-- LexIA v2 · Etapa 7 — Ampliar enum generator_slug con
-- los slugs de Actuaciones Preparatorias.
-- ════════════════════════════════════════════════════════

begin;

alter type public.generator_slug add value if not exists 'tdr_eett';
alter type public.generator_slug add value if not exists 'estrategia_contratacion';

commit;
