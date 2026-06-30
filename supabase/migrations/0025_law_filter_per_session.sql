-- ────────────────────────────────────────────────────────────────────
-- 0025_law_filter_per_session.sql
--
-- Agrega filtro de ley aplicable por conversación de chat y por llamada
-- de voz. Permite que cada sesión decida si limitar el RAG a Ley 32069,
-- Ley 30225, o ambas (null = no filtra).
--
-- Decisión de diseño 28/06/2026: la persistencia es por sesión y no a
-- nivel de perfil de usuario, porque César consulta sobre casos que
-- pueden estar bajo cualquiera de las dos leyes según el momento.
-- ────────────────────────────────────────────────────────────────────

alter table chat_conversations
  add column if not exists law_filter text[];

comment on column chat_conversations.law_filter is
  'Restringe el RAG de esta conversación a una o ambas leyes. Valores válidos: ley_32069 y/o ley_30225. NULL o array vacío = sin filtro (ambas leyes).';

alter table voice_calls
  add column if not exists law_filter text[];

comment on column voice_calls.law_filter is
  'Restringe el RAG de esta llamada a una o ambas leyes. Mismos valores que chat_conversations.law_filter.';
