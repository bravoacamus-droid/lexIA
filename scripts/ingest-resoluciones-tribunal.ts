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

const ESTADO = join(process.cwd(), 'data', 'tcp-ingesta.state.jsonl');
const CANDADO = join(process.cwd(), 'data', 'tcp-ingesta.lock');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.slice(8) || 0);
const DESDE = Number(process.argv.find((a) => a.startsWith('--desde='))?.slice(8) || 2020);
const PAUSA_MS = 900; // cortesía con gob.pe
/** Tope al que puede llegar la espera si el buscador va apretado. */
const PAUSA_MAX_MS = 4000;
/** Pausa larga cuando el buscador está en rojo, para que se recupere. */
const DESCANSO_MS = 120_000;
const UMBRAL_AMARILLO = 1800;
const UMBRAL_ROJO = 3000;

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
 * Vigila que el buscador siga respondiendo rápido mientras crece el
 * corpus.
 *
 * El 02/08/2026 la ingesta degradó hybrid_search hasta superar el
 * statement_timeout de 8 s: el chat y la voz quedaron sin fuentes y solo
 * lo detectamos al probar a mano. Ahora se mide cada cierto tramo y se
 * avisa en el log apenas la latencia se dispara.
 *
 * Mide TRES veces y devuelve la MEDIANA. Una sola medición no sirve para
 * decidir: el 03/08/2026 el guardián detuvo la corrida a los 399
 * documentos por un 3,129 ms aislado, y al medir en serie la misma
 * consulta la mediana era 297 ms. La primera llamada de cada serie suele
 * costar segundos (apertura de conexión) y hay picos sueltos de red; la
 * mediana los descarta y solo sobrevive la degradación sostenida, que es
 * la que justifica parar horas de trabajo.
 */
const CONSULTA_SALUD = 'plazo para perfeccionar el contrato';

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
      // Un error sí es concluyente al primer intento: significa que la
      // consulta superó el statement_timeout, no que la red tosió.
      if (error) return -1;
      muestras.push(Date.now() - t0);
      await sleep(300);
    }
    return muestras.sort((a, b) => a - b)[1];
  } catch {
    return -1;
  }
}

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

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', setiembre: '09', septiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
};

/**
 * Fecha de EXPEDICIÓN leída de la firma del propio documento.
 *
 * Las resoluciones cierran con "Lima, 24 de julio de 2026". El texto cita
 * además fechas de otros actos —la convocatoria, el contrato, la
 * resolución impugnada—, así que se recorre de atrás hacia adelante y se
 * exige que el año coincida con el de la numeración.
 *
 * Es la fuente PREFERENTE sobre la ficha de gob.pe: esa página traía la
 * primera fecha que apareciera en su HTML, y en el 6% de los casos era
 * una fecha citada. La "Resolución N° 2931-2026-S3" quedó fechada en
 * 2023 (César, 03/08/2026).
 */
function fechaDeExpedicion(texto: string, anioEsperado: number): string | null {
  const re =
    /(?:Lima|Arequipa|Trujillo|Cusco|Piura)\s*,?\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})/gi;
  const hallazgos = [...texto.matchAll(re)];
  for (let i = hallazgos.length - 1; i >= 0; i--) {
    const [, dia, mesTxt, anio] = hallazgos[i];
    const mes = MESES[mesTxt.toLowerCase()];
    if (!mes || Number(anio) !== anioEsperado) continue;
    return `${anio}-${mes}-${String(dia).padStart(2, '0')}`;
  }
  return null;
}

/** Extrae la URL del PDF y la fecha de la ficha de gob.pe. */
async function fichaResolucion(
  url: string,
  anioEsperado: number,
): Promise<{ pdf: string | null; fecha: string | null }> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return { pdf: null, fecha: null };
  const html = await res.text();
  const pdf = (html.match(/https:\/\/cdn\.www\.gob\.pe\/[^"']+\.pdf/i) || [])[0] || null;
  const m = html.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(20\d{2})/);
  const mes = m ? MESES[m[2].toLowerCase()] : null;
  // Se descarta si el año no es el de la resolución: es señal de que se
  // capturó una fecha citada y no la de publicación.
  const fecha =
    m && mes && Number(m[3]) === anioEsperado
      ? `${m[3]}-${mes}-${String(m[1]).padStart(2, '0')}`
      : null;
  return { pdf, fecha };
}

/**
 * Candado de instancia única.
 *
 * En Windows, detener la consola que lanzó el script NO mata al proceso
 * de Node: queda huérfano y sigue ingiriendo. El 02/08/2026 se
 * acumularon NUEVE procesos simultáneos; cada uno con su propia foto de
 * lo ya procesado, se pisaban entre sí y 30 de cada 50 documentos
 * fallaban por clave duplicada (además de saturar la base y disparar la
 * latencia de las búsquedas).
 */
function tomarCandado(): void {
  if (existsSync(CANDADO)) {
    const pid = Number(readFileSync(CANDADO, 'utf8').trim());
    let vivo = false;
    try {
      process.kill(pid, 0); // no lo mata: solo comprueba que exista
      vivo = true;
    } catch {
      vivo = false;
    }
    if (vivo) {
      console.error(
        `❌ Ya hay una ingesta corriendo (PID ${pid}).
` +
          `   Si estás seguro de que no, borra data/tcp-ingesta.lock`,
      );
      process.exit(1);
    }
    console.log(`(candado huérfano del PID ${pid} — se reemplaza)`);
  }
  writeFileSync(CANDADO, String(process.pid));
  const soltar = () => {
    try {
      if (existsSync(CANDADO) && readFileSync(CANDADO, 'utf8').trim() === String(process.pid)) {
        unlinkSync(CANDADO);
      }
    } catch {
      /* nada que hacer */
    }
  };
  process.on('exit', soltar);
  process.on('SIGINT', () => {
    soltar();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    soltar();
    process.exit(143);
  });
}

async function main() {
  tomarCandado();
  const censo = cargarCenso();
  const procesadas = yaProcesadas();

  // Cruce con lo que ya está en la biblioteca
  // PAGINADO OBLIGATORIO: el cliente de Supabase devuelve como máximo
  // 1,000 filas por consulta. Sin paginar, el deduplicador solo veía las
  // primeras mil resoluciones y todo lo demás se volvía a descargar y
  // embeber para fallar recién al insertar (medido el 02/08/2026: 30 de
  // cada 50 documentos). Con 37 mil por ingerir, esto no es un detalle.
  const existentes: Array<{ number: string | null; title: string }> = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from('normative_documents')
      .select('number, title')
      .eq('type', 'resolucion_tce')
      .range(desde, desde + 999);
    if (error) throw new Error(`leyendo existentes: ${error.message}`);
    const lote = (data || []) as Array<{ number: string | null; title: string }>;
    existentes.push(...lote);
    if (lote.length < 1000) break;
  }
  const enBD = new Set<string>();
  for (const d of existentes) {
    const texto = `${d.number || ''} ${d.title}`;
    // Número y año por un lado, sala por otro. Antes se hacía con un
    // solo patrón que terminaba en `\D*(S\d)?`, y al ser `\D*` codicioso
    // se tragaba el "-S2" final: la sala quedaba vacía y NINGUNA
    // resolución ya ingerida se reconocía. Efecto medido el 02/08/2026:
    // 27 de 50 documentos se volvían a descargar y embeber para fallar
    // recién al insertar, gastando cuota de embeddings al pepe.
    const mNum = texto.match(/0*(\d{1,5})\s*-+\s*((?:19|20)\d{2})/);
    const mSala = texto.match(/S(\d)/i);
    if (mNum) {
      enBD.add(`${mNum[1]}-${mNum[2]}-${mSala ? 'S' + mSala[1] : 's?'}`);
      // Sin sala también, por si el censo la trae y la BD no (o al revés).
      enBD.add(`${mNum[1]}-${mNum[2]}-s?`);
    }
  }

  const pendientes = censo.filter((r) => !procesadas.has(r.key) && !enBD.has(r.key));
  const total = LIMIT > 0 ? Math.min(LIMIT, pendientes.length) : pendientes.length;

  console.log(`Censo (desde ${DESDE}): ${censo.length}`);
  console.log(
    `Ya en biblioteca: ${existentes.length} resoluciones (${enBD.size} claves) | ya procesadas: ${procesadas.size}`,
  );
  console.log(`A procesar en esta corrida: ${total}\n`);

  let ok = 0;
  let fallos = 0;
  let chunksTotal = 0;
  /** Espera entre documentos; sube y baja según la salud del buscador. */
  let pausaActual = PAUSA_MS;
  const t0 = Date.now();

  for (let i = 0; i < total; i++) {
    const r = pendientes[i];
    try {
      const { pdf, fecha: fechaFicha } = await fichaResolucion(r.url, r.anio);
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

      // Preferencia: la firma del documento; luego la ficha de gob.pe;
      // como último recurso, el 1 de enero del año de la numeración.
      const firma = fechaDeExpedicion(raw, r.anio);
      const fecha = firma || fechaFicha;
      const origenFecha = firma
        ? 'firma del documento'
        : fechaFicha
          ? 'publicación en gob.pe'
          : 'año del número';

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
            fecha_origen: origenFecha,
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

    // Chequeo de salud del buscador cada 200 documentos.
    //
    // La lentitud NO viene del tamaño del índice sino de la CONTENCIÓN
    // con esta misma ingesta. Medido el 04/08/2026: con la carga
    // detenida y 148 mil fragmentos —más de los que había cuando el
    // guardián marcó 3,322 ms— el buscador respondía en 169-412 ms. Son
    // las escrituras al índice vectorial las que le quitan aire a las
    // lecturas.
    //
    // Por eso ya no se detiene la corrida al primer rojo: eso costó 6.6
    // horas de máquina parada sin que nadie mirara. Ahora se afloja el
    // ritmo y se vuelve a medir; si en tres intentos no recupera, ahí sí
    // se detiene, porque entonces el problema es otro.
    if ((i + 1) % 200 === 0) {
      let ms = await medirBuscador();
      let intentos = 0;
      while ((ms < 0 || ms > UMBRAL_ROJO) && intentos < 3) {
        intentos++;
        console.log(
          `  🔴 buscador en ${ms < 0 ? 'error' : `${ms} ms`} — pausa de ${DESCANSO_MS / 1000}s ` +
            `para dejarlo respirar (intento ${intentos}/3)`,
        );
        await sleep(DESCANSO_MS);
        ms = await medirBuscador();
      }
      if (ms < 0 || ms > UMBRAL_ROJO) {
        console.log('  🔴 No recupera tras tres pausas — detengo. Lo ingerido queda guardado.');
        break;
      }
      const estado = ms > UMBRAL_AMARILLO ? '🟡' : '🟢';
      console.log(`  ${estado} salud del buscador: ${ms} ms${intentos ? ' (recuperado)' : ''}`);
      // En amarillo se aumenta la espera entre documentos y en verde se
      // recupera: la ingesta cede ancho de banda cuando el buscador lo
      // necesita en vez de competir a ciegas.
      if (ms > UMBRAL_AMARILLO) {
        pausaActual = Math.min(pausaActual + 600, PAUSA_MAX_MS);
        console.log(`     ritmo aflojado a ${pausaActual} ms entre documentos`);
      } else if (pausaActual > PAUSA_MS) {
        pausaActual = Math.max(pausaActual - 300, PAUSA_MS);
        console.log(`     ritmo recuperado a ${pausaActual} ms entre documentos`);
      }
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
    await sleep(pausaActual);
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
