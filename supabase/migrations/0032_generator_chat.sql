-- ════════════════════════════════════════════════════════════════════
-- LexIA v2 — Etapa 32: Generador tipo Chat (reemplaza generadores viejos)
-- ════════════════════════════════════════════════════════════════════
-- Feedback César 13/07/2026: los generadores actuales son formularios
-- asistidos con muchos campos. César prefiere el flujo tipo NotebookLM:
-- chat conversacional + carga de fuentes (PDFs propios del usuario) +
-- selección de perfil (Área usuaria/DEC, Legal, Titular, AGA,
-- Fiscalización) + generación en formato descargable a Word.
--
-- Este módulo REEMPLAZA los generadores anteriores. Los datos previos
-- en `generated_documents` se conservan (histórico), pero la interfaz
-- nueva usa estas 3 tablas.
--
--   generator_conversations — una por hilo, con perfil elegido
--   generator_messages       — historial user/assistant + sources RAG
--   generator_files          — PDFs subidos a Gemini Files API con TTL
-- ════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────
-- 1. generator_conversations
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.generator_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text,  -- autogenerado desde el primer mensaje o dejado en null
  perfil text not null default 'area_usuaria' check (perfil in (
    'area_usuaria',
    'dec',            -- Dependencia Encargada de las Contrataciones
    'area_legal',
    'titular_entidad',
    'aga',            -- Autoridad de Gestión Administrativa
    'fiscalizacion'   -- Defensa ante contraloría / fiscalía
  )),

  law_filter text[] check (law_filter <@ array['ley_32069', 'ley_30225']),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generator_conversations_user_idx
  on public.generator_conversations (user_id, updated_at desc);

-- ─────────────────────────────────────────────────────────────────
-- 2. generator_messages
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.generator_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.generator_conversations(id) on delete cascade,

  role text not null check (role in ('user', 'assistant')),
  content text not null,

  -- Sources del RAG sobre biblioteca normativa (el modelo cita con [N])
  -- Formato: [{ chunk_id, doc_id, doc_title, doc_type, doc_number, snippet }]
  sources jsonb,

  -- Archivos adjuntos por el usuario en ESTE turno (referencia a generator_files)
  -- Formato: [{ file_id, name, size }]
  attached_files jsonb,

  -- Contadores de tokens del turno (opcional, para métricas)
  tokens_input integer,
  tokens_output integer,
  tokens_thinking integer,

  created_at timestamptz not null default now()
);

create index if not exists generator_messages_conv_idx
  on public.generator_messages (conversation_id, created_at asc);

-- ─────────────────────────────────────────────────────────────────
-- 3. generator_files
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.generator_files (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.generator_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Nombre del recurso en Gemini Files API (files/xxxxxxxxxx). Se usa
  -- como fileUri en el fileData del request. Gemini borra archivos
  -- tras 48h automáticamente, por lo que expira_at nos ayuda a saber
  -- cuándo el archivo ya no es válido para reutilizar.
  gemini_file_name text not null,
  gemini_file_uri text not null,
  expires_at timestamptz,

  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,

  created_at timestamptz not null default now()
);

create index if not exists generator_files_conv_idx
  on public.generator_files (conversation_id, created_at desc);
create index if not exists generator_files_expires_idx
  on public.generator_files (expires_at asc) where expires_at is not null;

-- ─────────────────────────────────────────────────────────────────
-- Triggers de updated_at
-- ─────────────────────────────────────────────────────────────────
create or replace function public.touch_generator_conversations_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_generator_conv_updated_at on public.generator_conversations;
create trigger trg_generator_conv_updated_at
  before update on public.generator_conversations
  for each row execute function public.touch_generator_conversations_updated_at();

-- Al insertar mensajes, también actualizamos updated_at de la conversación
-- (útil para ordenar el listado por actividad reciente).
create or replace function public.touch_generator_conv_from_message()
returns trigger language plpgsql as $$
begin
  update public.generator_conversations
    set updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_generator_message_touch_conv on public.generator_messages;
create trigger trg_generator_message_touch_conv
  after insert on public.generator_messages
  for each row execute function public.touch_generator_conv_from_message();

-- ─────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────
alter table public.generator_conversations enable row level security;
alter table public.generator_messages      enable row level security;
alter table public.generator_files         enable row level security;

drop policy if exists "gen_conv: owner all" on public.generator_conversations;
create policy "gen_conv: owner all"
  on public.generator_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "gen_msg: via conversation" on public.generator_messages;
create policy "gen_msg: via conversation"
  on public.generator_messages for all
  using (
    exists (
      select 1 from public.generator_conversations c
      where c.id = generator_messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.generator_conversations c
      where c.id = generator_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "gen_files: owner all" on public.generator_files;
create policy "gen_files: owner all"
  on public.generator_files for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
