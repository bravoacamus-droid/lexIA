-- ════════════════════════════════════════════════════════
-- LexIA v2 · Etapa 6 — Catálogo de plantillas de generadores
-- ════════════════════════════════════════════════════════
-- Las plantillas oficiales del OECE (Bases, Consultas, Apelaciones, etc.)
-- se guardan como referencia de estilo y se inyectan como few-shot en los
-- prompts de los nuevos generadores.
--
-- No reemplazamos tokens en el .docx; en su lugar el LLM ve el texto del
-- modelo y produce su propio markdown, que luego docx-builder convierte
-- a Word para descarga.
-- ════════════════════════════════════════════════════════

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'generator_slug') then
    create type public.generator_slug as enum (
      'consultas_observaciones',
      'pliego_absolucion',
      'bases_estandar',
      'apelaciones'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'generator_audience') then
    create type public.generator_audience as enum ('entity', 'provider', 'consultant');
  end if;
  if not exists (select 1 from pg_type where typname = 'procurement_object') then
    create type public.procurement_object as enum (
      'bienes', 'servicios', 'obras', 'consultoria_obras',
      'consultoria_general', 'mixto'
    );
  end if;
end$$;

create table if not exists public.generator_templates (
  id uuid primary key default gen_random_uuid(),
  slug public.generator_slug not null,
  audience public.generator_audience not null,
  object_type public.procurement_object,
  /** Nombre legible que sirve como label en el wizard. */
  label text not null,
  /** Ruta relativa al archivo original .docx/.pdf en data/ o Storage. */
  source_path text not null,
  /** Texto extraído del modelo (.docx → mammoth). Sirve como few-shot. */
  sample_text text not null,
  /** Notas adicionales sobre cuándo usar este modelo. */
  notes text,
  /** Si false, no aparece en el wizard (deprecated u oculto). */
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists generator_templates_slug_idx
  on public.generator_templates(slug, audience)
  where active = true;

-- Lectura pública para usuarios autenticados (lo necesitan los wizards
-- en el frontend). Los modelos no son confidenciales — son oficiales OECE.
alter table public.generator_templates enable row level security;

drop policy if exists "generator_templates: authenticated read" on public.generator_templates;
create policy "generator_templates: authenticated read"
  on public.generator_templates for select
  to authenticated
  using (active = true);

commit;
