-- ════════════════════════════════════════════════════════════════════
-- A-LexIA — Etapa 62: consultas, observaciones y su absolución
-- ════════════════════════════════════════════════════════════════════
-- QUÉ SE GUARDA Y POR QUÉ ASÍ
--
-- La etapa de consultas y observaciones produce dos documentos que son
-- la misma tabla vista desde los dos lados: el participante formula y el
-- comité absuelve. César entregó los dos modelos el 23/09/2026 —un
-- concurso público de mantenimiento vial— y de ahí sale esta forma.
--
-- Un `pliego` es el documento; una `entrada` es cada fila de su tabla.
-- La entrada lleva la formulación y, cuando el comité responde, también
-- su absolución: son la misma fila del documento y separarlas en dos
-- tablas obligaría a coserlas en cada consulta.
--
-- El cuerpo de cada escrito NO se guarda como texto corrido. Va en
-- `jsonb` con sus tramos —«Referencia», «1. Sustento Fáctico»,
-- «2. Sustento Jurídico», «3. Solicitud»—, porque esa estructura es lo
-- que hace que el Word salga como el modelo. Guardarlo aplanado es
-- justamente lo que César viene observando: «los formatos que están en
-- el software aún no están de acuerdo a la estructura alcanzada».
--
-- RLS
--
-- Como en todo lo demás: cada quien ve lo suyo y nada más. Ver
-- `feedback_supabase_rls` — sin excepciones.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.pliegos_consultas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Desde qué lado se trabaja este pliego. Un mismo procedimiento puede
  -- tener uno de cada: el del participante y el del comité.
  cara          text not null check (cara in ('formulacion', 'absolucion')),

  -- El encabezado del documento.
  procedimiento       text not null default '',
  numero_procedimiento text not null default '',
  objeto              text not null default '',
  participante        text not null default '',

  -- El PDF de las bases, cuando se sube, para citar folios y numerales.
  bases_storage_path  text,
  bases_nombre        text,

  status        text not null default 'draft'
                check (status in ('draft', 'listo', 'presentado')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pliegos_consultas_user_idx
  on public.pliegos_consultas (user_id, updated_at desc);

comment on table public.pliegos_consultas is
  'Un documento de formulación o de absolución de consultas y observaciones.';
comment on column public.pliegos_consultas.cara is
  'formulacion = lo presenta un participante · absolucion = lo responde el comité.';

-- ── Las filas de la tabla del documento ──────────────────────────────

create table if not exists public.entradas_consulta (
  id          uuid primary key default gen_random_uuid(),
  pliego_id   uuid not null references public.pliegos_consultas(id) on delete cascade,

  -- El número de la fila. Es el que empareja formulación y absolución en
  -- los modelos, así que se guarda explícito y no se deduce del orden.
  numero      integer not null,
  tipo        text not null check (tipo in ('consulta', 'observacion')),

  -- Dónde recae, tal como lo numeran las bases.
  seccion     text not null default 'Específica'
              check (seccion in ('General', 'Específica')),
  numeral     text not null default '',
  literal     text not null default '',
  pagina      text not null default '',

  -- El escrito, por tramos. [{ rotulo, parrafos[], vinetas[] }]
  cuerpo      jsonb not null default '[]'::jsonb,
  -- «Artículo y norma que se vulnera». Solo en observaciones.
  norma_vulnerada text not null default '',

  -- La absolución del comité, cuando la hay.
  decision    text check (decision in ('acoge', 'acoge_parcialmente', 'no_acoge', 'aclara')),
  fundamentos jsonb not null default '[]'::jsonb,
  conclusion  text not null default '',
  precision_en_bases text not null default '',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (pliego_id, numero)
);

create index if not exists entradas_consulta_pliego_idx
  on public.entradas_consulta (pliego_id, numero);

comment on column public.entradas_consulta.cuerpo is
  'Los tramos del escrito con su rótulo: Referencia, Sustento Fáctico, Sustento Jurídico, Solicitud.';
comment on column public.entradas_consulta.fundamentos is
  'Los fundamentos de la absolución, cada uno con su rótulo.';

-- ── `updated_at` al día ──────────────────────────────────────────────

create or replace function public.tocar_actualizado()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pliegos_consultas_tocar on public.pliegos_consultas;
create trigger pliegos_consultas_tocar
  before update on public.pliegos_consultas
  for each row execute function public.tocar_actualizado();

drop trigger if exists entradas_consulta_tocar on public.entradas_consulta;
create trigger entradas_consulta_tocar
  before update on public.entradas_consulta
  for each row execute function public.tocar_actualizado();

-- Al tocar una entrada también se mueve su pliego: el listado ordena por
-- la fecha del pliego y si no, editar una fila no lo subía.
create or replace function public.tocar_pliego_de_la_entrada()
returns trigger language plpgsql as $$
begin
  update public.pliegos_consultas
     set updated_at = now()
   where id = coalesce(new.pliego_id, old.pliego_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists entradas_consulta_tocar_pliego on public.entradas_consulta;
create trigger entradas_consulta_tocar_pliego
  after insert or update or delete on public.entradas_consulta
  for each row execute function public.tocar_pliego_de_la_entrada();

-- ── RLS ──────────────────────────────────────────────────────────────

alter table public.pliegos_consultas enable row level security;
alter table public.entradas_consulta enable row level security;

drop policy if exists "pliegos propios" on public.pliegos_consultas;
create policy "pliegos propios" on public.pliegos_consultas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- La entrada no tiene dueño propio: hereda el del pliego.
drop policy if exists "entradas del pliego propio" on public.entradas_consulta;
create policy "entradas del pliego propio" on public.entradas_consulta
  for all
  using (
    exists (
      select 1 from public.pliegos_consultas p
       where p.id = entradas_consulta.pliego_id
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.pliegos_consultas p
       where p.id = entradas_consulta.pliego_id
         and p.user_id = auth.uid()
    )
  );
