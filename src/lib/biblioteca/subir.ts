/**
 * Subir un documento a la Biblioteca Normativa desde el panel (servidor).
 *
 * POR QUÉ (reunión con César del 27/11/2026)
 *
 * Hasta ahora todo lo que el actualizador no trae (modificaciones de la
 * Ley y el Reglamento, acuerdos de Sala Plena, dictámenes, informes de
 * vicio de nulidad) se cargaba con scripts desde la consola. César lo pidió
 * en la web: «uno para subir manual, sería genial».
 *
 * Hace lo mismo que los ingestores (`scripts/ingest-carpeta-cesar.ts`):
 *   · un archivo idéntico (mismo md5) o un documento del mismo tipo con el
 *     mismo número no entra dos veces: se devuelve el que ya está;
 *   · texto del PDF (o del Word), sin la leyenda de firma digital que el
 *     OECE repite en cada página; si es un escaneo, se transcribe con Gemini;
 *   · se trocea con `chunkText`, se vectoriza con el modelo de toda la
 *     biblioteca y se guardan documento y fragmentos;
 *   · el resumen (`ai_summary`) se genera al final; si falla, lo completa
 *     `scripts/generar-resumenes.ts`, que toma todo documento sin resumen.
 *
 * Nada a medias: si algo falla después de crear el documento, se borran el
 * documento y sus fragmentos. El PDF queda en el bucket `normativa`
 * (`pdf_storage_path`) y la subida temporal del usuario se borra.
 */
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { chunkText } from '@/lib/ingestion/chunker';
import { embed } from '@/lib/ai/embeddings';
import { transcribirPdfEscaneado } from '@/lib/ai/ocr-pdf';
import { generateDocumentSummary } from '@/lib/ai/document-summary';
import { textoDelWord } from '@/lib/evaluacion/mejora/control-de-cambios';
import type { NormativeDocType } from '@/lib/supabase/types';
import { LEYES, nucleoDelNumero, proponerFicha, TIPOS_SUBIBLES, type FichaPropuesta, type LeyAplicable } from './fichas';

export class ErrorDeSubida extends Error {
  constructor(
    public codigo: 'no_existe' | 'sin_texto' | 'duplicado' | 'datos' | 'fallo',
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export interface DocumentoExistente {
  id: string;
  number: string | null;
  title: string;
  type: string;
  /** Por qué se considera el mismo. */
  por: 'archivo' | 'numero';
}

export interface Lectura {
  md5: string;
  paginas: number;
  caracteres: number;
  ocr: boolean;
  /** Las primeras líneas, para que el usuario reconozca el documento. */
  muestra: string;
  propuesta: FichaPropuesta;
  duplicado: DocumentoExistente | null;
}

export interface FichaConfirmada {
  tipo: NormativeDocType;
  numero: string;
  titulo: string;
  fecha: string | null;
  ley: LeyAplicable;
  fuente: string | null;
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** La leyenda de firma digital del OECE, con su «Pág. n de m» delante si lo trae. */
export function sinLeyendaDeFirma(t: string): string {
  return t
    .replace(/(?:P[áa]g\.\s*\d+\s*de\s*\d+\s*)?Esta es una copia aut[ée]ntica imprimible[\s\S]{0,1200}?validador\.xhtml/gi, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function limpiar(t: string): string {
  return t
    .replace(/\u0000/g, '')
    .replace(/[￾￿]/g, '')
    .replace(/^=== Página \d+ ===\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const esWord = (ruta: string) => /\.docx$/i.test(ruta);

export async function descargarSubida(admin: SupabaseClient, ruta: string): Promise<Buffer> {
  const { data, error } = await admin.storage.from('uploads').download(ruta);
  if (error || !data) throw new ErrorDeSubida('no_existe', 'No se encontró el archivo subido. Vuelve a subirlo.');
  return Buffer.from(await data.arrayBuffer());
}

/** El texto del archivo; si es un PDF escaneado, transcrito con Gemini. */
export async function textoDelArchivo(buf: Buffer, ruta: string): Promise<{ texto: string; paginas: number; ocr: boolean }> {
  if (esWord(ruta)) {
    const texto = limpiar(await textoDelWord(buf));
    return { texto, paginas: 0, ocr: false };
  }
  // Copia propia: pdf.js se queda con el búfer que recibe.
  const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(buf)));
  const r = await extractText(pdf, { mergePages: true });
  const paginas = pdf.numPages;
  const texto = limpiar(sinLeyendaDeFirma(String(r.text)));
  if (texto.replace(/\s/g, '').length >= Math.max(200, 130 * Math.min(paginas, 3))) return { texto, paginas, ocr: false };
  const t = await transcribirPdfEscaneado(buf, { nombre: ruta.split('/').pop() });
  const transcrito = limpiar(sinLeyendaDeFirma(t.texto));
  if (transcrito.replace(/\s/g, '').length < 200) {
    throw new ErrorDeSubida('sin_texto', `El archivo no tiene texto legible (${paginas} página(s)), ni transcribiéndolo.`);
  }
  return { texto: transcrito, paginas, ocr: true };
}

/** Un documento igual: el mismo archivo (md5) o el mismo tipo y número. */
export async function buscarDuplicado(
  admin: SupabaseClient,
  args: { md5: string; tipo?: string | null; numero?: string | null },
): Promise<DocumentoExistente | null> {
  const { data: porArchivo } = await admin
    .from('normative_documents')
    .select('id, number, title, type')
    .eq('metadata->>md5', args.md5)
    .limit(1)
    .maybeSingle();
  if (porArchivo) return { ...(porArchivo as Omit<DocumentoExistente, 'por'>), por: 'archivo' };
  if (!args.tipo || !args.numero) return null;
  const nucleo = nucleoDelNumero(args.numero);
  if (!nucleo) {
    const { data } = await admin.from('normative_documents').select('id, number, title, type').eq('type', args.tipo).eq('number', args.numero.trim()).maybeSingle();
    return data ? { ...(data as Omit<DocumentoExistente, 'por'>), por: 'numero' } : null;
  }
  // «4-2026» y «004-2026» son el mismo; «14-2026» no.
  const patron = nucleo.anio ? `%${nucleo.correlativo}%${nucleo.anio}%` : `%${nucleo.correlativo}%`;
  const { data: candidatos } = await admin
    .from('normative_documents')
    .select('id, number, title, type')
    .eq('type', args.tipo)
    .ilike('number', patron)
    .limit(50);
  const igual = ((candidatos ?? []) as Array<Omit<DocumentoExistente, 'por'>>).find((d) => {
    const n = nucleoDelNumero(d.number ?? '');
    return !!n && n.correlativo === nucleo.correlativo && n.anio === nucleo.anio;
  });
  return igual ? { ...igual, por: 'numero' } : null;
}

/** Lee el archivo subido y propone la ficha; dice si ya está en la biblioteca. */
export async function leerSubida(admin: SupabaseClient, ruta: string): Promise<Lectura> {
  const buf = await descargarSubida(admin, ruta);
  const md5 = createHash('md5').update(buf).digest('hex');
  const { texto, paginas, ocr } = await textoDelArchivo(buf, ruta);
  const nombre = ruta.split('/').pop()?.replace(/^\d+-/, '') ?? 'documento';
  const propuesta = await proponerFicha(texto, nombre);
  const duplicado = await buscarDuplicado(admin, { md5, tipo: propuesta.tipo, numero: propuesta.numero });
  return {
    md5,
    paginas,
    caracteres: texto.length,
    ocr,
    muestra: texto.slice(0, 600),
    propuesta,
    duplicado,
  };
}

function validarFicha(f: FichaConfirmada) {
  if (!TIPOS_SUBIBLES.includes(f.tipo)) throw new ErrorDeSubida('datos', 'Elige el tipo de documento.');
  if (!f.numero.trim()) throw new ErrorDeSubida('datos', 'Escribe el número del documento.');
  if (!f.titulo.trim()) throw new ErrorDeSubida('datos', 'Escribe el título.');
  if (f.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha)) throw new ErrorDeSubida('datos', 'La fecha debe ser AAAA-MM-DD.');
  if (f.fecha && f.fecha > new Date().toISOString().slice(0, 10)) throw new ErrorDeSubida('datos', 'La fecha no puede ser futura.');
  if (!LEYES.includes(f.ley)) throw new ErrorDeSubida('datos', 'Ley aplicable no válida.');
  if (f.fuente && !/^https?:\/\//i.test(f.fuente)) throw new ErrorDeSubida('datos', 'La fuente debe ser un enlace (https://…).');
}

export interface ResultadoDeSubida {
  id: string;
  numero: string;
  fragmentos: number;
  resumen: 'listo' | 'pendiente';
  ocr: boolean;
  pdfGuardado: boolean;
}

/** Ingresa el documento: texto, fragmentos, vectores, resumen. Todo o nada. */
export async function subirALaBiblioteca(
  admin: SupabaseClient,
  args: { ruta: string; ficha: FichaConfirmada; actor: string },
): Promise<ResultadoDeSubida> {
  const f = { ...args.ficha, numero: args.ficha.numero.replace(/\s+/g, ' ').trim(), titulo: args.ficha.titulo.replace(/\s+/g, ' ').trim() };
  validarFicha(f);
  const buf = await descargarSubida(admin, args.ruta);
  const md5 = createHash('md5').update(buf).digest('hex');
  const ya = await buscarDuplicado(admin, { md5, tipo: f.tipo, numero: f.numero });
  if (ya) throw new ErrorDeSubida('duplicado', `Ya está en la biblioteca: ${ya.number ?? ya.title}.`, { documento: ya });

  const { texto, paginas, ocr } = await textoDelArchivo(buf, args.ruta);
  const trozos = chunkText(texto);
  if (trozos.length === 0) throw new ErrorDeSubida('sin_texto', 'El documento no tiene texto que indexar.');

  // Vectores antes de crear nada: si Gemini falla, no queda un documento sin fragmentos.
  let vectores: number[][] = [];
  for (let intento = 1; ; intento++) {
    try {
      vectores = await embed(trozos.map((t) => t.content), 'RETRIEVAL_DOCUMENT');
      break;
    } catch (e) {
      if (intento >= 3) throw new ErrorDeSubida('fallo', `No se pudo indexar el documento: ${(e as Error).message.slice(0, 120)}`);
      await dormir(2500 * intento);
    }
  }

  const archivo = args.ruta.split('/').pop()?.replace(/^\d+-/, '') ?? null;
  const { data: doc, error } = await admin
    .from('normative_documents')
    .insert({
      type: f.tipo,
      number: f.numero,
      title: f.titulo,
      date: f.fecha || null,
      source_url: f.fuente || null,
      raw_text: texto,
      applicable_law: [f.ley],
      metadata: {
        md5,
        archivo,
        pages: paginas || undefined,
        texto_via_ocr: ocr || undefined,
        origen: 'panel',
        subido_por: args.actor,
        subido_at: new Date().toISOString(),
        ingested_by: 'panel_biblioteca',
      },
    } as never)
    .select('id')
    .single();
  if (error || !doc) {
    if (error?.code === '23505') throw new ErrorDeSubida('duplicado', 'Ya hay un documento de ese tipo con ese número.');
    throw new ErrorDeSubida('fallo', `No se pudo guardar el documento: ${error?.message.slice(0, 140)}`);
  }
  const id = (doc as { id: string }).id;
  const deshacer = async () => {
    await admin.from('normative_chunks').delete().eq('document_id', id);
    await admin.from('normative_documents').delete().eq('id', id);
  };

  try {
    const filas = trozos.map((t, k) => ({
      document_id: id,
      chunk_index: t.index,
      content: t.content,
      embedding: vectores[k] as never,
      metadata: { source: f.numero, heading: t.heading || null } as never,
    }));
    for (let i = 0; i < filas.length; i += 25) {
      let ok = false;
      let ultimo = '';
      for (let intento = 1; intento <= 3 && !ok; intento++) {
        const { error: e } = await admin.from('normative_chunks').insert(filas.slice(i, i + 25) as never);
        ok = !e;
        ultimo = e?.message ?? '';
        if (!ok) await dormir(2000 * intento);
      }
      if (!ok) throw new Error(`fragmentos: ${ultimo.slice(0, 120)}`);
    }
  } catch (e) {
    await deshacer();
    throw new ErrorDeSubida('fallo', `No se pudieron guardar los fragmentos; no se agregó nada. ${(e as Error).message}`);
  }

  // El PDF, para tenerlo en la biblioteca (el bucket `normativa` solo admite PDF).
  let pdfGuardado = false;
  if (!esWord(args.ruta)) {
    const destino = `panel/${id}.pdf`;
    const { error: e } = await admin.storage.from('normativa').upload(destino, buf, { contentType: 'application/pdf', upsert: true });
    if (!e) {
      pdfGuardado = true;
      await admin.from('normative_documents').update({ pdf_storage_path: destino } as never).eq('id', id);
    }
  }

  // El resumen; si falla, queda para `generar-resumenes.ts`.
  let resumen: ResultadoDeSubida['resumen'] = 'pendiente';
  try {
    const r = await generateDocumentSummary({ type: f.tipo, number: f.numero, title: f.titulo, raw_text: texto });
    if (r.summary) {
      await admin
        .from('normative_documents')
        .update({ ai_summary: r.summary, ai_summary_generated_at: new Date().toISOString(), ai_summary_model: r.model } as never)
        .eq('id', id);
      resumen = 'listo';
    }
  } catch {
    /* pendiente */
  }

  await admin.storage.from('uploads').remove([args.ruta]).catch(() => {});
  await admin.from('registro_de_administracion').insert({
    actor: args.actor,
    accion: 'subir_documento',
    usuario: null,
    detalle: { documento: id, tipo: f.tipo, numero: f.numero, fragmentos: trozos.length, ocr },
  } as never);

  return { id, numero: f.numero, fragmentos: trozos.length, resumen, ocr, pdfGuardado };
}

/** Lo último que se subió desde el panel. */
export async function subidosRecientemente(admin: SupabaseClient, limite = 50) {
  const { data } = await admin
    .from('normative_documents')
    .select('id, type, number, title, date, ingested_at, metadata, ai_summary')
    .eq('metadata->>origen', 'panel')
    .order('ingested_at', { ascending: false })
    .limit(limite);
  return ((data ?? []) as Array<{ id: string; type: string; number: string | null; title: string; date: string | null; ingested_at: string; ai_summary: unknown }>).map(
    (d) => ({ id: d.id, tipo: d.type, numero: d.number, titulo: d.title, fecha: d.date, subidoEn: d.ingested_at, conResumen: !!d.ai_summary }),
  );
}
