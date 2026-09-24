-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 68: el expediente contractual del generador de ejecución
-- ════════════════════════════════════════════════════════════════════
-- «Generador de documentos administrativos» (César, setiembre de 2026):
-- los documentos se vinculan a un EXPEDIENTE CONTRACTUAL, no a una
-- conversación. La fuente común —contrato, TDR, solicitudes, informes—
-- se sube una vez y la reutilizan todos los perfiles: el Área Usuaria
-- redacta su informe, la DEC continúa sobre el mismo expediente, luego
-- Asesoría Jurídica y la AGA o el Titular.
--
-- Tres tablas:
--   · expedientes             — el contrato y su ficha maestra.
--   · expediente_documentos   — cada documento, con su carpeta (01–12),
--                               su estado (original, generado por LexIA,
--                               revisado, firmado, presentado,
--                               incorporado) y, si lo generó LexIA, sus
--                               datos de generación y de formalización.
--   · expediente_actuaciones  — cada análisis desde un perfil emisor:
--                               diagnóstico, preguntas, borrador y
--                               auditoría.
--
-- RLS en las tres, sin excepciones: cada usuario ve y toca solo lo suyo.
-- Los archivos van al bucket `uploads`, en la carpeta del usuario, con
-- las políticas que ya tiene.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.expedientes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titulo      text not null,
  -- La ficha maestra del contrato: cada dato con su valor, de dónde salió
  -- y si el usuario lo corrigió. Ver src/lib/ejecucion/tipos.ts.
  ficha       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists expedientes_user_idx on public.expedientes (user_id, updated_at desc);

create table if not exists public.expediente_actuaciones (
  id             uuid primary key default gen_random_uuid(),
  expediente_id  uuid not null references public.expedientes(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  perfil         text not null,
  -- La actuación que eligió el usuario, o nula si pidió «Analizar mi caso».
  actuacion      text,
  pedido         text not null default '',
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente', 'analizando', 'listo', 'redactando', 'error')),
  error          text,
  analisis       jsonb,
  respuestas     jsonb not null default '[]'::jsonb,
  borrador       jsonb,
  auditoria      jsonb,
  -- La actuación de otro perfil desde la que se continuó.
  continua_de    uuid references public.expediente_actuaciones(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists expediente_actuaciones_exp_idx on public.expediente_actuaciones (expediente_id, created_at);

create table if not exists public.expediente_documentos (
  id             uuid primary key default gen_random_uuid(),
  expediente_id  uuid not null references public.expedientes(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  nombre         text not null,
  -- Ruta en el bucket `uploads`. Nula en los documentos que genera LexIA.
  ruta           text,
  origen         text not null default 'cargado' check (origen in ('cargado', 'lexia')),
  estado         text not null default 'original'
                   check (estado in ('original', 'generado', 'revisado', 'firmado', 'presentado', 'incorporado')),
  carpeta        smallint check (carpeta between 1 and 12),
  -- Qué documento es: contrato, adenda, solicitud del contratista,
  -- informe del Área Usuaria… Lo decide la lectura; el usuario lo corrige.
  clase          text,
  lectura        text not null default 'pendiente' check (lectura in ('pendiente', 'leyendo', 'leido', 'error')),
  error          text,
  texto          text,
  paginas        integer,
  -- Lo que la lectura sacó: resumen, datos de la ficha con su cita,
  -- hechos fechados, documentos que contiene.
  datos          jsonb not null default '{}'::jsonb,
  -- Solo en los documentos de LexIA: fecha y hora, usuario, perfil,
  -- fuentes, versión, nivel de salida.
  generacion     jsonb,
  -- Número oficial, fecha oficial, fecha de presentación, firmante,
  -- estado de trámite.
  formalizacion  jsonb,
  actuacion_id   uuid references public.expediente_actuaciones(id) on delete set null,
  -- Si este documento es la versión oficial de un borrador de LexIA.
  version_de     uuid references public.expediente_documentos(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists expediente_documentos_exp_idx on public.expediente_documentos (expediente_id, created_at);

-- ── RLS ─────────────────────────────────────────────────────────────

alter table public.expedientes enable row level security;
alter table public.expediente_documentos enable row level security;
alter table public.expediente_actuaciones enable row level security;

drop policy if exists expedientes_select on public.expedientes;
create policy expedientes_select on public.expedientes
  for select using (auth.uid() = user_id);
drop policy if exists expedientes_insert on public.expedientes;
create policy expedientes_insert on public.expedientes
  for insert with check (auth.uid() = user_id);
drop policy if exists expedientes_update on public.expedientes;
create policy expedientes_update on public.expedientes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists expedientes_delete on public.expedientes;
create policy expedientes_delete on public.expedientes
  for delete using (auth.uid() = user_id);

-- Un documento o una actuación solo se crean dentro de un expediente
-- propio: no basta con poner el propio user_id.
drop policy if exists expediente_documentos_select on public.expediente_documentos;
create policy expediente_documentos_select on public.expediente_documentos
  for select using (auth.uid() = user_id);
drop policy if exists expediente_documentos_insert on public.expediente_documentos;
create policy expediente_documentos_insert on public.expediente_documentos
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.expedientes e where e.id = expediente_id and e.user_id = auth.uid())
  );
drop policy if exists expediente_documentos_update on public.expediente_documentos;
create policy expediente_documentos_update on public.expediente_documentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists expediente_documentos_delete on public.expediente_documentos;
create policy expediente_documentos_delete on public.expediente_documentos
  for delete using (auth.uid() = user_id);

drop policy if exists expediente_actuaciones_select on public.expediente_actuaciones;
create policy expediente_actuaciones_select on public.expediente_actuaciones
  for select using (auth.uid() = user_id);
drop policy if exists expediente_actuaciones_insert on public.expediente_actuaciones;
create policy expediente_actuaciones_insert on public.expediente_actuaciones
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.expedientes e where e.id = expediente_id and e.user_id = auth.uid())
  );
drop policy if exists expediente_actuaciones_update on public.expediente_actuaciones;
create policy expediente_actuaciones_update on public.expediente_actuaciones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists expediente_actuaciones_delete on public.expediente_actuaciones;
create policy expediente_actuaciones_delete on public.expediente_actuaciones
  for delete using (auth.uid() = user_id);
