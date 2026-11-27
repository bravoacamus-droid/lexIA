#!/usr/bin/env tsx
/**
 * Ingesta de los dictámenes y los informes de vicio de nulidad (IVN) que
 * César entregó en carpetas (reunión del 27/11/2026: «se crearían
 * dictámenes y vicio de nulidad»). Tipos nuevos de la migración 0093.
 *
 *   · informe_vicio_nulidad — «INFORME IVN N° 032-2025/DSAT»: la DSAT del
 *     OECE declara (o no) la nulidad del procedimiento y lo retrotrae.
 *   · dictamen — «EXPEDIENTE DIC N° 1218-2025-SDPC»: supervisión de un
 *     procedimiento cuyo contrato ya se firmó; recomienda y remite al
 *     órgano de control.
 *
 * QUÉ HACE
 *
 * - Lee los PDF de las dos carpetas; los repetidos (mismo md5: César mandó
 *   «…-1.pdf» que son copias) entran una vez.
 * - El número sale del encabezado; la fecha del IVN, de su cierre
 *   («Jesús María, 7 de julio de 2026»: las fechas del cuerpo traen la
 *   llamada a pie de página pegada, «171 de junio»); la del dictamen, que
 *   no la escribe, de la firma digital del PDF.
 * - Quita la leyenda de firma digital que el OECE repite en cada página
 *   («Esta es una copia auténtica imprimible…»): unos 700 caracteres por
 *   página que, si no, llenarían los fragmentos de ruido.
 * - Los escaneados sin texto se transcriben con Gemini (`ocr-pdf.ts`).
 * - Trocea con `chunkText` y vectoriza con `embed` (gemini-embedding-001,
 *   1024 dimensiones, el modelo de toda la biblioteca).
 *
 * Los resúmenes (`ai_summary`) no se hacen aquí: los genera
 * `scripts/generar-resumenes.ts`, que toma todo documento sin resumen.
 *
 * Idempotente: un PDF cuyo md5 ya está en `metadata.md5` se omite.
 *
 * Uso:
 *   npx tsx scripts/ingest-carpeta-cesar.ts --dry-run
 *   npx tsx scripts/ingest-carpeta-cesar.ts
 *   npx tsx scripts/ingest-carpeta-cesar.ts --carpeta="C:/otra/ruta"
 */
import { config as loadEnv } from 'dotenv';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy, getMeta } from 'unpdf';
import { chunkText } from '../src/lib/ingestion/chunker';
import { embed } from '../src/lib/ai/embeddings';
import { transcribirPdfEscaneado } from '../src/lib/ai/ocr-pdf';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const DRY_RUN = process.argv.includes('--dry-run');
const RAIZ =
  process.argv.find((a) => a.startsWith('--carpeta='))?.slice(10).replace(/^"|"$/g, '') ??
  'C:/Users/luigi/Documents/cesar';

const CARPETAS: Array<{ nombre: RegExp; tipo: 'informe_vicio_nulidad' | 'dictamen' }> = [
  { nombre: /VICIO DE NULIDAD/i, tipo: 'informe_vicio_nulidad' },
  { nombre: /DICT[ÁA]MENES/i, tipo: 'dictamen' },
];

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07',
  agosto: '08', setiembre: '09', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function pdfsDe(dir: string): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) salida.push(...pdfsDe(p));
    else if (/\.pdf$/i.test(e)) salida.push(p);
  }
  return salida.sort();
}

/** La leyenda de firma digital del OECE, con su «Pág. n de m» delante si lo trae. */
function sinLeyendaDeFirma(t: string): string {
  return t
    .replace(/(?:P[áa]g\.\s*\d+\s*de\s*\d+\s*)?Esta es una copia aut[ée]ntica imprimible[\s\S]{0,1200}?validador\.xhtml/gi, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function limpiar(t: string): string {
  return t
    .replace(/\u0000/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '')
    .replace(/^=== Página \d+ ===\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface Ficha {
  numero: string;
  titulo: string;
  correlativo: number;
  anio: number;
  fecha: string;
  fechaOrigen: string;
  entidad: string | null;
  procedimiento: string | null;
}

/** «2026-07-07» de «Jesús María, 7 de julio de 2026» (el último que aparezca). */
function fechaDeCierre(t: string): string | null {
  const todas = [
    ...t.matchAll(/(?:Jes[úu]s\s+Mar[íi]a|Lima|San\s+Isidro)\s*,\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})/gi),
  ];
  const m = todas.at(-1);
  if (!m || !MESES[m[2].toLowerCase()]) return null;
  return `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
}

/** La fecha de la firma: el PDF del OECE la guarda como CreationDate/ModDate («D:20250812…»). */
async function fechaDelPdf(buf: Buffer): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { info } = await getMeta(pdf);
    const crudo = String((info as Record<string, unknown>).ModDate ?? (info as Record<string, unknown>).CreationDate ?? '');
    const m = crudo.match(/D:(\d{4})(\d{2})(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  } catch {
    return null;
  }
}

const unaLinea = (s: string | undefined | null, max = 260) =>
  s ? s.replace(/\s+/g, ' ').replace(/\d(?=[,.;:]?\s*$)/, '').trim().slice(0, max) || null : null;

async function ficha(tipo: 'informe_vicio_nulidad' | 'dictamen', texto: string, buf: Buffer): Promise<Ficha | string> {
  const plano = texto.replace(/\s+/g, ' ');
  if (tipo === 'informe_vicio_nulidad') {
    const m = plano.match(/INFORME\s+IVN\s+N\s*[.°º]*\s*[°º]?\s*(\d{1,3})\s*-\s*(\d{4})\s*\/\s*DSAT/i);
    if (!m) return 'sin «INFORME IVN N° …/DSAT» en el encabezado';
    const correlativo = Number(m[1]);
    const anio = Number(m[2]);
    const numero = `Informe IVN N° ${String(correlativo).padStart(3, '0')}-${anio}/DSAT`;
    const entidad = unaLinea(plano.match(/Entidad\s+contratante\s*:\s*(.+?)\s+Procedimiento\s*:/i)?.[1], 160);
    const procedimiento = unaLinea(plano.match(/Procedimiento\s*:\s*(.+?)\s+Referencia\s*:/i)?.[1]);
    let cierre = fechaDeCierre(plano);
    let origen = 'cierre del informe';
    // El IVN 014-2026 cierra «26 de enero de 2025»: errata de enero, el
    // número manda. Un informe no se fecha antes del año de su número.
    if (cierre && Number(cierre.slice(0, 4)) < anio) {
      cierre = String(anio) + cierre.slice(4);
      origen = 'cierre del informe (año corregido por el número)';
    }
    return {
      numero,
      titulo: entidad ? `${numero} · ${entidad}` : numero,
      correlativo,
      anio,
      fecha: cierre ?? `${anio}-01-01`,
      fechaOrigen: cierre ? origen : 'año del número',
      entidad,
      procedimiento,
    };
  }
  const m = plano.match(/EXPEDIENTE\s+DIC\s+N\s*[.°º]*\s*[°º]?\s*(\d{3,5})\s*-\s*(\d{4})(\s*-\s*[A-Z]{2,6})?/i);
  if (!m) return 'sin «EXPEDIENTE DIC N° …» en el encabezado';
  const correlativo = Number(m[1]);
  const anio = Number(m[2]);
  const sufijo = m[3] ? m[3].replace(/\s+/g, '') : '';
  const numero = `Dictamen — Expediente DIC N° ${correlativo}-${anio}${sufijo}`;
  const entidad = unaLinea(plano.match(/\bENTIDAD\s+(.+?)\s+PROCEDIMIENTO\s+DE\s+SELECCI[ÓO]N/i)?.[1], 160);
  const procedimiento = unaLinea(plano.match(/PROCEDIMIENTO\s+DE\s+SELECCI[ÓO]N\s+(.+?)\s+I\.\s+ANTECEDENTES/i)?.[1]);
  const firma = await fechaDelPdf(buf);
  return {
    numero,
    titulo: entidad ? `${numero} · ${entidad}` : numero,
    correlativo,
    anio,
    fecha: firma ?? `${anio}-01-01`,
    fechaOrigen: firma ? 'firma digital del PDF' : 'año del número',
    entidad,
    procedimiento,
  };
}

async function textoDe(buf: Buffer, nombre: string): Promise<{ texto: string; paginas: number; ocr: boolean } | string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const r = await extractText(pdf, { mergePages: true });
  let texto = limpiar(sinLeyendaDeFirma(String(r.text)));
  const paginas = pdf.numPages;
  if (texto.replace(/\s/g, '').length >= 400 * Math.min(paginas, 3) / 3) return { texto, paginas, ocr: false };
  // Escaneo sin capa de texto.
  if (DRY_RUN) return { texto: '', paginas, ocr: true };
  const t = await transcribirPdfEscaneado(buf, { nombre });
  texto = limpiar(sinLeyendaDeFirma(t.texto));
  if (texto.replace(/\s/g, '').length < 400) return `escaneo sin texto y la transcripción no devolvió nada (${paginas} pág)`;
  return { texto, paginas, ocr: true };
}

async function guardar(
  tipo: 'informe_vicio_nulidad' | 'dictamen',
  f: Ficha,
  texto: string,
  meta: { paginas: number; ocr: boolean; md5: string; archivo: string },
): Promise<string> {
  const trozos = chunkText(texto);
  if (trozos.length === 0) return 'el troceador no produjo nada';
  if (DRY_RUN) return `simulación · ${meta.paginas} pág · ${trozos.length} trozos · ${texto.length} c${meta.ocr ? ' · OCR' : ''}`;

  let vectores: number[][] = [];
  for (let intento = 1; ; intento++) {
    try {
      vectores = await embed(trozos.map((t) => t.content), 'RETRIEVAL_DOCUMENT');
      break;
    } catch (e) {
      if (intento >= 4) return `no se pudo vectorizar: ${(e as Error).message.slice(0, 120)}`;
      await dormir(3000 * intento);
    }
  }

  const { data: doc, error } = await supabase
    .from('normative_documents')
    .insert({
      type: tipo,
      number: f.numero,
      title: f.titulo,
      summary: f.procedimiento,
      date: f.fecha,
      source_url: null,
      raw_text: texto,
      applicable_law: ['ley_32069'],
      metadata: {
        entidad: 'OECE',
        emitter:
          tipo === 'informe_vicio_nulidad'
            ? 'Dirección de Supervisión, Asistencia Técnica (DSAT)'
            : 'Subdirección de Supervisión de Procedimientos Competitivos',
        anio: String(f.anio),
        correlativo: String(f.correlativo).padStart(3, '0'),
        entidad_contratante: f.entidad,
        procedimiento: f.procedimiento,
        pages: meta.paginas,
        md5: meta.md5,
        archivo: meta.archivo,
        fecha_origen: f.fechaOrigen,
        texto_via_ocr: meta.ocr || undefined,
        entregado_por: 'César, 27/11/2026',
        ingested_by: 'ingest_carpeta_cesar',
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
    metadata: { source: f.numero, heading: t.heading || null } as never,
  }));
  for (let i = 0; i < filas.length; i += 25) {
    let ok = false;
    for (let intento = 1; intento <= 3 && !ok; intento++) {
      const { error: e } = await supabase.from('normative_chunks').insert(filas.slice(i, i + 25) as never);
      ok = !e;
      if (!ok) await dormir(3000 * intento);
    }
    if (!ok) {
      // Sin fragmentos no se busca ni se cita: se quita lo que este script acaba de crear.
      await supabase.from('normative_chunks').delete().eq('document_id', id);
      await supabase.from('normative_documents').delete().eq('id', id);
      return 'no se pudieron guardar los fragmentos';
    }
  }
  return `ingestado · ${meta.paginas} pág · ${trozos.length} trozos${meta.ocr ? ' · OCR' : ''}`;
}

async function main() {
  const carpetas = readdirSync(RAIZ).filter((e) => statSync(join(RAIZ, e)).isDirectory());
  const vistos = new Set<string>();
  const cuenta: Record<string, number> = {};
  for (const { nombre, tipo } of CARPETAS) {
    const dir = carpetas.find((c) => nombre.test(c));
    if (!dir) {
      console.log(`· No está la carpeta de ${tipo}`);
      continue;
    }
    const archivos = pdfsDe(join(RAIZ, dir));
    console.log(`\n${tipo}: ${archivos.length} PDF${DRY_RUN ? ' · simulación' : ''}`);
    for (const ruta of archivos) {
      const buf = readFileSync(ruta);
      const md5 = createHash('md5').update(buf).digest('hex');
      const archivo = basename(ruta);
      process.stdout.write(`· ${archivo.padEnd(40)} `);
      if (vistos.has(md5)) {
        console.log('copia de otro archivo de la carpeta');
        cuenta.copias = (cuenta.copias ?? 0) + 1;
        continue;
      }
      vistos.add(md5);
      const { data: ya } = await supabase
        .from('normative_documents')
        .select('id, number')
        .eq('metadata->>md5', md5)
        .maybeSingle();
      if (ya) {
        console.log(`ya estaba (${(ya as { number: string }).number})`);
        cuenta.yaEstaban = (cuenta.yaEstaban ?? 0) + 1;
        continue;
      }
      try {
        const t = await textoDe(buf, archivo);
        if (typeof t === 'string') {
          console.log(t);
          cuenta.fallidos = (cuenta.fallidos ?? 0) + 1;
          continue;
        }
        if (DRY_RUN && t.ocr) {
          console.log(`escaneo: se transcribirá (${t.paginas} pág)`);
          continue;
        }
        const f = await ficha(tipo, t.texto, buf);
        if (typeof f === 'string') {
          console.log(f);
          cuenta.fallidos = (cuenta.fallidos ?? 0) + 1;
          continue;
        }
        const r = await guardar(tipo, f, t.texto, { paginas: t.paginas, ocr: t.ocr, md5, archivo });
        console.log(`${f.numero} · ${f.fecha} · ${r}`);
        if (r.startsWith('ingestado') || r.startsWith('simulación')) cuenta[tipo] = (cuenta[tipo] ?? 0) + 1;
        else cuenta.fallidos = (cuenta.fallidos ?? 0) + 1;
      } catch (e) {
        console.log(`FALLÓ: ${(e as Error).message.slice(0, 160)}`);
        cuenta.fallidos = (cuenta.fallidos ?? 0) + 1;
      }
    }
  }
  console.log('\n', cuenta);
}

void main();
