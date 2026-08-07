#!/usr/bin/env tsx
/**
 * CENSA la colección completa de Pronunciamientos del OECE (2033).
 *
 * POR QUÉ ESTE SCRIPT Y NO censar-colecciones-oece.ts: aquel paraba tras
 * dos páginas sin entradas nuevas, y dio 451 cuando la colección declara
 * 6,190. La colección repite entradas en algunos tramos, así que "una
 * página sin novedades" no significa que se acabó. Aquí se recorren
 * TODAS las páginas hasta la última.
 *
 * Lo aprendido sondeando la fuente, para quien retome esto:
 *   · La paginación es ?sheet=N, no ?page=N. Con el parámetro
 *     equivocado gob.pe devuelve siempre la primera página.
 *   · Es estable: la misma página pedida dos veces devuelve lo mismo.
 *   · Los años NO están ordenados. La página 40 trae 2019, la 55 trae
 *     2024, la 60 trae 2016 y la 70 vuelve a 2024. Hay que recorrer todo
 *     y filtrar después.
 *   · El tamaño de página varía: unas traen 25 entradas y otras 100.
 *   · Los años viejos vienen COMPILADOS —"pronunciamientos-dgr-2017-del-
 *     776-al-800", un PDF con 25 pronunciamientos dentro— mientras que
 *     de 2018 en adelante son individuales. Se distinguen por el slug.
 *   · El slug ya trae número y año ("pronunciamiento-n-686-2024-osce-
 *     dgr"), así que no hace falta abrir cada ficha para clasificar.
 *     Eso convierte el censo en 248 peticiones en vez de 6,190.
 *
 * Salida: data/pronunciamientos.census.json
 *
 * Uso: npx tsx scripts/censar-pronunciamientos.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

const COLECCION =
  'https://www.gob.pe/institucion/oece/colecciones/2033-pronunciamientos-del-oece';
const ULTIMA_PAGINA = 248;

interface Entrada {
  id: string;
  slug: string;
  url: string;
  /** 'individual' | 'compilado' | 'otro' */
  forma: string;
  numero: string | null;
  anio: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pagina(sheet: number, reintentos = 3): Promise<Map<string, string>> {
  for (let i = 0; i < reintentos; i++) {
    try {
      const r = await fetch(sheet === 1 ? COLECCION : `${COLECCION}?sheet=${sheet}`, {
        headers: HEADERS,
      });
      if (r.ok) {
        const html = await r.text();
        const m = new Map<string, string>();
        for (const x of html.matchAll(/informes-publicaciones\/(\d+)-([a-z0-9-]+)/g)) {
          if (!m.has(x[1])) m.set(x[1], x[2]);
        }
        return m;
      }
      if (r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      return new Map();
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return new Map();
}

function clasificar(slug: string): Entrada['forma'] {
  if (/^pronunciamiento-n[o-]/.test(slug)) return 'individual';
  if (/^pronunciamientos-/.test(slug)) return 'compilado';
  return 'otro';
}

function numeroYAnio(slug: string): { numero: string | null; anio: string | null } {
  // "pronunciamiento-n-686-2024-osce-dgr"
  const m = slug.match(/pronunciamiento-n[o-]-?(\d+)-(20\d{2})/);
  if (m) return { numero: m[1], anio: m[2] };
  const a = slug.match(/(20\d{2})/);
  return { numero: null, anio: a ? a[1] : null };
}

async function main() {
  const todas = new Map<string, Entrada>();

  for (let sheet = 1; sheet <= ULTIMA_PAGINA; sheet++) {
    const p = await pagina(sheet);
    for (const [id, slug] of p) {
      if (todas.has(id)) continue;
      const { numero, anio } = numeroYAnio(slug);
      todas.set(id, {
        id,
        slug,
        url: `https://www.gob.pe/institucion/oece/informes-publicaciones/${id}`,
        forma: clasificar(slug),
        numero,
        anio,
      });
    }
    if (sheet % 20 === 0 || sheet === ULTIMA_PAGINA) {
      console.log(`  página ${String(sheet).padStart(3)}/${ULTIMA_PAGINA} · acumulado ${todas.size}`);
    }
    await sleep(300);
  }

  const lista = [...todas.values()];
  console.log(`\nTOTAL censado: ${lista.length} (la colección declara 6,190)\n`);

  const porAnio = new Map<string, { individual: number; compilado: number; otro: number }>();
  for (const e of lista) {
    const a = e.anio || 'sin año';
    if (!porAnio.has(a)) porAnio.set(a, { individual: 0, compilado: 0, otro: 0 });
    const c = porAnio.get(a)!;
    c[e.forma as 'individual' | 'compilado' | 'otro']++;
  }
  console.log('POR AÑO Y FORMA:');
  [...porAnio.entries()].sort().reverse().forEach(([a, c]) =>
    console.log(`  ${a}: individuales ${String(c.individual).padStart(4)} · compilados ${String(c.compilado).padStart(3)} · otros ${c.otro}`),
  );

  const objetivo = lista.filter(
    (e) => e.forma === 'individual' && e.anio && Number(e.anio) >= 2024,
  );
  console.log(`\nOBJETIVO (individuales de 2024 en adelante): ${objetivo.length}`);

  const ruta = join(process.cwd(), 'data', 'pronunciamientos.census.json');
  writeFileSync(ruta, JSON.stringify(lista, null, 2));
  console.log(`guardado en ${ruta}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
