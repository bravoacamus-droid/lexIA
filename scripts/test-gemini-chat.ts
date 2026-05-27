#!/usr/bin/env tsx
/**
 * Reproduce localmente la llamada exacta que falla en /api/chat,
 * usando el mismo modelo y el mismo SDK.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

import { generateText, streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
if (!KEY) {
  console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
  process.exit(1);
}

const google = createGoogleGenerativeAI({ apiKey: KEY });

const MODELS_TO_TEST = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-pro',
];

async function main() {
  console.log(`Probando ${MODELS_TO_TEST.length} modelos con la API key...\n`);

  for (const id of MODELS_TO_TEST) {
    process.stdout.write(`  ${id.padEnd(30)} `);
    try {
      const { text } = await generateText({
        model: google(id),
        prompt: 'Di solo "ok"',
        maxTokens: 10,
      });
      console.log(`OK -> "${text.replace(/\n/g, ' ').slice(0, 30)}"`);
    } catch (err) {
      const e = err as Error;
      console.log(`FAIL -> ${e.name}: ${e.message.slice(0, 200)}`);
    }
  }

  console.log('\n--- Probando streamText (como hace /api/chat) ---');
  try {
    const result = streamText({
      model: google('gemini-flash-latest'),
      system: 'Eres un asistente. Responde corto.',
      messages: [{ role: 'user', content: '¿Qué es la subsanación de ofertas?' }],
      temperature: 0.3,
    });
    let collected = '';
    for await (const chunk of result.textStream) {
      collected += chunk;
    }
    console.log(`streamText OK (${collected.length} chars):`);
    console.log(`"${collected.slice(0, 200)}..."`);
  } catch (err) {
    const e = err as Error;
    console.log(`streamText FAIL -> ${e.name}: ${e.message}`);
    if (e.stack) console.log('Stack:', e.stack.split('\n').slice(0, 5).join('\n'));
  }
}

main().catch(console.error);
