import { NextResponse } from 'next/server';
import { streamText, generateText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';
import { chatModel, fastModel, CHAT_MODEL_ID, FAST_MODEL_ID } from '@/lib/ai/gemini';
import { buildChatSystemPrompt, TITLE_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import type { ChatSource, NormativeDocType } from '@/lib/supabase/types';
import type { ProfileRole } from '@/lib/auth/session';
import { ensureCanUse, recordUsage } from '@/lib/billing/feature-gate';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { expandLegalQuery } from '@/lib/ai/query-expansion';
import { rewriteToLegalQueries } from '@/lib/ai/query-rewrite';
import { fetchNeighborChunks, mergeNeighbors } from '@/lib/ai/neighbor-chunks';
import {
  isPanoramicQuery,
  extractCentralTopic,
  buildPanoramicFacets,
} from '@/lib/ai/panoramic-query';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
});

interface HybridSearchRow {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: NormativeDocType;
  doc_number: string | null;
  similarity: number;
}

/**
 * Aumentado de 8 a 15 el 29/06/2026 tras diagnosticar bug de recall
 * pobre en preguntas específicas. Ej. "plazo de difusión del
 * requerimiento en LP para bienes" — el chunk correcto de la
 * Directiva 007-2025-OECE-CD tenía similitud ~0.70 pero quedaba
 * fuera del top-8 porque otros chunks tangenciales tenían ~0.72.
 * Con 15 el chunk correcto tiene chance de entrar al contexto.
 */
const MAX_CHUNKS = 15;
const MAX_HISTORY = 8;

// Query expansion vive en `@/lib/ai/query-expansion` — compartido con la
// búsqueda de voz para que ambos flujos mantengan los mismos patrones
// legales (ej: "contrato menor" → Art. 226).

/**
 * Rerank + dedupe de chunks tras hybrid_search.
 * Espejo del rerankAndDedupe en voice-search.ts. Ambos endpoints (chat y
 * voz) usan la MISMA lógica de recuperación para mantener consistencia.
 *
 * - Boostea chunks tipo 'ley' o 'reglamento' cuando la query pide una
 *   regla base (prevalece, artículo, plazo, establece, etc.). Sin este
 *   boost, pronunciamientos ganaban la similaridad por repetir vocabulario
 *   y ocultaban la fuente primaria.
 * - Dedupe por firma (primeros 200 chars) para evitar 3 copias del mismo
 *   pronunciamiento cuando la BD tiene documentos duplicados.
 */
function rerankChunks(
  rows: HybridSearchRow[],
  query: string,
  keepCount: number,
): HybridSearchRow[] {
  const wantsBaseRule =
    /(?:prevalece|prevalecen|artículo|numeral|inciso|plazo|obliga|est[aá]blece|determina|dispone|regula)/i.test(
      query,
    );
  const seen = new Set<string>();
  const scored = rows
    .map((r) => {
      let score = r.similarity;
      if (wantsBaseRule && (r.doc_type === 'ley' || r.doc_type === 'reglamento')) {
        score += 0.08;
      }
      return { row: r, score };
    })
    .sort((a, b) => b.score - a.score);

  const out: HybridSearchRow[] = [];
  for (const { row } of scored) {
    const sig = row.content.slice(0, 200).replace(/\s+/g, ' ').trim();
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(row);
    if (out.length >= keepCount) break;
  }
  return out;
}

export async function POST(req: Request) {
  // Verificación temprana de env vars críticas — devolvemos error claro si faltan
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('[chat] GOOGLE_GENERATIVE_AI_API_KEY no configurado en runtime');
    return NextResponse.json(
      {
        error: 'missing_env',
        message:
          'Falta GOOGLE_GENERATIVE_AI_API_KEY en las variables de entorno del despliegue.',
      },
      { status: 500 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  const { conversationId, messages } = parsed.data;

  // Verificar ownership de la conversación + cargar rol del usuario
  // (en paralelo para no agregar latencia)
  const [convoRes, profileRes] = await Promise.all([
    supabase
      .from('chat_conversations')
      .select('id, user_id, title, law_filter')
      .eq('id', conversationId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('profile_role')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const convo = convoRes.data as
    | { id: string; user_id: string; title: string; law_filter: string[] | null }
    | null;
  const userRole = (profileRes.data?.profile_role as ProfileRole | null) || null;

  if (!convo || convo.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Filtro de ley a nivel de conversación (persistente por sesión, no
  // a nivel de perfil). Null o array vacío = no filtra (busca en ambas).
  const lawFilter =
    convo.law_filter && convo.law_filter.length > 0 ? convo.law_filter : null;

  // Gate de cuota de mensajes
  const guard = await ensureCanUse(user.id, 'chat_message');
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 });
  }

  // Título PROVISIONAL inmediato (observación César 27/07/2026: lista
  // llena de "Nueva conversación"). Si el usuario abandona antes de que
  // termine el stream, la conversación igual queda identificable. El
  // título definitivo generado por el LLM en onFinish lo sobreescribe.
  if (!convo.title) {
    const provisional = String(lastUser.content || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    if (provisional) {
      void supabase
        .from('chat_conversations')
        .update({ title: provisional } as never)
        .eq('id', conversationId)
        .then(() => {});
    }
  }

  // 1. Embed user query + variantes expandidas
  //
  // Query expansion (01/07/2026): la pregunta natural del usuario a veces
  // usa vocabulario común mientras que el chunk correcto de la Ley usa
  // vocabulario numérico específico. Ejemplo real reportado por César:
  //   Query: "¿qué derecho tiene el contratista si la Entidad resuelve el contrato?"
  //   Chunk Art. 123.5: "50% de la utilidad prevista, calculada sobre saldo..."
  //   → sim baja porque no comparten palabras clave.
  //
  // Fix: detectamos patrones legales comunes y agregamos términos técnicos
  // adjuntos a la query original antes de embedear. La query original se
  // conserva para el FTS que usa hybrid_search internamente.
  let queryEmbedding: number[] | null = null;
  let expandedEmbedding: number[] | null = null;
  const { expanded: expandedQuery, focalQueries } = expandLegalQuery(lastUser.content);

  // Detección de preguntas PANORÁMICAS (feedback César 13/07/2026).
  // Cuando el usuario pide un resumen/panorámica de un tema, hacemos
  // sub-búsquedas por facetas (tipos, definición, requisitos,
  // procedimiento, excepciones, alcance) para no perder cobertura
  // temática. Ver src/lib/ai/panoramic-query.ts.
  const panoramic = isPanoramicQuery(lastUser.content);
  const panoramicTopic = panoramic ? extractCentralTopic(lastUser.content) : '';
  const panoramicFacets = panoramic ? buildPanoramicFacets(panoramicTopic) : [];

  let sources: ChatSource[] = [];

  // Optimización 08/07/2026: los 2-5 embeds (query + expanded + N focales)
  // NO tienen dependencia entre sí — antes se hacían secuencialmente y
  // sumaban 1.5-3s de latencia antes del primer token. Ahora se lanzan
  // TODOS en paralelo con Promise.all. Cada embed sigue individualmente
  // resiliente a fallo (se retorna null y el pipeline sigue).
  //
  // `embedOne` puede throw; envolvemos en un allSettled-style para que
  // un fallo aislado no aborte todo el retrieval.
  const safeEmbed = (text: string) =>
    embedOne(text, 'RETRIEVAL_QUERY').catch((err: Error) => {
      console.error('[chat] embed_failed', {
        text_preview: text.slice(0, 60),
        err: err.message,
      });
      return null as number[] | null;
    });

  const embedPromises: Promise<number[] | null>[] = [safeEmbed(lastUser.content)];
  const doExpanded = !!expandedQuery && expandedQuery !== lastUser.content;
  if (doExpanded) embedPromises.push(safeEmbed(expandedQuery));
  const focalStartIdx = embedPromises.length;
  for (const focal of focalQueries) embedPromises.push(safeEmbed(focal));
  const panoramicStartIdx = embedPromises.length;
  for (const facet of panoramicFacets) embedPromises.push(safeEmbed(facet));

  const allEmbeds = await Promise.all(embedPromises);
  queryEmbedding = allEmbeds[0];
  expandedEmbedding = doExpanded ? allEmbeds[1] : null;
  const focalEmbeddings = allEmbeds.slice(focalStartIdx, panoramicStartIdx);
  const panoramicEmbeddings = allEmbeds.slice(panoramicStartIdx);

  // 2. Hybrid search + rerank.
  //    Sobre-recuperamos 2x para que el rerank tenga margen. Sin esto,
  //    el chunk correcto de Ley/Reglamento puede quedar fuera del top
  //    cuando pronunciamientos aplicando el mismo concepto ganan la
  //    similaridad por repetir vocabulario (bug reportado 01/07/2026:
  //    Art. 66.6 sobre prevalencia NO aparecía en top-6 mientras el
  //    Pronunciamiento 298 y Directiva 003 dominaban).
  //
  //    Fallback FTS-only: si el embedding falló arriba, usamos vector
  //    de zeros para que hybrid_search igual devuelva resultados por
  //    text search. Es peor calidad pero MEJOR que 0 fuentes.
  const searchEmbedding = queryEmbedding ?? new Array(1024).fill(0);
  {
    // Oversample capado a 15 (era 30). Feedback César 01/07/2026 tras
    // audit de 4 preguntas fallidas: match_count > 15 causa timeout en
    // hybrid_search sobre el corpus de 12k chunks (statement_timeout
    // Postgres). Cuando timeout, devuelve 0 filas → "no encontré info".
    // Con 15 el rerank sigue teniendo margen y el chat ya trae los
    // chunks correctos.
    const oversample = Math.min(MAX_CHUNKS + 3, 15);
    const { data: chunks, error: searchError } = await supabase.rpc('hybrid_search', {
      query_text: lastUser.content,
      query_embedding: searchEmbedding,
      match_count: oversample,
      filter_type: null,
      filter_law: lawFilter,
    });

    if (searchError) {
      console.error('[chat] hybrid_search_failed', {
        error: searchError.message,
        code: searchError.code,
        fts_only: !queryEmbedding,
      });
    } else if (chunks) {
      let combined = chunks as HybridSearchRow[];

      // 2b. Segunda búsqueda con la query expandida — mergea chunks
      //     técnicos que la query natural no traía.
      if (expandedEmbedding) {
        const seenIds = new Set(combined.map((c) => c.chunk_id));
        const { data: extraChunks } = await supabase.rpc('hybrid_search', {
          query_text: expandedQuery,
          query_embedding: expandedEmbedding,
          match_count: 10,
          filter_type: null,
          filter_law: lawFilter,
        });
        if (extraChunks) {
          for (const c of extraChunks as HybridSearchRow[]) {
            if (!seenIds.has(c.chunk_id)) {
              combined.push(c);
              seenIds.add(c.chunk_id);
            }
          }
        }

      }

      // 2c. Búsquedas FOCALIZADAS por artículo — una por patrón que la
      //     expansión detectó. Cada focal es concentrada ("artículo 226
      //     contrato menor 8 UIT") y se ejecuta con filter_type='ley'
      //     para garantizar que el chunk base de la Ley 32069 entre al
      //     pool aunque quede por debajo en similarity global. Ver
      //     voice-search.ts para el diagnóstico completo.
      if (queryEmbedding && focalQueries.length > 0) {
        const seenIds = new Set(combined.map((c) => c.chunk_id));
        // Los N focal RPCs son independientes — Promise.all para
        // paralelizarlos (antes se iban en secuencia sumando 200-400ms
        // por focal). Los embeds YA se calcularon en paralelo arriba;
        // aquí solo hacemos hybrid_search.
        const focalResults = await Promise.all(
          focalQueries.map(async (focal, i) => {
            const focalEmb = focalEmbeddings[i];
            if (!focalEmb) return null;
            const { data } = await supabase.rpc('hybrid_search', {
              query_text: focal,
              query_embedding: focalEmb,
              match_count: 3,
              filter_type: 'ley',
              filter_law: lawFilter,
            });
            return data as HybridSearchRow[] | null;
          }),
        );
        for (const rows of focalResults) {
          if (!rows) continue;
          for (const c of rows) {
            if (!seenIds.has(c.chunk_id)) {
              combined.push(c);
              seenIds.add(c.chunk_id);
            }
          }
        }
      }

      // 2c-ter. RESCATE DE FUENTE PRIMARIA — CONDICIONAL.
      //     Regla general: si tras las búsquedas anteriores el pool ya
      //     trae suficientes chunks de Ley/Reglamento, no se toca nada.
      //     Solo cuando la norma base está ausente (o casi) se activan
      //     dos rescates:
      //       a) reescribir la consulta a lenguaje jurídico y buscar con
      //          eso (resuelve el desajuste coloquial↔normativo);
      //       b) repetir la consulta original filtrada a Ley/Reglamento.
      //     Es deliberadamente un FALLBACK y no un paso permanente:
      //     inyectar normas en toda consulta desplaza a los fragmentos
      //     que sí responden (medido: la voz cayó de 100% a 10% en
      //     "modalidades de contratación" cuando se hacía siempre).
      const esPrimariaTipo = (t: string) => t === 'ley' || t === 'reglamento';
      const RESERVA_PRIMARIA = 3;
      const primariasEnPool = combined.filter((c) =>
        esPrimariaTipo(c.doc_type),
      ).length;
      const necesitaRescate = primariasEnPool < RESERVA_PRIMARIA;

      if (necesitaRescate && queryEmbedding) {
        const rewrites = await rewriteToLegalQueries(lastUser.content);
        if (rewrites.length > 0) {
          const seenIds = new Set(combined.map((c) => c.chunk_id));
          const rewriteEmbs = await Promise.all(rewrites.map(safeEmbed));
          const resultados = await Promise.all(
            rewrites.flatMap((frase, i) => {
              const emb = rewriteEmbs[i];
              if (!emb) return [];
              return (['ley', 'reglamento'] as const).map(async (tipo) => {
                const { data } = await supabase.rpc('hybrid_search', {
                  query_text: frase,
                  query_embedding: emb,
                  match_count: 3,
                  filter_type: tipo,
                  filter_law: lawFilter,
                });
                return data as HybridSearchRow[] | null;
              });
            }),
          );
          for (const rows of resultados) {
            if (!rows) continue;
            for (const c of rows) {
              if (!seenIds.has(c.chunk_id)) {
                combined.push(c);
                seenIds.add(c.chunk_id);
              }
            }
          }
        }
      }

      // 2c-quater. Segundo rescate (solo si sigue faltando norma base):
      //     repetir la consulta ORIGINAL filtrada a Ley y Reglamento.
      //     Origen (01/08/2026): César preguntó "si la entidad no tiene
      //     listo el contrato dentro de los tres días hábiles..." y los
      //     18 chunks recuperados fueron pronunciamientos sobre plazos de
      //     consultas; el Art. 91 del Reglamento (que responde exacto:
      //     requerir con 5 días hábiles y quedar liberado) nunca entró al
      //     contexto y el chat respondió "no aparece regulado".
      if (necesitaRescate && queryEmbedding) {
        const seenIds = new Set(combined.map((c) => c.chunk_id));
        const primarias = await Promise.all(
          (['ley', 'reglamento'] as const).map(async (tipo) => {
            const { data } = await supabase.rpc('hybrid_search', {
              query_text: lastUser.content,
              query_embedding: queryEmbedding,
              match_count: 4,
              filter_type: tipo,
              filter_law: lawFilter,
            });
            return data as HybridSearchRow[] | null;
          }),
        );
        for (const rows of primarias) {
          if (!rows) continue;
          for (const c of rows) {
            if (!seenIds.has(c.chunk_id)) {
              combined.push(c);
              seenIds.add(c.chunk_id);
            }
          }
        }
      }

      // 2d. Búsquedas PANORÁMICAS por facetas — cuando el usuario pide
      //     un resumen/panorámica de un tema ("resúmeme todo sobre X"),
      //     ejecutamos 4-6 sub-búsquedas por facetas típicas (tipos,
      //     definición, requisitos, procedimiento, excepciones, alcance)
      //     para no perder cobertura temática. Feedback César 13/07/2026:
      //     LexIA se iba por otro lado en preguntas transversales.
      // Guardamos el TOP-1 de cada faceta para garantizar cobertura tras
      // el rerank final — sin esto, el corte a 25 por similarity global
      // eliminaba facetas enteras (test 24/07/2026: "contratos menores"
      // y "CPI" desaparecían de la síntesis de modalidades).
      const facetTopChunks: HybridSearchRow[] = [];
      if (panoramicFacets.length > 0 && panoramicEmbeddings.length > 0) {
        const seenIds = new Set(combined.map((c) => c.chunk_id));
        const panoramicResults = await Promise.all(
          panoramicFacets.map(async (facet, i) => {
            const emb = panoramicEmbeddings[i];
            if (!emb) return null;
            const { data } = await supabase.rpc('hybrid_search', {
              query_text: facet,
              query_embedding: emb,
              match_count: 5,
              filter_type: null,
              filter_law: lawFilter,
            });
            return data as HybridSearchRow[] | null;
          }),
        );
        for (const rows of panoramicResults) {
          if (!rows) continue;
          // Top-2 por faceta (antes top-1). Tras el re-troceado del
          // 01/08/2026 los fragmentos son más granulares —cada uno cubre
          // menos terreno—, así que una faceta necesita 2 para quedar
          // representada. Medido: con top-1 la cobertura panorámica cayó.
          if (rows.length > 0) facetTopChunks.push(rows[0]);
          if (rows.length > 1) facetTopChunks.push(rows[1]);
          for (const c of rows) {
            if (!seenIds.has(c.chunk_id)) {
              combined.push(c);
              seenIds.add(c.chunk_id);
            }
          }
        }
      }

      // Cuando es panorámica, mantenemos MÁS chunks en el pool final
      // (25 vs 15) para que el LLM tenga cobertura completa del tema
      // al sintetizar. El system prompt condicional le indica que
      // agrupe en secciones enumeradas.
      // Presupuesto panorámico ampliado a 32 (antes 25): el re-troceado
      // del 01/08/2026 hizo los fragmentos más granulares, así que cubrir
      // un tema completo requiere más piezas.
      const finalMaxChunks = panoramic ? Math.min(MAX_CHUNKS + 17, 32) : MAX_CHUNKS;
      let reranked = rerankChunks(combined, lastUser.content, finalMaxChunks);

      // COBERTURA POR FACETA: garantizar que el top-1 de cada faceta
      // sobreviva el corte. Si el rerank lo dejó fuera, lo re-inyectamos
      // (reemplazando los últimos del ranking para no exceder el límite).
      if (facetTopChunks.length > 0) {
        const inFinal = new Set(reranked.map((c) => c.chunk_id));
        const missing = facetTopChunks.filter((c) => !inFinal.has(c.chunk_id));
        // Dedup dentro de missing (2 facetas pueden compartir top-1)
        const uniqueMissing = [...new Map(missing.map((c) => [c.chunk_id, c])).values()];
        if (uniqueMissing.length > 0) {
          const keep = Math.max(reranked.length - uniqueMissing.length, 0);
          reranked = [...reranked.slice(0, keep), ...uniqueMissing];
        }
      }

      // CUPO GARANTIZADO DE FUENTE PRIMARIA — regla general, no atada a
      // ningún tema. Si el pool trajo chunks de la Ley o el Reglamento,
      // al menos los 3 mejores sobreviven el corte final, aunque su
      // similitud quede por debajo de fuentes secundarias más verbosas
      // (pronunciamientos y resoluciones citan largamente el caso y
      // ganan similitud superficial). Sin este cupo, una pregunta
      // narrativa puede llegar al modelo sin una sola norma base — que
      // es exactamente lo que produce el "no aparece regulado".
      // También es el blindaje necesario antes de ingerir las ~37 mil
      // resoluciones del Tribunal: sin él inundarían todas las consultas.
      {
        const yaPrimarias = reranked.filter((c) => esPrimariaTipo(c.doc_type)).length;
        if (yaPrimarias < RESERVA_PRIMARIA) {
          const inFinal = new Set(reranked.map((c) => c.chunk_id));
          const candidatas = combined
            .filter((c) => esPrimariaTipo(c.doc_type) && !inFinal.has(c.chunk_id))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, RESERVA_PRIMARIA - yaPrimarias);
          if (candidatas.length > 0) {
            const keep = Math.max(reranked.length - candidatas.length, 0);
            reranked = [...reranked.slice(0, keep), ...candidatas];
          }
        }
      }
      // COSIDO DE FRAGMENTOS VECINOS — regla general (ver
      // neighbor-chunks.ts). El troceado parte los documentos por
      // tamaño, no por unidad normativa, así que artículos, tablas y
      // enumeraciones quedan cortados a la mitad. Traemos el fragmento
      // contiguo de los más relevantes para que el detalle (cifras,
      // plazos, tablas) llegue completo. Se AGREGAN sin desplazar a los
      // ya seleccionados, así ninguna respuesta que hoy funciona pierde
      // información.
      {
        const vecinos = await fetchNeighborChunks(supabase, reranked, {
          // En panorámicas se cose MÁS: el tema abarca artículos
          // consecutivos (ej. emergencias: arts. 280-290) y con los
          // fragmentos ya granulares hay que recuperar el tramo contiguo.
          topN: panoramic ? 8 : 5,
          maxAdd: panoramic ? 8 : 5,
        });
        if (vecinos.length > 0) {
          reranked = mergeNeighbors(reranked, vecinos as HybridSearchRow[]);
        }
      }

      // Orden de PRELACIÓN NORMATIVA (observación César 27/07/2026):
      // "primero la ley, el reglamento y luego los demás documentos".
      // Sort estable: dentro de cada nivel se mantiene el orden por
      // relevancia del rerank. Esto define la numeración [N] del prompt
      // y el orden en que el usuario ve las fuentes.
      const PRELACION: Record<string, number> = {
        ley: 0,
        reglamento: 1,
        directiva: 2,
        opinion: 3,
        pronunciamiento: 4,
        resolucion: 5,
        resolucion_tce: 5,
        guia: 6,
        bases_estandar: 7,
        manual_seace: 8,
        tupa: 9,
      };
      reranked = [...reranked].sort(
        (a, b) => (PRELACION[a.doc_type] ?? 10) - (PRELACION[b.doc_type] ?? 10),
      );
      sources = reranked.map((c) => ({
        chunk_id: c.chunk_id,
        doc_id: c.document_id,
        doc_title: c.doc_title,
        doc_type: c.doc_type,
        doc_number: c.doc_number,
        snippet: c.content,
      }));
    }
    // Log diagnóstico: registra el resultado del retrieval por request.
    // Útil cuando el usuario reporta "no vienen fuentes" — permite
    // distinguir 0 chunks (retrieval vacío) vs. chunks OK pero header
    // truncado por Vercel edge.
    console.log('[chat] retrieval', {
      fts_only: !queryEmbedding,
      chunks_returned: (chunks as HybridSearchRow[] | null)?.length ?? 0,
      sources_final: sources.length,
    });
  }

  // 2b. Búsqueda de Q&A del balotario OECE (entrenamiento adicional).
  //     Se llama SIEMPRE que hay embedding — la función SQL filtra por
  //     min_similarity 0.75 así que solo devuelve Q&A muy relacionados.
  //     Si la consulta del usuario NO es tipo examen, retorna vacío y
  //     no afecta al contexto. Si SÍ matchea, esas Q&A curadas se
  //     inyectan como "material de referencia adicional" en el prompt.
  let trainingQA: Array<{
    section: string | null;
    question: string;
    options: Record<'a' | 'b' | 'c' | 'd', string | null>;
    correctLetter: 'a' | 'b' | 'c' | 'd';
    correctText: string | null;
    similarity: number;
  }> = [];
  if (queryEmbedding) {
    const { data: qaData, error: qaError } = await supabase.rpc('search_training_qa', {
      query_embedding: queryEmbedding,
      match_count: 3,
      min_similarity: 0.75,
    });
    if (qaError) {
      // Si la tabla no existe (migración 0030 aún no aplicada), degradamos silenciosamente.
      if (
        !(qaError.message || '').toLowerCase().includes('does not exist') &&
        !(qaError.message || '').toLowerCase().includes('not found')
      ) {
        console.error('[chat] training_qa search error:', qaError.message);
      }
    } else if (qaData) {
      trainingQA = ((qaData as unknown[]) || []).map((r) => {
        const row = r as {
          section: string | null;
          question: string;
          option_a: string | null;
          option_b: string | null;
          option_c: string | null;
          option_d: string | null;
          correct_letter: 'a' | 'b' | 'c' | 'd';
          correct_text: string | null;
          similarity: number;
        };
        return {
          section: row.section,
          question: row.question,
          options: {
            a: row.option_a,
            b: row.option_b,
            c: row.option_c,
            d: row.option_d,
          },
          correctLetter: row.correct_letter,
          correctText: row.correct_text,
          similarity: row.similarity,
        };
      });
    }
  }

  // 3. Persistir el mensaje de usuario (idempotent: only if último mensaje no es el mismo)
  const { data: existingUserMsg } = await supabase
    .from('chat_messages')
    .select('id, role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const last = existingUserMsg as { role: string; content: string } | null;
  if (!last || last.role !== 'user' || last.content !== lastUser.content) {
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: lastUser.content,
    } as never);
    // Solo contamos un mensaje cuando es genuinamente nuevo (no replay)
    await recordUsage(user.id, 'chat_message');
  }

  // 4. Build prompt — el perfil del usuario ajusta el tono y los énfasis.
  //    Las Q&A del balotario (si hay) se pasan como material adicional
  //    para que el modelo produzca respuestas alineadas con el criterio
  //    OECE de Certificación.
  const systemPrompt = buildChatSystemPrompt(
    sources,
    userRole,
    trainingQA,
    panoramic ? { topic: panoramicTopic } : null,
  );
  const trimmedHistory = messages.slice(-MAX_HISTORY);

  // 5. Stream
  const chatStartedAt = Date.now();
  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages: trimmedHistory,
    temperature: 0.3,
    onError({ error }) {
      console.error('[chat] streamText runtime error:', error);
    },
    onFinish: async ({ text, usage }) => {
      // Bitácora de tokens del chat
      void recordAiUsage({
        userId: user.id,
        feature: 'chat',
        model: CHAT_MODEL_ID,
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
        latencyMs: Date.now() - chatStartedAt,
        metadata: { conversation_id: conversationId },
      });

      // Persistir respuesta del asistente
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: text,
        sources: sources as never,
      } as never);

      // Auto-generar título si la conversación aún no tiene
      const convoData = convo as { id: string; title: string | null };
      if (!convoData.title) {
        try {
          const titleStartedAt = Date.now();
          const titleResult = await generateText({
            model: fastModel,
            system: TITLE_SYSTEM_PROMPT,
            prompt: `Pregunta del usuario:\n${lastUser.content}\n\nRespuesta:\n${text.slice(0, 400)}`,
            temperature: 0.2,
            maxTokens: 30,
          });
          const rawTitle = titleResult.text;
          void recordAiUsage({
            userId: user.id,
            feature: 'chat_title',
            model: FAST_MODEL_ID,
            inputTokens: titleResult.usage?.promptTokens ?? 0,
            outputTokens: titleResult.usage?.completionTokens ?? 0,
            latencyMs: Date.now() - titleStartedAt,
            metadata: { conversation_id: conversationId },
          });
          const cleanTitle = rawTitle
            .replace(/^["']|["']$/g, '')
            .replace(/\.$/, '')
            .trim()
            .slice(0, 80);
          if (cleanTitle.length > 2) {
            await supabase
              .from('chat_conversations')
              .update({ title: cleanTitle } as never)
              .eq('id', conversationId);
          }
        } catch (err) {
          console.error('Title gen error:', err);
        }
      }
    },
  });

  // Devolver el stream con headers que el cliente del Vercel AI SDK entiende.
  // Exponemos el mensaje de error real (en lugar del genérico "An error occurred")
  // para diagnóstico rápido en producción.
  const response = result.toDataStreamResponse({
    getErrorMessage(error) {
      const msg =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : typeof error === 'string'
            ? error
            : 'unknown_error';
      console.error('[chat] error returned to client:', msg);
      return msg.slice(0, 500);
    },
  });
  response.headers.set('x-lexia-sources', encodeURIComponent(JSON.stringify(sources)));
  return response;
}
