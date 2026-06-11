import { extractText, getDocumentProxy } from 'unpdf';
import { createClient } from '@supabase/supabase-js';
import { chunkText } from '@/lib/ingestion/chunker';

const UA = 'Mozilla/5.0 (compatible; LexIA-Bot/1.0; +https://lexia.pe/bot)';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

interface IngestResult {
  inserted: boolean;
  reason?: string;
  chunkCount?: number;
  documentId?: string;
}

/**
 * Descarga un PDF desde una URL, lo extrae, lo chunkea, lo embebe con
 * Gemini y persiste todo en normative_documents + normative_chunks.
 *
 * Es idempotente: si la URL ya existe en normative_documents.source_url
 * el documento se considera ya ingestado y se saltea (returning inserted=false).
 */
export async function ingestPdfFromUrl(opts: {
  url: string;
  docType: string;
  linkText?: string;
  supabaseUrl: string;
  serviceKey: string;
  geminiKey: string;
}): Promise<IngestResult> {
  const supabase = createClient(opts.supabaseUrl, opts.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Idempotencia: ¿ya está esta URL en BD?
  const { data: existing } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('source_url', opts.url)
    .maybeSingle();
  if (existing) {
    return { inserted: false, reason: 'ya existe (source_url)' };
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
    if (!ct.includes('pdf') && !opts.url.toLowerCase().endsWith('.pdf')) {
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

  // 3. Extraer texto
  let text: string;
  let pages: number;
  try {
    const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const pdf = await getDocumentProxy(data);
    const result = await extractText(pdf, { mergePages: true });
    text = String(result.text).replace(/ /g, '').replace(/[ \t]+/g, ' ').trim();
    pages = pdf.numPages;
  } catch (e) {
    return { inserted: false, reason: `extract: ${(e as Error).message.slice(0, 120)}` };
  }
  if (text.length < 400) {
    return { inserted: false, reason: `texto insuficiente (${text.length}c, escaneo?)` };
  }

  // 4. Chunking
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return { inserted: false, reason: 'chunker no produjo chunks' };
  }

  // 5. Inferir number + title del linkText / URL
  const number = inferNumberFromText(opts.linkText || '') || basenameFromUrl(opts.url);
  const title = (opts.linkText || basenameFromUrl(opts.url)).slice(0, 240);

  // 6. Insertar documento
  const { data: inserted, error: insErr } = await supabase
    .from('normative_documents')
    .insert({
      type: opts.docType,
      number,
      title,
      source_url: opts.url,
      raw_text: text,
      metadata: { pages, ingested_by: 'scraping_bot' },
    } as never)
    .select('id')
    .single();
  if (insErr || !inserted) {
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
    metadata: { source: number, heading: c.heading } as never,
  }));
  const { error: chunkErr } = await supabase
    .from('normative_chunks')
    .insert(rows as never);
  if (chunkErr) {
    return { inserted: false, reason: `insert chunks: ${chunkErr.message}` };
  }

  return {
    inserted: true,
    chunkCount: chunks.length,
    documentId: (inserted as { id: string }).id,
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

function inferNumberFromText(s: string): string | null {
  if (!s) return null;
  // Patrones típicos: "Pronunciamiento N° 295-2026", "Opinión 023-2024/DTN", etc.
  const m = s.match(/(?:n[°º.]?\s*|n\.?\s*)?(\d+[\s\-./]\d{4}(?:[\s\-./][A-Z0-9-]+)?)/i);
  if (m) return m[1].replace(/\s+/g, '');
  return null;
}

function basenameFromUrl(u: string): string {
  try {
    const { pathname } = new URL(u);
    const last = pathname.split('/').filter(Boolean).pop() || u;
    return decodeURIComponent(last);
  } catch {
    return u;
  }
}
