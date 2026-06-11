-- ════════════════════════════════════════════════════════
-- LexIA v2 · Revisor EETT / TDR
-- ════════════════════════════════════════════════════════
-- Tercer modo del evaluador:
--   'tdr_audit' → audita un único documento (TDR o EETT) sin
--   comparar contra ofertas. Detecta direccionamiento, ambigüedades,
--   requisitos desproporcionados y vicios contra principios de la Ley.
-- ════════════════════════════════════════════════════════

begin;

alter type public.evaluation_mode add value if not exists 'tdr_audit';

commit;
