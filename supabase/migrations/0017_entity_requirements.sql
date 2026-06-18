-- ════════════════════════════════════════════════════════════════════
-- LexIA v2 — Etapa 17: Requerimientos del Área Usuaria (tipo SEACE)
-- ════════════════════════════════════════════════════════════════════
-- Tabla para el módulo "Nuevo Requerimiento" del perfil Entidad. Replica
-- la UX del SEACE: wizard de 3 pasos + Anexo (EETT/TDR) con cláusulas
-- ordenables e incluibles. Cada cláusula puede llenarse en modo manual
-- (pegar tal cual) o IA (LexIA mejora el texto puntual con sustento
-- normativo de la BD).
-- ════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.entity_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Paso 1: Datos generales del requerimiento
  nro text,                                    -- autogenerado o manual
  anio integer not null,                       -- 2026
  objeto text not null check (objeto in (
    'bien', 'servicio', 'obra', 'consultoria_obra'
  )),
  area_usuaria text,
  denominacion text not null,

  -- Anexo Datos generales
  organo_unidad_organica text,
  actividad_poi text,

  -- Cláusulas del anexo — array JSONB con la forma:
  -- [{
  --   id: "finalidad_publica",
  --   label: "FINALIDAD PÚBLICA",
  --   order: 0,
  --   included: true|false,
  --   mode: "manual" | "ai",
  --   content: "<p>HTML del TipTap...</p>",
  --   ai_input: "texto puntual del usuario antes de mejorar",
  --   is_custom: boolean   // true si fue agregada con +Cláusula
  -- }, ...]
  clauses jsonb not null default '[]'::jsonb,

  -- Paso 2 y 3 (placeholder por ahora, alcance futuro)
  entregas jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,

  status text not null default 'draft' check (status in (
    'draft', 'review', 'final', 'archived'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entity_requirements_user_idx
  on public.entity_requirements (user_id, created_at desc);

create index if not exists entity_requirements_status_idx
  on public.entity_requirements (user_id, status);

-- Trigger para updated_at
create or replace function public.touch_entity_requirements_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_entity_requirements_updated_at on public.entity_requirements;
create trigger trg_entity_requirements_updated_at
  before update on public.entity_requirements
  for each row execute function public.touch_entity_requirements_updated_at();

-- RLS
alter table public.entity_requirements enable row level security;

drop policy if exists "entity_requirements: owner all" on public.entity_requirements;
create policy "entity_requirements: owner all"
  on public.entity_requirements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
