import { createHash } from 'node:crypto';
import { extractText, getDocumentProxy } from 'unpdf';
import { createClient } from '@supabase/supabase-js';
import { chunkText } from '@/lib/ingestion/chunker';
import {
  classifyByPattern,
  type NormativeDocType,
} from '@/lib/scraping/classifier';
import { limpiarTexto, normalizarDocumento } from '@/lib/scraping/normalizar';
import { variantesDeFicha } from '@/lib/scraping/discover';

const UA = 'Mozilla/5.0 (compatible; A-LexIA-Bot/1.0; +https://lexia.pe/bot)';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

export interface IngestResult {
  inserted: boolean;
  reason?: string;
  chunkCount?: number;
  documentId?: string;
  /** Tipo final asignado (puede diferir del docType solicitado por reclasificación). */
  finalType?: NormativeDocType;
  /** Si el classifier reclasificó respecto del docType de la fuente. */
  reclassified?: boolean;
  /** Ya estaba en la biblioteca: no es un fallo y no se reintenta. */
  yaExiste?: boolean;
  /** El texto se obtuvo leyendo el escaneo con Gemini. */
  viaOcr?: boolean;
}

/**
 * Descarga un PDF desde una URL, lo extrae, lo chunkea, lo embebe con
 * Gemini y persiste todo en normative_documents + normative_chunks, con
 * los mismos datos que la carga manual (ver normalizar.ts): número,
 * título, fecha, régimen, entidad, año y correlativo.
 *
 * Es idempotente: si la URL (del PDF o de su ficha) o, en resoluciones,
 * su número ya están en la biblioteca, se saltea sin descargar.
 */
export async function ingestPdfFromUrl(opts: {
  url: string;
  docType: string;
  linkText?: string;
  /** La ficha de gob.pe de la que salió el PDF, si la hay. */
  fichaUrl?: string;
  /** Título y fecha que muestra la ficha. */
  fichaTitulo?: string | null;
  fichaFecha?: string | null;
  /** Leer con Gemini un escaneo sin texto. Lo decide quien llama: cuesta. */
  permitirOcr?: boolean;
  supabaseUrl: string;
  serviceKey: string;
  geminiKey: string;
}): Promise<IngestResult> {
  const supabase = createClient(opts.supabaseUrl, opts.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 0. Auto-clasificación: el docType de la fuente es un default. Si la URL
  // o el texto del link sugieren un tipo más específico (ej. la fuente es
  // "directiva" pero el link es un manual SEACE), lo sobreescribimos.
  const classified = classifyByPattern({
    url: opts.url,
    linkText: opts.fichaTitulo ?? opts.linkText,
    defaultType: opts.docType as NormativeDocType,
  });
  const finalType = classified.type;

  // 1. Idempotencia: por la URL del PDF, por la de la ficha y por el
  // número normalizado. Antes de descargar nada.
  const urls = [opts.url, ...(opts.fichaUrl ? variantesDeFicha(opts.fichaUrl) : [])];
  const { data: porUrl, error: errUrl } = await supabase.from('normative_documents').select('id').in('source_url', urls).limit(1);
  if (errUrl) return { inserted: false, reason: `consulta de existencia: ${errUrl.message.slice(0, 120)}` };
  if ((porUrl ?? []).length > 0) {
    return { inserted: false, reason: 'ya existe', yaExiste: true, finalType, reclassified: classified.reclassified };
  }
  const previo = normalizarDocumento({
    tipo: finalType,
    tituloFicha: opts.fichaTitulo,
    fechaFicha: opts.fichaFecha,
    textoEnlace: opts.linkText,
    url: opts.url,
    fichaUrl: opts.fichaUrl,
    texto: '',
  });
  const { data: porNumero } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('type', finalType)
    .eq('number', previo.number)
    .limit(1);
  if ((porNumero ?? []).length > 0) {
    return { inserted: false, reason: 'ya existe (número)', yaExiste: true, finalType, reclassified: classified.reclassified };
  }

  // 2. Descargar PDF
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  let buffer: Buffer;
  try {
    const res = await fetch(opts.url, {
      headers: { 'User-Agent': UA, Accept: 'application/pdf,*/*' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { inserted: false, reason: `HTTP ${res.status}` };
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('pdf') && !opts.url.toLowerCase().split('?')[0].endsWith('.pdf')) {
      return { inserted: false, reason: `content-type no PDF: ${ct}` };
    }
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return { inserted: false, reason: `fetch: ${(e as Error).message.slice(0, 120)}` };
  } finally {
    clearTimeout(timer);
  }

  if (buffer.byteLength < 4096) {
    return { inserted: false, reason: `PDF muy pequeño (${buffer.byteLength}b)` };
  }

  // 3. Extraer texto. Una copia: pdf.js se queda con el búfer que recibe
  // y el OCR necesita el original.
  let text: string;
  let pages: number;
  let viaOcr = false;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(buffer)));
    const result = await extractText(pdf, { mergePages: true });
    // Ojo con esta línea: durante meses fue `.replace(/ /g, '')`, que
    // borra TODOS los espacios. Salió a la luz el 06/09/2026: la primera
    // resolución ingerida se guardó como «TribunaldeContratacionesPúblicas
    // Resolución…», sin un solo espacio. Se unifican los blancos, no se
    // eliminan.
    text = limpiarTexto(String(result.text))
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    pages = pdf.numPages;
  } catch (e) {
    return { inserted: false, reason: `extract: ${(e as Error).message.slice(0, 120)}` };
  }
  if (text.length < 400) {
    if (!opts.permitirOcr) return { inserted: false, reason: `texto insuficiente (${text.length}c, escaneo)` };
    try {
      const { transcribirPdfEscaneado } = await import('@/lib/ai/ocr-pdf');
      const t = await transcribirPdfEscaneado(buffer, { nombre: opts.fichaTitulo ?? 'documento.pdf' });
      const limpio = limpiarTexto(t.texto).trim();
      if (t.tramosFallidos > 0 || limpio.length < 400) {
        return { inserted: false, reason: `escaneo: el OCR no dio texto suficiente (${limpio.length}c)` };
      }
      text = limpio;
      viaOcr = true;
    } catch (e) {
      return { inserted: false, reason: `ocr: ${(e as Error).message.slice(0, 120)}` };
    }
  }

  // 3b. ¿Ya hay un documento del mismo tipo con este mismo texto? Atrapa
  // lo que se subió a mano sin URL (el Código de Ética se volvió a traer
  // así el 24/09/2026). La función solo mira los tipos pequeños.
  const md5 = createHash('md5').update(text, 'utf8').digest('hex');
  const { data: igual } = await supabase.rpc('documento_con_el_mismo_texto', { p_type: finalType, p_md5: md5 });
  if (igual) return { inserted: false, reason: 'ya existe (mismo texto)', yaExiste: true, finalType };

  // 4. Chunking
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return { inserted: false, reason: 'chunker no produjo chunks' };
  }

  // 5. Los datos de la biblioteca, con las reglas de la carga manual.
  const norma = normalizarDocumento({
    tipo: finalType,
    tituloFicha: opts.fichaTitulo,
    fechaFicha: opts.fichaFecha,
    textoEnlace: opts.linkText,
    url: opts.url,
    fichaUrl: opts.fichaUrl,
    texto: text,
    paginas: pages,
  });

  // 6. Insertar documento (usando el tipo reclasificado, no el de la fuente)
  const { data: inserted, error: insErr } = await supabase
    .from('normative_documents')
    .insert({
      type: finalType,
      number: norma.number,
      title: norma.title,
      date: norma.date,
      applicable_law: norma.applicable_law,
      source_url: opts.fichaUrl ?? opts.url,
      raw_text: text,
      metadata: {
        ...norma.metadata,
        ingested_by: 'scraping_bot',
        source_doc_type: opts.docType,
        classifier_matched: classified.matchedRule,
        reclassified: classified.reclassified,
        pdf_url: opts.url,
        texto_via_ocr: viaOcr || undefined,
      },
    } as never)
    .select('id')
    .single();
  if (insErr || !inserted) {
    // Otra corrida lo insertó entre la comprobación y aquí: no es un fallo.
    if (insErr?.code === '23505') return { inserted: false, reason: 'ya existe (número)', yaExiste: true, finalType };
    return {
      inserted: false,
      reason: `insert doc: ${insErr?.message?.slice(0, 120)}`,
    };
  }

  // 7. Embeddings batch (Gemini)
  let embeddings: number[][];
  try {
    embeddings = await embedBatch(
      chunks.map((c) => c.content),
      opts.geminiKey,
    );
  } catch (e) {
    // rollback del doc para reintentar después
    await supabase
      .from('normative_documents')
      .delete()
      .eq('id', (inserted as { id: string }).id);
    return { inserted: false, reason: `embed: ${(e as Error).message.slice(0, 120)}` };
  }

  // 8. Insertar chunks
  const rows = chunks.map((c, i) => ({
    document_id: (inserted as { id: string }).id,
    chunk_index: c.index,
    content: c.content,
    embedding: embeddings[i] as never,
    metadata: { source: norma.number, heading: c.heading } as never,
  }));
  // De diez en diez, no todos de golpe: dos resoluciones del Tribunal
  // —la 8010 y la 8012 de 2026, de más de cuarenta fragmentos con su
  // vector cada uno— agotaban el tiempo de la sentencia y se quedaban a
  // medias, dejando el documento registrado y sin contenido, es decir
  // invisible para el chat pero contado como ya ingerido.
  const TANDA = 10;
  for (let i = 0; i < rows.length; i += TANDA) {
    // Con reintentos: bajo carga (otra ingesta escribiendo, el índice
    // vectorial reorganizándose) un lote puede pasarse del tiempo de la
    // sentencia y entrar al segundo intento (pasó el 24/09/2026).
    let chunkErr: { message: string } | null = null;
    for (let intento = 0; intento < 3; intento++) {
      ({ error: chunkErr } = await supabase.from('normative_chunks').insert(rows.slice(i, i + TANDA) as never));
      if (!chunkErr) break;
      await new Promise((r) => setTimeout(r, 2000 * (intento + 1)));
    }
    if (chunkErr) {
      // Si falla a media escritura se retira el documento entero: así el
      // siguiente intento vuelve a empezar en vez de darlo por hecho.
      await supabase
        .from('normative_documents')
        .delete()
        .eq('id', (inserted as { id: string }).id);
      return { inserted: false, reason: `insert chunks: ${chunkErr.message}` };
    }
  }

  return {
    inserted: true,
    chunkCount: chunks.length,
    documentId: (inserted as { id: string }).id,
    finalType,
    reclassified: classified.reclassified,
    viaOcr,
  };
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 25;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: slice.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBEDDING_DIM,
        })),
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
    for (const e of json.embeddings) out.push(e.values);
  }
  return out;
}
