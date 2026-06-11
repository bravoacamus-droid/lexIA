-- ════════════════════════════════════════════════════════
-- LexIA v2 · Etapa 11 — Tracking de consumo + columnas billing
-- ════════════════════════════════════════════════════════
-- · feature_usage: contador mensual de consumo por (user, feature, mes)
-- · subscriptions: agrega cancel_at_period_end + processor metadata
-- ════════════════════════════════════════════════════════

begin;

-- Contadores mensuales — un row por (user, feature, año-mes).
-- El feature gate INCREMENTA esto al consumir una operación cuoteada.
create table if not exists public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /** Slug del feature (ej. "generator_call", "evaluation_run"). */
  feature text not null,
  /** Mes calendario al que pertenece este contador (YYYY-MM-01). */
  period_start date not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature, period_start)
);

create index if not exists feature_usage_user_idx
  on public.feature_usage(user_id, period_start desc);

-- Trigger touch updated_at
create or replace function public.touch_feature_usage()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feature_usage_touch on public.feature_usage;
create trigger feature_usage_touch
  before update on public.feature_usage
  for each row execute function public.touch_feature_usage();

-- RLS: el usuario lee su propio consumo (útil para mostrarlo en /cuenta).
alter table public.feature_usage enable row level security;

drop policy if exists "feature_usage: owner select" on public.feature_usage;
create policy "feature_usage: owner select"
  on public.feature_usage for select
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────
-- Ampliar `subscriptions` con campos que usa el webhook de Culqi
-- ──────────────────────────────────────────────────────
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists processor text default 'culqi',
  add column if not exists currency text default 'PEN',
  add column if not exists amount_cents int,
  add column if not exists last_payment_at timestamptz,
  add column if not exists last_event_id text;

create index if not exists subscriptions_processor_idx
  on public.subscriptions(processor, status);

commit;
