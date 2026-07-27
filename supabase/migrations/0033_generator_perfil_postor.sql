-- ════════════════════════════════════════════════════════════════════
-- LexIA v2 — Etapa 33: Perfil 'postor' en el generador chat
-- ════════════════════════════════════════════════════════════════════
-- César entregó (21/07/2026, carpeta "consultor/") 8 modelos reales de
-- RECURSO DE APELACIÓN: a la Entidad y al Tribunal (LPA/CP/SIE) en
-- variantes presentación / subsanación / absolución / descargo como
-- tercer administrado. El redactor de estos documentos es el POSTOR
-- (proveedor impugnante) o el consultor que lo asesora — ninguno de
-- los 6 perfiles existentes lo cubría.
-- ════════════════════════════════════════════════════════════════════

begin;

alter table public.generator_conversations
  drop constraint if exists generator_conversations_perfil_check;

alter table public.generator_conversations
  add constraint generator_conversations_perfil_check check (perfil in (
    'area_usuaria',
    'dec',
    'area_legal',
    'titular_entidad',
    'aga',
    'fiscalizacion',
    'postor'
  ));

commit;
