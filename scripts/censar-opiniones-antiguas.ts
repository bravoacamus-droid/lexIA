#!/usr/bin/env tsx
/**
 * CENSA las opiniones de la Dirección Técnico Normativa anteriores a
 * 2025, que NO están en ninguna colección de gob.pe.
 *
 * La colección 66839 ("Opiniones de la DTN - OECE") se creó con el OECE
 * y solo tiene 152 entradas, todas de 2025 y 2026. Las anteriores siguen
 * publicadas como informes-publicaciones sueltos y únicamente se
 * alcanzan por el BUSCADOR de gob.pe.
 *
 * Lo aprendido sondeando el buscador:
 *   · Pagina con &sheet=N y sigue trayendo material nuevo bastante más
 *     allá de la página 15, así que no se puede cortar temprano. La
 *     regla de "dos páginas sin novedades" fue justo lo que hizo que el
 *     censo de pronunciamientos diera 451 en vez de 5,940.
 *   · La búsqueda es difusa: pedir "opinion dtn 2022" devuelve opiniones
 *     de varios años. Por eso se usan términos genéricos y se clasifica
 *     por el AÑO DEL SLUG, no por el término buscado.
 *   · El slug trae número y año ("opinion-n-050-2022-dtn"), así que no
 *     hace falta abrir cada ficha para clasificar.
 *
 * Se combinan varias formulaciones porque ninguna sola devuelve todo.
 *
 * Salida: data/opiniones-antiguas.census.json
 *
 * Uso: npx tsx scripts/censar-opiniones-antiguas.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

const BASE = 'https://www.gob.pe/busquedas?contenido[]=informes_publicaciones&term=';

/** Varias formulaciones: ninguna sola devuelve el conjunto completo. */
const TERMINOS = [
  'opinion+dtn',
  'opinion+dtn+2020',
  'opinion+dtn+2021',
  'opinion+dtn+2022',
  'opinion+dtn+2023',
  'opinion+dtn+2024',
  'opiniones+direccion+tecnico+normativa',
];

/** Hasta dónde paginar cada término, y cuántas páginas secas tolerar. */
const MAX_PAGINAS = 40;
const SECAS_TOLERADAS = 6;

interface Entrada {
  id: string;
  slug: string;
  url: string;
  numero: string | null;
  anio: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pagina(term: string, sheet: number): Promise<Array<{ id: string; slug: string }>> {
  const url = `${BASE}${term}${sheet > 1 ? `&sheet=${sheet}` : ''}`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS });
      if (r.ok) {
        const html = await r.text();
        const m = new Map<string, string>();
        for (const x of html.matchAll(/informes-publicaciones\/(\d+)-(opinion[a-z0-9-]*)/gi)) {
          if (!m.has(x[1])) m.set(x[1], x[2]);
        }
        return [...m.entries()].map(([id, slug]) => ({ id, slug }));
      }
      if (r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      return [];
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return [];
}

function numeroYAnio(slug: string): { numero: string | null; anio: string | null } {
  const m = slug.match(/opinion-n[o-]?-?0*(\d+)-(\d{4})/i);
  if (m) return { numero: m[1], anio: m[2] };
  const a = slug.match(/(20[0-2]\d)/);
  return { numero: null, anio: a ? a[1] : null };
}

async function main() {
  const todas = new Map<string, Entrada>();

  for (const term of TERMINOS) {
    let secas = 0;
    let nuevasDelTermino = 0;
    for (let sheet = 1; sheet <= MAX_PAGINAS && secas < SECAS_TOLERADAS; sheet++) {
      const l = await pagina(term, sheet);
      if (l.length === 0) { secas++; await sleep(300); continue; }
      let nuevas = 0;
      for (const { id, slug } of l) {
        if (todas.has(id)) continue;
        const { numero, anio } = numeroYAnio(slug);
        todas.set(id, {
          id,
          slug,
          url: `https://www.gob.pe/institucion/oece/informes-publicaciones/${id}`,
          numero,
          anio,
        });
        nuevas++;
      }
      nuevasDelTermino += nuevas;
      secas = nuevas === 0 ? secas + 1 : 0;
      await sleep(300);
    }
    console.log(`  "${term}" → ${nuevasDelTermino} nuevas · acumulado ${todas.size}`);
  }

  const lista = [...todas.values()];
  console.log(`\nTOTAL censado: ${lista.length} opiniones\n`);

  const porAnio = new Map<string, number>();
  lista.forEach((e) => {
    const a = e.anio || 'sin año';
    porAnio.set(a, (porAnio.get(a) || 0) + 1);
  });
  console.log('POR AÑO:');
  [...porAnio.entries()].sort().reverse().forEach(([a, n]) =>
    console.log(`  ${a}: ${n}`),
  );

  const objetivo = lista.filter((e) => e.anio && Number(e.anio) >= 2020 && Number(e.anio) <= 2024);
  console.log(`\nOBJETIVO (2020-2024): ${objetivo.length}`);

  const ruta = join(process.cwd(), 'data', 'opiniones-antiguas.census.json');
  writeFileSync(ruta, JSON.stringify(lista, null, 2));
  console.log(`guardado en ${ruta}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
