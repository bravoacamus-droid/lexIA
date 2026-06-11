-- ════════════════════════════════════════════════════════
-- LexIA v2 · Etapa 10 — Bot de scraping de normativa
-- ════════════════════════════════════════════════════════
-- · scraping_sources: catálogo de URLs oficiales a monitorear
-- · scraping_runs:    historial de ejecuciones (audit + monitoreo)
-- · profiles.is_admin: gate para el panel /admin/scraping
-- ════════════════════════════════════════════════════════

begin;

-- Flag de administrador en profiles (default false).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Catálogo de fuentes a scrapear.
create table if not exists public.scraping_sources (
  id uuid primary key default gen_random_uuid(),
  /** URL de la página índice/listado que enumera documentos. */
  url text not null,
  /** Tipo de documento que se espera encontrar (mapea a normative_documents.type). */
  doc_type text not null check (
    doc_type in ('ley','reglamento','directiva','opinion','pronunciamiento','resolucion_tce')
  ),
  /** Nombre legible (ej. "OECE — Directivas vigentes"). */
  label text not null,
  /**
   * Estrategia de extracción de enlaces a documentos individuales.
   * El bot usa fetch+cheerio para localizar los <a href> dentro de
   * los elementos que matchen este selector.
   */
  link_selector text default 'a[href]',
  /**
   * Regex que el href debe matchear para considerarlo un documento candidato.
   * Útil para filtrar entre enlaces de paginación, breadcrumbs, etc.
   * Ej: '\\.pdf$|/documento/'
   */
  link_filter_regex text,
  /** Si false, no se incluye en la corrida automática. */
  active boolean not null default true,
  /** Periodicidad sugerida en días (informativa, no la fuerza el cron). */
  cadence_days int not null default 7,
  last_crawled_at timestamptz,
  last_doc_count int default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists scraping_sources_active_idx on public.scraping_sources(active)
  where active = true;
create index if not exists scraping_sources_lastcrawl_idx on public.scraping_sources(last_crawled_at);

-- Historial de ejecuciones — un row por (source, run).
create table if not exists public.scraping_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.scraping_sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  /** Cuántos enlaces a docs detectó el discoverer. */
  links_found int default 0,
  /** Cuántos eran NUEVOS (no estaban ya en normative_documents). */
  docs_new int default 0,
  /** Cuántos terminaron embebidos correctamente. */
  docs_embedded int default 0,
  /** Cuántos chunks se insertaron en total. */
  chunks_inserted int default 0,
  /** OK | partial | failed */
  status text not null default 'running',
  error_message text
);

create index if not exists scraping_runs_source_idx
  on public.scraping_runs(source_id, started_at desc);

-- RLS — lectura solo para admin. Escritura solo desde service_role.
alter table public.scraping_sources enable row level security;
alter table public.scraping_runs enable row level security;

drop policy if exists "scraping_sources: admin read" on public.scraping_sources;
create policy "scraping_sources: admin read"
  on public.scraping_sources for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "scraping_runs: admin read" on public.scraping_runs;
create policy "scraping_runs: admin read"
  on public.scraping_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

commit;
