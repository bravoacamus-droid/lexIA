#!/usr/bin/env tsx
/**
 * Reproduce el error "[generator-chat] Request contains an invalid
 * argument" que reporta César.
 *
 * Es un 400 INVALID_ARGUMENT de la API de Gemini, no un fallo de LexIA,
 * así que hay que aislar cuál de las piezas del turno lo provoca. Se
 * prueban por separado, de la más simple a la real:
 *
 *   1. El modelo a secas, sin nada más.
 *   2. El modelo con los safety settings que usa el generador.
 *   3. El modelo con un system prompt largo, como el que arma la ruta.
 *   4. El historial con un mensaje vacío, que es la causa clásica.
 *
 * La que falle señala el culpable.
 *
 * Uso: npx tsx scripts/diagnosticar-generator-chat.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { generateText, streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

config({ path: join(process.cwd(), '.env.local'), override: true });

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_HATE_SPEECH' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY' as const, threshold: 'BLOCK_NONE' as const },
];

/** El prompt exacto que disparó el error, tomado de la captura. */
const PROMPT_DE_CESAR =
  'Redacta un TDR (Términos de Referencia) completo para el servicio que te describa a continuación. Incluye antecedentes, objeto, finalidad pública, actividades, perfil del proveedor, entregables, cronograma, garantías y penalidades. Servicio a contratar:';

async function probar(
  nombre: string,
  fn: () => Promise<unknown>,
): Promise<boolean> {
  process.stdout.write(`  ${nombre.padEnd(58)} `);
  try {
    await fn();
    console.log('✅');
    return true;
  } catch (e) {
    const msg = (e as Error).message.replace(/\s+/g, ' ').slice(0, 130);
    console.log(`❌ ${msg}`);
    return false;
  }
}

async function main() {
  const modelos = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];

  console.log('── El modelo responde, sin adornos ──');
  for (const id of modelos) {
    await probar(`${id} · sin safety settings`, () =>
      generateText({ model: google(id), prompt: 'Di "ok".', temperature: 0.3 }),
    );
  }

  console.log('\n── Con los safety settings del generador ──');
  for (const id of modelos) {
    await probar(`${id} · con los cinco safety settings`, () =>
      generateText({
        model: google(id, { safetySettings: SAFETY }),
        prompt: 'Di "ok".',
        temperature: 0.3,
      }),
    );
    // CIVIC_INTEGRITY no está soportado en todos los modelos y es una
    // causa conocida de INVALID_ARGUMENT. Se prueba sin él.
    await probar(`${id} · sin HARM_CATEGORY_CIVIC_INTEGRITY`, () =>
      generateText({
        model: google(id, { safetySettings: SAFETY.slice(0, 4) }),
        prompt: 'Di "ok".',
        temperature: 0.3,
      }),
    );
  }

  console.log('\n── El turno real del generador ──');
  const modelo = google('gemini-3.6-flash', { safetySettings: SAFETY });

  await probar('mensaje único del usuario, como en la captura', () =>
    generateText({
      model: modelo,
      system: 'Eres LexIA, asistente en contrataciones del Estado peruano.',
      messages: [{ role: 'user', content: PROMPT_DE_CESAR }],
      temperature: 0.3,
    }),
  );

  await probar('historial con un mensaje del asistente VACÍO', () =>
    generateText({
      model: modelo,
      system: 'Eres LexIA.',
      messages: [
        { role: 'user', content: PROMPT_DE_CESAR },
        { role: 'assistant', content: '' },
      ],
      temperature: 0.3,
    }),
  );

  await probar('historial con un mensaje del usuario VACÍO', () =>
    generateText({
      model: modelo,
      system: 'Eres LexIA.',
      messages: [{ role: 'user', content: '' }],
      temperature: 0.3,
    }),
  );

  await probar('system prompt de 40 000 caracteres', () =>
    generateText({
      model: modelo,
      system: 'Eres LexIA. ' + 'Contexto normativo de referencia. '.repeat(1200),
      messages: [{ role: 'user', content: PROMPT_DE_CESAR }],
      temperature: 0.3,
    }),
  );

  // ── Lo que realmente hace la ruta ───────────────────────────────────
  // El prefijo "[generator-chat]" del error solo lo pone
  // toDataStreamResponse, así que el fallo ocurre en streamText y no en
  // otra pieza del turno. Hay que reproducirlo con streamText y con el
  // system prompt real, no con uno de relleno.
  console.log('\n── streamText con el system prompt real ──');

  const { GENERATOR_PERFILES, FORMATO_DOCUMENTO_ADMINISTRATIVO, ESTRUCTURAS_MODELO } =
    await import('../src/lib/ai/generator-perfiles');

  const perfil = GENERATOR_PERFILES['area_usuaria'];
  const systemReal = `${perfil.systemPrompt}\n${FORMATO_DOCUMENTO_ADMINISTRATIVO}\n${
    ESTRUCTURAS_MODELO['area_usuaria'] ?? ''
  }`;
  console.log(`  (system prompt real: ${systemReal.length.toLocaleString('es-PE')} caracteres)`);

  await probar('streamText · perfil area_usuaria · prompt de César', async () => {
    const r = streamText({
      model: modelo,
      system: systemReal,
      messages: [{ role: 'user', content: PROMPT_DE_CESAR }],
      temperature: 0.3,
    });
    // El error de Gemini no aparece hasta que se consume el stream.
    let n = 0;
    for await (const _ of r.textStream) n++;
    if (n === 0) throw new Error('el stream no emitió nada');
  });

  await probar('streamText · dos mensajes seguidos del usuario', async () => {
    const r = streamText({
      model: modelo,
      system: systemReal,
      messages: [
        { role: 'user', content: PROMPT_DE_CESAR },
        { role: 'user', content: 'Servicio de limpieza para la sede central.' },
      ],
      temperature: 0.3,
    });
    let n = 0;
    for await (const _ of r.textStream) n++;
    if (n === 0) throw new Error('el stream no emitió nada');
  });

  await probar('streamText · con un file part de URI inventado', async () => {
    const r = streamText({
      model: modelo,
      system: systemReal,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT_DE_CESAR },
            {
              type: 'file',
              data: new URL('https://generativelanguage.googleapis.com/v1beta/files/inexistente'),
              mimeType: 'application/pdf',
            },
          ],
        },
      ] as never,
      temperature: 0.3,
    });
    // Se propaga el error real de Gemini, no un genérico: el mensaje
    // exacto es lo que hay que comparar con el que ve César.
    let n = 0;
    try {
      for await (const _ of r.textStream) n++;
    } catch (e) {
      throw new Error(`Gemini respondió: ${(e as Error).message}`);
    }
    const err = await r.experimental_providerMetadata?.catch?.(() => null);
    if (n === 0) throw new Error(`stream vacío. metadata: ${JSON.stringify(err)?.slice(0, 200)}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
