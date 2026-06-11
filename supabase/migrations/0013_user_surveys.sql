-- ════════════════════════════════════════════════════════
-- LexIA v2 · Etapa 12 — Encuestas segmentadas post-onboarding
-- ════════════════════════════════════════════════════════
-- Guarda la respuesta del usuario a la encuesta correspondiente a su perfil.
-- Una encuesta por usuario (puede saltarla; queda registro de "skipped").
-- ════════════════════════════════════════════════════════

begin;

create table if not exists public.user_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  /** Slug de la encuesta: 'provider' | 'entity' | 'consultant'. */
  survey_slug text not null,
  /** Respuestas {pregunta_id: respuesta_texto}. */
  answers jsonb not null default '{}'::jsonb,
  /** Si el usuario presionó "saltar". */
  skipped boolean not null default false,
  /** Fecha en que se completó/saltó. */
  completed_at timestamptz not null default now()
);

alter table public.user_surveys enable row level security;

drop policy if exists "user_surveys: owner all" on public.user_surveys;
create policy "user_surveys: owner all"
  on public.user_surveys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
