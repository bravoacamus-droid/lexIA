/**
 * Scraper de colecciones de gob.pe/OECE y gob.pe/perucompras.
 *
 * Para cada colección:
 *   1. Itera páginas hasta cubrir maxItems o llegar a fecha < 2025-01-01
 *   2. Por cada item: descarga la página individual, extrae título, fecha y
 *      la URL del PDF en cdn.www.gob.pe
 *   3. Filtra por fecha ≥ 2025-01-01 (solo régimen Ley 32069)
 *   4. Descarga el PDF a data/normativa/<type>/ y crea el .json hermano
 *
 * Output: print resumen y archivos en disco. La ingesta a BD se hace después
 * con `pnpm exec tsx scripts/ingest-normativa-v2.ts --keep`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

interface CollectionSpec {
  key: string;
  baseUrl: string;
  type: 'directiva' | 'opinion' | 'pronunciamiento' | 'resolucion_tce' | 'reglamento';
  maxItems: number;
  itemPathPrefix: string;
  itemPathPattern: RegExp;
}

const COLLECTIONS: CollectionSpec[] = [
  {
    key: 'manuales-seace',
    baseUrl: 'https://www.gob.pe/institucion/oece/colecciones/66426-manuales-de-usuario-de-la-ley-n-32069-en-el-seace',
    type: 'directiva',
    maxItems: 50,
    itemPathPrefix: 'https://www.gob.pe',
    itemPathPattern: /institucion\/oece\/informes-publicaciones\/(\d+)/g,
  },
  {
    key: 'comunicados-oece',
    baseUrl: 'https://www.gob.pe/institucion/oece/colecciones/66609-comunicados-del-oece',
    type: 'directiva',
    maxItems: 20,
    itemPathPrefix: 'https://www.gob.pe',
    itemPathPattern: /institucion\/oece\/informes-publicaciones\/(\d+)/g,
  },
  {
    key: 'sala-plena',
    baseUrl: 'https://www.gob.pe/institucion/oece/colecciones/715-acuerdos-de-sala-plena',
    type: 'resolucion_tce',
    maxItems: 30,
    itemPathPrefix: 'https://www.gob.pe',
    itemPathPattern: /institucion\/oece\/informes-publicaciones\/(\d+)/g,
  },
  {
    key: 'opiniones-oece',
    baseUrl: 'https://www.gob.pe/institucion/oece/colecciones/66839-opiniones-de-la-direccion-tecnico-normativa-oece',
    type: 'opinion',
    maxItems: 50,
    itemPathPrefix: 'https://www.gob.pe',
    itemPathPattern: /institucion\/oece\/informes-publicaciones\/(\d+)/g,
  },
  {
    key: 'pronunciamientos-oece',
    baseUrl: 'https://www.gob.pe/institucion/oece/colecciones/2033-pronunciamientos-del-oece',
    type: 'pronunciamiento',
    maxItems: 100,
    itemPathPrefix: 'https://www.gob.pe',
    itemPathPattern: /institucion\/oece\/informes-publicaciones\/(\d+)/g,
  },
  {
    key: 'resoluciones-tce',
    baseUrl: 'https://www.gob.pe/institucion/oece/colecciones/68030',
    type: 'resolucion_tce',
    maxItems: 100,
    itemPathPrefix: 'https://www.gob.pe',
    itemPathPattern: /institucion\/oece\/informes-publicaciones\/(\d+)/g,
  },
  {
    key: 'comunicados-perucompras',
    baseUrl: 'https://www.gob.pe/institucion/perucompras/colecciones/5312-comunicados',
    type: 'directiva',
    maxItems: 30,
    itemPathPrefix: 'https://www.gob.pe',
    itemPathPattern: /institucion\/perucompras\/informes-publicaciones\/(\d+)/g,
  },
];

const CUTOFF_DATE = new Date('2025-01-01');
const OUT_BASE = path.resolve('data', 'normativa');
const SLEEP_BETWEEN_REQUESTS = 600;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function get(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; LexIA-Ingest/1.0; +https://lex-ia-drab.vercel.app)',
        },
      });
      if (res.ok) return await res.text();
      if (res.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
  throw new Error('unreachable');
}

function parseSpanishDate(text: string): Date | null {
  const m = text.match(/(\d{1,2})\s+de\s+([a-zñé]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MESES[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  if (!month) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function sanitizeFilename(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

async function downloadBinary(url: string, dest: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PDF HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

interface ItemMeta {
  id: string;
  title: string;
  date: Date;
  pdfUrl: string;
  itemUrl: string;
}

async function scrapeItem(itemUrl: string): Promise<ItemMeta | null> {
  const html = await get(itemUrl);
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) return null;
  const fullTitle = titleMatch[1];
  // Cortar el sufijo "- Informes ... Plataforma del Estado Peruano"
  const title = fullTitle
    .split(' - Informes y publicaciones')[0]
    .split(' - Plataforma')[0]
    .trim();

  const pdfMatch = html.match(/https:\/\/cdn[^"]+\.pdf[^"]*/);
  if (!pdfMatch) return null;
  const pdfUrl = pdfMatch[0].replace(/\?v=\d+$/, '');

  const dateMatch = html.match(/\d{1,2}\s+de\s+[a-zñé]+\s+de\s+\d{4}/i);
  const date = dateMatch ? parseSpanishDate(dateMatch[0]) : null;
  if (!date) return null;

  const idMatch = itemUrl.match(/(\d+)$/);
  const id = idMatch ? idMatch[1] : 'unknown';

  return { id, title, date, pdfUrl, itemUrl };
}

async function scrapeCollection(col: CollectionSpec): Promise<{
  attempted: number;
  downloaded: number;
  skippedDate: number;
  errors: number;
}> {
  console.log(`\n━━━ ${col.key} (target: ${col.maxItems}, tipo: ${col.type}) ━━━`);
  const outDir = path.join(OUT_BASE, col.type);
  fs.mkdirSync(outDir, { recursive: true });

  let page = 1;
  let downloaded = 0;
  let attempted = 0;
  let skippedDate = 0;
  let errors = 0;
  let dryPages = 0;

  while (downloaded < col.maxItems) {
    const pageUrl = page === 1 ? col.baseUrl : `${col.baseUrl}?sheet=${page}`;
    let pageHtml: string;
    try {
      pageHtml = await get(pageUrl);
    } catch (e) {
      console.log(`  pág ${page}: ERROR ${(e as Error).message}, abortando paginación`);
      break;
    }

    const ids = Array.from(
      new Set(
        Array.from(pageHtml.matchAll(col.itemPathPattern), (m) => m[1]),
      ),
    );
    if (ids.length === 0) {
      console.log(`  pág ${page}: sin items, fin`);
      break;
    }

    let pageDownloaded = 0;
    for (const id of ids) {
      if (downloaded >= col.maxItems) break;
      const itemUrl = `${col.itemPathPrefix}${
        col.itemPathPattern.source.includes('perucompras')
          ? `/institucion/perucompras/informes-publicaciones/${id}`
          : `/institucion/oece/informes-publicaciones/${id}`
      }`;
      attempted++;
      await sleep(SLEEP_BETWEEN_REQUESTS);
      let meta: ItemMeta | null;
      try {
        meta = await scrapeItem(itemUrl);
      } catch (e) {
        errors++;
        continue;
      }
      if (!meta) {
        errors++;
        continue;
      }
      if (meta.date < CUTOFF_DATE) {
        skippedDate++;
        continue;
      }

      // ID PRIMERO para garantizar unicidad (el slug se trunca a 90 chars
      // y títulos parecidos en distintos manuales colisionaban si el ID
      // quedaba después del corte).
      const titlePart = sanitizeFilename(`${col.key}-${meta.title}`).slice(0, 70);
      const slug = `${meta.id}-${titlePart}`;
      const pdfPath = path.join(outDir, `${slug}.pdf`);
      const jsonPath = path.join(outDir, `${slug}.json`);

      if (fs.existsSync(pdfPath)) {
        downloaded++;
        pageDownloaded++;
        continue;
      }

      try {
        const size = await downloadBinary(meta.pdfUrl, pdfPath);
        fs.writeFileSync(
          jsonPath,
          JSON.stringify(
            {
              number: meta.title.slice(0, 120),
              title: meta.title,
              date: meta.date.toISOString().slice(0, 10),
              source_url: meta.itemUrl,
            },
            null,
            2,
          ),
        );
        downloaded++;
        pageDownloaded++;
        console.log(
          `  ✓ ${meta.date.toISOString().slice(0, 10)} ${meta.title.slice(0, 60)} (${(size / 1024).toFixed(0)} KB)`,
        );
      } catch (e) {
        errors++;
        console.log(`  ✗ ${meta.title.slice(0, 50)}: ${(e as Error).message}`);
      }
    }

    if (pageDownloaded === 0) {
      dryPages++;
      if (dryPages >= 2) {
        console.log(`  pág ${page}: sin descargas viables, fin`);
        break;
      }
    } else {
      dryPages = 0;
    }
    page++;
    if (page > 30) {
      console.log(`  alcanzado tope de 30 páginas, fin`);
      break;
    }
  }

  console.log(
    `  → ${downloaded}/${col.maxItems} descargados · ${skippedDate} pre-2025 · ${errors} errores · ${attempted} intentos`,
  );
  return { attempted, downloaded, skippedDate, errors };
}

async function main() {
  const totals = { attempted: 0, downloaded: 0, skippedDate: 0, errors: 0 };
  for (const col of COLLECTIONS) {
    const r = await scrapeCollection(col);
    totals.attempted += r.attempted;
    totals.downloaded += r.downloaded;
    totals.skippedDate += r.skippedDate;
    totals.errors += r.errors;
  }
  console.log(`\n═══ TOTAL: ${totals.downloaded} PDFs descargados ═══`);
  console.log(
    `  intentos: ${totals.attempted} · pre-2025: ${totals.skippedDate} · errores: ${totals.errors}`,
  );
}

main().catch((e) => {
  console.error('Falló:', e);
  process.exit(1);
});
