-- ════════════════════════════════════════════════════════
-- LexIA Contrataciones · Schema inicial
-- ════════════════════════════════════════════════════════

-- EXTENSIONES
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ════════════════════════════════════════════════════════
-- 1. PROFILES
-- ════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  organization text,
  role text default 'user',
  avatar_url text,
  created_at timestamptz default now()
);

-- Trigger: crear profile al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════
-- 2. NORMATIVE_DOCUMENTS
-- ════════════════════════════════════════════════════════
create table if not exists public.normative_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ley','reglamento','directiva','opinion','pronunciamiento','resolucion_tce')),
  number text,
  date date,
  title text not null,
  summary text,
  source_url text,
  pdf_storage_path text,
  raw_text text,
  metadata jsonb default '{}'::jsonb,
  ingested_at timestamptz default now(),
  unique(type, number)
);

create index if not exists normative_docs_type_idx on public.normative_documents(type);
create index if not exists normative_docs_date_idx on public.normative_documents(date desc);
create index if not exists normative_docs_fts_idx on public.normative_documents
  using gin(to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(summary,'')));

-- ════════════════════════════════════════════════════════
-- 3. NORMATIVE_CHUNKS
-- ════════════════════════════════════════════════════════
create table if not exists public.normative_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.normative_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1024),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists normative_chunks_doc_idx on public.normative_chunks(document_id, chunk_index);
create index if not exists normative_chunks_embedding_idx on public.normative_chunks
  using hnsw (embedding vector_cosine_ops);
create index if not exists normative_chunks_fts_idx on public.normative_chunks
  using gin(to_tsvector('spanish', content));

-- ════════════════════════════════════════════════════════
-- 4. CHAT_CONVERSATIONS
-- ════════════════════════════════════════════════════════
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists chat_conv_user_idx on public.chat_conversations(user_id, updated_at desc);

-- ════════════════════════════════════════════════════════
-- 5. CHAT_MESSAGES
-- ════════════════════════════════════════════════════════
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now()
);

create index if not exists chat_msg_conv_idx on public.chat_messages(conversation_id, created_at);

-- Trigger: actualizar updated_at de la conversación cuando hay un mensaje nuevo
create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.chat_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.chat_messages;
create trigger on_message_inserted
  after insert on public.chat_messages
  for each row execute function public.touch_conversation();

-- ════════════════════════════════════════════════════════
-- 6. USER_FOLDERS
-- ════════════════════════════════════════════════════════
create table if not exists public.user_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  parent_id uuid references public.user_folders(id) on delete cascade,
  name text not null,
  color text default 'slate',
  icon text default 'folder',
  created_at timestamptz default now()
);

create index if not exists user_folders_user_idx on public.user_folders(user_id);

-- ════════════════════════════════════════════════════════
-- 7. USER_SAVED_DOCUMENTS
-- ════════════════════════════════════════════════════════
create table if not exists public.user_saved_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references public.normative_documents(id) on delete cascade,
  folder_id uuid references public.user_folders(id) on delete set null,
  saved_at timestamptz default now(),
  unique(user_id, document_id)
);

create index if not exists user_saved_docs_user_idx on public.user_saved_documents(user_id, saved_at desc);

-- ════════════════════════════════════════════════════════
-- 8. USER_ANNOTATIONS
-- ════════════════════════════════════════════════════════
create table if not exists public.user_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references public.normative_documents(id) on delete cascade,
  highlighted_text text not null,
  position jsonb not null,
  color text default 'yellow' check (color in ('yellow','green','blue')),
  created_at timestamptz default now()
);

create index if not exists user_annot_user_doc_idx on public.user_annotations(user_id, document_id);

-- ════════════════════════════════════════════════════════
-- 9. EVALUATIONS
-- ════════════════════════════════════════════════════════
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  status text default 'pending' check (status in ('pending','processing','done','failed')),
  bases_file_path text,
  offer_files jsonb,
  result jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists evaluations_user_idx on public.evaluations(user_id, created_at desc);

-- ════════════════════════════════════════════════════════
-- 10. GENERATED_DOCUMENTS
-- ════════════════════════════════════════════════════════
create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_type text not null,
  title text,
  input_data jsonb not null,
  generated_content text,
  status text default 'draft' check (status in ('draft','final')),
  created_at timestamptz default now()
);

create index if not exists gen_docs_user_idx on public.generated_documents(user_id, created_at desc);
