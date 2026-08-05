#!/usr/bin/env tsx
/**
 * Ingesta de las OPINIONES y PRONUNCIAMIENTOS del OECE que faltaban.
 *
 * ORIGEN (05/08/2026): la biblioteca tenía 48 opiniones y 96
 * pronunciamientos, con huecos evidentes en los correlativos. La causa
 * no era gob.pe: el scraper de colecciones traía topes escritos a mano
 * —maxItems 50 y 100— y se detenía al alcanzarlos, no al agotar la
 * fuente. El censo completo de las colecciones dio:
 *
 *     opiniones         148 publicadas ·  48 en biblioteca · faltan 100
 *     pronunciamientos  451 publicadas ·  96 en biblioteca · faltan 374
 *
 * Por qué esto antes que seguir con resoluciones: el corpus está a razón
 * de 1 fragmento normativo por cada 24 de jurisprudencia, y las
 * opiniones de la Dirección Técnico Normativa son la interpretación
 * vinculante de la norma. Valen mucho más por documento que la
 * resolución número 20,000 del Tribunal.
 *
 * Reanudable, con candado de instancia única y regulador de ritmo, igual
 * que la ingesta de resoluciones.
 *
 * Requiere el censo: npx tsx scripts/censar-colecciones-oece.ts
 *
 * Uso:
 *   npx tsx scripts/ingest-opiniones-pronunciamientos.ts --limit=5  (muestra)
 *   npx tsx scripts/ingest-opiniones-pronunciamientos.ts
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readFileSync, existsSync, appendFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { generateText } from 'ai';
import { chunkText } from '../src/lib/ingestion/chunker';
import { fastModel } from '../src/lib/ai/gemini';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

const CENSO = join(process.cwd(), 'data', 'oece-colecciones.census.json');
const ESTADO = join(process.cwd(), 'data', 'oece-ingesta.state.jsonl');
const CANDADO = join(process.cwd(), 'data', 'oece-ingesta.lock');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.slice(8) || 0);

const PAUSA_MS = 900;
const PAUSA_MAX_MS = 4000;
const DESCANSO_MS = 120_000;
const UMBRAL_AMARILLO = 1800;
const UMBRAL_ROJO = 3000;
const CONSULTA_SALUD = 'plazo para perfeccionar el contrato';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Entrada {
  id: string;
  url: string;
  titulo: string;
  fecha: string | null;
}

/** Candado de instancia única: en Windows matar la consola no mata el
 *  proceso hijo, y dos ingestas simultáneas se pisan. */
function tomarCandado(): void {
  if (existsSync(CANDADO)) {
    const pid = Number(readFileSync(CANDADO, 'utf8').trim());
    let vivo = false;
    try { process.kill(pid, 0); vivo = true; } catch { vivo = false; }
    if (vivo) {
      console.error(`❌ Ya hay una ingesta corriendo (PID ${pid}).`);
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

async function medirBuscador(): Promise<number> {
  try {
    const emb = await embedBatch([CONSULTA_SALUD]);
    const muestras: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      const { error } = await supabase.rpc('hybrid_search', {
        query_text: CONSULTA_SALUD,
        query_embedding: emb[0],
        match_count: 15,
        filter_type: null,
        filter_law: null,
      });
      if (error) return -1;
      muestras.push(Date.now() - t0);
      await sleep(300);
    }
    return muestras.sort((a, b) => a - b)[1];
  } catch {
    return -1;
  }
}

async function transcribirEscaneado(buf: Buffer, ref: string): Promise<string | null> {
  if (buf.length > 18 * 1024 * 1024) return null;
  try {
    const r = await generateText({
      model: fastModel,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Transcribe FIELMENTE todo el texto de este documento legal peruano, ' +
              'respetando el orden de lectura, la numeración de artículos y numerales, ' +
              'y el contenido de las tablas. No resumas, no interpretes, no agregues ' +
              'comentarios: devuelve únicamente el texto transcrito.',
          },
          { type: 'file', data: buf, mimeType: 'application/pdf' },
        ],
      }],
      temperature: 0,
      maxTokens: 32000,
    });
    const t = (r.text || '').trim();
    return t.length >= 400 ? t : null;
  } catch (e) {
    console.log(`   ⚠️ OCR falló en ${ref}: ${(e as Error).message.slice(0, 60)}`);
    return null;
  }
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < texts.length; i += 25) {
    const slice = texts.slice(i, i + 25);
    let intento = 0;
    for (;;) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: slice.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text: text.slice(0, 8000) }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIM,
          })),
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
        for (const e of json.embeddings) out.push(e.values);
        break;
      }
      if (++intento > 4) throw new Error(`Gemini ${res.status} tras 4 intentos`);
      await sleep(3000 * intento);
    }
    await sleep(1100);
  }
  return out;
}

function anotar(id: string, estado: string, detalle = '') {
  appendFileSync(ESTADO, JSON.stringify({ id, estado, detalle }) + '\n');
}

function yaProcesados(): Set<string> {
  const s = new Set<string>();
  if (!existsSync(ESTADO)) return s;
  for (const l of readFileSync(ESTADO, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    try { s.add((JSON.parse(l) as { id: string }).id); } catch { /* ignorar */ }
  }
  return s;
}

/**
 * Correlativo de 4 dígitos a partir del título.
 *   "Opinión N° D000079-2026-OECE-DTN"     → 0079
 *   "Pronunciamiento N° 452-2026/OECE-DSAT" → 0452
 * Debe coincidir con el formato de lo ya ingerido: el orden de la
 * biblioteca es por año descendente y correlativo ascendente.
 */
function correlativoDe(titulo: string): string | null {
  const m = titulo.match(/N[°º.]?\s*D?0*(\d+)\s*-\s*(20\d{2})/i);
  return m ? m[1].padStart(4, '0') : null;
}

function anioDe(titulo: string, fecha: string | null): string | null {
  const m = titulo.match(/-\s*(20\d{2})\s*[-/]/);
  if (m) return m[1];
  return fecha ? fecha.slice(0, 4) : null;
}

/** Extrae la URL del PDF de la ficha de gob.pe. */
async function pdfDeFicha(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/https:\/\/cdn[^"']+\.pdf[^"']*/);
  return m ? m[0].replace(/\?v=\d+$/, '') : null;
}

async function main() {
  if (!existsSync(CENSO)) {
    console.error('❌ Falta el censo. Corre antes: npx tsx scripts/censar-colecciones-oece.ts');
    process.exit(1);
  }
  tomarCandado();

  const censo = JSON.parse(readFileSync(CENSO, 'utf8')) as Record<string, Entrada[]>;

  // Lo que ya está, reconocido por el id de gob.pe en source_url. Se
  // cruza contra TODOS los tipos, no solo el de la colección: la
  // "Modificación del TUPA del OECE" aparece en ambas colecciones pero
  // vive en la biblioteca como tipo 'tupa'.
  const enBiblioteca = new Set<string>();
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from('normative_documents')
      .select('source_url')
      .range(desde, desde + 999);
    if (error) throw new Error(error.message);
    const filas = (data || []) as Array<{ source_url: string | null }>;
    for (const f of filas) {
      const id = (f.source_url || '').match(/(\d+)$/)?.[1];
      if (id) enBiblioteca.add(id);
    }
    if (filas.length < 1000) break;
  }
  const procesados = yaProcesados();

  const pendientes: Array<Entrada & { tipo: string }> = [];
  for (const [clave, tipo] of [
    ['opiniones', 'opinion'],
    ['pronunciamientos', 'pronunciamiento'],
  ] as Array<[string, string]>) {
    for (const e of censo[clave] || []) {
      if (enBiblioteca.has(e.id) || procesados.has(e.id)) continue;
      // Entradas que no son de este tipo (el TUPA se cuela en ambas).
      if (!/opini[óo]n|pronunciamiento/i.test(e.titulo)) continue;
      pendientes.push({ ...e, tipo });
    }
  }
  // Más reciente primero: si se corta, lo vigente ya está dentro.
  pendientes.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const lista = LIMIT > 0 ? pendientes.slice(0, LIMIT) : pendientes;
  console.log(`En biblioteca: ${enBiblioteca.size} documentos (por id de gob.pe)`);
  console.log(`A procesar en esta corrida: ${lista.length}\n`);

  let ok = 0;
  let fallos = 0;
  let chunksTotal = 0;
  let pausaActual = PAUSA_MS;
  const t0 = Date.now();

  for (let i = 0; i < lista.length; i++) {
    const e = lista[i];
    try {
      const pdf = await pdfDeFicha(e.url);
      if (!pdf) {
        anotar(e.id, 'sin_pdf');
        fallos++;
        await sleep(pausaActual);
        continue;
      }

      const buf = Buffer.from(await (await fetch(pdf, { headers: HEADERS })).arrayBuffer());
      const doc = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(doc, { mergePages: true });
      let raw = String(text).trim();
      let viaOcr = false;
      if (raw.length < 400) {
        const ocr = await transcribirEscaneado(buf, e.titulo.slice(0, 30));
        if (!ocr) {
          anotar(e.id, 'sin_texto', `${raw.length} chars, OCR sin resultado`);
          fallos++;
          await sleep(pausaActual);
          continue;
        }
        raw = ocr;
        viaOcr = true;
      }

      const anio = anioDe(e.titulo, e.fecha);
      const correlativo = correlativoDe(e.titulo);
      const chunks = chunkText(raw);
      const embeddings = await embedBatch(chunks.map((c) => c.content));

      const { data: inserted, error } = await supabase
        .from('normative_documents')
        .insert({
          type: e.tipo,
          number: e.titulo,
          title: e.titulo,
          raw_text: raw,
          date: e.fecha,
          source_url: e.url,
          // Toda esta tanda es del régimen vigente (2025 en adelante).
          applicable_law: ['ley_32069'],
          metadata: {
            entidad: 'OECE',
            anio,
            correlativo,
            pages: doc.numPages,
            fecha_origen: 'publicación en gob.pe',
            texto_via_ocr: viaOcr || undefined,
          } as never,
        } as never)
        .select('id')
        .single();
      if (error || !inserted) {
        anotar(e.id, 'error_doc', error?.message.slice(0, 80));
        fallos++;
        await sleep(pausaActual);
        continue;
      }

      // Fragmentos con reintento; si no entran, se borra el documento
      // para no dejarlo visible en la biblioteca pero mudo para el chat.
      const filas = chunks.map((c, k) => ({
        document_id: (inserted as { id: string }).id,
        chunk_index: k,
        content: c.content,
        embedding: JSON.stringify(embeddings[k]),
        metadata: { heading: c.heading || null } as never,
      }));
      try {
        for (let k = 0; k < filas.length; k += 50) {
          const lote = filas.slice(k, k + 50) as never;
          let intento = 0;
          for (;;) {
            const { error: err } = await supabase.from('normative_chunks').insert(lote);
            if (!err) break;
            if (++intento > 3) throw new Error(err.message);
            await sleep(2000 * intento);
          }
        }
      } catch (err) {
        await supabase
          .from('normative_documents')
          .delete()
          .eq('id', (inserted as { id: string }).id);
        throw new Error(`fragmentos: ${(err as Error).message}`);
      }

      anotar(e.id, 'ok', `${filas.length} frag${viaOcr ? ' (ocr)' : ''}`);
      ok++;
      chunksTotal += filas.length;
    } catch (err) {
      anotar(e.id, 'excepcion', (err as Error).message.slice(0, 80));
      fallos++;
    }

    // Regulador de ritmo: cede ancho de banda al buscador en vez de
    // competir a ciegas o abandonar.
    if ((i + 1) % 100 === 0) {
      let ms = await medirBuscador();
      let intentos = 0;
      while ((ms < 0 || ms > UMBRAL_ROJO) && intentos < 3) {
        intentos++;
        console.log(`  🔴 buscador en ${ms < 0 ? 'error' : `${ms} ms`} — pausa ${DESCANSO_MS / 1000}s (${intentos}/3)`);
        await sleep(DESCANSO_MS);
        ms = await medirBuscador();
      }
      if (ms < 0 || ms > UMBRAL_ROJO) {
        console.log('  🔴 No recupera tras tres pausas — detengo.');
        break;
      }
      console.log(`  ${ms > UMBRAL_AMARILLO ? '🟡' : '🟢'} salud del buscador: ${ms} ms`);
      if (ms > UMBRAL_AMARILLO) pausaActual = Math.min(pausaActual + 600, PAUSA_MAX_MS);
      else if (pausaActual > PAUSA_MS) pausaActual = Math.max(pausaActual - 300, PAUSA_MS);
    }

    if ((i + 1) % 10 === 0 || i + 1 === lista.length) {
      const seg = (Date.now() - t0) / 1000;
      const porDoc = seg / (i + 1);
      console.log(
        `  ${i + 1}/${lista.length} · ok ${ok} · fallos ${fallos} · ${chunksTotal} frag · ` +
          `${porDoc.toFixed(1)}s/doc · faltan ~${(((lista.length - i - 1) * porDoc) / 60).toFixed(0)} min`,
      );
    }
    await sleep(pausaActual);
  }

  console.log(`\n✅ ${ok} ingeridos · ${fallos} omitidos · ${chunksTotal} fragmentos`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
