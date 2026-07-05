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

/**
 * Query expansion — detecta patrones legales comunes en la pregunta del
 * usuario y agrega términos técnicos que suelen aparecer en los artículos
 * relevantes del Reglamento. La query original se mantiene; los términos
 * extra ayudan a que el embedding matchee chunks con vocabulario numérico
 * específico (ej: "50% utilidad", "8 días hábiles").
 *
 * Retorna una string vacía si no aplica expansión — el caller debe evitar
 * hacer la segunda búsqueda en ese caso.
 */
function expandLegalQuery(query: string): string {
  const q = query.toLowerCase();
  const additions: string[] = [];

  // Resolución de contrato por Entidad → 50% utilidad Art. 123.5
  if (
    /(?:resoluci[óo]n|resolver).*(?:contrat|imputable|atribuible).*(?:entidad|contratante)/i.test(q) ||
    (/derecho.*contratista/i.test(q) && /resoluci[óo]n/i.test(q))
  ) {
    additions.push(
      'artículo 123 reglamento 50% utilidad prevista saldo obra fórmulas reajuste liquidación',
    );
  }

  // Suspensión de plazo por Entidad → Art. 107.5 AGA
  if (/suspensi[óo]n.*plazo/i.test(q) && /entidad|contratante/i.test(q)) {
    additions.push(
      'artículo 107 numeral 107.5 autoridad gestión administrativa AGA autorización previa',
    );
  }

  // Falta de pago valorizaciones → Art. 202.3
  if (/(?:falta|no)\s+pago.*valorizaci[óo]n|dos\s+valorizaciones/i.test(q)) {
    additions.push(
      'artículo 202 numeral 202.3 costos directos mayores gastos generales vinculados acreditados',
    );
  }

  // Sistemas de entrega bienes/servicios → Art. 129
  if (/sistema.*entrega|llave en mano|comodato|gesti[óo]n de instalaciones/i.test(q)) {
    additions.push(
      'artículo 129 sistemas entrega bienes servicios llave en mano mantenimiento suministro comodato',
    );
  }

  // Ampliación de plazo → Art. 198
  if (/ampliaci[óo]n.*plazo/i.test(q) && !/preguntas/i.test(q)) {
    additions.push('artículo 198 numeral 198.1 causales ampliación plazo ruta crítica');
  }

  // Difusión del requerimiento → Art. 51
  if (/difusi[óo]n.*requerimiento/i.test(q)) {
    additions.push(
      'artículo 51 numeral 51.2 51.3 51.4 51.5 cinco días hábiles seis días absolución acta',
    );
  }

  // Recurso de apelación → Art. 304
  if (/apelaci[óo]n.*tribunal|recurso.*apelaci[óo]n/i.test(q)) {
    additions.push('artículo 304 ocho días hábiles Tribunal Contrataciones Públicas');
  }

  // Prevalencia pliego vs bases integradas → Art. 66.6
  if (
    /prevalece|divergencia/i.test(q) &&
    /(?:pliego|bases integradas|integraci[óo]n)/i.test(q)
  ) {
    additions.push(
      'artículo 66 numeral 66.6 prevalece lo absuelto pliego absolución consultas',
    );
  }

  if (additions.length === 0) return '';
  return `${query} ${additions.join(' ')}`;
}

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
  const expandedQuery = expandLegalQuery(lastUser.content);
  let sources: ChatSource[] = [];

  try {
    queryEmbedding = await embedOne(lastUser.content, 'RETRIEVAL_QUERY');
    if (expandedQuery && expandedQuery !== lastUser.content) {
      expandedEmbedding = await embedOne(expandedQuery, 'RETRIEVAL_QUERY');
    }
  } catch (err) {
    console.error('Voyage embedding error:', err);
  }

  // 2. Hybrid search + rerank (only if we have an embedding).
  //    Sobre-recuperamos 2x para que el rerank tenga margen. Sin esto,
  //    el chunk correcto de Ley/Reglamento puede quedar fuera del top
  //    cuando pronunciamientos aplicando el mismo concepto ganan la
  //    similaridad por repetir vocabulario (bug reportado 01/07/2026:
  //    Art. 66.6 sobre prevalencia NO aparecía en top-6 mientras el
  //    Pronunciamiento 298 y Directiva 003 dominaban).
  if (queryEmbedding) {
    // Oversample capado a 15 (era 30). Feedback César 01/07/2026 tras
    // audit de 4 preguntas fallidas: match_count > 15 causa timeout en
    // hybrid_search sobre el corpus de 12k chunks (statement_timeout
    // Postgres). Cuando timeout, devuelve 0 filas → "no encontré info".
    // Con 15 el rerank sigue teniendo margen y el chat ya trae los
    // chunks correctos.
    const oversample = Math.min(MAX_CHUNKS + 3, 15);
    const { data: chunks, error: searchError } = await supabase.rpc('hybrid_search', {
      query_text: lastUser.content,
      query_embedding: queryEmbedding,
      match_count: oversample,
      filter_type: null,
      filter_law: lawFilter,
    });

    if (searchError) {
      console.error('Hybrid search error:', searchError);
    } else if (chunks) {
      let combined = chunks as HybridSearchRow[];

      // 2b. Segunda búsqueda con la query expandida — mergea chunks
      //     técnicos que la query natural no traía.
      if (expandedEmbedding) {
        const { data: extraChunks } = await supabase.rpc('hybrid_search', {
          query_text: expandedQuery,
          query_embedding: expandedEmbedding,
          match_count: 10,
          filter_type: null,
          filter_law: lawFilter,
        });
        if (extraChunks) {
          const seenIds = new Set(combined.map((c) => c.chunk_id));
          for (const c of extraChunks as HybridSearchRow[]) {
            if (!seenIds.has(c.chunk_id)) {
              combined.push(c);
              seenIds.add(c.chunk_id);
            }
          }
        }
      }

      const reranked = rerankChunks(combined, lastUser.content, MAX_CHUNKS);
      sources = reranked.map((c) => ({
        chunk_id: c.chunk_id,
        doc_id: c.document_id,
        doc_title: c.doc_title,
        doc_type: c.doc_type,
        doc_number: c.doc_number,
        snippet: c.content,
      }));
    }
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
  const systemPrompt = buildChatSystemPrompt(sources, userRole, trainingQA);
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
