-- ════════════════════════════════════════════════════════
-- LexIA v2 · Profiles ampliados + Suscripciones (Etapa 2)
-- ════════════════════════════════════════════════════════
-- 1. Extiende `profiles` con role, onboarding y datos de organización
-- 2. Crea `subscriptions` y `subscription_events` (Culqi + trial 30 días)
-- 3. Reescribe trigger handle_new_user para inicializar la suscripción
-- 4. Define RLS para las nuevas tablas
-- ════════════════════════════════════════════════════════

begin;

-- ──────────────────────────────────────────────────────
-- 1. PROFILES ampliados
-- ──────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type public.profile_role as enum ('entity','provider','consultant');
  end if;
end$$;

alter table public.profiles
  add column if not exists profile_role public.profile_role,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists organization_name text,
  add column if not exists ruc text,
  add column if not exists position_title text,
  add column if not exists profile_metadata jsonb not null default '{}'::jsonb;

-- La columna `role` legacy (text) se conserva para no romper código actual.
-- En etapa posterior se podrá deprecar a favor de `profile_role`.

create index if not exists profiles_role_idx on public.profiles(profile_role)
  where profile_role is not null;
create index if not exists profiles_onboarding_idx on public.profiles(onboarding_completed)
  where onboarding_completed = false;

-- ──────────────────────────────────────────────────────
-- 2. SUBSCRIPTIONS
-- ──────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type public.subscription_tier as enum (
      'free_trial', 'starter', 'pro', 'enterprise'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'trialing', 'active', 'past_due', 'canceled'
    );
  end if;
end$$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free_trial',
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  culqi_customer_id text,
  culqi_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_trial_idx on public.subscriptions(trial_ends_at)
  where status = 'trialing';

-- Trigger touch para mantener updated_at
create or replace function public.touch_subscription()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_subscription();

-- ──────────────────────────────────────────────────────
-- 3. SUBSCRIPTION_EVENTS (audit log)
-- ──────────────────────────────────────────────────────
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_sub_idx
  on public.subscription_events(subscription_id, created_at desc);

-- ──────────────────────────────────────────────────────
-- 4. Trigger handle_new_user — crea profile + subscription en trial
-- ──────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name)
  values (new.id, v_full_name)
  on conflict (id) do nothing;

  insert into public.subscriptions (
    user_id, tier, status, trial_ends_at
  ) values (
    new.id,
    'free_trial',
    'trialing',
    now() + interval '30 days'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- (el trigger on_auth_user_created ya existe de 0001_init y apunta a esta función)

-- ──────────────────────────────────────────────────────
-- 5. RLS para subscriptions
-- ──────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;

drop policy if exists "subscriptions: owner select" on public.subscriptions;
create policy "subscriptions: owner select"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No hay policy de insert/update/delete para usuarios — todo eso pasa por
-- el trigger handle_new_user (security definer) o por endpoints server-side
-- con service_role (webhooks de Culqi, cron de trial expirado).

drop policy if exists "subscription_events: owner select" on public.subscription_events;
create policy "subscription_events: owner select"
  on public.subscription_events for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_events.subscription_id
        and s.user_id = auth.uid()
    )
  );

commit;
