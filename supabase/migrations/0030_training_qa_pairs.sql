-- ═══════════════════════════════════════════════════════════════
-- 0030_training_qa_pairs.sql
-- ═══════════════════════════════════════════════════════════════
-- Tabla dedicada para pares de preguntas y respuestas del balotario
-- OECE de Certificación de Compradores Públicos.
--
-- Objetivo: entrenar mejor al chat cuando el usuario hace preguntas
-- tipo examen ("¿en qué caso...?", "¿cuál principio...?"). Cuando el
-- retriever detecta que la consulta suena a Q&A, este endpoint
-- complementa los chunks normativos con Q&A relevantes del balotario.
--
-- No se muestra en la biblioteca — es material de entrenamiento
-- interno de la IA, no fuente normativa oficial.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists vector;

create table if not exists public.training_qa_pairs (
  id uuid primary key default gen_random_uuid(),

  -- Identificación
  source text not null default 'balotario_oece_certificacion',
  section text,               -- ACTUACIONES PREPARATORIAS, SELECCIÓN, EJECUCIÓN, etc.
  question_num integer,       -- Número dentro de la sección (informativo)
  page integer,               -- Página del PDF original (para trazabilidad)

  -- Contenido del Q&A
  question text not null,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_letter char(1) check (correct_letter in ('a', 'b', 'c', 'd')),
  correct_text text,          -- Denormalizado: texto de la opción correcta

  -- Embedding de la pregunta (para búsqueda semántica)
  embedding vector(1024),

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.training_qa_pairs is
  'Pares Q&A del balotario OECE para entrenamiento del chat. No es normativa oficial, es material de estudio para mejorar respuestas a preguntas tipo examen.';

comment on column public.training_qa_pairs.embedding is
  'Embedding de la PREGUNTA (no de la respuesta) — la búsqueda RAG matchea preguntas del usuario con preguntas del balotario.';

-- Índice de similaridad por coseno (IVFFlat para escalar a 200-500 rows)
create index if not exists training_qa_pairs_embedding_idx
  on public.training_qa_pairs
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 20);

-- Índice para filtrar por sección
create index if not exists training_qa_pairs_section_idx
  on public.training_qa_pairs (section)
  where section is not null;

-- ═══════════════════════════════════════════════════════════════
-- Función SQL: buscar Q&A por similitud
-- ═══════════════════════════════════════════════════════════════
create or replace function public.search_training_qa(
  query_embedding vector(1024),
  match_count int default 5,
  min_similarity float default 0.65
)
returns table (
  id uuid,
  section text,
  question text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_letter char(1),
  correct_text text,
  similarity float
)
language sql stable
as $$
  select
    t.id,
    t.section,
    t.question,
    t.option_a,
    t.option_b,
    t.option_c,
    t.option_d,
    t.correct_letter,
    t.correct_text,
    1 - (t.embedding <=> query_embedding) as similarity
  from public.training_qa_pairs t
  where t.embedding is not null
    and 1 - (t.embedding <=> query_embedding) >= min_similarity
  order by t.embedding <=> query_embedding
  limit match_count;
$$;

comment on function public.search_training_qa is
  'Búsqueda semántica de Q&A del balotario por similaridad coseno. Se llama desde /api/chat cuando la pregunta del usuario suena a examen.';

-- ═══════════════════════════════════════════════════════════════
-- RLS: cualquier usuario autenticado puede LEER (Q&A pública para IA);
-- solo service_role escribe (ingesta desde script admin).
-- ═══════════════════════════════════════════════════════════════
alter table public.training_qa_pairs enable row level security;

drop policy if exists "training_qa_pairs: read authenticated" on public.training_qa_pairs;
create policy "training_qa_pairs: read authenticated"
  on public.training_qa_pairs for select
  to authenticated
  using (true);
