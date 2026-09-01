-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 55: el espejo del índice también al actualizar
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (31/08/2026): nueve documentos entraron a la biblioteca con
-- el texto estropeado —«dos (2) dÌas h·biles», «ResoluciÛn N∞ 002»,
-- «PER⁄ COMPRAS»—. Al ir a repararlos apareció que corregir el texto
-- no bastaba: `normative_chunks_norm`, la copia sin acentos que sirve
-- para buscar por palabras, se quedaría con el texto viejo.
--
-- CAUSA: `trg_espejar_fragmento_normativo` se disparaba solo en INSERT.
-- Mientras un fragmento no se editaba nunca, no se notaba. Pero un
-- fragmento sí se edita —al reparar una codificación, al rehacer un
-- troceado, al corregir una transcripción— y desde ese momento la
-- búsqueda insensible a acentos consulta un índice desfasado, sin que
-- nada avise.
--
-- ARREGLO: el disparador atiende también UPDATE. Se limita a cuando
-- cambia `content`, porque `fts` se recalcula a partir de él y no
-- interesa reescribir el espejo cada vez que se toca cualquier otra
-- columna.
--
-- Se rellena además el espejo de lo que hoy pudiera faltar, por si
-- algún fragmento se actualizó antes de esta migración.
-- ════════════════════════════════════════════════════════════════════

drop trigger if exists trg_espejar_fragmento_normativo on public.normative_chunks;

create trigger trg_espejar_fragmento_normativo
  after insert or update of content on public.normative_chunks
  for each row
  execute function public.espejar_fragmento_normativo();

-- Lo que hubiera quedado desfasado hasta hoy: solo lo que falta o no
-- coincide, para no reescribir el espejo entero —son trescientos mil
-- fragmentos y la consulta no terminaría—.
insert into public.normative_chunks_norm (chunk_id, fts)
select c.id, c.fts
  from public.normative_chunks c
  join public.normative_documents d on d.id = c.document_id
  left join public.normative_chunks_norm n on n.chunk_id = c.id
 where d.type is not null
   and not public.es_casuistica(d.type)
   and (n.chunk_id is null or n.fts is distinct from c.fts)
on conflict (chunk_id) do update set fts = excluded.fts;
