#!/usr/bin/env tsx
/**
 * Ingesta masiva de las RESOLUCIONES DEL TRIBUNAL censadas previamente
 * (data/tcp-index*.jsonl — 37,212 únicas de 2020 a hoy).
 *
 * Orden de trabajo: de lo MÁS RECIENTE a lo más antiguo. Si el proceso
 * se corta, lo ya ingerido es lo más valioso (régimen Ley 32069) y el
 * resto queda pendiente de forma coherente.
 *
 * Es REANUDABLE: cada resolución procesada se anota en el archivo de
 * estado, así que relanzar continúa donde quedó sin repetir trabajo ni
 * volver a gastar embeddings.
 *
 * Dedupe: clave normalizada número-año-sala, cruzada con lo que ya está
 * en la biblioteca (25 resoluciones ingeridas antes) y con lo procesado
 * en corridas anteriores.
 *
 * Uso:
 *   npx tsx scripts/ingest-resoluciones-tribunal.ts --limit=10   (muestra)
 *   npx tsx scripts/ingest-resoluciones-tribunal.ts              (todo)
 *   npx tsx scripts/ingest-resoluciones-tribunal.ts --desde=2025 (por año)
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'node:fs';
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

const ESTADO = join(process.cwd(), 'data', 'tcp-ingesta.state.jsonl');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.slice(8) || 0);
const DESDE = Number(process.argv.find((a) => a.startsWith('--desde='))?.slice(8) || 2020);
const PAUSA_MS = 900; // cortesía con gob.pe

interface IndexRow {
  key: string;
  numero: string;
  anio: number;
  sala: string;
  titulo: string;
  url: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Transcribe un PDF SIN capa de texto usando la capacidad multimodal de
 * Gemini (lee el documento como imagen).
 *
 * Antes estos PDFs se omitían, lo que dejaba huecos silenciosos en la
 * biblioteca. El Tribunal publica casi todo firmado digitalmente y con
 * texto —en las muestras de 2020 y 2026 no apareció ninguno escaneado—,
 * pero sobre 37 mil documentos conviene tener el respaldo.
 *
 * Devuelve null si la transcripción falla o sale demasiado corta, para
 * que el documento quede registrado como problema en vez de ingerirse
 * vacío.
 */
async function transcribirEscaneado(
  buf: Buffer,
  referencia: string,
): Promise<string | null> {
  // Gemini acepta PDFs en línea hasta ~20 MB.
  if (buf.length > 18 * 1024 * 1024) return null;
  try {
    const r = await generateText({
      model: fastModel,
      messages: [
        {
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
        },
      ],
      temperature: 0,
      maxTokens: 32000,
    });
    const t = (r.text || '').trim();
    return t.length >= 400 ? t : null;
  } catch (e) {
    console.log(`   ⚠️ OCR falló en ${referencia}: ${(e as Error).message.slice(0, 60)}`);
    return null;
  }
}

function cargarCenso(): IndexRow[] {
  const all = new Map<string, IndexRow>();
  for (const f of ['tcp-index.jsonl', 'tcp-index-tcp32069.jsonl']) {
    const p = join(process.cwd(), 'data', f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line) as IndexRow;
        if (!all.has(r.key)) all.set(r.key, r);
      } catch {
        /* línea corrupta */
      }
    }
  }
  return [...all.values()]
    .filter((r) => r.anio >= DESDE)
    // más reciente primero: año desc, correlativo desc
    .sort((a, b) => b.anio - a.anio || Number(b.numero.split('-')[0]) - Number(a.numero.split('-')[0]));
}

function yaProcesadas(): Set<string> {
  const s = new Set<string>();
  if (!existsSync(ESTADO)) return s;
  for (const line of readFileSync(ESTADO, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      s.add((JSON.parse(line) as { key: string }).key);
    } catch {
      /* ignorar */
    }
  }
  return s;
}

function anotar(key: string, estado: string, detalle = '') {
  appendFileSync(ESTADO, JSON.stringify({ key, estado, detalle }) + '\n');
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 25;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
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
      // 429 / 5xx → reintentar con espera creciente
      if (++intento > 4) throw new Error(`Gemini ${res.status} tras 4 intentos`);
      await sleep(3000 * intento);
    }
    await sleep(1100);
  }
  return out;
}

/** Extrae la URL del PDF y la fecha de la ficha de gob.pe. */
async function fichaResolucion(
  url: string,
): Promise<{ pdf: string | null; fecha: string | null }> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return { pdf: null, fecha: null };
  const html = await res.text();
  const pdf = (html.match(/https:\/\/cdn\.www\.gob\.pe\/[^"']+\.pdf/i) || [])[0] || null;
  const MESES: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
    agosto: 8, setiembre: 9, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  };
  const m = html.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(20\d{2})/);
  const fecha =
    m && MESES[m[2].toLowerCase()]
      ? `${m[3]}-${String(MESES[m[2].toLowerCase()]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
      : null;
  return { pdf, fecha };
}

async function main() {
  const censo = cargarCenso();
  const procesadas = yaProcesadas();

  // Cruce con lo que ya está en la biblioteca
  const { data: existentes } = await supabase
    .from('normative_documents')
    .select('number, title')
    .eq('type', 'resolucion_tce');
  const enBD = new Set<string>();
  for (const d of (existentes || []) as Array<{ number: string | null; title: string }>) {
    const m = `${d.number || ''} ${d.title}`.match(/0*(\d{1,5})\s*-+\s*(\d{4})\D*(S\d)?/i);
    if (m) enBD.add(`${m[1]}-${m[2]}-${(m[3] || 's?').toUpperCase()}`);
  }

  const pendientes = censo.filter((r) => !procesadas.has(r.key) && !enBD.has(r.key));
  const total = LIMIT > 0 ? Math.min(LIMIT, pendientes.length) : pendientes.length;

  console.log(`Censo (desde ${DESDE}): ${censo.length}`);
  console.log(`Ya en biblioteca: ${enBD.size} | ya procesadas: ${procesadas.size}`);
  console.log(`A procesar en esta corrida: ${total}\n`);

  let ok = 0;
  let fallos = 0;
  let chunksTotal = 0;
  const t0 = Date.now();

  for (let i = 0; i < total; i++) {
    const r = pendientes[i];
    try {
      const { pdf, fecha } = await fichaResolucion(r.url);
      if (!pdf) {
        anotar(r.key, 'sin_pdf');
        fallos++;
        await sleep(PAUSA_MS);
        continue;
      }

      const buf = Buffer.from(
        await (await fetch(pdf, { headers: HEADERS })).arrayBuffer(),
      );
      const doc = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(doc, { mergePages: true });
      let raw = String(text).trim();
      let viaOcr = false;
      if (raw.length < 400) {
        // Sin capa de texto → lo lee Gemini como imagen en vez de omitirlo.
        const ocr = await transcribirEscaneado(buf, r.key);
        if (!ocr) {
          anotar(r.key, 'sin_texto', `${raw.length} chars, OCR sin resultado`);
          fallos++;
          await sleep(PAUSA_MS);
          continue;
        }
        raw = ocr;
        viaOcr = true;
        console.log(`   🖼️ ${r.key} transcrito con Gemini (${raw.length} chars)`);
      }

      const chunks = chunkText(raw);
      const embeddings = await embedBatch(chunks.map((c) => c.content));

      const { data: inserted, error } = await supabase
        .from('normative_documents')
        .insert({
          type: 'resolucion_tce',
          number: `Resolución N° ${r.numero}-${r.sala}`,
          title: `Resolución N° ${r.numero}-${r.sala} (Tribunal de Contrataciones)`,
          raw_text: raw,
          date: fecha || `${r.anio}-01-01`,
          source_url: r.url,
          // El Tribunal aplica la ley vigente al momento del procedimiento.
          applicable_law: r.anio >= 2025 ? ['ley_32069'] : ['ley_30225'],
          metadata: {
            entidad: 'OECE',
            anio: String(r.anio),
            correlativo: r.numero.split('-')[0].padStart(4, '0'),
            sala: r.sala,
            fecha_origen: fecha ? 'publicación en gob.pe' : 'año del número',
            // Deja rastro de que el texto vino de OCR y no de la capa
            // del PDF, por si hay que revisar su fidelidad después.
            texto_via_ocr: viaOcr || undefined,
          } as never,
        } as never)
        .select('id')
        .single();
      if (error || !inserted) {
        anotar(r.key, 'error_doc', error?.message.slice(0, 80));
        fallos++;
        await sleep(PAUSA_MS);
        continue;
      }

      const filas = chunks.map((c, k) => ({
        document_id: (inserted as { id: string }).id,
        chunk_index: k,
        content: c.content,
        embedding: JSON.stringify(embeddings[k]),
        metadata: { heading: c.heading || null } as never,
      }));
      for (let k = 0; k < filas.length; k += 50) {
        const { error: e } = await supabase
          .from('normative_chunks')
          .insert(filas.slice(k, k + 50) as never);
        if (e) throw new Error(e.message);
      }

      anotar(r.key, 'ok', `${filas.length} frag${viaOcr ? ' (ocr)' : ''}`);
      ok++;
      chunksTotal += filas.length;
    } catch (e) {
      anotar(r.key, 'excepcion', (e as Error).message.slice(0, 80));
      fallos++;
    }

    if ((i + 1) % 10 === 0 || i + 1 === total) {
      const seg = (Date.now() - t0) / 1000;
      const porDoc = seg / (i + 1);
      const restan = ((total - i - 1) * porDoc) / 60;
      console.log(
        `  ${i + 1}/${total} · ok ${ok} · fallos ${fallos} · ${chunksTotal} frag · ` +
          `${porDoc.toFixed(1)}s/doc · faltan ~${restan.toFixed(0)} min`,
      );
    }
    await sleep(PAUSA_MS);
  }

  console.log(`\n✅ ${ok} ingeridas · ${fallos} omitidas · ${chunksTotal} fragmentos`);
  if (ok > 0) {
    console.log(`   promedio ${(chunksTotal / ok).toFixed(1)} fragmentos por resolución`);
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
