/**
 * Test E2E del GENERADOR contra el caso real de César (24/07/2026):
 * - 3 PDFs de la carpeta "fuente - devolución de requerimiento"
 *   (memorándum UTI + TDR transmisión de datos + disposiciones
 *   contratos menores SUNARP)
 * - El prompt EXACTO de PROMPT.docx
 * - Score contra la respuesta modelo (informe técnico completo)
 *
 * Flujo idéntico al de /api/generator-chat: sube PDFs a Gemini Files
 * API, arma system prompt del perfil + formato administrativo + RAG,
 * llama a gemini-3.6-flash.
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { readFileSync } from 'fs';
import { generateText } from 'ai';
import { generatorModel } from '../src/lib/ai/gemini';
import {
  uploadFileToGemini,
  deleteGeminiFile,
  type GeminiFile,
} from '../src/lib/ai/gemini-files';
import {
  GENERATOR_PERFILES,
  FORMATO_DOCUMENTO_ADMINISTRATIVO,
} from '../src/lib/ai/generator-perfiles';

const PROMPT_CESAR = `Quiero que proyectes un informe como especialista de abastecimiento dirigido al jefe de la unidad de administración. En dicho informe debe indicar que todo requerimiento debe ser presentado con anticipación, por lo menos con una anticipación no menor a diez (10) días calendario a la fecha de la necesidad prevista, esto de acuerdo a las disposiciones de contratos menores de la sunarp.

Asimismo, debe recomendar que el área usuaria pueda determinar el plazo de ejecución del servicio considerando el plazo de mudanza del inmueble actual al inmueble (local) recientemente alquilado, dado que contar con un servicio de transmisión de datos hasta 31 de agosto cuando la mudanza se ha previsto aproximadamente entre la primera y segunda semana no resultaría factible que esta contratación sea mayor al tiempo de operatividad en el actual inmueble.

Por otro lado, considerando que el tiempo de contratación es corto, recomendar al jefe de la unidad de administración que pueda evaluar otro mecanismo de contratación tales como el pago por los días prestados del servicio mediante una caja chica, fondo por encargo y/u otros mecanismos o caso contrario evaluar la posibilidad de que la mudanza se efectúe durante los feriados del 25 al 29 de julio de 2026.`;

const FILES = [
  {
    path: 'fuente - devolución de requerimiento/MEMORANDUM No 00299-2026-SUNARP_ZRXIV_UTI.pdf',
    name: 'MEMORANDUM No 00299-2026-SUNARP_ZRXIV_UTI.pdf',
  },
  {
    path: 'fuente - devolución de requerimiento/TDR. Servicio de Transmision de datos vf[F].pdf',
    name: 'TDR Servicio de Transmision de datos.pdf',
  },
  {
    path: 'fuente - devolución de requerimiento/TEXTO FINAL DISPOSICIONES CONTRATOS MENORES - AL 07MAYO2025-MODIF OA (VF)[F] (1).pdf',
    name: 'Disposiciones Contratos Menores SUNARP.pdf',
  },
];

// Puntos clave de la respuesta modelo de César
const KEY_POINTS: Array<{ desc: string; patterns: RegExp[]; critical?: boolean }> = [
  { desc: 'Formato INFORME con encabezado (PARA/DE/ASUNTO)', patterns: [/PARA\s*:/i], critical: true },
  { desc: 'Campo REFERENCIA', patterns: [/REFERENCIA\s*:/i], critical: true },
  { desc: 'Anticipación 10 días calendario', patterns: [/diez\s*\(?10\)?\s*d[íi]as\s+calendario|10\s+d[íi]as\s+calendario/i], critical: true },
  { desc: 'Cita disposiciones contratos menores (norma interna)', patterns: [/disposicion(?:es)?\s+.*contratos?\s+menores/i], critical: true },
  { desc: 'Numeral 8.2 de las disposiciones (leído del PDF)', patterns: [/8\.2/] },
  { desc: 'Incumplimiento del plazo detectado (4 días vs 10)', patterns: [/contraviene|incumple|no\s+cumple|inobservancia/i], critical: true },
  { desc: 'Análisis de mudanza vs plazo de servicio', patterns: [/mudanza|traslado/i], critical: true },
  { desc: 'No factible contratar más allá de operatividad', patterns: [/no\s+resulta(?:r[íi]a)?\s+(?:t[ée]cnicamente\s+)?factible|gasto\s+ineficiente|operatividad/i], critical: true },
  { desc: 'Valor por dinero', patterns: [/valor\s+por\s+dinero/i] },
  { desc: 'Caja chica como mecanismo alternativo', patterns: [/caja\s+chica/i], critical: true },
  { desc: 'Fondo por encargo', patterns: [/fondos?\s+por\s+encargo/i], critical: true },
  { desc: 'Mudanza en feriados 25-29 julio', patterns: [/feriados?.*25.*29|25\s+al\s+29\s+de\s+julio/i], critical: true },
  { desc: 'Secciones romanas (I. II. III.)', patterns: [/^#{0,3}\s*I+\.\s+[A-ZÁÉÍÓÚ]/m], critical: true },
  { desc: 'Numeración decimal (1.1, 2.1...)', patterns: [/\d\.\d\.?\s+[A-ZÁÉÍÓÚE]/], critical: true },
  { desc: 'Recomendaciones accionables', patterns: [/RECOMENDACION|recomienda/i], critical: true },
  { desc: 'Cierre formal (Atentamente)', patterns: [/atentamente/i] },
];

async function main() {
  const uploaded: GeminiFile[] = [];
  try {
    console.log('1. Subiendo los 3 PDFs reales a Gemini Files API...');
    for (const f of FILES) {
      const buf = readFileSync(f.path);
      const up = await uploadFileToGemini(buf, 'application/pdf', f.name);
      uploaded.push(up);
      console.log(`   ✅ ${f.name} (${(buf.length / 1024).toFixed(0)} KB) → ${up.name}`);
    }

    // System prompt idéntico al del route (perfil DEC = especialista de
    // abastecimiento pertenece a la dependencia encargada de contrataciones)
    const perfil = GENERATOR_PERFILES.dec;
    const systemPrompt = `${perfil.systemPrompt}

═══════════════════════════════════════════════════════
INSTRUCCIONES DEL GENERADOR
═══════════════════════════════════════════════════════
El usuario está en un chat conversacional. Cuando pida redactar un
documento (memorando, oficio, informe, resolución, TDR, EETT, descargo,
etc.), produce el documento COMPLETO en formato markdown, listo para
copiar.
${FORMATO_DOCUMENTO_ADMINISTRATIVO}
═══════════════════════════════════════════════════════
DOCUMENTOS ADJUNTOS DEL USUARIO (3)
═══════════════════════════════════════════════════════
El usuario adjuntó los siguientes archivos como CONTEXTO específico:
  1. MEMORANDUM No 00299-2026 (requerimiento de la UTI)
  2. TDR Servicio de Transmision de datos
  3. Disposiciones Contratos Menores de la entidad

Estos documentos son la fuente principal del caso concreto.`;

    console.log('\n2. Generando informe con gemini-3.6-flash...');
    const start = Date.now();
    const result = await generateText({
      model: generatorModel,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT_CESAR },
            ...uploaded.map((f) => ({
              type: 'file' as const,
              data: new URL(f.uri),
              mimeType: f.mimeType,
            })),
          ],
        },
      ],
      temperature: 0.3,
    });
    const ms = Date.now() - start;
    const text = result.text;
    console.log(`   ✅ ${ms}ms | ${text.length} chars | tokens in=${result.usage?.promptTokens} out=${result.usage?.completionTokens}`);
    console.log(`   finishReason: ${result.finishReason}`);

    // Score
    let earned = 0;
    let possible = 0;
    const misses: string[] = [];
    for (const kp of KEY_POINTS) {
      const w = kp.critical ? 2 : 1;
      possible += w;
      if (kp.patterns.some((rx) => rx.test(text))) earned += w;
      else misses.push(kp.desc + (kp.critical ? ' ⚠️CRÍTICO' : ''));
    }
    const pct = Math.round((earned / possible) * 100);

    console.log('\n═'.repeat(35));
    console.log(`SCORE: ${pct}% (${KEY_POINTS.length - misses.length}/${KEY_POINTS.length} puntos)`);
    if (misses.length) {
      console.log('FALTARON:');
      misses.forEach((m) => console.log('  ✗', m));
    }
    console.log('\n--- DOCUMENTO GENERADO (primeras 60 líneas) ---');
    console.log(text.split('\n').slice(0, 60).join('\n'));
  } finally {
    console.log('\n3. Cleanup...');
    for (const f of uploaded) {
      await deleteGeminiFile(f.name).catch(() => {});
    }
    console.log('   ✅ Files eliminados de Gemini');
  }
}

main().catch(console.error);
