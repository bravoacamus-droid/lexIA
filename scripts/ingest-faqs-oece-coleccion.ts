#!/usr/bin/env tsx
/**
 * Ingesta de las PREGUNTAS FRECUENTES del OECE (colección 5052 de gob.pe),
 * enviada por César el 01/08/2026.
 *
 * La colección tiene 7 entradas, de las cuales 3 YA están en la
 * biblioteca (verificado antes de escribir esto):
 *   - "Modificación del TUPA del OECE"           (no es una FAQ; ya está)
 *   - "Preguntas Frecuentes sobre la Normativa"  (la que envió en PDF)
 *   - "Preguntas Frecuentes del SEACE"
 * Este script ingiere las 4 restantes y no vuelve a subir las existentes.
 *
 * FECHA: los documentos no la traen en su texto, así que —como indicó
 * César— se usa la fecha de PUBLICACIÓN en gob.pe. Cuando el nombre del
 * archivo declara la versión vigente (ej. "4ta versión 25-08-2025"), se
 * prefiere esa por ser la del contenido que realmente se ingiere.
 *
 * Uso:
 *   npx tsx scripts/ingest-faqs-oece-coleccion.ts            (simulación)
 *   npx tsx scripts/ingest-faqs-oece-coleccion.ts --apply
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { chunkText } from '../src/lib/ingestion/chunker';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;
const APPLY = process.argv.includes('--apply');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

const COLECCION =
  'https://www.gob.pe/institucion/oece/colecciones/5052-preguntas-frecuentes-del-organismo-especializado-para-las-contrataciones-publicas-eficientes-oece';

interface Faq {
  title: string;
  /** Fecha de publicación / versión vigente. */
  date: string;
  pdf: string;
  page: string;
  /** Régimen al que corresponde el contenido. */
  law: string[];
}

const FAQS: Faq[] = [
  {
    title:
      'Preguntas Frecuentes del Procedimiento de Certificación por Niveles (OECE)',
    date: '2025-09-12',
    pdf: 'https://cdn.www.gob.pe/uploads/document/file/8652312/356160-preguntas-frecuentes-del-procedimiento-de-certificacion-por-niveles.pdf',
    page: 'https://www.gob.pe/institucion/oece/informes-publicaciones/356160-preguntas-frecuentes-del-procedimiento-de-certificacion-por-niveles',
    law: ['ley_32069'],
  },
  {
    title:
      'Preguntas Frecuentes sobre el Registro de Instituciones Arbitrales y Centros de Administración de Juntas de Prevención y Resolución de Disputas (REGAJU)',
    date: '2025-09-02',
    pdf: 'https://cdn.www.gob.pe/uploads/document/file/8585339/7105407-preguntas-frecuentes-sobre-el-registro-de-instituciones-arbitrales-y-centros-de-administracion-de-juntas-de-prevencion-y-resolucion-de-disputas-regaju.pdf',
    page: 'https://www.gob.pe/institucion/oece/informes-publicaciones/7105407-preguntas-frecuentes-sobre-el-registro-de-instituciones-arbitrales-y-centros-de-administracion-de-juntas-de-prevencion-y-resolucion-de-disputas-regaju',
    law: ['ley_32069'],
  },
  {
    title:
      'Preguntas Frecuentes sobre Procedimientos ante el Registro Nacional de Proveedores (RNP)',
    // La entrada de gob.pe data de 2021, pero el PDF vigente es la 4ta
    // versión del 25-08-2025: se usa la del contenido que se ingiere.
    date: '2025-08-25',
    pdf: 'https://cdn.www.gob.pe/uploads/document/file/8542117/1134646-preguntas-frecuentes-sobre-procedimientos-ante-el-registro-nacional-de-proveedores-rnp-4ta-version-25-08-2025-vigente.pdf',
    page: 'https://www.gob.pe/institucion/oece/informes-publicaciones/1134646-preguntas-frecuentes-sobre-procedimientos-ante-el-registro-nacional-de-proveedores-rnp',
    law: ['ley_32069'],
  },
  {
    title:
      'Preguntas Frecuentes sobre la Ley N° 30225 y su Reglamento (régimen vigente hasta el 21-04-2025)',
    date: '2023-01-12',
    pdf: 'https://cdn.www.gob.pe/uploads/document/file/4040464/Preguntas%20frecuentes%20sobre%20la%20normativa%20de%20Contrataciones%20del%20Estado%20-%2012.01.2023.pdf',
    page: 'https://www.gob.pe/institucion/oece/informes-publicaciones/1239321-preguntas-frecuentes-sobre-la-ley-n-30225-y-su-reglamento-vigente-hasta-el-21-04-2025',
    // Régimen anterior: se marca como 30225 para que el selector de ley
    // no la mezcle con la normativa vigente.
    law: ['ley_30225'],
  },
];

/** La FAQ que ya teníamos sin fecha — la colección da su publicación. */
const FECHA_FAQ_NORMATIVA = '2026-04-22';

async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 25;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
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
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
    for (const e of json.embeddings) out.push(e.values);
    process.stdout.write(`\r    embeddings ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
    await new Promise((r) => setTimeout(r, 1200));
  }
  process.stdout.write('\n');
  return out;
}

/** Palabras significativas del título, para detectar si ya está. */
function huella(t: string): string[] {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !['preguntas', 'frecuentes', 'sobre'].includes(w));
}

async function main() {
  console.log(`Colección: ${COLECCION}\n`);

  const { data: existentes } = await supabase
    .from('normative_documents')
    .select('id, title, date');
  const yaEstan = (existentes || []) as Array<{ id: string; title: string; date: string | null }>;

  // 1. Completar la fecha de la FAQ que ya teníamos sin ella.
  const faqNormativa = yaEstan.find((d) =>
    /preguntas frecuentes sobre la normativa/i.test(d.title),
  );
  if (faqNormativa && !faqNormativa.date) {
    console.log(
      `▸ Fecha de publicación para "${faqNormativa.title.slice(0, 50)}": ${FECHA_FAQ_NORMATIVA}`,
    );
    if (APPLY) {
      await supabase
        .from('normative_documents')
        .update({
          date: FECHA_FAQ_NORMATIVA,
          metadata: { anio: FECHA_FAQ_NORMATIVA.slice(0, 4), entidad: 'OECE', fecha_origen: 'publicación en gob.pe' },
        } as never)
        .eq('id', faqNormativa.id);
      console.log('   ✅ aplicada');
    }
  }

  // 2. Ingerir las que faltan.
  for (const faq of FAQS) {
    const claves = huella(faq.title).slice(0, 3);
    const duplicado = yaEstan.find((d) => {
      const t = d.title.toLowerCase();
      // Debe ser OTRA pregunta frecuente, no cualquier documento que
      // comparta vocabulario: sin esta condición la FAQ del REGAJU se
      // confundía con la "Directiva N° 004-2025 - Registro de
      // Instituciones Arbitrales", que repite las mismas palabras.
      if (!/preguntas\s+frecuentes/i.test(t)) return false;
      return claves.length > 0 && claves.every((k) => t.includes(k));
    });
    if (duplicado) {
      console.log(`⏭️  Ya existe: ${faq.title.slice(0, 58)}`);
      continue;
    }

    console.log(`\n▸ ${faq.title.slice(0, 66)}`);
    console.log(`   publicación: ${faq.date} | régimen: ${faq.law[0]}`);
    if (!APPLY) {
      console.log('   (simulación — no se descarga)');
      continue;
    }

    const res = await fetch(faq.pdf, { headers: HEADERS });
    if (!res.ok) {
      console.error(`   ❌ descarga falló: HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const raw = String(text).trim();
    console.log(`   ${pdf.numPages} págs · ${raw.length} chars`);
    if (raw.length < 500) {
      console.error('   ❌ texto insuficiente (¿PDF escaneado?) — se omite');
      continue;
    }

    const chunks = chunkText(raw);
    console.log(`   ${chunks.length} fragmentos`);
    const embeddings = await embedBatch(chunks.map((c) => c.content));

    const { data: doc, error } = await supabase
      .from('normative_documents')
      .insert({
        type: 'guia',
        number: faq.title.slice(0, 90),
        title: faq.title,
        raw_text: raw,
        date: faq.date,
        source_url: faq.page,
        applicable_law: faq.law,
        metadata: {
          entidad: 'OECE',
          anio: faq.date.slice(0, 4),
          fecha_origen: 'publicación en gob.pe',
          coleccion: 'Preguntas Frecuentes del OECE (5052)',
        } as never,
      } as never)
      .select('id')
      .single();
    if (error || !doc) {
      console.error(`   ❌ ${error?.message}`);
      continue;
    }

    const filas = chunks.map((c, i) => ({
      document_id: (doc as { id: string }).id,
      chunk_index: i,
      content: c.content,
      embedding: JSON.stringify(embeddings[i]),
      metadata: { heading: c.heading || null } as never,
    }));
    for (let i = 0; i < filas.length; i += 50) {
      const { error: e } = await supabase
        .from('normative_chunks')
        .insert(filas.slice(i, i + 50) as never);
      if (e) throw new Error(`chunks [${i}]: ${e.message}`);
    }
    console.log(`   ✅ ingerido (${filas.length} fragmentos)`);
  }

  if (!APPLY) console.log('\n(simulación — ejecuta con --apply)');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
