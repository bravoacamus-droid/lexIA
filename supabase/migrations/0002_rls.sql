-- ════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════

-- Habilitar RLS en TODAS las tablas
alter table public.profiles enable row level security;
alter table public.normative_documents enable row level security;
alter table public.normative_chunks enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_folders enable row level security;
alter table public.user_saved_documents enable row level security;
alter table public.user_annotations enable row level security;
alter table public.evaluations enable row level security;
alter table public.generated_documents enable row level security;

-- ──────────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────────
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ──────────────────────────────────────────────────
-- NORMATIVE_DOCUMENTS · lectura pública (autenticados)
-- ──────────────────────────────────────────────────
drop policy if exists "normative_documents_select_authenticated" on public.normative_documents;
create policy "normative_documents_select_authenticated" on public.normative_documents
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- ──────────────────────────────────────────────────
-- NORMATIVE_CHUNKS · lectura pública (autenticados)
-- ──────────────────────────────────────────────────
drop policy if exists "normative_chunks_select_authenticated" on public.normative_chunks;
create policy "normative_chunks_select_authenticated" on public.normative_chunks
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- ──────────────────────────────────────────────────
-- CHAT_CONVERSATIONS · owner-only
-- ──────────────────────────────────────────────────
drop policy if exists "chat_conv_owner_all" on public.chat_conversations;
create policy "chat_conv_owner_all" on public.chat_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────
-- CHAT_MESSAGES · join con owner de la conversación
-- ──────────────────────────────────────────────────
drop policy if exists "chat_msg_owner_all" on public.chat_messages;
create policy "chat_msg_owner_all" on public.chat_messages
  for all using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────
-- USER_FOLDERS · owner-only
-- ──────────────────────────────────────────────────
drop policy if exists "user_folders_owner_all" on public.user_folders;
create policy "user_folders_owner_all" on public.user_folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────
-- USER_SAVED_DOCUMENTS · owner-only
-- ──────────────────────────────────────────────────
drop policy if exists "user_saved_owner_all" on public.user_saved_documents;
create policy "user_saved_owner_all" on public.user_saved_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────
-- USER_ANNOTATIONS · owner-only
-- ──────────────────────────────────────────────────
drop policy if exists "user_annot_owner_all" on public.user_annotations;
create policy "user_annot_owner_all" on public.user_annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────
-- EVALUATIONS · owner-only
-- ──────────────────────────────────────────────────
drop policy if exists "evaluations_owner_all" on public.evaluations;
create policy "evaluations_owner_all" on public.evaluations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────
-- GENERATED_DOCUMENTS · owner-only
-- ──────────────────────────────────────────────────
drop policy if exists "gen_docs_owner_all" on public.generated_documents;
create policy "gen_docs_owner_all" on public.generated_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
