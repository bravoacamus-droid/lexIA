-- ════════════════════════════════════════════════════════════════════
-- Llamadas con el Abogado Virtual — infraestructura BD
--
-- Funcionalidad nueva acordada con César el 26/06/2026 por S/ 500
-- adicionales al contrato (S/ 250 al hito 2 + S/ 250 al hito 3).
--
-- Diseño compatible con Ley N° 29733 de Protección de Datos Personales:
--   - Consentimiento expreso, libre, previo, informado, demostrable.
--   - Derecho de eliminación (Art. 18).
--   - Retención configurable.
--   - Datos sensibles (voz) requieren registro escrito.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Consentimiento de voz por usuario
--    Se solicita UNA SOLA VEZ antes de su primera llamada. Si cambia
--    la versión del disclaimer, se vuelve a pedir.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.voice_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /** Versión del texto del disclaimer aceptado (incrementar si cambia). */
  disclaimer_version text not null default 'v1-2026-06-26',
  /** Las 4 casillas aceptadas (booleanos). */
  accepted_ia_no_lawyer boolean not null default false,
  accepted_recording boolean not null default false,
  accepted_data_in_google_cloud boolean not null default false,
  accepted_no_confidential_third_party boolean not null default false,
  /** Auditoría: IP y user-agent al momento de la aceptación. */
  accepted_ip text,
  accepted_user_agent text,
  accepted_at timestamptz not null default now()
);

create index if not exists voice_consents_user_idx
  on public.voice_consents(user_id, accepted_at desc);

alter table public.voice_consents enable row level security;

drop policy if exists "voice_consents_own_select" on public.voice_consents;
create policy "voice_consents_own_select" on public.voice_consents
  for select using (auth.uid() = user_id);

drop policy if exists "voice_consents_own_insert" on public.voice_consents;
create policy "voice_consents_own_insert" on public.voice_consents
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 2. Llamadas individuales
--    Una fila por cada llamada que inicia el usuario. Se crea al
--    abrir la sesión y se actualiza al cerrar con métricas.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.voice_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /** Estado de la llamada. */
  status text not null default 'active'
    check (status in ('active', 'completed', 'failed', 'deleted')),
  /** Voz seleccionada por el usuario (masculina/femenina/etc.). */
  voice_id text not null default 'Aoede',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  /** Duración en segundos (calculada al cerrar). */
  duration_seconds integer,
  /** Tokens consumidos (audio entrada + salida). */
  tokens_in integer,
  tokens_out integer,
  /** Costo estimado en USD (calculado). */
  cost_usd numeric(10, 6),
  /** Cuántas veces el agente llamó a search_normativa durante la llamada. */
  rag_queries_count integer not null default 0,
  /** Documentos normativos citados durante la llamada (jsonb con doc_ids). */
  cited_documents jsonb not null default '[]'::jsonb,
  /** Resumen ejecutivo generado al cierre. */
  summary text,
  /** Calificación del usuario (1-5). */
  user_rating smallint check (user_rating between 1 and 5),
  user_rating_comment text,
  /** Path en Supabase Storage del audio guardado (si retención lo permite). */
  audio_storage_path text,
  /** Fecha en que se eliminará automáticamente la grabación. */
  retention_until timestamptz not null default (now() + interval '90 days'),
  /** Metadata adicional libre (modelo usado, errores, etc.). */
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_calls_user_idx
  on public.voice_calls(user_id, started_at desc);
create index if not exists voice_calls_status_idx
  on public.voice_calls(status) where status in ('active', 'completed');
create index if not exists voice_calls_retention_idx
  on public.voice_calls(retention_until) where status = 'completed';

alter table public.voice_calls enable row level security;

drop policy if exists "voice_calls_own_select" on public.voice_calls;
create policy "voice_calls_own_select" on public.voice_calls
  for select using (auth.uid() = user_id);

drop policy if exists "voice_calls_own_insert" on public.voice_calls;
create policy "voice_calls_own_insert" on public.voice_calls
  for insert with check (auth.uid() = user_id);

drop policy if exists "voice_calls_own_update" on public.voice_calls;
create policy "voice_calls_own_update" on public.voice_calls
  for update using (auth.uid() = user_id);

drop policy if exists "voice_calls_own_delete" on public.voice_calls;
create policy "voice_calls_own_delete" on public.voice_calls
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 3. Transcripción de cada llamada (separada por volumen)
--    Se almacenan los turnos de conversación con timestamp.
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.voice_call_transcripts (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.voice_calls(id) on delete cascade,
  /** Quién habló: 'user' o 'assistant'. */
  speaker text not null check (speaker in ('user', 'assistant')),
  /** Timestamp relativo al inicio de la llamada (segundos). */
  timestamp_seconds numeric(10, 3) not null,
  /** Texto transcrito. */
  text text not null,
  /** Si el agente citó normativa en este turno (jsonb con refs). */
  citations jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists voice_transcripts_call_idx
  on public.voice_call_transcripts(call_id, timestamp_seconds);

alter table public.voice_call_transcripts enable row level security;

drop policy if exists "voice_transcripts_own_select" on public.voice_call_transcripts;
create policy "voice_transcripts_own_select" on public.voice_call_transcripts
  for select using (
    exists (
      select 1 from public.voice_calls
      where id = call_id and user_id = auth.uid()
    )
  );

drop policy if exists "voice_transcripts_own_insert" on public.voice_call_transcripts;
create policy "voice_transcripts_own_insert" on public.voice_call_transcripts
  for insert with check (
    exists (
      select 1 from public.voice_calls
      where id = call_id and user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 4. Storage bucket para grabaciones de audio
--    Privado, solo el dueño puede descargar su propio audio.
--    Tamaño máximo 50 MB por archivo (~1 hora de audio comprimido).
-- ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-recordings',
  'voice-recordings',
  false,
  52428800,                              -- 50 MB
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "voice_recordings_own_select" on storage.objects;
create policy "voice_recordings_own_select" on storage.objects
  for select using (
    bucket_id = 'voice-recordings'
      and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "voice_recordings_own_insert" on storage.objects;
create policy "voice_recordings_own_insert" on storage.objects
  for insert with check (
    bucket_id = 'voice-recordings'
      and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "voice_recordings_own_delete" on storage.objects;
create policy "voice_recordings_own_delete" on storage.objects
  for delete using (
    bucket_id = 'voice-recordings'
      and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────────────────────────
-- 5. Trigger para actualizar updated_at
-- ─────────────────────────────────────────────────────────────────
create or replace function public.touch_voice_calls_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_voice_calls_updated_at on public.voice_calls;
create trigger touch_voice_calls_updated_at
  before update on public.voice_calls
  for each row execute function public.touch_voice_calls_updated_at();

comment on table public.voice_consents is
  'Consentimiento expreso del usuario para usar Llamadas con el Abogado Virtual. Conforme a Ley 29733: libre, previo, expreso, informado, inequívoco y demostrable.';
comment on table public.voice_calls is
  'Cada llamada de voz IA del usuario. Se crea al abrir sesión Gemini Live, se actualiza al cerrar con métricas y costo.';
comment on table public.voice_call_transcripts is
  'Turnos de conversación transcritos. Permite mostrar el historial al usuario y citar normativa con timestamps.';
