#!/usr/bin/env tsx
/**
 * Trae de gob.pe unos documentos concretos, por su número.
 *
 * POR QUÉ NO SE TRAE TODO
 *
 * Al arreglar el rastreador (06/09/2026) se vio que faltaban unas
 * novecientas resoluciones de 2026: la biblioteca se cortaba en la 7564
 * y el portal iba por la 8496. Traerlas todas cuesta vectorizarlas, así
 * que de momento se traen solo las que hacen falta para responder los
 * casos que reportó César —las que su documento cita y nosotros no
 * teníamos—. El resto lo irá cubriendo el cron semanal.
 *
 * CÓMO FUNCIONA
 *
 * El índice de la colección va ordenado por fecha de publicación
 * descendente, cien por página. Se recorren páginas hasta encontrar
 * todos los números pedidos o agotar el tope, se entra en la ficha de
 * cada uno a por su PDF y se ingiere por el mismo camino que usa el
 * cron.
 *
 *   npx tsx scripts/traer-documentos-citados.ts            (en seco)
 *   npx tsx scripts/traer-documentos-citados.ts --aplicar
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { discoverLinks, resolverPdfDeFicha } from '../src/lib/scraping/discover';
import { ingestPdfFromUrl } from '../src/lib/scraping/ingest';

config({ path: join(process.cwd(), '.env.local'), override: true });

interface Coleccion {
  docType: string;
  /** Base de la colección en el portal nuevo, sin los parámetros. */
  base: string;
  /** Patrón del enlace a la ficha dentro del índice. */
  selector: string;
  filtro: string;
  /** Los números que se buscan, tal como aparecen en el nombre del archivo. */
  objetivos: string[];
  /** Cuántas páginas del índice recorrer como mucho. */
  paginas: number;
}

/**
 * Lo que citan los casos del documento «Respondiendo casos reales» y no
 * teníamos. Comprobado uno a uno contra la base el 06/09/2026.
 */
const COLECCIONES: Coleccion[] = [
  {
    docType: 'resolucion_tce',
    base: 'https://www.gob.pe/institucion/oece/colecciones/68030-resoluciones-del-tribunal-de-contrataciones-publicas',
    selector: 'a[href*="/normas-legales/"]',
    filtro: '/normas-legales/[0-9]+-',
    objetivos: [
      '7671-2026', '7717-2026', '7723-2026', '7725-2026', '7740-2026', '7766-2026',
      '7784-2026', '7815-2026', '7834-2026', '7840-2026', '7863-2026', '7871-2026',
      '7890-2026', '7897-2026', '7957-2026', '7959-2026', '7969-2026', '7977-2026',
      '7982-2026', '8007-2026', '8010-2026', '8012-2026', '8032-2026', '8066-2026',
      '8111-2026', '8114-2026', '8129-2026',
      // Las que César pide citar en sus comentarios del 06/09/2026:
      // la 165 desarrolla si vale una imagen recortada del estado de
      // cuenta para acreditar experiencia; la 7837, un certificado de
      // trabajo emitido antes de que terminara la experiencia.
      '165-2026', '7837-2026',
    ],
    // La 165 es de comienzos de año: hay que bajar mucho más en el
    // índice para alcanzarla.
    paginas: 60,
  },
  {
    docType: 'pronunciamiento',
    base: 'https://www.gob.pe/institucion/oece/colecciones/2033-pronunciamientos-del-oece',
    selector: 'a[href*="/informes-publicaciones/"]',
    filtro: '/informes-publicaciones/[0-9]+-',
    objetivos: ['494-2026'],
    paginas: 14,
  },
];

function urlDePagina(base: string, sheet: number): string {
  return `${base}?filter%5Border%5D=publication_desc&filter%5Bper_page%5D=100&sheet=${sheet}`;
}

/** ¿El enlace de la ficha corresponde a alguno de los números buscados? */
function objetivoDe(url: string, objetivos: string[]): string | null {
  const slug = url.toLowerCase();
  for (const o of objetivos) {
    // En el nombre del archivo el número va relleno con ceros hasta
    // cinco cifras: la 165 aparece como «00165-2026-tcp-s2». La versión
    // anterior admitía UN cero y por eso no la encontraba nunca.
    const [num, anio] = o.split('-');
    const re = new RegExp(`-0*${num}-${anio}-`);
    if (re.test(slug)) return o;
  }
  return null;
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  console.log(aplicar ? '\nINGIRIENDO\n' : '\nEN SECO — nada se escribe. Añade --aplicar.\n');

  const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();

  for (const col of COLECCIONES) {
    console.log(`══ ${col.docType} · se buscan ${col.objetivos.length}`);
    const pendientes = new Set(col.objetivos);
    const encontrados: Array<{ objetivo: string; ficha: string }> = [];

    for (let sheet = 1; sheet <= col.paginas && pendientes.size > 0; sheet++) {
      const enlaces = await discoverLinks({
        sourceUrl: urlDePagina(col.base, sheet),
        linkSelector: col.selector,
        linkFilterRegex: col.filtro,
      });
      for (const e of enlaces) {
        const o = objetivoDe(e.url, [...pendientes]);
        if (!o) continue;
        pendientes.delete(o);
        encontrados.push({ objetivo: o, ficha: e.url });
      }
      process.stdout.write(`\r   página ${sheet}: encontrados ${encontrados.length}/${col.objetivos.length}`);
    }
    process.stdout.write('\n');

    if (pendientes.size > 0) {
      console.log(`   no aparecieron en el índice: ${[...pendientes].join(', ')}`);
    }

    let hechos = 0;
    for (const { objetivo, ficha } of encontrados) {
      const pdf = await resolverPdfDeFicha(ficha, 'a[href*=".pdf"]');
      if (!pdf) {
        console.log(`   ⚠ ${objetivo}: la ficha no expone PDF`);
        continue;
      }
      if (!aplicar) {
        console.log(`   · ${objetivo} → ${pdf.titulo.slice(0, 60)}`);
        continue;
      }
      const r = await ingestPdfFromUrl({
        url: pdf.url,
        docType: col.docType,
        linkText: pdf.titulo,
        supabaseUrl: SUPABASE_URL,
        serviceKey: SERVICE_KEY,
        geminiKey: GEMINI_KEY,
      });
      console.log(
        `   ${r.inserted ? '✅' : '⚠'} ${objetivo}${r.inserted ? ` · ${r.chunkCount} fragmentos` : ` · ${r.reason}`}`,
      );
      if (r.inserted) hechos++;
    }
    if (aplicar) console.log(`   ${hechos} de ${col.objetivos.length} ingeridos\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
