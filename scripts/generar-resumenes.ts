#!/usr/bin/env tsx
/**
 * Genera los resúmenes IA que faltan, por lotes.
 *
 * Hasta ahora se generaban SOLO bajo demanda, al abrir un documento en la
 * biblioteca. Con 18,691 documentos y 305 resúmenes, las fichas se veían
 * vacías y el indicador de cobertura marcaba 2%.
 *
 * Medido antes de lanzarlo, con muestra real de 14 documentos y los
 * tokens que reporta el propio modelo:
 *     mediana 1.7 s por documento · 5,210 tokens entrada · 336 salida
 *     normativa (3,012 docs)  ~15.7 M tokens  ~US$ 7
 *     todo     (18,386 docs)  ~95.8 M tokens  ~US$ 44
 *
 * Reanudable: solo toma documentos con ai_summary nulo, así que relanzar
 * continúa donde quedó. No hace falta archivo de estado.
 *
 * Orden: primero la normativa y al final las resoluciones del Tribunal.
 * Son el 84% del total y las que menos se abren; si hay que cortar, se
 * corta por ahí.
 *
 * Uso:
 *   npx tsx scripts/generar-resumenes.ts --solo-normativa
 *   npx tsx scripts/generar-resumenes.ts                  (todo)
 *   npx tsx scripts/generar-resumenes.ts --limit=50       (muestra)
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { generateDocumentSummary } from '../src/lib/ai/document-summary';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const CANDADO = join(process.cwd(), 'data', 'resumenes.lock');
const SOLO_NORMATIVA = process.argv.includes('--solo-normativa');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.slice(8) || 0);
/** Cuántos documentos a la vez. Más allá de esto Gemini empieza a
 *  devolver límite de peticiones y el reintento cuesta más que el
 *  paralelismo que gana. */
const CONCURRENCIA = 4;
const LOTE = 200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Candado de instancia única: en Windows cerrar la consola no mata el
 *  proceso hijo, y dos corridas a la vez duplican el gasto en tokens. */
function tomarCandado(): void {
  if (existsSync(CANDADO)) {
    const pid = Number(readFileSync(CANDADO, 'utf8').trim());
    let vivo = false;
    try { process.kill(pid, 0); vivo = true; } catch { vivo = false; }
    if (vivo) {
      console.error(`❌ Ya hay una generación corriendo (PID ${pid}).`);
      process.exit(1);
    }
    console.log(`⚠️ Candado huérfano del PID ${pid} — se libera.`);
  }
  writeFileSync(CANDADO, String(process.pid));
  const soltar = () => { try { unlinkSync(CANDADO); } catch { /* ya no está */ } };
  process.on('exit', soltar);
  process.on('SIGINT', () => { soltar(); process.exit(130); });
  process.on('SIGTERM', () => { soltar(); process.exit(143); });
}

interface Doc {
  id: string;
  type: string;
  number: string | null;
  title: string;
  texto: string | null;
}

/**
 * Pide los pendientes con el texto YA TRUNCADO en el servidor.
 *
 * Traer raw_text completo hacía que la corrida avanzara 15 documentos
 * cada 10 minutos: ese campo llega a 567 mil caracteres en la Ley y un
 * lote de 200 arrastraba decenas de megabytes que el generador iba a
 * descartar de todos modos, porque trunca a 24,000 antes de enviar nada
 * al modelo. Ver migración 0048.
 */
async function siguienteLote(): Promise<Doc[]> {
  const { data, error } = await supabase.rpc('documentos_sin_resumen', {
    limite: LOTE,
    excluir_tce: SOLO_NORMATIVA,
    max_chars: 24000,
  });
  if (error) throw new Error(error.message);
  return (data || []) as Doc[];
}

async function procesar(d: Doc): Promise<{ ok: boolean; tokIn: number; tokOut: number }> {
  // Sin texto no hay resumen posible. Sin esta guarda, un fallo al traer
  // el contenido produce resúmenes que dicen "el documento se encuentra
  // vacío" y quedan guardados como si fueran buenos: el 10/08/2026 se
  // escribieron 20 así por usar el nombre de campo equivocado, y solo se
  // detectaron al leerlos. Es peor que no tener resumen, porque nada
  // avisa de que están mal.
  if ((d.texto || '').trim().length < 200) {
    return { ok: false, tokIn: 0, tokOut: 0 };
  }
  try {
    // Tiempo límite por documento.
    //
    // Sin esto la corrida se cuelga entera: los documentos se procesan de
    // a cuatro con Promise.all, y una sola llamada que no responda deja
    // al grupo esperando para siempre. Pasó el 10/08/2026 en el
    // documento 3,200 —el proceso seguía vivo, el registro congelado y
    // la base sin avanzar en dos minutos— y ya se había visto en la
    // medición inicial, donde una opinión tardó 5 minutos.
    //
    // 90 segundos es holgado: una llamada normal tarda 2 o 3.
    const r = await Promise.race([
      generateDocumentSummary({
        type: d.type,
        number: d.number,
        title: d.title,
        raw_text: d.texto || '',
      }),
      new Promise<never>((_, rechazar) =>
        setTimeout(() => rechazar(new Error('tiempo agotado')), 90_000),
      ),
    ]);
    if (!r.summary) return { ok: false, tokIn: 0, tokOut: 0 };
    const { error } = await supabase
      .from('normative_documents')
      .update({
        ai_summary: r.summary,
        ai_summary_generated_at: new Date().toISOString(),
        ai_summary_model: r.model,
      } as never)
      .eq('id', d.id);
    if (error) return { ok: false, tokIn: r.tokens.in, tokOut: r.tokens.out };
    return { ok: true, tokIn: r.tokens.in, tokOut: r.tokens.out };
  } catch {
    return { ok: false, tokIn: 0, tokOut: 0 };
  }
}

async function main() {
  tomarCandado();

  const { count: pendientes } = await supabase
    .from('normative_documents')
    .select('*', { count: 'exact', head: true })
    .is('ai_summary', null)
    .then((r) => (SOLO_NORMATIVA ? r : r));
  console.log(`Pendientes: ${pendientes}${SOLO_NORMATIVA ? ' (se procesa solo normativa)' : ''}\n`);

  let ok = 0;
  let fallos = 0;
  let tokIn = 0;
  let tokOut = 0;
  let fallosSeguidos = 0;
  const t0 = Date.now();

  for (;;) {
    const lote = await siguienteLote();
    if (lote.length === 0) break;
    const trozo = LIMIT > 0 ? lote.slice(0, Math.max(LIMIT - ok - fallos, 0)) : lote;
    if (trozo.length === 0) break;

    for (let i = 0; i < trozo.length; i += CONCURRENCIA) {
      const grupo = trozo.slice(i, i + CONCURRENCIA);
      const res = await Promise.all(grupo.map(procesar));
      for (const r of res) {
        if (r.ok) ok++; else fallos++;
        tokIn += r.tokIn;
        tokOut += r.tokOut;
      }
      // Corte por fallos seguidos.
      //
      // Cuando se agotó el saldo de Gemini el 10/08/2026, la corrida
      // siguió girando: un documento que falla conserva el resumen
      // vacío, así que el siguiente lote devolvía los mismos y los
      // reintentaba sin fin. Llegó a 2,130 fallos fingiendo que
      // trabajaba. Ahora se detiene y lo dice.
      fallosSeguidos = res.every((r) => !r.ok) ? fallosSeguidos + res.length : 0;
      if (fallosSeguidos >= 40) {
        console.error(
          `\n❌ ${fallosSeguidos} fallos seguidos — se detiene. ` +
            'Suele ser saldo agotado en Gemini; revisa AI Studio.',
        );
        break;
      }

      const hechos = ok + fallos;
      if (hechos % 40 < CONCURRENCIA) {
        const seg = (Date.now() - t0) / 1000;
        const usd = (tokIn / 1e6) * 0.30 + (tokOut / 1e6) * 2.50;
        console.log(
          `  ${ok} ok · ${fallos} fallos · ${(seg / hechos).toFixed(2)} s/doc · ` +
            `${(tokIn / 1e6).toFixed(2)}M tokens · ~US$ ${usd.toFixed(2)}`,
        );
      }
      await sleep(300);
    }
    if (LIMIT > 0 && ok + fallos >= LIMIT) break;
  }

  const usd = (tokIn / 1e6) * 0.30 + (tokOut / 1e6) * 2.50;
  console.log(`\n✅ ${ok} resúmenes · ${fallos} fallos · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  console.log(`   ${(tokIn / 1e6).toFixed(2)}M tokens entrada · ${(tokOut / 1e6).toFixed(2)}M salida · ~US$ ${usd.toFixed(2)}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
