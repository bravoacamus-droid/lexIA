-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 41: mantener la caché caliente y aflojar el límite
-- ════════════════════════════════════════════════════════════════════
-- CONTEXTO (05/08/2026): Supabase avisó que el proyecto está agotando su
-- presupuesto de disco. La instancia es Micro —1 GB de RAM, 87 MB/s
-- sostenidos— y la base pesa 5.4 GB, con un índice vectorial de 2.1 GB.
-- Nada de eso cabe en memoria.
--
-- Medido con la ingesta detenida:
--   primera búsqueda tras estar ociosa        4,304 ms
--   las siguientes, ya en caché                 325 ms
--   una pregunta de chat en frío (10 búsq.)   6,599 ms
--   la misma, ya caliente                       605 ms
--   tres usuarios a la vez, en caliente        1,231 ms
--
-- En caliente el sistema vuela. El problema es el arranque en frío, y
-- 6,599 ms queda a 1.4 s del límite de 8 s a partir del cual la consulta
-- se cancela y el chat responde sin fuentes — la falla que César ya
-- reportó una vez.
--
-- Dos medidas, ninguna de las cuales sustituye a más memoria:
--
-- 1. CALENTAR: una búsqueda cada 10 minutos mantiene en caché los puntos
--    de entrada del grafo HNSW, el índice de texto de la normativa y la
--    tabla de documentos —el camino por el que pasa toda búsqueda—.
--    No elimina todo el arranque en frío: cada pregunta recorre el grafo
--    por un camino distinto. Reduce el caso común, no el peor.
--
--    Se hace con pg_cron y no con las tareas de Vercel porque las de
--    Vercel en plan gratuito corren una vez al día. Además así no hay
--    salto de red ni función serverless de por medio.
--
-- 2. LÍMITE A 15 s: no acelera nada; convierte "el chat responde sin
--    fuentes" en "el chat tarda". No se sube más porque las funciones de
--    Vercel cortan a los 30 s y después de buscar todavía hay que llamar
--    al modelo. Y alargarlo tiene contra: una consulta lenta ocupa su
--    conexión más tiempo, y con 60 conexiones y 10 búsquedas por
--    pregunta, seis usuarios simultáneos ya rozan el tope.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;

-- ── 1. Consultas de calentamiento ────────────────────────────────────
-- Guardan su vector ya calculado: Postgres no puede llamar a Gemini.
-- Se llenan con scripts/preparar-cache-caliente.ts
create table if not exists public.busquedas_calentamiento (
  id serial primary key,
  texto text not null unique,
  embedding vector(1024)
);

comment on table public.busquedas_calentamiento is
  'Consultas que la tarea de calentamiento ejecuta cada 10 minutos para mantener en caché el camino común de búsqueda (migración 0041). Su vector se precalcula desde la aplicación.';

alter table public.busquedas_calentamiento enable row level security;
-- Sin políticas de lectura: solo la tarea programada la usa, y esa corre
-- como superusuario. Nadie más necesita verla.

create or replace function public.calentar_cache()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
begin
  for fila in
    select texto, embedding from public.busquedas_calentamiento
    where embedding is not null
  loop
    -- El resultado se descarta: lo que interesa es que las páginas
    -- queden en memoria.
    perform public.hybrid_search(fila.texto, fila.embedding, 15, null, null);
  end loop;
end;
$$;

-- Cada 10 minutos.
select cron.unschedule('calentar-cache')
 where exists (select 1 from cron.job where jobname = 'calentar-cache');

select cron.schedule('calentar-cache', '*/10 * * * *', 'select public.calentar_cache();');

-- ── 2. Límite de tiempo de las consultas del usuario ─────────────────
alter role authenticated set statement_timeout = '15s';
