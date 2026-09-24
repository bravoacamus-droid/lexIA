#!/usr/bin/env tsx
/**
 * Normaliza lo que trajo el actualizador automático antes del 24/09/2026.
 *
 * Esos documentos (resoluciones, opiniones, pronunciamientos, directivas)
 * se guardaron sin fecha, sin año, sin correlativo y sin entidad, con el
 * número tal como venía («000076-2026-OECE-DTN») y la URL del PDF en vez
 * de la de la ficha. En la biblioteca quedaban fuera de orden y de los
 * filtros. Aquí se les aplican las mismas reglas que a la carga manual
 * (src/lib/scraping/normalizar.ts), recuperando de gob.pe la ficha de
 * cada uno: su URL, su título oficial y su fecha.
 *
 * Si el número normalizado ya existe en la biblioteca, se compara el
 * contenido: si es el mismo documento, se retira el duplicado; si no,
 * no se toca y se informa.
 *
 * Uso:
 *   npx tsx scripts/normalizar-documentos-del-actualizador.ts          (simula)
 *   npx tsx scripts/normalizar-documentos-del-actualizador.ts --apply
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
loadEnv({ path: join(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';
import { discoverLinks, resolverPdfDeFicha } from '../src/lib/scraping/discover';
import { normalizarDocumento } from '../src/lib/scraping/normalizar';
import { claveDeResolucion } from '../src/lib/scraping/resoluciones';
import { classifyByPattern } from '../src/lib/scraping/classifier';

const APPLY = process.argv.includes('--apply');
const supabase = createClient((process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sinVersion = (u: string) => u.split('?')[0];

interface Doc {
  id: string;
  type: string;
  number: string;
  title: string;
  source_url: string;
  raw_text: string;
  metadata: Record<string, unknown>;
}

/** El mismo documento: mismo largo (±2 %) y mismo comienzo. */
function mismoContenido(a: string, b: string): boolean {
  const n = (s: string) => s.replace(/\s+/g, ' ').trim();
  const x = n(a);
  const y = n(b);
  if (!x || !y) return false;
  const ratio = Math.min(x.length, y.length) / Math.max(x.length, y.length);
  return ratio > 0.98 && x.slice(200, 1500) === y.slice(200, 1500);
}

async function main() {
  console.log(APPLY ? 'MODO APLICAR\n' : 'SIMULACIÓN — no escribe nada\n');
  const { data, error } = await supabase
    .from('normative_documents')
    .select('id, type, number, title, source_url, raw_text, metadata')
    .eq('metadata->>ingested_by', 'scraping_bot');
  if (error) throw new Error(error.message);
  const docs = (data ?? []) as Doc[];
  const pendientes = docs.filter((d) => !d.metadata?.anio || d.type === 'resolucion');
  console.log(`Del actualizador: ${docs.length} · sin normalizar: ${pendientes.length}\n`);

  // Las fichas de gob.pe: las resoluciones por el censo del Tribunal; lo
  // demás, recorriendo el índice de su colección.
  const censo = new Map<string, string>();
  for (const f of ['data/tcp-index-tcp32069.jsonl', 'data/tcp-index.jsonl']) {
    for (const l of readFileSync(f, 'utf8').split('\n')) {
      if (!l.trim()) continue;
      try {
        const r = JSON.parse(l) as { key: string; url: string };
        if (!censo.has(r.key)) censo.set(r.key, r.url);
      } catch {
        /* línea corrupta */
      }
    }
  }
  const { data: fuentes } = await supabase.from('scraping_sources').select('url, doc_type, link_selector, link_filter_regex, pdf_selector');
  const porPdf = new Map<string, { ficha: string; titulo: string; fecha: string | null }>();
  const tiposPendientes = new Set(pendientes.filter((d) => d.type !== 'resolucion_tce').map((d) => d.type));
  for (const f of (fuentes ?? []) as Array<{ url: string; doc_type: string; link_selector: string; link_filter_regex: string | null; pdf_selector: string }>) {
    if (!tiposPendientes.has(f.doc_type)) continue;
    const faltan = () => pendientes.filter((d) => d.type === f.doc_type && !porPdf.has(sinVersion(d.source_url))).length;
    for (let hoja = 1; hoja <= 6 && faltan() > 0; hoja++) {
      const url = f.url.replace(/sheet=\d+/, `sheet=${hoja}`);
      const links = await discoverLinks({ sourceUrl: url, linkSelector: f.link_selector || 'a[href]', linkFilterRegex: f.link_filter_regex });
      for (const l of links) {
        const ficha = await resolverPdfDeFicha(l.url, f.pdf_selector);
        if (ficha) porPdf.set(sinVersion(ficha.url), { ficha: l.url, titulo: ficha.titulo, fecha: ficha.fecha });
        await sleep(300);
      }
      console.log(`  ${f.doc_type} hoja ${hoja}: ${links.length} fichas leídas · faltan ${faltan()}`);
    }
  }

  let normalizados = 0;
  let duplicados = 0;
  let sinFicha = 0;
  let conflictos = 0;
  for (const d of pendientes) {
    // El tipo, con el clasificador corregido: diecisiete resoluciones del
    // Tribunal habían quedado como `resolucion` directoral.
    const tipo = classifyByPattern({
      url: d.source_url,
      linkText: d.title,
      defaultType: ((d.metadata?.source_doc_type as string) || d.type) as never,
    }).type as string;
    if (tipo !== d.type) console.log(`  TIPO       ${d.number}: ${d.type} → ${tipo}`);
    d.type = tipo;
    let fichaUrl: string | null = null;
    let tituloFicha: string | null = d.title;
    let fechaFicha: string | null = null;
    if (d.type === 'resolucion_tce') {
      const c = claveDeResolucion(d.title) ?? claveDeResolucion(d.number);
      fichaUrl = c ? censo.get(`${c.numero}-${c.anio}-${c.sala}`) ?? null : null;
    } else {
      const f = porPdf.get(sinVersion(d.source_url));
      if (f) {
        fichaUrl = f.ficha;
        tituloFicha = f.titulo || d.title;
        fechaFicha = f.fecha;
      }
    }
    if (!fichaUrl) sinFicha++;
    const n = normalizarDocumento({
      tipo: d.type,
      tituloFicha,
      fechaFicha,
      url: d.source_url,
      fichaUrl,
      texto: d.raw_text ?? '',
      paginas: (d.metadata?.pages as number | undefined) ?? undefined,
    });

    // ¿Ese número ya lo tiene otro documento?
    const { data: otro } = await supabase
      .from('normative_documents')
      .select('id, raw_text')
      .eq('type', d.type)
      .eq('number', n.number)
      .neq('id', d.id)
      .limit(1)
      .maybeSingle();
    if (otro) {
      if (mismoContenido(d.raw_text ?? '', (otro as { raw_text: string }).raw_text ?? '')) {
        duplicados++;
        console.log(`  DUPLICADO  ${n.number} — se retira la copia del actualizador`);
        if (APPLY) await supabase.from('normative_documents').delete().eq('id', d.id);
      } else {
        conflictos++;
        console.log(`  CONFLICTO  ${n.number} — otro documento con el mismo número y distinto contenido: no se toca`);
      }
      continue;
    }

    console.log(`  ${d.number.padEnd(24)} → ${n.number} · ${n.date} · ${n.metadata.entidad} · ${n.metadata.anio}-${n.metadata.correlativo}${fichaUrl ? '' : ' · (sin ficha)'}`);
    normalizados++;
    if (APPLY) {
      const { error: e } = await supabase
        .from('normative_documents')
        .update({
          type: tipo,
          number: n.number,
          title: n.title,
          date: n.date,
          applicable_law: n.applicable_law,
          source_url: fichaUrl ?? d.source_url,
          metadata: { ...d.metadata, ...n.metadata, pdf_url: d.metadata?.pdf_url ?? d.source_url },
        } as never)
        .eq('id', d.id);
      if (e) console.log(`    ✗ ${e.message}`);
    }
  }
  console.log(`\nNormalizados: ${normalizados} · duplicados retirados: ${duplicados} · conflictos: ${conflictos} · sin ficha encontrada: ${sinFicha}`);
  if (!APPLY) console.log('(simulación — ejecuta con --apply)');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
