import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';
import {
  generatorModel,
  GENERATOR_MODEL_ID,
} from '@/lib/ai/gemini';
import {
  GENERATOR_PERFILES,
  FORMATO_DOCUMENTO_ADMINISTRATIVO,
  ESTRUCTURAS_MODELO,
  type GeneratorPerfil,
} from '@/lib/ai/generator-perfiles';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { ensureCanUse } from '@/lib/billing/feature-gate';
import type { NormativeDocType } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/generator-chat
 *
 * Turno del generador tipo chat. Combina:
 *   - Perfil elegido (5 opciones) → system prompt específico
 *   - Files adjuntos del usuario (PDFs subidos vía Files API) →
 *     fileData parts nativos que Gemini 3.6-flash procesa
 *   - RAG sobre biblioteca normativa (hybrid_search) → chunks
 *     inyectados en el prompt como whitelist
 *   - Streaming de la respuesta usando el AI SDK
 */

const RequestSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
});

interface HybridRow {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: NormativeDocType;
  doc_number: string | null;
  similarity: number;
}

const MAX_RAG_CHUNKS = 10;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'missing_env', detail: 'GOOGLE_GENERATIVE_AI_API_KEY no configurado' },
      { status: 500 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { conversationId, messages } = parsed.data;

  // Cargar conversación y verificar ownership
  const { data: convoRow } = await supabase
    .from('generator_conversations')
    .select('id, user_id, perfil, law_filter, title')
    .eq('id', conversationId)
    .maybeSingle();
  if (!convoRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const convo = convoRow as {
    id: string;
    user_id: string;
    perfil: GeneratorPerfil;
    law_filter: string[] | null;
    title: string | null;
  };
  if (convo.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Gate de cuota (cuenta como una generación)
  const guard = await ensureCanUse(user.id, 'generator_call');
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 });
  }

  // Cargar files adjuntos vigentes de esta conversación (los ya subidos
  // a Gemini Files API por el endpoint POST /api/generator-chat/[id]/files).
  // Filtramos por expires_at > now() para no enviar file URIs que Gemini
  // ya borró (48h TTL).
  const { data: filesData } = await supabase
    .from('generator_files')
    .select('id, gemini_file_uri, mime_type, original_name, expires_at')
    .eq('conversation_id', conversationId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: true });

  const files = (filesData || []) as Array<{
    id: string;
    gemini_file_uri: string;
    mime_type: string;
    original_name: string;
    expires_at: string | null;
  }>;

  // RAG: buscar chunks relevantes en la biblioteca normativa
  let ragChunks: HybridRow[] = [];
  try {
    const queryEmbedding = await embedOne(lastUser.content, 'RETRIEVAL_QUERY');
    const lawFilter =
      convo.law_filter && convo.law_filter.length > 0 ? convo.law_filter : null;
    const { data } = await supabase.rpc('hybrid_search', {
      query_text: lastUser.content,
      query_embedding: queryEmbedding,
      match_count: MAX_RAG_CHUNKS,
      filter_type: null,
      filter_law: lawFilter,
    });
    if (data) ragChunks = data as HybridRow[];
  } catch (err) {
    console.error('[generator-chat] rag error:', (err as Error).message);
  }

  // Construir el system prompt combinando perfil + RAG whitelist
  const perfil = GENERATOR_PERFILES[convo.perfil];
  const whitelist = ragChunks
    .map((c, i) => {
      const label = c.doc_number
        ? `${c.doc_type} — ${c.doc_number}`
        : c.doc_type;
      return `  [${i + 1}] ${label} (${c.doc_title.slice(0, 80)})`;
    })
    .join('\n');
  const ragContext = ragChunks
    .map((c, i) => {
      const label = c.doc_number || c.doc_title;
      return `[${i + 1}] ${label}\n${c.content.slice(0, 2000)}`;
    })
    .join('\n\n---\n\n');

  const systemPrompt = `${perfil.systemPrompt}

═══════════════════════════════════════════════════════
INSTRUCCIONES DEL GENERADOR
═══════════════════════════════════════════════════════
El usuario está en un chat conversacional. Cuando pida redactar un
documento (memorando, oficio, informe, resolución, TDR, EETT, descargo,
etc.), produce el documento COMPLETO en formato markdown, listo para
copiar. Usa:
- Título en H1 (# TÍTULO DEL DOCUMENTO)
- Secciones en H2 (## SECCIÓN)
- Sub-secciones en H3 (### Sub-sección)
- Listas con "-" o numeradas según convenga
- Tablas en markdown cuando sean necesarias
- **Negrita** para conceptos clave
- PROHIBIDO usar notación LaTeX ($$, \\frac, \\text, \\times): el chat y
  la exportación a Word NO la renderizan. Escribe fórmulas y cálculos en
  texto plano con paréntesis, ej.:
  Penalidad diaria = (0.10 × 15,000.00) / (0.40 × 30) = S/ 125.00

Cuando el usuario haga una consulta puntual (no un documento), responde
en prosa fluida pero manteniendo la estructura visual con encabezados
y listas.

NIVEL DE DETALLE (pedido del cliente 27/07/2026): escribe para un
lector con conocimiento BÁSICO de contrataciones sin perder rigor
técnico. Cuando uses un término técnico (buena pro, valor referencial,
bases integradas, prestación adicional), añade entre paréntesis o en la
misma oración una glosa breve de qué significa la primera vez que
aparece. Desarrolla los fundamentos en 2-3 oraciones en vez de 1.

DATOS FALTANTES: si el usuario no aportó datos necesarios para un
documento completo (fechas, montos, números de expediente, plazos),
NO los inventes: usa corchetes [COMPLETAR: descripción del dato] y
cierra el documento con una sección "**Datos pendientes para completar
este documento**" listando cada corchete. Así el usuario sabe
exactamente qué información debe conseguir.
${FORMATO_DOCUMENTO_ADMINISTRATIVO}
${ESTRUCTURAS_MODELO[convo.perfil as GeneratorPerfil] ? `\n${ESTRUCTURAS_MODELO[convo.perfil as GeneratorPerfil]}\n` : ''}
${
  files.length > 0
    ? `═══════════════════════════════════════════════════════
DOCUMENTOS ADJUNTOS DEL USUARIO (${files.length})
═══════════════════════════════════════════════════════
El usuario adjuntó los siguientes archivos como CONTEXTO específico
de su caso (procesados nativamente por ti como partes fileData):
${files.map((f, i) => `  ${i + 1}. ${f.original_name}`).join('\n')}

Estos documentos son la fuente principal del caso concreto. Combínalos
con la normativa de la whitelist para responder o redactar.
`
    : ''
}${
    ragChunks.length > 0
      ? `═══════════════════════════════════════════════════════
NORMATIVA DISPONIBLE PARA CITAR (whitelist)
═══════════════════════════════════════════════════════
${whitelist}

Cuando cites, usa el formato [N] con el número entre corchetes. Solo
cita como fuente primaria los documentos de esta lista — son los
fragmentos que efectivamente están cargados. Si un fragmento menciona
otro documento por número, ese documento puede existir en la base
normativa pero no está en el pool actual; menciónalo como "según se
hace referencia" sin transcribir contenido que no tienes.

REGLA ANTI-RECITACIÓN: los fragmentos son SOLO REFERENCIA para tus
citas [N]. NO copies párrafos textualmente ni encadenes varias
oraciones idénticas a un fragmento — PARAFRASEA con tus propias
palabras. Solo pueden ir entre comillas ("...") las frases legales
CORTAS que sea imprescindible citar literalmente (ej: definiciones,
literales de un artículo puntual). Esto previene bloqueos del filter
de copyright de Gemini.

CONTENIDO DE LOS FRAGMENTOS:
${ragContext}
`
      : ''
  }`;

  // Construir mensajes con file parts adjuntos al ÚLTIMO mensaje del user
  // (así el modelo los ve como contexto de esa pregunta).
  const trimmedHistory = messages.slice(-8);
  const modelMessages = trimmedHistory.map((m, idx) => {
    const isLast = idx === trimmedHistory.length - 1 && m.role === 'user';
    if (!isLast || files.length === 0) {
      return { role: m.role, content: m.content };
    }
    // Último mensaje del user con files adjuntos: usar formato de parts
    // que el AI SDK entiende (multimodal).
    // IMPORTANTE: el data DEBE ser instancia de URL (no string) para
    // que el converter de @ai-sdk/google emita `fileData.fileUri` en
    // lugar de intentar `inlineData` con base64. Verificado en el
    // source del SDK: /dist/*.js `part.data instanceof URL ? {...}`.
    return {
      role: m.role,
      content: [
        { type: 'text' as const, text: m.content },
        ...files.map((f) => ({
          type: 'file' as const,
          data: new URL(f.gemini_file_uri),
          mimeType: f.mime_type,
        })),
      ],
    };
  });

  const chatStartedAt = Date.now();
  const result = await streamText({
    model: generatorModel,
    system: systemPrompt,
    // AI SDK acepta contenido multimodal en los messages
    messages: modelMessages as never,
    temperature: 0.3,
    onError({ error }) {
      console.error('[generator-chat] streamText error:', error);
    },
    onFinish: async ({ text, usage }) => {
      void recordAiUsage({
        userId: user.id,
        feature: 'generator_chat',
        model: GENERATOR_MODEL_ID,
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
        latencyMs: Date.now() - chatStartedAt,
        metadata: {
          conversation_id: conversationId,
          perfil: convo.perfil,
          n_files: files.length,
          n_rag_chunks: ragChunks.length,
        },
      });

      // Persistir user message (si es el último y aún no está en BD)
      // + assistant reply
      const userText = lastUser.content;
      const userAttachedFiles = files.map((f) => ({
        file_id: f.id,
        name: f.original_name,
      }));

      const { data: existingLastUser } = await supabase
        .from('generator_messages')
        .select('id, content')
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const alreadyPersisted =
        existingLastUser &&
        (existingLastUser as { content: string }).content === userText;

      if (!alreadyPersisted) {
        await supabase.from('generator_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: userText,
          attached_files: userAttachedFiles as never,
        } as never);
      }

      const sourcesForMessage = ragChunks.map((c) => ({
        chunk_id: c.chunk_id,
        doc_id: c.document_id,
        doc_title: c.doc_title,
        doc_type: c.doc_type,
        doc_number: c.doc_number,
        snippet: c.content,
      }));

      await supabase.from('generator_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: text,
        sources: sourcesForMessage as never,
        tokens_input: usage?.promptTokens ?? 0,
        tokens_output: usage?.completionTokens ?? 0,
      } as never);

      // Auto-generar título si aún no tiene
      if (!convo.title && userText) {
        const title = userText.slice(0, 60).replace(/\s+/g, ' ').trim();
        await supabase
          .from('generator_conversations')
          .update({ title } as never)
          .eq('id', conversationId);
      }
    },
  });

  return result.toDataStreamResponse({
    getErrorMessage(error) {
      const msg = (error as Error)?.message || 'unknown';
      return `[generator-chat] ${msg}`;
    },
  });
}
