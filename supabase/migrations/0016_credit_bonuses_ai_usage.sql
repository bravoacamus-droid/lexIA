-- ════════════════════════════════════════════════════════════════════
-- LexIA v2 — Etapa 16: Bonus credits + AI usage logging
-- ════════════════════════════════════════════════════════════════════
-- Dos mecánicas nuevas:
--  (1) user_credit_bonuses: créditos extra otorgados por encuestas
--      respondidas, promos, etc. Se suman a la quota mensual del tier.
--  (2) ai_usage_log: bitácora de consumo de tokens por llamada a modelo
--      (chat, generator, evaluator…). Permite al admin medir gasto y
--      decidir precios.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ─── (1) Créditos bonus ────────────────────────────────────────────────
create table if not exists public.user_credit_bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in (
    'chat_message',
    'generator_call',
    'evaluation_run',
    'scraping_admin'
  )),
  amount integer not null check (amount > 0),
  /** Mes calendario al que aplica el bonus (yyyy-mm-01). */
  period_start date not null,
  /** De dónde vino: 'survey_completed' | 'promo' | 'admin_grant' … */
  source text not null,
  /** Texto libre con el motivo (legible para el usuario). */
  reason text,
  granted_at timestamptz not null default now()
);

create index if not exists user_credit_bonuses_user_period_idx
  on public.user_credit_bonuses (user_id, feature, period_start);

-- RLS: el usuario solo puede leer sus bonificaciones; ninguna writes desde
-- cliente. Las inserts las hace el server vía service_role (bypass).
alter table public.user_credit_bonuses enable row level security;

drop policy if exists "credit_bonuses: select own" on public.user_credit_bonuses;
create policy "credit_bonuses: select own"
  on public.user_credit_bonuses for select
  using (auth.uid() = user_id);

-- ─── (2) AI usage log ──────────────────────────────────────────────────
-- Captura input/output tokens y latencia por llamada. Útil tanto para el
-- panel admin como para auditar comportamiento por usuario.
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  /** Feature funcional (no necesariamente coincide con FeatureKey del gating). */
  feature text not null,
  /** Modelo concreto invocado, p.ej. 'gemini-flash-latest'. */
  model text not null,
  provider text not null default 'google',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer generated always as (input_tokens + output_tokens) stored,
  /** Costo estimado en USD * 1e6 (millonésimas) — evita floats en aggregate. */
  cost_micros bigint not null default 0,
  latency_ms integer,
  status text not null default 'ok',
  /** Cualquier metadata extra: doc_id, slug, conversation_id, etc. */
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_idx on public.ai_usage_log (created_at desc);
create index if not exists ai_usage_user_created_idx on public.ai_usage_log (user_id, created_at desc);
create index if not exists ai_usage_feature_idx on public.ai_usage_log (feature, created_at desc);
create index if not exists ai_usage_model_idx on public.ai_usage_log (model, created_at desc);

alter table public.ai_usage_log enable row level security;

drop policy if exists "ai_usage: select own" on public.ai_usage_log;
create policy "ai_usage: select own"
  on public.ai_usage_log for select
  using (auth.uid() = user_id);

-- ─── (3) Refinar user_surveys ──────────────────────────────────────────
-- Permitimos que el usuario re-tome la encuesta. UPSERT por user_id ya
-- funciona porque la columna es UNIQUE. Añadimos un timestamp de cuándo
-- fue la última edición y un flag de reward_granted para asegurar
-- idempotencia de la entrega del bonus (no dar 2x si re-hace).
alter table public.user_surveys
  add column if not exists reward_granted boolean not null default false;

alter table public.user_surveys
  add column if not exists updated_at timestamptz not null default now();

commit;
