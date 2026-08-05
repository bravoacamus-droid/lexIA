#!/usr/bin/env tsx
/**
 * CENSA las colecciones de Opiniones y Pronunciamientos del OECE en
 * gob.pe: recorre TODAS las páginas y anota cada entrada con su fecha.
 *
 * Motivo (05/08/2026): la biblioteca tenía 47 opiniones y 96
 * pronunciamientos, y las series mostraban huecos —opiniones con
 * correlativos 7 a 54 y una sola de 2025, pronunciamientos 175 a 346 y
 * ninguno de 2025—. La causa no era que gob.pe no los publicara: el
 * scraper tenía topes de 50 y 100 entradas. Nunca se pidió el resto.
 *
 * Este script no descarga ni ingiere nada: solo levanta el inventario
 * real para saber cuánto falta antes de comprometer trabajo.
 *
 * Salida: data/oece-colecciones.census.json
 *
 * Uso: npx tsx scripts/censar-colecciones-oece.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

interface Coleccion {
  key: string;
  tipo: string;
  url: string;
}

const COLECCIONES: Coleccion[] = [
  {
    key: 'opiniones',
    tipo: 'opinion',
    url: 'https://www.gob.pe/institucion/oece/colecciones/66839-opiniones-de-la-direccion-tecnico-normativa-oece',
  },
  {
    key: 'pronunciamientos',
    tipo: 'pronunciamiento',
    url: 'https://www.gob.pe/institucion/oece/colecciones/2033-pronunciamientos-del-oece',
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, reintentos = 3): Promise<string> {
  for (let i = 0; i < reintentos; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.text();
      if (res.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === reintentos - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
  throw new Error('inalcanzable');
}

function fechaEs(texto: string): string | null {
  const m = texto.match(/(\d{1,2})\s+de\s+([a-zñé]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  return `${m[3]}-${String(mes).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

interface Entrada { id: string; url: string; titulo: string; fecha: string | null }

async function censar(col: Coleccion): Promise<Entrada[]> {
  console.log(`\n━━━ ${col.key} ━━━`);
  const vistos = new Map<string, Entrada>();
  let pagina = 1;
  let paginasSecas = 0;

  while (paginasSecas < 2 && pagina <= 80) {
    // gob.pe pagina con ?sheet=N, no con ?page=N. Con el parámetro
    // equivocado devuelve siempre la primera página, así que el censo
    // daba 26 entradas por colección y parecía que no había más.
    const html = await get(pagina === 1 ? col.url : `${col.url}?sheet=${pagina}`);
    const ids = [...html.matchAll(/institucion\/oece\/informes-publicaciones\/(\d+)/g)].map((m) => m[1]);
    const nuevos = [...new Set(ids)].filter((id) => !vistos.has(id));
    if (nuevos.length === 0) {
      paginasSecas++;
      pagina++;
      await sleep(500);
      continue;
    }
    paginasSecas = 0;
    for (const id of nuevos) vistos.set(id, { id, url: '', titulo: '', fecha: null });
    console.log(`  página ${String(pagina).padStart(2)} · ${nuevos.length} nuevas · acumulado ${vistos.size}`);
    pagina++;
    await sleep(500);
  }

  // Detalle de cada entrada: título y fecha
  console.log(`  leyendo ficha de ${vistos.size} entradas...`);
  let n = 0;
  for (const [id, e] of vistos) {
    const url = `https://www.gob.pe/institucion/oece/informes-publicaciones/${id}`;
    try {
      const html = await get(url);
      const t = html.match(/<title>([^<]+)<\/title>/);
      e.titulo = t ? t[1].split(' - Informes')[0].split(' - Plataforma')[0].trim() : '';
      const f = html.match(/\d{1,2}\s+de\s+[a-zñé]+\s+de\s+\d{4}/i);
      e.fecha = f ? fechaEs(f[0]) : null;
      e.url = url;
    } catch {
      e.url = url;
    }
    if (++n % 50 === 0) console.log(`    ${n}/${vistos.size}`);
    await sleep(350);
  }
  return [...vistos.values()];
}

async function main() {
  const salida: Record<string, Entrada[]> = {};
  for (const col of COLECCIONES) {
    const entradas = await censar(col);
    salida[col.key] = entradas;

    const porAnio = new Map<string, number>();
    entradas.forEach((e) => {
      const a = e.fecha ? e.fecha.slice(0, 4) : 'sin fecha';
      porAnio.set(a, (porAnio.get(a) || 0) + 1);
    });
    console.log(`\n  TOTAL ${col.key}: ${entradas.length}`);
    [...porAnio.entries()].sort().reverse().forEach(([a, n]) =>
      console.log(`    ${a}: ${n}`),
    );
  }

  const ruta = join(process.cwd(), 'data', 'oece-colecciones.census.json');
  writeFileSync(ruta, JSON.stringify(salida, null, 2));
  console.log(`\n✅ censo guardado en ${ruta}`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
