-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 69: el rastreador recuerda lo que falló
-- ════════════════════════════════════════════════════════════════════
-- El rastreador salta lo que ya está en la biblioteca, pero lo que
-- FALLA —un escaneo sin texto, un PDF que no descarga, un error de
-- embeddings— no queda en ningún lado: en la corrida siguiente se
-- vuelve a descargar, a extraer y, si llega, a vectorizar. Cada día,
-- para siempre. Con cien enlaces por índice, un puñado de documentos
-- rotos basta para gastar cómputo y cuota sin avance.
--
-- `scraping_fallos` anota cada URL que falló, cuántas veces y cuándo
-- se puede volver a intentar: al día siguiente, a los tres días, a la
-- semana; tras el tercer intento, no más (queda para la ingesta manual,
-- que sí lee escaneos con OCR).
--
-- RLS: solo el panel de administración la lee; el rastreador escribe
-- con la clave de servicio.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.scraping_fallos (
  url              text primary key,
  source_id        uuid references public.scraping_sources(id) on delete cascade,
  motivo           text not null,
  intentos         integer not null default 1,
  ultimo_intento   timestamptz not null default now(),
  proximo_intento  timestamptz not null default now() + interval '1 day'
);

create index if not exists scraping_fallos_source_idx on public.scraping_fallos (source_id, proximo_intento);

alter table public.scraping_fallos enable row level security;

drop policy if exists "scraping_fallos: admin read" on public.scraping_fallos;
create policy "scraping_fallos: admin read"
  on public.scraping_fallos for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- El rastreador pregunta por cada enlace si su URL ya está en la
-- biblioteca. Sin índice, cada pregunta recorre la tabla entera.
create index if not exists normative_documents_source_url_idx
  on public.normative_documents (source_url);
