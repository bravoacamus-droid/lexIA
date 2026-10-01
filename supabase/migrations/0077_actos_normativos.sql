-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 77: el acto normativo como unidad de la biblioteca
-- ════════════════════════════════════════════════════════════════════
-- Documento 11 de César («Mejorando la biblioteca normativa», 30/09/2026).
--
-- Una directiva no es un PDF: es un acto con número y título oficiales,
-- la resolución que lo aprueba, sus modificaciones o rectificaciones (cada
-- una con fecha y enlace) y una vigencia. Hasta hoy la biblioteca lo
-- adivinaba agrupando por carpeta o por título, y por eso salían
-- duplicados, directivas sin título y modificatorias sin distinguir.
--
-- La fuente de verdad es el «Tablero normativo de contrataciones
-- públicas» del OECE (versión del 18/08/2026), que lista cada norma de la
-- DGA, el OECE y Perú Compras con esos datos y sus enlaces oficiales.
--
--   · normative_acts        — el acto: número, título, enlace oficial,
--                             documentos (aprobación, modificaciones…),
--                             vigencia y si está derogado.
--   · normative_documents   — cada texto apunta a su acto (acto_clave)
--                             y puede ocultarse de la biblioteca (oculto)
--                             por derogado, vencido o retirado.
--
-- Lectura pública como la de normative_documents; escritura solo con la
-- clave de servicio (no hay políticas de escritura).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.normative_acts (
  clave          text primary key,
  tipo           text not null,
  entidad        text,
  -- «Directiva N° 0002-2025-EF/54.01»
  numero         text not null,
  -- «Disposiciones para elaboración del Plan Anual de Contrataciones»
  titulo         text,
  -- Ficha oficial del instrumento (gob.pe).
  url            text,
  -- [{rol: aprueba|modificacion|rectificacion|anexo|otro, nombre, fecha, url}]
  documentos     jsonb not null default '[]'::jsonb,
  vigente_desde  date,
  vigente_hasta  date,
  derogada       boolean not null default false,
  nota           text,
  fuente_datos   text,
  updated_at     timestamptz not null default now()
);

create index if not exists normative_acts_tipo_idx on public.normative_acts (tipo, vigente_desde desc);

alter table public.normative_acts enable row level security;

drop policy if exists normative_acts_select on public.normative_acts;
create policy normative_acts_select on public.normative_acts
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

alter table public.normative_documents
  add column if not exists acto_clave text references public.normative_acts(clave) on delete set null,
  add column if not exists oculto boolean not null default false;

create index if not exists normative_documents_acto_idx on public.normative_documents (acto_clave);
create index if not exists normative_documents_oculto_idx on public.normative_documents (oculto) where oculto;
