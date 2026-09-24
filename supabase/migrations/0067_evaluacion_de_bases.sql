-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 67: la evaluación de bases
-- ════════════════════════════════════════════════════════════════════
-- César la define en «Estructura de A-LexIA»: revisar las bases para
-- detectar omisiones, modificaciones indebidas, exigencias no previstas,
-- restricciones injustificadas e inconsistencias; para el proveedor,
-- antes de consultar u observar; para el evaluador, antes de publicar.
--
-- Se guarda como una evaluación más, con su propio modo: la tabla
-- `evaluations` ya tiene RLS y sus policies (cada usuario lo suyo), y el
-- archivo va al mismo bucket `uploads`.
-- ════════════════════════════════════════════════════════════════════

alter type public.evaluation_mode add value if not exists 'bases_audit';
