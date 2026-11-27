#!/usr/bin/env tsx
/**
 * Pone al día el texto consolidado de la Ley N° 32069 y su Reglamento con
 * lo que salió después de la edición de Editora Perú «actualizada al
 * 04/02/2026» (reunión con César del 27/11/2026: «este reglamento hace poco
 * ha sido modificado con un decreto… ya lo pones acá nomás»).
 *
 * Tres cambios, con el texto literal de la norma que modifica y la nota
 * «(*)» con que Editora Perú anota sus consolidados:
 *   1. Art. 7.1 b) de la Ley — Sexta DCM de la Ley N° 32515 (quita «fuera
 *      del territorio nacional»).
 *   2. Art. 7.1 r) de la Ley — Décimo Primera DCM de la Ley N° 32515
 *      (encargos ≤ 8 UIT y caja chica).
 *   3. Decimocuarta DCF del Reglamento — art. 3 del D.S. N° 222-2026-EF
 *      (certificación: fecha límite 30/04/2028).
 *
 * Se parchan `raw_text` y `texto_estructurado` del MISMO documento, con el
 * mismo número (parte-de-norma.ts y ejecucion/sustento.ts lo buscan así),
 * y solo los fragmentos que contienen esos pasajes (se re-vectorizan; los
 * demás no cambian). Los resaltados de los usuarios se reubican por texto
 * (`indice-de-texto.ts`), así que no se pierden.
 *
 * Además entran como documentos propios las normas modificatorias:
 *   · D.S. N° 001-2026-EF y D.S. N° 222-2026-EF — tipo `reglamento`.
 *   · Ley N° 32515, solo sus disposiciones Sexta y Décimo Primera DCM —
 *     tipo `ley`, con un título sin «Reglamento» para no chocar con el
 *     `maybeSingle()` de `ejecucion/sustento.ts`.
 *
 * Idempotente: si el consolidado ya tiene el literal r), no lo vuelve a
 * parchar; las normas nuevas se omiten si su número ya está.
 *
 * Uso: npx tsx scripts/actualizar-reglamento-nov-2026.ts [--dry-run] [--carpeta=…]
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { chunkText } from '../src/lib/ingestion/chunker';
import { recortarDeElPeruano } from '../src/lib/ingestion/el-peruano';
import { embed } from '../src/lib/ai/embeddings';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const db = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const DRY_RUN = process.argv.includes('--dry-run');
const RAIZ =
  process.argv.find((a) => a.startsWith('--carpeta='))?.slice(10).replace(/^"|"$/g, '') ??
  'C:/Users/luigi/Documents/cesar';
const CONSOLIDADO = '670afae4-9d5f-44f4-bd68-9d24eb1eaf8b';

// ── Textos literales (de los PDF de El Peruano que entregó César) ─────

const B_ANTES =
  'b) Las contrataciones realizadas por los órganos del Servicio Exterior de la República fuera del territorio nacional, exclusivamente para su funcionamiento y gestión.';
const B_TEXTO =
  'b) Las contrataciones realizadas por los órganos del Servicio Exterior de la República exclusivamente para su funcionamiento y gestión.';
const B_NOTA =
  '(*) Literal modificado por la Sexta Disposición Complementaria Modificatoria de la Ley N° 32515, publicada el 4 de diciembre de 2025.';

const Q_LITERAL = 'q) Las contrataciones que se sujetan a regímenes especiales.';
const R_TEXTO =
  'r) Las contrataciones efectuadas con fondos provenientes de encargos a personal de la institución, siempre que sean iguales o inferiores a ocho Unidades Impositivas Tributarias (UIT) vigentes al momento de la contratación, y las contrataciones con fondos provenientes de caja chica, conforme a las disposiciones del Sistema Nacional de Tesorería.';
const R_NOTA =
  '(*) Literal incorporado por la Décimo Primera Disposición Complementaria Modificatoria de la Ley N° 32515, publicada el 4 de diciembre de 2025.';

const D14_CUERPO_ANTES =
  'En un plazo no mayor de dieciocho meses desde la entrada en vigencia del presente Reglamento, el OECE implementa el nuevo modelo de certificación regulado en el artículo 16 del Reglamento.';
const D14_CUERPO =
  'El OECE establece, mediante comunicado, la fecha de inicio de la implementación progresiva del nuevo modelo de certificación regulado en el artículo 16 del Reglamento. El inicio de dicha implementación tiene como fecha límite el 30 de abril de 2028.';
const D14_NOTA_ANTES = 'Artículo modificado por el artículo 2 del Decreto Supremo N° 001-2026-EF publicado el 8 de enero de 2026.';
const D14_NOTA =
  'Disposición modificada por el artículo 3 del Decreto Supremo N° 222-2026-EF, publicado el 21 de octubre de 2026 (antes, por el artículo 2 del Decreto Supremo N° 001-2026-EF, publicado el 8 de enero de 2026).';

/** Reemplaza exactamente una vez; si no está o está más de una vez, falla. */
function unaVez(texto: string, antes: string, despues: string, que: string): string {
  const i = texto.indexOf(antes);
  if (i < 0) throw new Error(`${que}: no se encontró el pasaje`);
  if (texto.indexOf(antes, i + 1) >= 0) throw new Error(`${que}: el pasaje aparece más de una vez`);
  return texto.slice(0, i) + despues + texto.slice(i + antes.length);
}

function parcharPlano(t: string): string {
  t = unaVez(t, B_ANTES, `${B_TEXTO} ${B_NOTA}`, 'raw 7.1 b');
  t = unaVez(t, `${Q_LITERAL} 7.2.`, `${Q_LITERAL} ${R_TEXTO} ${R_NOTA} 7.2.`, 'raw 7.1 r');
  // La nota del D.S. 001 se repite en otros artículos: se cambia la que va pegada a la Decimocuarta.
  t = unaVez(t, `${D14_CUERPO_ANTES}” (*) ${D14_NOTA_ANTES}`, `${D14_CUERPO}” (*) ${D14_NOTA}`, 'raw DCF 14');
  return t;
}

function parcharEstructurado(t: string): string {
  t = unaVez(
    t,
    `- **b)** ${B_ANTES.slice(3)}`,
    `- **b)** ${B_TEXTO.slice(3)} **(*)**\n\n  **${B_NOTA.slice(4)}**`,
    'md 7.1 b',
  );
  t = unaVez(
    t,
    `- **q)** ${Q_LITERAL.slice(3)}\n\n`,
    `- **q)** ${Q_LITERAL.slice(3)}\n\n- **r)** ${R_TEXTO.slice(3)} **(*)**\n\n  **${R_NOTA.slice(4)}**\n\n`,
    'md 7.1 r',
  );
  t = unaVez(
    t,
    `${D14_CUERPO_ANTES}**” (*)** \n\n**${D14_NOTA_ANTES}**`,
    `${D14_CUERPO}**” (*)** \n\n**${D14_NOTA}**`,
    'md DCF 14',
  );
  return t;
}

// ── Normas modificatorias como documentos propios ────────────────────

function buscarPdf(patron: RegExp, dir = RAIZ): string | null {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      const r = buscarPdf(patron, p);
      if (r) return r;
    } else if (patron.test(e)) return p;
  }
  return null;
}

async function textoDelPdf(ruta: string): Promise<{ texto: string; paginas: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(ruta)));
  const r = await extractText(pdf, { mergePages: true });
  return { texto: String(r.text).replace(/\u0000/g, '').trim(), paginas: pdf.numPages };
}

interface NormaNueva {
  type: 'reglamento' | 'ley';
  number: string;
  title: string;
  date: string;
  texto: string;
  paginas: number;
  archivo: string;
  nota: string;
}

async function normasNuevas(): Promise<NormaNueva[]> {
  const salida: NormaNueva[] = [];

  const p001 = buscarPdf(/ds001_2026ef\.pdf$/i);
  if (!p001) throw new Error('falta el PDF del D.S. 001-2026-EF');
  const d001 = await textoDelPdf(p001);
  salida.push({
    type: 'reglamento',
    number: 'Decreto Supremo N° 001-2026-EF',
    title: 'Decreto Supremo N° 001-2026-EF — Modifica el Reglamento de la Ley N° 32069, Ley General de Contrataciones Públicas',
    date: '2026-01-08',
    texto: recortarDeElPeruano(d001.texto, /001-2026-EF/),
    paginas: d001.paginas,
    archivo: p001,
    nota: 'Ya incorporado en el texto consolidado de Editora Perú (actualizado al 04/02/2026).',
  });

  const p222 = buscarPdf(/222-2026-ef\.pdf$/i);
  if (!p222) throw new Error('falta el PDF del D.S. 222-2026-EF');
  const d222 = await textoDelPdf(p222);
  salida.push({
    type: 'reglamento',
    number: 'Decreto Supremo N° 222-2026-EF',
    title:
      'Decreto Supremo N° 222-2026-EF — Modifica la Decimocuarta Disposición Complementaria Final del Reglamento de la Ley N° 32069 (nuevo modelo de certificación)',
    date: '2026-10-21',
    texto: recortarDeElPeruano(d222.texto, /222-2026-EF/),
    paginas: d222.paginas,
    archivo: p222,
    nota: 'Incorporado por A-LexIA al texto consolidado el 27/11/2026.',
  });

  const pLey = buscarPdf(/ley32515\.pdf$/i);
  if (!pLey) throw new Error('falta el PDF de la Ley 32515');
  const ley = (await textoDelPdf(pLey)).texto.replace(/\s+/g, ' ');
  const sexta = ley.match(/SEXTA\. Modificación del literal b\) del numeral 7\.1 del artículo 7 de la Ley 32069[\s\S]*?\(…\)”/)?.[0];
  const undecima = ley.match(/DÉCIMO PRIMERA\. Incorporación de un supuesto excluido del ámbito de aplicación de la Ley 32069[\s\S]*?Sistema Nacional de Tesorería”/)?.[0];
  if (!sexta || !undecima) throw new Error('no se encontraron la Sexta o la Décimo Primera DCM en la Ley 32515');
  salida.push({
    type: 'ley',
    number: 'Ley N° 32515',
    title:
      'Ley N° 32515, Ley de Endeudamiento del Sector Público para el Año Fiscal 2026 — disposiciones que modifican el artículo 7 de la Ley N° 32069',
    date: '2025-12-04',
    texto: [
      'LEY Nº 32515',
      'LEY DE ENDEUDAMIENTO DEL SECTOR PÚBLICO PARA EL AÑO FISCAL 2026',
      'Publicada en el diario oficial El Peruano el 4 de diciembre de 2025.',
      'Extracto: solo las disposiciones complementarias modificatorias que cambian la Ley N° 32069, Ley General de Contrataciones Públicas. El resto de la ley trata del endeudamiento público.',
      'DISPOSICIONES COMPLEMENTARIAS MODIFICATORIAS',
      sexta,
      undecima,
    ].join('\n\n'),
    paginas: 0,
    archivo: pLey,
    nota: 'Incorporado por A-LexIA al texto consolidado el 27/11/2026.',
  });
  return salida;
}

async function guardarNorma(n: NormaNueva) {
  const { data: ya } = await db.from('normative_documents').select('id').eq('number', n.number).maybeSingle();
  if (ya) return `${n.number}: ya estaba`;
  const trozos = chunkText(n.texto);
  if (DRY_RUN) return `${n.number}: simulación · ${trozos.length} trozos · ${n.texto.length} c`;
  const vectores = await embed(trozos.map((t) => t.content), 'RETRIEVAL_DOCUMENT');
  const { data: doc, error } = await db
    .from('normative_documents')
    .insert({
      type: n.type,
      number: n.number,
      title: n.title,
      date: n.date,
      source_url: null,
      raw_text: n.texto,
      applicable_law: ['ley_32069'],
      metadata: {
        entidad: 'MEF / Congreso',
        pages: n.paginas || undefined,
        archivo: n.archivo.split(/[\\/]/).pop(),
        modifica: 'Ley N° 32069 y su Reglamento (D.S. N° 009-2025-EF)',
        nota: n.nota,
        entregado_por: 'César, 27/11/2026',
        ingested_by: 'actualizar_reglamento_nov_2026',
      },
    } as never)
    .select('id')
    .single();
  if (error || !doc) throw new Error(`${n.number}: ${error?.message}`);
  const id = (doc as { id: string }).id;
  const filas = trozos.map((t, k) => ({
    document_id: id,
    chunk_index: t.index,
    content: t.content,
    embedding: vectores[k] as never,
    metadata: { source: n.number, heading: t.heading || null } as never,
  }));
  // Por lotes: 42 fragmentos de una vez pasaron el tiempo máximo de la base.
  for (let i = 0; i < filas.length; i += 10) {
    let error: string | null = null;
    for (let intento = 1; intento <= 3; intento++) {
      const { error: e } = await db.from('normative_chunks').insert(filas.slice(i, i + 10) as never);
      error = e?.message ?? null;
      if (!error) break;
      await new Promise((r) => setTimeout(r, 3000 * intento));
    }
    if (error) {
      await db.from('normative_chunks').delete().eq('document_id', id);
      await db.from('normative_documents').delete().eq('id', id);
      throw new Error(`${n.number}: fragmentos: ${error}`);
    }
  }
  return `${n.number}: ingestado · ${trozos.length} trozos`;
}

async function main() {
  // 1. El consolidado.
  const { data: doc, error } = await db
    .from('normative_documents')
    .select('id, number, title, raw_text, texto_estructurado, metadata')
    .eq('id', CONSOLIDADO)
    .single();
  if (error || !doc) throw new Error(`consolidado: ${error?.message}`);
  if ((doc.raw_text as string).includes(R_TEXTO.slice(0, 80))) {
    console.log('· El consolidado ya tiene el literal r): no se vuelve a parchar.');
  } else {
    const raw = parcharPlano(doc.raw_text as string);
    const md = doc.texto_estructurado ? parcharEstructurado(doc.texto_estructurado as string) : null;
    const titulo = (doc.title as string).replace(
      /actualizado al 04-02-2026$/,
      'actualizado al 04-02-2026, con el D.S. N° 222-2026-EF y la Ley N° 32515 incorporados (27-11-2026)',
    );
    console.log(`· raw_text ${(doc.raw_text as string).length} → ${raw.length} c; estructurado ${md ? 'parchado' : 'no tiene'}`);
    console.log(`· título: ${titulo}`);

    // Los fragmentos que contienen los pasajes.
    const cambios: Array<{ id: string; content: string }> = [];
    for (const [antes, despues] of [
      [B_ANTES, `${B_TEXTO} ${B_NOTA}`],
      [`${Q_LITERAL} 7.2.`, `${Q_LITERAL} ${R_TEXTO} ${R_NOTA} 7.2.`],
      [`${D14_CUERPO_ANTES}” (*) ${D14_NOTA_ANTES}`, `${D14_CUERPO}” (*) ${D14_NOTA}`],
      [D14_CUERPO_ANTES, D14_CUERPO],
    ] as const) {
      const { data: frs } = await db
        .from('normative_chunks')
        .select('id, content')
        .eq('document_id', CONSOLIDADO)
        .ilike('content', `%${antes.slice(0, 60)}%`);
      for (const f of (frs ?? []) as Array<{ id: string; content: string }>) {
        const previo = cambios.find((c) => c.id === f.id);
        const base = previo?.content ?? f.content;
        // El pasaje puede estar cortado al final de un fragmento por el solape: se cambia lo que haya entero.
        const nuevo = base.includes(antes) ? base.replace(antes, despues) : base;
        if (nuevo === base) continue;
        if (previo) previo.content = nuevo;
        else cambios.push({ id: f.id, content: nuevo });
      }
    }
    console.log(`· fragmentos a re-vectorizar: ${cambios.length}`);
    if (!DRY_RUN) {
      const vectores = await embed(cambios.map((c) => c.content), 'RETRIEVAL_DOCUMENT');
      const { error: e1 } = await db
        .from('normative_documents')
        .update({
          raw_text: raw,
          ...(md ? { texto_estructurado: md, texto_estructurado_at: new Date().toISOString() } : {}),
          title: titulo,
          metadata: {
            ...((doc.metadata as Record<string, unknown>) ?? {}),
            modificaciones_incorporadas: [
              { norma: 'Ley N° 32515 (Sexta y Décimo Primera DCM)', publicada: '2025-12-04', cambia: 'art. 7.1 b) y r) de la Ley' },
              { norma: 'D.S. N° 222-2026-EF (art. 3)', publicada: '2026-10-21', cambia: 'Decimocuarta DCF del Reglamento' },
            ],
            actualizado_por_alexia: '2026-11-27',
          },
        } as never)
        .eq('id', CONSOLIDADO);
      if (e1) throw new Error(`consolidado: ${e1.message}`);
      for (let k = 0; k < cambios.length; k++) {
        const { error: e2 } = await db
          .from('normative_chunks')
          .update({ content: cambios[k].content, embedding: vectores[k] as never } as never)
          .eq('id', cambios[k].id);
        if (e2) throw new Error(`fragmento ${cambios[k].id}: ${e2.message}`);
      }
      console.log('· consolidado actualizado');
    }
  }

  // 2. Las normas modificatorias como documentos propios.
  for (const n of await normasNuevas()) console.log('·', await guardarNorma(n));
}

main().catch((e) => {
  console.error('❌', (e as Error).message);
  process.exit(1);
});
