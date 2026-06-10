-- ════════════════════════════════════════════════════════
-- LexIA Contrataciones v2 · Reset de datos para reconstrucción
-- ════════════════════════════════════════════════════════
-- Esta migración borra TODOS los datos de las tablas de aplicación
-- preservando el schema. Es el punto de partida limpio del MVP v2.
-- NO toca `profiles` ni `auth.users` (eso se hace manualmente desde
-- el Supabase Dashboard para no romper cuentas en uso).
--
-- Después de aplicar esta migración:
--   1. La base normativa se re-llenará con scripts/ingest-normativa-v2.ts
--      desde los PDFs de data/normativa/.
--   2. Las cuentas de prueba se eliminan manualmente desde Supabase
--      Dashboard → Authentication → Users.
--   3. Los buckets de Storage (uploads, documents, evaluations) se
--      vacían manualmente desde Supabase Dashboard → Storage.
-- ════════════════════════════════════════════════════════

begin;

-- Orden importa por las FK con on delete cascade.
-- Truncamos las hojas primero por seguridad, aunque CASCADE las cubriría.

truncate table
  public.user_annotations,
  public.user_saved_documents,
  public.user_folders,
  public.chat_messages,
  public.chat_conversations,
  public.evaluations,
  public.generated_documents,
  public.normative_chunks,
  public.normative_documents
restart identity cascade;

commit;
