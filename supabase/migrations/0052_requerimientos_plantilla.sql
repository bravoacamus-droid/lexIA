-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 52: requerimientos armados desde plantilla
-- ════════════════════════════════════════════════════════════════════
-- CONTEXTO: César entregó en agosto de 2026 las plantillas oficiales de
-- requerimiento (carpeta "ESTRUCTURA DE REQUERIMIENTO"). No son una guía
-- de estilo: son formularios con texto invariable, condicionales y topes
-- normativos. El generador anterior (entity_requirements, etapa 17)
-- guarda cláusulas de texto libre y solo cubre la familia de menores a
-- 8 UIT, así que no sirve para esto.
--
-- POR QUÉ UNA TABLA NUEVA Y NO UNA COLUMNA MÁS EN entity_requirements:
-- lo que se persiste aquí no es el documento, son las RESPUESTAS. El
-- documento se vuelve a armar en cada exportación a partir de la
-- plantilla vigente. Así, cuando César corrija una plantilla —y va a
-- corregirlas—, los requerimientos ya guardados salen con el texto
-- corregido en vez de quedar congelados con la versión antigua. Mezclar
-- eso con una tabla que guarda HTML ya redactado confundiría las dos
-- cosas.
--
-- `respuestas` tiene la forma que consume el ensamblador:
--   {
--     campos:      { organo: "...", plazo_entrega: "..." },
--     redacciones: { finalidad: "texto que redactó el modelo" },
--     opciones:    { modalidad_pago: "suma_alzada" },
--     tablas:      { items: [["01","25","Unidad","Escritorio..."]] },
--     condiciones: { requiere_seguros: false }
--   }
-- ════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.requerimientos_plantilla (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Id de la plantilla en el registro del código (p. ej. 'ps-bienes-general').
  -- Es texto y no clave foránea a propósito: las plantillas viven en el
  -- repositorio, no en la base, porque son código auditable contra los
  -- .docx originales.
  plantilla_id text not null,

  denominacion text not null,

  -- Cuantía de la contratación y monto del contrato, contra los que se
  -- verifican los topes (3 veces la cuantía, 25% MYPE, 30% adelantos).
  -- Nulos mientras no se conozcan; el ensamblador avisa cuando faltan en
  -- vez de dar las cifras por buenas.
  cuantia numeric,
  monto_contrato numeric,

  respuestas jsonb not null default '{}'::jsonb,

  status text not null default 'draft' check (status in (
    'draft', 'review', 'final', 'archived'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requerimientos_plantilla_user_idx
  on public.requerimientos_plantilla (user_id, created_at desc);

create or replace function public.touch_requerimientos_plantilla()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_requerimientos_plantilla_updated_at
  on public.requerimientos_plantilla;
create trigger trg_requerimientos_plantilla_updated_at
  before update on public.requerimientos_plantilla
  for each row execute function public.touch_requerimientos_plantilla();

-- RLS: un requerimiento es del usuario que lo redacta. No hay lectura
-- compartida entre cuentas.
alter table public.requerimientos_plantilla enable row level security;

drop policy if exists "requerimientos_plantilla: owner all"
  on public.requerimientos_plantilla;
create policy "requerimientos_plantilla: owner all"
  on public.requerimientos_plantilla for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
