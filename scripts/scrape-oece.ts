#!/usr/bin/env tsx
/**
 * Scraper de OECE (ex-OSCE).
 * Descarga PDFs de las colecciones públicas y genera los .json con metadata,
 * dejando todo listo para `npm run ingest`.
 *
 * Uso:
 *   npx tsx scripts/scrape-oece.ts [--type=resolucion_tce] [--max=30]
 *
 * Tipos soportados (mapeo a las colecciones reales de gob.pe/oece):
 *   - resolucion_tce  → /colecciones/716-resoluciones-del-tribunal...
 *   - pronunciamiento → /colecciones/2033-pronunciamientos-del-oece
 *   - opinion         → /institucion/oece/normas-legales/tipos/40-opinion
 *   - directiva       → /institucion/oece/normas-legales/tipos/29-directiva
 *
 * NO scrapea masivamente — respeta un delay entre requests.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const DATA_DIR = join(process.cwd(), 'data', 'normativa');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const BASE = 'https://www.gob.pe';

const SOURCES: Record<string, { path: string; label: string }> = {
  resolucion_tce: {
    path: '/institucion/oece/colecciones/716-resoluciones-del-tribunal-de-contrataciones-del-estado',
    label: 'Resoluciones del Tribunal',
  },
  pronunciamiento: {
    path: '/institucion/oece/colecciones/2033-pronunciamientos-del-oece',
    label: 'Pronunciamientos',
  },
  opinion: {
    path: '/institucion/oece/normas-legales/tipos/40-opinion',
    label: 'Opiniones',
  },
  directiva: {
    path: '/institucion/oece/normas-legales/tipos/29-directiva',
    label: 'Directivas',
  },
};

interface CliArgs {
  type: keyof typeof SOURCES;
  max: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let type: keyof typeof SOURCES = 'resolucion_tce';
  let max = 20;
  for (const a of args) {
    if (a.startsWith('--type=')) {
      const v = a.slice(7);
      if (v in SOURCES) type = v as keyof typeof SOURCES;
    } else if (a.startsWith('--max=')) {
      max = parseInt(a.slice(6), 10) || 20;
    }
  }
  return { type, max };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return await res.text();
}

async function downloadPdf(url: string, destPath: string): Promise<number> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} bajando ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
  return buffer.byteLength;
}

interface DocLink {
  detailUrl: string;
  slug: string;
}

function extractDocLinks(html: string): DocLink[] {
  // Las colecciones tienen links del estilo
  // /institucion/oece/normas-legales/12345-2919-2025-tce-s1
  // /institucion/oece/colecciones/.../12345-2919-2025-tce-s1
  const seen = new Set<string>();
  const out: DocLink[] = [];
  const re = /href="(\/institucion\/oece\/normas-legales\/\d+-[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (url.endsWith('/tipos') || url.includes('/tipos/')) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const slug = url.split('/').pop() || '';
    out.push({ detailUrl: BASE + url, slug });
  }
  return out;
}

interface DocDetail {
  pdfUrl: string | null;
  title: string;
  date: string | null;
  number: string;
  summary: string | null;
}

function extractDocDetail(html: string, slug: string): DocDetail {
  // PDF URL
  const pdfMatch = html.match(/href="(https:\/\/cdn\.www\.gob\.pe\/uploads\/document\/file\/[^"]+\.pdf[^"]*)"/);
  const pdfUrl = pdfMatch ? pdfMatch[1].replace(/&amp;/g, '&') : null;

  // Title from <title> or h1
  const titleMatch =
    html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
    html.match(/<title>([^<]+?)\s*-\s*Normas/);
  const rawTitle = titleMatch ? titleMatch[1].trim() : slug;

  // Number: intentamos extraer de title
  // Ej: "Resolución N.° 2919-2025-TCE-S1"
  // Ej: "Opinión N° 023-2024/DTN"
  const numberMatch = rawTitle.match(/(Resolución|Opinión|Pronunciamiento|Directiva)\s+N\.?\s*°?\s*[\d\-\/A-Z]+/i);
  const number = numberMatch ? numberMatch[0].trim() : rawTitle.slice(0, 60);

  // Date: a veces "Publicado el ..." aparece
  const dateMatch =
    html.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i);
  let date: string | null = null;
  if (dateMatch) {
    const months: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
    };
    const d = dateMatch[1].padStart(2, '0');
    const m = months[dateMatch[2].toLowerCase()];
    const y = dateMatch[3];
    date = `${y}-${m}-${d}`;
  }

  // Summary: meta description or first paragraph
  const summaryMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  let summary: string | null = summaryMatch ? summaryMatch[1].slice(0, 400) : null;
  if (summary && summary.includes('GOB.PE')) summary = null;

  return { pdfUrl, title: rawTitle, date, number, summary };
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { type, max } = parseArgs();
  const source = SOURCES[type];
  const targetDir = join(DATA_DIR, type);
  mkdirSync(targetDir, { recursive: true });

  console.log(`Scraping ${source.label} (max ${max}) → ${targetDir}\n`);

  // 1. Listar
  const listingUrl = BASE + source.path;
  const listingHtml = await fetchHtml(listingUrl);
  const links = extractDocLinks(listingHtml).slice(0, max);
  console.log(`Encontrados ${links.length} documentos en el listado.\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const link of links) {
    process.stdout.write(`  ${link.slug.padEnd(50)} `);

    try {
      const detailHtml = await fetchHtml(link.detailUrl);
      const detail = extractDocDetail(detailHtml, link.slug);

      if (!detail.pdfUrl) {
        console.log('SKIP (sin PDF)');
        skipped += 1;
        continue;
      }

      const filename = sanitizeFilename(link.slug);
      const pdfPath = join(targetDir, `${filename}.pdf`);
      const jsonPath = join(targetDir, `${filename}.json`);

      if (existsSync(pdfPath) && existsSync(jsonPath)) {
        console.log('SKIP (ya descargado)');
        skipped += 1;
        continue;
      }

      const size = await downloadPdf(detail.pdfUrl, pdfPath);
      writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            number: detail.number,
            title: detail.title,
            date: detail.date,
            summary: detail.summary,
            source_url: link.detailUrl,
          },
          null,
          2,
        ),
      );
      const kb = Math.round(size / 1024);
      console.log(`OK (${kb} KB)`);
      downloaded += 1;

      await sleep(500); // 0.5s entre requests, somos buenos ciudadanos
    } catch (err) {
      console.log(`FAIL: ${(err as Error).message.slice(0, 80)}`);
      failed += 1;
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`Resumen: ${downloaded} nuevos · ${skipped} skip · ${failed} fail`);
  console.log(`\nSiguiente paso: ejecuta \`npm run ingest\` para procesar los PDFs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
