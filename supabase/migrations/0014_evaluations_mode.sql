-- ════════════════════════════════════════════════════════
-- LexIA v2 · Modo de evaluación (Auto-revisión para proveedor)
-- ════════════════════════════════════════════════════════
-- Distingue entre:
--   - 'committee' (default): evaluación oficial del comité, dictamen
--     CUMPLE/SUBSANABLE/NO_CUMPLE. Audiencia: Entidad pública.
--   - 'self_review': auto-revisión del postor antes de presentar oferta.
--     Mismo motor, lenguaje consejero y enfoque en riesgos. Audiencia:
--     Proveedor.
-- ════════════════════════════════════════════════════════

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evaluation_mode') then
    create type public.evaluation_mode as enum ('committee', 'self_review');
  end if;
end$$;

alter table public.evaluations
  add column if not exists mode public.evaluation_mode not null default 'committee';

create index if not exists evaluations_mode_idx
  on public.evaluations(user_id, mode, created_at desc);

commit;
