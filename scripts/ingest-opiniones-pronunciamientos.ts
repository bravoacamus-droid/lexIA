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
/** Censo completo de la colección de pronunciamientos (248 páginas). */
const CENSO_PRON = join(process.cwd(), 'data', 'pronunciamientos.census.json');
/** Año mínimo a ingerir de ese censo. */
const DESDE_ANIO = Number(process.argv.find((a) => a.startsWith('--desde='))?.slice(8) || 2024);
/** Censo de las opiniones anteriores a 2025 (fuera de colección). */
const CENSO_OPIN_ANT = join(process.cwd(), 'data', 'opiniones-antiguas.census.json');
/** Año mínimo de opiniones antiguas; 0 las desactiva. */
const DESDE_OPINION = Number(
  process.argv.find((a) => a.startsWith('--opiniones-desde='))?.slice(18) || 0,
);
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

/**
 * Quita del texto extraído los caracteres de control que Postgres no
 * acepta.
 *
 * Algunos PDFs del OECE traen bytes nulos en su capa de texto. Al viajar
 * como JSON llegan a Postgres como un escape que rechaza —"unsupported
 * Unicode escape sequence"— y tumba la inserción del documento entero:
 * 10 de los primeros 245 (4%) se perdían por esto.
 *
 * Se comparan códigos en vez de usar una expresión regular con escapes
 * para que el archivo fuente no tenga que contener caracteres de control
 * literales. Se conservan tabulación, salto de línea y retorno de carro,
 * que sí forman parte del contenido.
 */
function limpiarTexto(s: string): string {
  let salida = '';
  let inicio = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 31 || c === 9 || c === 10 || c === 13) continue;
    salida += s.slice(inicio, i);
    inicio = i + 1;
  }
  return inicio === 0 ? s : salida + s.slice(inicio);
}

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

/**
 * Entidad emisora, leída del propio título.
 *
 * No se puede fijar en "OECE": ese organismo existe desde 2025. Los
 * pronunciamientos de 2023 y 2024 los emitió el OSCE, y sus títulos lo
 * dicen ("Pronunciamiento N° 686-2024/OSCE-DGR"). Con la entidad fija se
 * habrían etiquetado mal unos 1,266 documentos, y el filtro por entidad
 * de la biblioteca —OECE, Perú Compras, DGA— habría mentido.
 */
function entidadDe(titulo: string, fecha?: string | null): string {
  // Sin \b a propósito: gob.pe publica títulos con la separación comida,
  // como "Pronunciamiento N° 404-2023OSCE-DGR". Con límite de palabra
  // ese caso no calzaba —entre "3" y "O" no hay frontera— y el documento
  // quedaba atribuido al OECE, que en 2023 no existía.
  if (/OSCE/i.test(titulo)) return 'OSCE';
  if (/OECE/i.test(titulo)) return 'OECE';
  if (/per[uú]\s*compras/i.test(titulo)) return 'Perú Compras';
  // Muchas opiniones antiguas se titulan solo "Opinión N° 051-2022/DTN",
  // sin nombrar al organismo. Ahí decide la fecha: el OECE reemplazó al
  // OSCE con la entrada en vigor de la Ley 32069. Sin esta regla, 548
  // opiniones de 2020 a 2024 quedaban atribuidas a un organismo que aún
  // no existía.
  if (fecha) return fecha < VIGENCIA_32069 ? 'OSCE' : 'OECE';
  return 'OECE';
}

function anioDe(titulo: string, fecha: string | null): string | null {
  const m = titulo.match(/-\s*(20\d{2})\s*[-/]/);
  if (m) return m[1];
  return fecha ? fecha.slice(0, 4) : null;
}

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', setiembre: '09', septiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
};

/**
 * Entrada en vigor de la Ley 32069. Lo anterior se rige por la 30225.
 *
 * Se decide por la FECHA y no por el año: los pronunciamientos de enero a
 * abril de 2025 son del régimen anterior aunque compartan año con los de
 * mayo en adelante. Marcarlos mal haría que el selector de régimen —lo
 * que César pidió expresamente para no mezclar— mostrara doctrina
 * derogada como vigente.
 */
const VIGENCIA_32069 = '2025-04-22';

function regimenDe(fecha: string | null): string[] {
  if (!fecha) return ['ley_32069'];
  return fecha < VIGENCIA_32069 ? ['ley_30225'] : ['ley_32069'];
}

/**
 * Descarga con reintentos y espera creciente.
 *
 * Sin esto, un rechazo pasajero de gob.pe —normal al pedir cientos de
 * páginas seguidas— quedaba anotado como "sin PDF" para siempre, porque
 * el archivo de estado da el documento por procesado. El 07/08/2026 eso
 * costó 6 de los primeros 20: al revisarlos a mano, las fichas
 * respondían bien y el PDF estaba donde debía.
 */
/** Fallos de descarga seguidos. Alimenta el freno de más abajo. */
let seguidosSinDescarga = 0;

async function traer(url: string, intentos = 6): Promise<Response | null> {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS });
      if (r.ok) { seguidosSinDescarga = 0; return r; }
      // 4xx que no sea límite de peticiones: no insistir, no hay nada ahí.
      if (r.status < 500 && r.status !== 429) return null;
    } catch {
      /* red inestable: se reintenta */
    }
    await sleep(3000 * (i + 1));
  }
  seguidosSinDescarga++;
  return null;
}

/**
 * Freno cuando gob.pe deja de responder de forma sostenida.
 *
 * Los reintentos por documento no bastan si el bloqueo dura minutos: el
 * 08/08/2026 se perdieron 42 documentos seguidos por esto. Se comprobó
 * después uno por uno —los diez revisados tenían su PDF donde debía—,
 * así que no faltaban: faltaba dejar de insistir un rato.
 *
 * Mismo patrón que el regulador del buscador: cuando el recurso empuja
 * de vuelta, se cede terreno en vez de seguir golpeando.
 */
async function frenarSiLaFuenteSeCierra(): Promise<void> {
  if (seguidosSinDescarga < 3) return;
  console.log(`  ⏸️ ${seguidosSinDescarga} descargas fallidas seguidas — pausa de 5 min`);
  await sleep(300_000);
  seguidosSinDescarga = 0;
}

/** Extrae del HTML de la ficha el PDF, el título y la fecha. */
async function leerFicha(
  url: string,
): Promise<{ pdf: string | null; titulo: string | null; fecha: string | null }> {
  const res = await traer(url);
  if (!res) return { pdf: null, titulo: null, fecha: null };
  const html = await res.text();

  // Insensible a mayúsculas: gob.pe sirve algunos como ".PDF" y sin la
  // bandera /i esos documentos quedaban registrados como "sin PDF"
  // aunque el archivo estuviera ahí (ej. Pronunciamiento N° 182-2025).
  const p = html.match(/https:\/\/cdn[^"']+\.pdf[^"']*/i);
  const pdf = p ? p[0].replace(/\?v=\d+$/, '') : null;

  const t = html.match(/<title>([^<]+)<\/title>/);
  const titulo = t
    ? t[1].split(' - Informes')[0].split(' - Plataforma')[0].trim()
    : null;

  const f = html.match(/(\d{1,2})\s+de\s+([a-zñáéíóú]+)\s+de\s+(20\d{2})/i);
  const mes = f ? MESES[f[2].toLowerCase()] : null;
  const fecha = f && mes ? `${f[3]}-${mes}-${String(f[1]).padStart(2, '0')}` : null;

  return { pdf, titulo, fecha };
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

  const pendientes: Array<Entrada & { tipo: string; orden: string }> = [];

  // Fuente 1 — colecciones de opiniones y pronunciamientos (2025-2026).
  for (const [clave, tipo] of [
    ['opiniones', 'opinion'],
    ['pronunciamientos', 'pronunciamiento'],
  ] as Array<[string, string]>) {
    for (const e of censo[clave] || []) {
      if (enBiblioteca.has(e.id) || procesados.has(e.id)) continue;
      // Entradas que no son de este tipo (el TUPA se cuela en ambas).
      if (!/opini[óo]n|pronunciamiento/i.test(e.titulo)) continue;
      pendientes.push({ ...e, tipo, orden: e.fecha || '0000' });
    }
  }

  // Fuente 3 — opiniones anteriores a 2025, que no están en ninguna
  // colección y solo se alcanzan por el buscador de gob.pe. Ver
  // censar-opiniones-antiguas.ts.
  //
  // Todas son del régimen de la Ley 30225 y las emitió el OSCE, pero eso
  // no se fija a mano: la entidad sale del título y el régimen de la
  // fecha, igual que en las otras fuentes. Así un documento raro con
  // fecha posterior no queda mal clasificado por una suposición.
  if (existsSync(CENSO_OPIN_ANT)) {
    const antiguas = JSON.parse(readFileSync(CENSO_OPIN_ANT, 'utf8')) as Array<{
      id: string; slug: string; url: string; numero: string | null; anio: string | null;
    }>;
    const yaEnLista2 = new Set(pendientes.map((p) => p.id));
    for (const e of antiguas) {
      if (!e.anio || Number(e.anio) < DESDE_OPINION) continue;
      if (enBiblioteca.has(e.id) || procesados.has(e.id) || yaEnLista2.has(e.id)) continue;
      pendientes.push({
        id: e.id,
        url: e.url,
        titulo: '',
        fecha: null,
        tipo: 'opinion',
        orden: `${e.anio}-${String(e.numero || '0').padStart(5, '0')}`,
      });
    }
  }

  // Fuente 2 — censo completo de la colección de pronunciamientos.
  // El de arriba solo alcanzaba 451 de los 5,940 publicados porque
  // paraba tras dos páginas sin novedades; este recorre las 248 páginas.
  // Solo se toman los INDIVIDUALES: de 2018 hacia atrás gob.pe publica
  // compilados de 25 pronunciamientos en un PDF, que necesitarían otro
  // tratamiento (partirlos) y quedan fuera del alcance pedido.
  if (existsSync(CENSO_PRON)) {
    const completo = JSON.parse(readFileSync(CENSO_PRON, 'utf8')) as Array<{
      id: string; slug: string; url: string; forma: string; numero: string | null; anio: string | null;
    }>;
    const yaEnLista = new Set(pendientes.map((p) => p.id));
    for (const e of completo) {
      if (e.forma !== 'individual') continue;
      if (!e.anio || Number(e.anio) < DESDE_ANIO) continue;
      if (enBiblioteca.has(e.id) || procesados.has(e.id) || yaEnLista.has(e.id)) continue;
      pendientes.push({
        id: e.id,
        url: e.url,
        titulo: '',   // se lee de la ficha
        fecha: null,  // se lee de la ficha
        tipo: 'pronunciamiento',
        // Sin fecha todavía: se ordena por año y correlativo del slug,
        // que basta para procesar lo más reciente primero.
        orden: `${e.anio}-${String(e.numero || '0').padStart(5, '0')}`,
      });
    }
  }

  // Más reciente primero: si se corta, lo vigente ya está dentro.
  pendientes.sort((a, b) => b.orden.localeCompare(a.orden));

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
      const ficha = await leerFicha(e.url);
      if (!ficha.pdf) {
        anotar(e.id, 'sin_pdf');
        fallos++;
        await frenarSiLaFuenteSeCierra();
        await sleep(pausaActual);
        continue;
      }
      // El censo de la colección trae título y fecha; el censo completo
      // de pronunciamientos solo trae el slug, así que se leen aquí.
      const titulo = e.titulo || ficha.titulo || '';
      const fecha = e.fecha || ficha.fecha;
      if (!titulo) {
        anotar(e.id, 'sin_titulo');
        fallos++;
        await sleep(pausaActual);
        continue;
      }
      const pdf = ficha.pdf;

      const resPdf = await traer(pdf);
      if (!resPdf) {
        anotar(e.id, 'sin_pdf', 'descarga del PDF falló tras reintentos');
        fallos++;
        await frenarSiLaFuenteSeCierra();
        await sleep(pausaActual);
        continue;
      }
      const buf = Buffer.from(await resPdf.arrayBuffer());
      const doc = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(doc, { mergePages: true });
      let raw = limpiarTexto(String(text).trim());
      let viaOcr = false;
      if (raw.length < 400) {
        const ocr = await transcribirEscaneado(buf, titulo.slice(0, 30));
        if (!ocr) {
          anotar(e.id, 'sin_texto', `${raw.length} chars, OCR sin resultado`);
          fallos++;
          await sleep(pausaActual);
          continue;
        }
        raw = limpiarTexto(ocr);
        viaOcr = true;
      }

      const anio = anioDe(titulo, fecha);
      const correlativo = correlativoDe(titulo);
      const chunks = chunkText(raw);
      const embeddings = await embedBatch(chunks.map((c) => c.content));

      const { data: inserted, error } = await supabase
        .from('normative_documents')
        .insert({
          type: e.tipo,
          number: titulo,
          title: titulo,
          raw_text: raw,
          date: fecha,
          source_url: e.url,
          // Según la FECHA, no el año: los de enero a abril de 2025 son
          // del régimen anterior aunque compartan año con los de mayo.
          applicable_law: regimenDe(fecha),
          metadata: {
            entidad: entidadDe(titulo, fecha),
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
