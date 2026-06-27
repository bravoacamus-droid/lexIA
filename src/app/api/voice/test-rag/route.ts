import { NextResponse } from 'next/server';
import { GoogleGenAI, type Type } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { searchNormativa, formatResultsForLLM } from '@/lib/ai/voice-search';
import { VOICE_SYSTEM_PROMPT } from '@/lib/ai/voice-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Endpoint de test del flujo Tool Calling con search_normativa.
 *
 * Simula una llamada de voz pero SIN audio: usa solo texto. Sirve
 * para validar que:
 *   1. El modelo decide llamar a search_normativa cuando es relevante.
 *   2. Nuestro ejecutor consulta correctamente la BD normativa.
 *   3. El modelo cita las fuentes en su respuesta final.
 *
 * Body:
 *   { "question": "..." }
 *
 * Response:
 *   { "answer": "...", "tool_calls": [...], "citations": [...] }
 *
 * NOTA: Esto NO es la implementación final de Live API con audio.
 * Es el banco de pruebas del RAG antes de meter audio en el día 4.
 */

interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  results_count: number;
  citations: string[];
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { question?: string };
  const question = String(body.question || '').trim();
  if (question.length < 3) {
    return NextResponse.json(
      { error: 'bad_request', detail: 'Falta la pregunta' },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
  }

  const genai = new GoogleGenAI({ apiKey });

  const toolCalls: ToolCallRecord[] = [];

  try {
    // Primer turno: el modelo recibe la pregunta y decide si llamar tool
    const chat = genai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: VOICE_SYSTEM_PROMPT,
        tools: [
          {
            functionDeclarations: [
              {
                name: 'search_normativa',
                description:
                  'Busca en la base normativa de LexIA (Ley 32069, Reglamento, directivas, opiniones DTN, pronunciamientos, resoluciones). Devuelve los 5 fragmentos más relevantes con su cita normativa. SIEMPRE usar esta función antes de citar normativa al usuario.',
                parameters: {
                  type: 'object' as unknown as Type,
                  properties: {
                    query: {
                      type: 'string' as unknown as Type,
                      description:
                        'Palabras clave o pregunta específica para buscar (ej. "plazo de pago al contratista").',
                    },
                    filter_type: {
                      type: 'string' as unknown as Type,
                      description:
                        'Opcional: filtrar por tipo (ley, reglamento, directiva, opinion, pronunciamiento, resolucion, resolucion_tce, lineamiento).',
                      nullable: true,
                    },
                  },
                  required: ['query'],
                },
              },
            ],
          },
        ],
      },
    });

    // Hasta 5 vueltas de tool calling
    let response = await chat.sendMessage({ message: question });
    let iterations = 0;
    const MAX_ITER = 5;

    while (response.functionCalls && response.functionCalls.length > 0 && iterations < MAX_ITER) {
      iterations += 1;

      // Ejecutar todas las function calls de este turno
      const toolResponses: Array<{
        name: string;
        response: { content: string };
      }> = [];

      for (const fc of response.functionCalls) {
        if (fc.name === 'search_normativa') {
          const args = (fc.args || {}) as { query: string; filter_type?: string };
          const results = await searchNormativa({
            query: args.query,
            filter_type: args.filter_type ?? null,
            match_count: 5,
          });
          const formatted = formatResultsForLLM(results);
          toolResponses.push({
            name: 'search_normativa',
            response: { content: formatted },
          });
          toolCalls.push({
            name: 'search_normativa',
            args,
            results_count: results.length,
            citations: results.map((r) => r.citation),
          });
        } else {
          // Tool desconocido
          toolResponses.push({
            name: fc.name || 'unknown',
            response: { content: 'Función no implementada.' },
          });
        }
      }

      // Devolver las respuestas del tool al modelo
      response = await chat.sendMessage({
        message: toolResponses.map((tr) => ({
          functionResponse: {
            name: tr.name,
            response: tr.response,
          },
        })),
      });
    }

    const finalText = response.text || '';
    const citationsFlat = toolCalls.flatMap((tc) => tc.citations);

    return NextResponse.json({
      answer: finalText,
      tool_calls: toolCalls,
      citations: citationsFlat,
      iterations,
    });
  } catch (e) {
    console.error('[voice/test-rag] error:', e);
    return NextResponse.json(
      { error: 'generation_failed', detail: (e as Error).message.slice(0, 300) },
      { status: 500 },
    );
  }
}
