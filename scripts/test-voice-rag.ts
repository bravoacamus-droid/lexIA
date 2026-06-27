#!/usr/bin/env tsx
/**
 * Test del flujo Tool Calling con search_normativa.
 *
 * Simula una conversación con el Abogado Virtual usando texto (no audio)
 * para validar que el modelo decide llamar a la función, que esta
 * devuelve chunks relevantes de la BD normativa, y que el modelo cita
 * las fuentes correctamente en su respuesta.
 *
 * Uso:
 *   pnpm exec tsx scripts/test-voice-rag.ts "¿En cuánto tiempo se debe pagar al proveedor?"
 *   pnpm exec tsx scripts/test-voice-rag.ts  # usa pregunta default
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { GoogleGenAI, type Type } from '@google/genai';

import { searchNormativa, formatResultsForLLM } from '../src/lib/ai/voice-search';
import { VOICE_SYSTEM_PROMPT } from '../src/lib/ai/voice-config';

loadEnv({ path: join(process.cwd(), '.env.local') });

const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')
  .trim()
  .replace(/[\r\n"']/g, '');

if (!apiKey) {
  console.error('❌ Falta GOOGLE_GENERATIVE_AI_API_KEY en .env.local');
  process.exit(1);
}

const question =
  process.argv.slice(2).join(' ').trim() ||
  '¿En cuánto tiempo hábiles se debe pagar al contratista desde la conformidad?';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test del Abogado Virtual (texto, sin audio)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Pregunta del usuario:');
  console.log(`  "${question}"`);
  console.log('');

  const genai = new GoogleGenAI({ apiKey });

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
                      'Opcional: filtrar por tipo (ley, reglamento, directiva, opinion, pronunciamiento, resolucion).',
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

  let response = await chat.sendMessage({ message: question });
  let iterations = 0;
  const MAX_ITER = 5;

  while (response.functionCalls && response.functionCalls.length > 0 && iterations < MAX_ITER) {
    iterations += 1;
    console.log(`📞 Iteración ${iterations} — el modelo llama a search_normativa:`);

    const toolResponses: Array<{
      name: string;
      response: { content: string };
    }> = [];

    for (const fc of response.functionCalls) {
      if (fc.name === 'search_normativa') {
        const args = (fc.args || {}) as { query: string; filter_type?: string };
        console.log(`  • query: "${args.query}"`);
        if (args.filter_type) console.log(`  • filter_type: ${args.filter_type}`);

        const t0 = Date.now();
        const results = await searchNormativa({
          query: args.query,
          filter_type: args.filter_type ?? null,
          match_count: 5,
        });
        const elapsed = Date.now() - t0;
        console.log(`  → ${results.length} resultados en ${elapsed}ms:`);
        results.forEach((r, i) => {
          console.log(`     [${i + 1}] ${r.citation} — ${r.title.slice(0, 60)}... (sim ${r.similarity.toFixed(3)})`);
        });
        console.log('');

        const formatted = formatResultsForLLM(results);
        toolResponses.push({
          name: 'search_normativa',
          response: { content: formatted },
        });
      }
    }

    response = await chat.sendMessage({
      message: toolResponses.map((tr) => ({
        functionResponse: {
          name: tr.name,
          response: tr.response,
        },
      })),
    });
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Respuesta del Abogado Virtual:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(response.text);
  console.log('');
  console.log(`Total iteraciones de tool calling: ${iterations}`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
