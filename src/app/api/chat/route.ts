import { NextResponse } from 'next/server';
import { streamText, generateText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';
import { chatModel, fastModel } from '@/lib/ai/gemini';
import { buildChatSystemPrompt, TITLE_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import type { ChatSource, NormativeDocType } from '@/lib/supabase/types';

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

const MAX_CHUNKS = 8;
const MAX_HISTORY = 8;

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

  // Verificar ownership de la conversación
  const { data: convo } = await supabase
    .from('chat_conversations')
    .select('id, user_id, title')
    .eq('id', conversationId)
    .maybeSingle();

  if (!convo || (convo as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 });
  }

  // 1. Embed user query
  let queryEmbedding: number[] | null = null;
  let sources: ChatSource[] = [];

  try {
    queryEmbedding = await embedOne(lastUser.content, 'RETRIEVAL_QUERY');
  } catch (err) {
    console.error('Voyage embedding error:', err);
  }

  // 2. Hybrid search (only if we have an embedding)
  if (queryEmbedding) {
    const { data: chunks, error: searchError } = await supabase.rpc('hybrid_search', {
      query_text: lastUser.content,
      query_embedding: queryEmbedding,
      match_count: MAX_CHUNKS,
      filter_type: null,
    });

    if (searchError) {
      console.error('Hybrid search error:', searchError);
    } else if (chunks) {
      sources = (chunks as HybridSearchRow[]).map((c) => ({
        chunk_id: c.chunk_id,
        doc_id: c.document_id,
        doc_title: c.doc_title,
        doc_type: c.doc_type,
        doc_number: c.doc_number,
        snippet: c.content,
      }));
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
  }

  // 4. Build prompt
  const systemPrompt = buildChatSystemPrompt(sources);
  const trimmedHistory = messages.slice(-MAX_HISTORY);

  // 5. Stream
  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages: trimmedHistory,
    temperature: 0.3,
    onError({ error }) {
      console.error('[chat] streamText runtime error:', error);
    },
    onFinish: async ({ text }) => {
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
          const { text: rawTitle } = await generateText({
            model: fastModel,
            system: TITLE_SYSTEM_PROMPT,
            prompt: `Pregunta del usuario:\n${lastUser.content}\n\nRespuesta:\n${text.slice(0, 400)}`,
            temperature: 0.2,
            maxTokens: 30,
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
