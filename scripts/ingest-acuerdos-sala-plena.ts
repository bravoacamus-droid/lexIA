#!/usr/bin/env tsx
/**
 * Ingesta de los acuerdos de Sala Plena del Tribunal.
 *
 * César los pone entre las fuentes de la biblioteca en «Estructura de
 * A-LexIA» y había cero, aunque las resoluciones del Tribunal que ya
 * están ingestadas los citan más de seiscientas veces. gob.pe los
 * publica todos bajo un mismo tipo de norma —«Acuerdo de Sala Plena»,
 * el 73—, en páginas de veinticinco; la colección 715 solo tiene los de
 * 2021 en adelante.
 *
 * QUÉ ENTRA Y QUÉ NO
 *
 * Los de 2016 en adelante: los que se dictaron bajo la Ley N° 30225 y
 * bajo la Ley N° 32069. Los anteriores —la Ley N° 26850 y el Decreto
 * Legislativo N° 1017, de 2004 a 2015— interpretan normas que ya nadie
 * aplica, y en la jerarquía un acuerdo va por delante de la resolución:
 * uno de 2005 le quitaría el sitio a la jurisprudencia vigente.
 *
 * Salvo los que el Tribunal SIGUE citando. Medido el 23/09/2026 sobre
 * las resoluciones de la biblioteca, de los anteriores a 2016 solo se
 * cita el 06-2012 (la regla de que el recurso se resuelve con la ley
 * vigente al convocarse el procedimiento). Va en `CITADOS_ANTERIORES`;
 * si mañana el Tribunal empieza a citar otro, se añade ahí.
 *
 * Lo que gob.pe no tiene publicado bajo el tipo 73 —el 01-2026/TCP, que
 * las resoluciones de 2026 citan por la multa mínima a las mypes, no
 * aparece— se puede traer con `--url=<ficha de gob.pe>`.
 *
 * Los PDF antiguos son a veces escaneos sin capa de texto: se
 * transcriben con Gemini, como en la ingesta de resoluciones.
 *
 * Uso:
 *   npx tsx scripts/ingest-acuerdos-sala-plena.ts --dry-run
 *   npx tsx scripts/ingest-acuerdos-sala-plena.ts
 *   npx tsx scripts/ingest-acuerdos-sala-plena.ts --url=https://www.gob.pe/institucion/oece/normas-legales/…
 *
 * Idempotente: lo que ya está —por su ficha de gob.pe— se omite.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { generateText } from 'ai';
import { chunkText } from '../src/lib/ingestion/chunker';
import { recortarDeElPeruano } from '../src/lib/ingestion/el-peruano';
import { textoIlegible } from '../src/lib/ingestion/legibilidad';
import { fastModel } from '../src/lib/ai/gemini';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/[\r\n"']/g, '');
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/[\r\n"']/g, '');
const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim().replace(/[\r\n"']/g, '');
if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
  console.error('Faltan credenciales en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DRY_RUN = process.argv.includes('--dry-run');
const URL_SUELTA = process.argv.find((a) => a.startsWith('--url='))?.slice(6) ?? null;
const DESDE = 2016;
/** Anteriores a 2016 que el Tribunal sigue citando: «número-año». */
const CITADOS_ANTERIORES = new Set(['6-2012']);

const LISTADO = 'https://www.gob.pe/institucion/oece/normas-legales/tipos/73-acuerdo-de-sala-plena';
const GOBPE = 'https://www.gob.pe';
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07',
  agosto: '08', setiembre: '09', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function traer(url: string): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok || i >= 2 || res.status < 500) return res;
    await dormir(2000 * (i + 1));
  }
}

function textoPlano(html: string): string[] {
  const cuerpo = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  return cuerpo
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

interface Ficha {
  ficha: string;
  titulo: string;
  numero: number;
  anio: number;
  fecha: string | null;
  sumilla: string | null;
  pdf: string;
}

/**
 * Lo que dice la ficha de gob.pe: el título, la fecha, la sumilla y el
 * PDF. El número y el año se leen del título —«N.° 003-2025/TCP»,
 * «N.° 06-2012/TC»—, que es lo que se ve y lo que se cita.
 */
async function leerFicha(ficha: string): Promise<Ficha | string> {
  const res = await traer(ficha);
  if (!res.ok) return `ficha HTTP ${res.status}`;
  const html = await res.text();
  const titulo = (html.match(/<title>([^<]+?)\s+-\s+Normas y documentos legales/)?.[1] ?? '')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .trim();
  // «N.° 003-2025/TCP», «N.° 06-2012/TC»; los de CONSUCODE se numeran
  // «N.° 014/2006» y los más antiguos «N.° 017/013», sin año: esos
  // quedan como año 0 y fuera de la regla.
  const m =
    titulo.match(/N\.?\s*[°º]?\s*0*(\d{1,3})-(\d{4})/i) ??
    titulo.match(/N\.?\s*[°º]?\s*0*(\d{1,3})\/((?:19|20)\d\d)\b/i) ??
    titulo.match(/N\.?\s*[°º]?\s*0*(\d{1,3})\/(\d{1,3})$/i)?.slice(0, 2).concat('0');
  if (!m) return `título sin número: «${titulo}»`;
  const pdf = html.match(/https:\/\/cdn\.www\.gob\.pe\/uploads\/document\/file\/[^"'?\s]+\.pdf/i)?.[0];
  if (!pdf) return 'la ficha no tiene PDF';

  const lineas = textoPlano(html);
  // La fecha es la primera línea con forma de fecha tras el título.
  let fecha: string | null = null;
  let sumilla: string | null = null;
  const i = lineas.findIndex((l, k) => k > 5 && l === titulo);
  for (let k = Math.max(0, i); k < Math.min(lineas.length, i + 8); k++) {
    const f = lineas[k].match(/^(\d{1,2}) de ([a-záéíóú]+) de (\d{4})$/i);
    if (f && MESES[f[2].toLowerCase()]) {
      fecha = `${f[3]}-${MESES[f[2].toLowerCase()]}-${f[1].padStart(2, '0')}`;
      const siguiente = lineas[k + 1] ?? '';
      if (siguiente && !/^Esta norma pertenece/i.test(siguiente) && siguiente !== titulo) {
        // La llamada a pie de página se pega a la palabra: «ESCANEADA1».
        sumilla = siguiente.replace(/([A-Za-zÁÉÍÓÚÑáéíóúñ])\d(?=\s|$)/g, '$1').trim();
      }
      break;
    }
  }
  // gob.pe los titula de tres maneras —«N.° 007-2021-TCE», «N.° 06-2021-TCE»,
  // «N.° 09-2020/TCE»—. Se guardan todos como los numera hoy el
  // Tribunal, «N.° 007-2021/TCE», para que la lista se lea pareja.
  const numero = Number(m[1]);
  const anio = Number(m[2]);
  const sigla = titulo.match(/[-/](TC[EP]?)\b/i)?.[1]?.toUpperCase() ?? (anio >= 2025 && fecha && fecha >= '2025-04-22' ? 'TCP' : 'TCE');
  const canonico = anio > 0 ? `Acuerdo de Sala Plena N.° ${String(numero).padStart(3, '0')}-${anio}/${sigla}` : titulo;
  return { ficha, titulo: canonico, numero, anio, fecha, sumilla, pdf };
}

async function listarFichas(): Promise<string[]> {
  const fichas = new Set<string>();
  for (let hoja = 1; hoja < 40; hoja++) {
    const res = await traer(`${LISTADO}?sheet=${hoja}`);
    if (!res.ok) throw new Error(`listado HTTP ${res.status}`);
    const html = await res.text();
    const nuevas = [...html.matchAll(/href="(\/institucion\/[a-z]+\/normas-legales\/\d+-[^"]+)"/g)].map(
      (x) => GOBPE + x[1],
    );
    if (nuevas.length === 0) break;
    nuevas.forEach((f) => fichas.add(f));
    await dormir(600);
  }
  return [...fichas];
}

async function extraerPdf(buffer: Buffer): Promise<{ texto: string; paginas: number }> {
  // Una copia: pdf.js se queda con el búfer que recibe, y el original
  // hace falta después si hay que transcribir.
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const r = await extractText(pdf, { mergePages: true });
  return { texto: String(r.text).trim(), paginas: pdf.numPages };
}

async function transcribir(buf: Buffer): Promise<string | null> {
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
                'comentarios: devuelve únicamente el texto transcrito, en texto plano, ' +
                'sin Markdown (sin asteriscos, sin «>» ni separadores).',
            },
            { type: 'file', data: buf, mimeType: 'application/pdf' },
          ],
        },
      ],
      temperature: 0,
      maxTokens: 32000,
    });
    // Aun pidiéndolo en texto plano, el modelo a veces marca títulos y
    // citas: el visor de la biblioteca los mostraría como asteriscos.
    const t = (r.text || '')
      .replace(/\*\*|__/g, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*(?:-{3,}|\*{3,})\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return t.length >= 400 ? t : null;
  } catch (e) {
    console.log(`
   ⚠️ la transcripción falló: ${(e as Error).message.slice(0, 160)}`);
    return null;
  }
}

async function vectorizar(textos: string[]): Promise<number[][]> {
  const salida: number[][] = [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < textos.length; i += 25) {
    const trozo = textos.slice(i, i + 25);
    for (let intento = 1; ; intento++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: trozo.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIM,
          })),
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
        for (const e of json.embeddings) salida.push(e.values);
        break;
      }
      if (intento >= 5) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
      await dormir(2000 * intento);
    }
    await dormir(1200);
  }
  return salida;
}

/** La Ley N° 32069 entró en vigencia el 22/04/2025. */
function leyAplicable(f: Ficha): string[] {
  const fecha = f.fecha ?? `${f.anio}-01-01`;
  return fecha >= '2025-04-22' ? ['ley_32069'] : ['ley_30225'];
}

async function ingestar(f: Ficha): Promise<string> {
  const { data: ya, error: errYa } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('source_url', f.ficha)
    .maybeSingle();
  if (errYa) return `no se pudo comprobar si ya estaba: ${errYa.message.slice(0, 100)}`;
  if (ya) return 'ya estaba';

  const res = await traer(f.pdf);
  if (!res.ok) return `PDF HTTP ${res.status}`;
  const buf = Buffer.from(await res.arrayBuffer());
  let { texto, paginas } = await extraerPdf(buf);
  // Algunos se publican con la página de El Peruano en que salieron, y
  // en ella van normas de otras entidades: se deja solo el acuerdo. La
  // legibilidad se mide sobre lo que queda, que es lo que se guarda.
  texto = recortarDeElPeruano(texto, /sala\s+plena/i);
  let viaOcr = false;
  const sinTexto = texto.replace(/\s/g, '').length < 400;
  if (sinTexto || textoIlegible(texto)) {
    // Un segundo intento: el primer fallo suele ser pasajero.
    const t = (await transcribir(buf)) ?? (await dormir(5000), await transcribir(buf));
    if (!t) return `${sinTexto ? 'escaneo sin texto' : 'texto ilegible'} y la transcripción falló (${paginas} pág)`;
    texto = recortarDeElPeruano(t, /sala\s+plena/i);
    viaOcr = true;
  }
  texto = texto.replace(/\u0000/g, '').replace(/[￾￿]/g, '').trim();
  const trozos = chunkText(texto);
  if (trozos.length === 0) return 'el troceador no produjo nada';
  if (DRY_RUN) {
    const muestra = process.argv.includes('--ver') ? `\n    «${texto.slice(0, 110)} … ${texto.slice(-110)}»` : '';
    return `simulación · ${paginas} pág · ${trozos.length} trozos · ${texto.length} c${viaOcr ? ' · OCR' : ''}${muestra}`;
  }

  const vectores = await vectorizar(trozos.map((t) => t.content));

  const { data: doc, error } = await supabase
    .from('normative_documents')
    .insert({
      type: 'acuerdo_sala_plena',
      number: f.titulo,
      title: f.titulo,
      summary: f.sumilla,
      date: f.fecha ?? `${f.anio}-01-01`,
      source_url: f.ficha,
      raw_text: texto,
      applicable_law: leyAplicable(f),
      metadata: {
        entidad: 'OECE',
        emitter: 'Tribunal de Contrataciones',
        anio: String(f.anio),
        correlativo: String(f.numero).padStart(3, '0'),
        pages: paginas,
        pdf_url: f.pdf,
        fecha_origen: f.fecha ? 'publicación en gob.pe' : 'año del número',
        texto_via_ocr: viaOcr || undefined,
        ingested_by: 'ingest_acuerdos_sala_plena',
      },
    } as never)
    .select('id')
    .single();
  if (error || !doc) return `no se pudo guardar: ${error?.message.slice(0, 140)}`;
  const id = (doc as { id: string }).id;

  const filas = trozos.map((t, k) => ({
    document_id: id,
    chunk_index: t.index,
    content: t.content,
    embedding: vectores[k] as never,
    metadata: { source: f.titulo, heading: t.heading || null } as never,
  }));
  for (let i = 0; i < filas.length; i += 25) {
    let ok = false;
    for (let intento = 1; intento <= 3 && !ok; intento++) {
      const { error: e } = await supabase.from('normative_chunks').insert(filas.slice(i, i + 25) as never);
      ok = !e;
      if (!ok) await dormir(3000 * intento);
    }
    if (!ok) {
      // Sin fragmentos el documento no se busca ni se cita: mejor no dejarlo.
      await supabase.from('normative_chunks').delete().eq('document_id', id);
      await supabase.from('normative_documents').delete().eq('id', id);
      return 'no se pudieron guardar los fragmentos';
    }
  }
  return `ingestado · ${paginas} pág · ${trozos.length} trozos${viaOcr ? ' · OCR' : ''}`;
}

async function main() {
  const fichas = URL_SUELTA ? [URL_SUELTA] : await listarFichas();
  console.log(`${fichas.length} ficha(s)${DRY_RUN ? ' · simulación' : ''}\n`);
  let entran = 0;
  for (const url of fichas) {
    const f = await leerFicha(url);
    await dormir(400);
    if (typeof f === 'string') {
      console.log(`· ${url.split('/').pop()?.padEnd(34)} ${f}`);
      continue;
    }
    const clave = `${f.numero}-${f.anio}`;
    if (!URL_SUELTA && f.anio < DESDE && !CITADOS_ANTERIORES.has(clave)) continue;
    entran++;
    process.stdout.write(`· ${f.titulo.padEnd(44)} ${String(f.fecha).padEnd(11)} `);
    try {
      console.log(await ingestar(f));
    } catch (e) {
      console.log(`FALLÓ: ${(e as Error).message.slice(0, 140)}`);
    }
  }
  console.log(`\n${entran} acuerdo(s) dentro de la regla.`);
}

void main();
