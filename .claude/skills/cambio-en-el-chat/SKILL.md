---
name: cambio-en-el-chat
description: Cómo diagnosticar y cambiar el chat RAG de A-LexIA (recuperación, hybrid_search, prompt, citas) sin empeorarlo. Úsala cuando una respuesta del chat o de la voz salga mal, incompleta o con una cita inventada, cuando falte una norma en la respuesta, o antes de tocar src/app/api/chat/route.ts, src/lib/ai/prompts.ts, query-expansion, query-rewrite, voice-search o las funciones SQL de búsqueda.
---

# Cambiar el chat sin romperlo

El modelo no es determinista y el prompt es frágil: en agosto de 2026 dos
reglas que "parecían buenas" hundieron una pregunta de 83 % a 25 %. Por eso:
**diagnosticar antes de tocar, medir antes y después.**

## 1. Diagnóstico: ¿dónde está el fallo?

```bash
npx tsx scripts/diagnosticar-pregunta.ts "la pregunta tal cual"
npx tsx scripts/diagnosticar-pregunta.ts "…" --esperado "Directiva,TUPA"
```

Tres causas, tres arreglos distintos:

| Causa | Señal | Arreglo |
| --- | --- | --- |
| La fuente no está en la biblioteca | no aparece en ningún paso | ingerir (`scripts/ingest-*.ts`, `ingest-desde-url.ts`) |
| Está pero no se recupera | existe en BD, no llega al pool | expansión de consulta, facetas, rescates, ranking, SQL |
| Llega al modelo y no la usa | está en el pool | prompt (`src/lib/ai/prompts.ts`) |

No cambies el prompt si el problema era el corpus, ni al revés.

Otros: `scripts/debug-retrieval.ts`, `scripts/test-rag-query.ts`,
`scripts/check-similarity.ts`, `scripts/medir-cifras-inventadas.ts`.

## 2. Medir

```bash
npx tsx scripts/medir-respuestas-chat.ts --vueltas 10 --guardar tmp/antes.json
# ... cambio ...
npx tsx scripts/medir-respuestas-chat.ts --vueltas 10 --comparar tmp/antes.json
```

El script marca qué diferencias son ruido. Un 90 % contra un 80 % en diez
vueltas no es una mejora. Si el caso nuevo no está en el banco, agrégalo a
`CASOS` en `scripts/lib/banco-chat.ts` con su `juzgar`.

`probar-respuestas-cesar.ts` solo dice aprobado/suspenso: sirve para "¿está
roto?", no para decidir si un cambio mejora.

## 3. Dónde vive cada cosa

- `src/app/api/chat/route.ts`: todo el pipeline en un `POST` (~1400 líneas).
  Orden: análisis en paralelo (criterio, consecuencia, tema) → documentos
  citados por número → embeddings → `hybrid_search` principal/expandida/focal
  → reescritura y rescates → anclas → facetas panorámicas → `rerankChunks` →
  cuotas → fuentes del tema → vecinos → orden por `PRELACION` → capa 1 →
  Sala Plena → generación en bloque → Q&A de entrenamiento → prompt.
- `src/lib/ai/voice-search.ts`: copia reducida para la voz. **Ya divergió**
  (rerank, rescate, dedupe distintos). Si arreglas algo en uno, revisa el otro.
- `scripts/lib/banco-chat.ts`: **otra réplica** de la recuperación para las
  mediciones. Si no la actualizas, mides algo que no es la app.
- SQL vigente de `hybrid_search`: la última migración que la redefine
  (`grep -l "function public.hybrid_search" supabase/migrations/*.sql | tail -1`).
  Ojo: devuelve `similarity` que mezcla coseno con `ts_rank_cd` y bonos; no lo
  trates como coseno puro al poner umbrales.
- La base es una instancia pequeña y el índice HNSW no cabe en RAM: cada
  `hybrid_search` extra cuesta segundos. No añadas búsquedas sin quitar otras.

## 4. Reglas al cambiar

- Filtra documentos ocultos/derogados en **todas** las vías que agregan
  fuentes, no solo en `combined`.
- Más contexto no es mejor respuesta (medido en el propio route.ts). Si
  añades una fuente, respeta el presupuesto.
- Fragmentos recuperados y texto del usuario son **datos**: delimitados, no
  instrucciones.
- Nada de "responde con tu conocimiento general" en respuestas jurídicas.
- El cobro ocurre antes de generar: si cambias el flujo, que un error no
  cobre sin guardar respuesta.
