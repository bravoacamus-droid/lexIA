#!/usr/bin/env tsx
/**
 * Carga lo publicado antes de la fecha de corte del actualizador.
 *
 * Desde el 24/09/2026 el actualizador diario solo trae lo fechado desde
 * su fecha de corte; lo anterior que aparezca en los índices lo anota
 * para cargarlo a mano. Esto es cargarlo a mano: recorre las páginas del
 * índice de cada fuente —de lo más reciente hacia atrás— y trae lo que
 * falte, con el MISMO ingestor que el actualizador (mismos datos
 * normalizados, misma comprobación de lo que ya existe, OCR para los
 * escaneos). Se detiene en cuanto una página entera ya está en la
 * biblioteca: ahí se alcanzó lo que ya se tenía.
 *
 * Las resoluciones del Tribunal van por su propia ingesta masiva
 * (scripts/ingest-resoluciones-tribunal.ts), que trabaja con el censo.
 *
 * Uso:
 *   npx tsx scripts/cargar-anteriores-al-corte.ts --tipos=opinion,pronunciamiento,directiva
 *   npx tsx scripts/cargar-anteriores-al-corte.ts --url=https://www.gob.pe/institucion/oece/normas-legales/…
 *   (--simular para no escribir)
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
loadEnv({ path: join(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';
import { discoverLinks, resolverPdfDeFicha, variantesDeFicha } from '../src/lib/scraping/discover';
import { ingestPdfFromUrl } from '../src/lib/scraping/ingest';

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const TIPOS = (arg('tipos') ?? 'opinion,pronunciamiento,directiva').split(',');
const URL_SOLA = arg('url');
const TIPO_URL = arg('tipo') ?? 'resolucion_tce';
const SIMULAR = process.argv.includes('--simular');
const MAX_HOJAS = Number(arg('hojas') ?? 12);

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function conocidas(urls: string[]): Promise<Set<string>> {
  const deVariante = new Map<string, string[]>();
  for (const u of urls) for (const v of variantesDeFicha(u)) deVariante.set(v, [...(deVariante.get(v) ?? []), u]);
  const vars = [...deVariante.keys()];
  const out = new Set<string>();
  for (let k = 0; k < vars.length; k += 100) {
    const { data, error } = await supabase.from('normative_documents').select('source_url').in('source_url', vars.slice(k, k + 100));
    if (error) throw new Error(error.message);
    for (const d of (data ?? []) as Array<{ source_url: string }>) for (const u of deVariante.get(d.source_url) ?? []) out.add(u);
  }
  return out;
}

async function cargarUna(fichaUrl: string, tipo: string, pdfSelector = 'a[href*=".pdf"]'): Promise<string> {
  const ficha = await resolverPdfDeFicha(fichaUrl, pdfSelector);
  if (!ficha) return 'sin PDF en la ficha';
  if (SIMULAR) return `simulado: ${ficha.titulo} (${ficha.fecha})`;
  const r = await ingestPdfFromUrl({
    url: ficha.url,
    docType: tipo,
    linkText: ficha.titulo,
    fichaUrl,
    fichaTitulo: ficha.titulo,
    fichaFecha: ficha.fecha,
    permitirOcr: true,
    supabaseUrl: SUPABASE_URL,
    serviceKey: SERVICE_KEY,
    geminiKey: GEMINI_KEY,
  });
  if (r.inserted) {
    await supabase.from('scraping_fallos').delete().eq('url', fichaUrl);
    return `ok · ${ficha.titulo} · ${r.chunkCount} frag${r.viaOcr ? ' (OCR)' : ''}`;
  }
  if (r.yaExiste) {
    await supabase.from('scraping_fallos').delete().eq('url', fichaUrl);
    return `ya estaba · ${ficha.titulo}`;
  }
  return `FALLÓ · ${ficha.titulo} · ${r.reason}`;
}

async function main() {
  if (URL_SOLA) {
    console.log(await cargarUna(URL_SOLA, TIPO_URL));
    return;
  }
  const { data: fuentes } = await supabase.from('scraping_sources').select('*').in('doc_type', TIPOS);
  for (const f of (fuentes ?? []) as Array<{ label: string; url: string; doc_type: string; link_selector: string; link_filter_regex: string | null; pdf_selector: string }>) {
    console.log(`\n══ ${f.label}`);
    let ok = 0;
    let fallos = 0;
    let anterior = '';
    for (let hoja = 1; hoja <= MAX_HOJAS; hoja++) {
      const url = f.url.replace(/sheet=\d+/, `sheet=${hoja}`);
      const links = await discoverLinks({ sourceUrl: url, linkSelector: f.link_selector || 'a[href]', linkFilterRegex: f.link_filter_regex });
      if (links.length === 0) break;
      // Una colección de una sola página devuelve la misma para cualquier
      // número de hoja: si se repite, no hay más.
      const firma = links.map((l) => l.url).join('|');
      if (firma === anterior) break;
      anterior = firma;
      const ya = await conocidas(links.map((l) => l.url));
      const faltan = links.filter((l) => !ya.has(l.url));
      console.log(`  hoja ${hoja}: ${links.length} enlaces · faltan ${faltan.length}`);
      for (const l of faltan) {
        const r = await cargarUna(l.url, f.doc_type, f.pdf_selector);
        if (r.startsWith('ok')) ok++;
        if (r.startsWith('FALLÓ') || r.startsWith('sin PDF')) fallos++;
        console.log(`    ${r}`);
        await sleep(600);
      }
      // Una hoja entera que ya estaba: se alcanzó lo que se tenía.
      if (faltan.length === 0) break;
    }
    console.log(`  → cargados ${ok} · con problemas ${fallos}`);
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
