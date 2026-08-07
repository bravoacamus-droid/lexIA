-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 44: revertir halfvec
-- ════════════════════════════════════════════════════════════════════
-- Se deshace lo de las etapas 42 y 43. El motivo NO es que halfvec sea
-- mala idea: es que esta máquina no puede construir el índice.
--
-- QUÉ PASÓ (06-07/08/2026):
--   · Copiar los 277,225 vectores a media precisión tomó 1.8 minutos.
--     Esa parte funcionó perfecto.
--   · Construir el índice HNSW sobre ellos llevaba 10 h 33 min y estaba
--     en 92.5%, con el ritmo derrumbándose:
--         19.8 min →  51.6%   (0.43 %/min)
--          174 min →  81.4%   (0.19 %/min)
--          633 min →  92.5%   (0.024 %/min)
--     Los dos procesos de construcción esperaban disco el 100% del
--     tiempo. Quedaban 5 horas más como mínimo, y el estimado ya no era
--     de fiar porque el ritmo seguía cayendo.
--   · Mientras tanto la plataforma se degradó: 11 de 15 consultas de
--     prueba correctas, una fallando siempre y las primeras respuestas
--     entre 4.6 y 7.5 segundos.
--
-- La causa de fondo es la memoria: 160 MB de maintenance_work_mem sobre
-- una instancia Micro de 1 GB no alcanzan para el grafo de 277 mil
-- vectores, así que Postgres lo arma apoyándose en disco. Que un índice
-- que en una máquina con memoria suficiente toma minutos aquí lleve diez
-- horas y media ES la prueba de que el problema es la RAM, no el formato
-- de los vectores.
--
-- SI SE RETOMA: hacerlo después de subir el cómputo a Small o superior.
-- La copia de vectores está resuelta y es rápida; lo único que falta es
-- una máquina que pueda construir el índice. Los scripts quedan en el
-- repositorio (halfvec-linea-base.ts, halfvec-copiar.ts) y la línea base
-- de 20 consultas está guardada en data/halfvec-linea-base.json.
--
-- LO QUE SÍ SE CONSERVA, porque es lo que de verdad arregló el
-- rendimiento y no depende de halfvec:
--   · etapa 38 y 40: la rama de texto acotada
--   · etapa 39: índice de texto propio para la normativa
--   · etapa 41: caché caliente por pg_cron y límite de 15 s
-- ════════════════════════════════════════════════════════════════════

-- El disparador primero: si no, borrar la tabla con inserciones en
-- curso podría fallar.
drop trigger if exists trg_espejar_halfvec on public.normative_chunks;
drop function if exists public.espejar_halfvec();

drop procedure if exists public.copiar_halfvec(integer);
drop function if exists public.construir_indice_halfvec();

-- Se lleva por delante su índice a medio construir, si quedó algo.
drop table if exists public.normative_chunks_h;
