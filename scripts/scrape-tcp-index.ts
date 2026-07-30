#!/usr/bin/env tsx
/**
 * CENSO del índice de Resoluciones del Tribunal (colección 716 de
 * gob.pe/oece) 2020 → hoy: número, año, sala, fecha y URL de cada
 * resolución — SIN descargar PDFs.
 *
 * gob.pe corta la paginación en ~420 sheets (~10,500 items), pero el
 * listado soporta filtro por fecha (filter[start_date]/filter[end_date],
 * verificado 29/07/2026). Recorremos VENTANAS TRIMESTRALES para que
 * ninguna exceda el límite.
 *
 * Confiabilidad y dedupe (pedido del cliente):
 *  - Fuente única oficial: www.gob.pe/institucion/oece.
 *  - Clave normalizada NNNN-YYYY-SALA → detecta duplicados dentro del
 *    índice y (en la fase de ingesta) contra la BD.
 *
 * Output: data/tcp-index.jsonl + resumen por año.
 * Reanudable: data/tcp-index.state.json guarda ventana y sheet.
 *
 * Uso: npx tsx scripts/scrape-tcp-index.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

// --col=716 (TCE, histórico 2020-2025, default) | --col=68030 (TCP, régimen 32069)
const COL = process.argv.includes('--col=68030') ? '68030' : '716';
const BASE =
  COL === '68030'
    ? 'https://www.gob.pe/institucion/oece/colecciones/68030-resoluciones-del-tribunal-de-contrataciones-publicas'
    : 'https://www.gob.pe/institucion/oece/colecciones/716-resoluciones-del-tribunal-de-contrataciones-del-estado';
const SUFFIX = COL === '68030' ? '-tcp32069' : '';
const OUT = path.join(process.cwd(), 'data', `tcp-index${SUFFIX}.jsonl`);
const STATE = path.join(process.cwd(), 'data', `tcp-index${SUFFIX}.state.json`);
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'text/html',
};
const DELAY_MS = 800;
const MAX_RETRIES = 3;

interface IndexRow {
  key: string;
  numero: string;
  anio: number;
  sala: string;
  titulo: string;
  url: string;
  window: string;
  sheet: number;
}

interface State {
  windowIdx: number;
  lastSheet: number;
  total: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ventanas trimestrales desde 2020-01-01 hasta hoy. */
function buildWindows(): Array<{ id: string; start: string; end: string }> {
  const out: Array<{ id: string; start: string; end: string }> = [];
  const now = new Date();
  for (let y = 2020; y <= now.getFullYear(); y++) {
    for (let q = 0; q < 4; q++) {
      const start = new Date(Date.UTC(y, q * 3, 1));
      if (start > now) break;
      const end = new Date(Date.UTC(y, q * 3 + 3, 0));
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      out.push({ id: `${y}-Q${q + 1}`, start: fmt(start), end: fmt(end) });
    }
  }
  return out;
}

function sheetUrl(win: { start: string; end: string }, sheet: number): string {
  const p = new URLSearchParams();
  p.set('filter[start_date]', win.start);
  p.set('filter[end_date]', win.end);
  if (sheet > 1) p.set('sheet', String(sheet));
  return `${BASE}?${p.toString()}`;
}

async function fetchPage(url: string): Promise<{ html: string; status: number } | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      const html = await res.text();
      if (res.ok || res.status === 404) return { html, status: res.status };
    } catch {
      /* retry */
    }
    await sleep(2000 * attempt);
  }
  return null;
}

function parseItems(html: string, windowId: string, sheet: number): IndexRow[] {
  const out: IndexRow[] = [];
  const re =
    /href="(\/institucion\/oece\/normas-legales\/\d+-([0-9]{1,5})-([0-9]{4})-(tc[ep])-?(s\d+|sala\d*)?[^"]*)"[^>]*>\s*([^<]{5,140})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const numero = m[2].replace(/^0+/, '') || '0';
    const anio = parseInt(m[3], 10);
    const sala = (m[5] || 's?').toUpperCase();
    out.push({
      key: `${numero}-${anio}-${sala}`,
      numero: `${numero}-${m[3]}`,
      anio,
      sala,
      titulo: m[6].trim().slice(0, 120),
      url: `https://www.gob.pe${m[1]}`,
      window: windowId,
      sheet,
    });
  }
  return out;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const windows = buildWindows();
  let state: State = { windowIdx: 0, lastSheet: 0, total: 0 };
  const seen = new Set<string>();
  if (fs.existsSync(STATE)) {
    const raw = JSON.parse(fs.readFileSync(STATE, 'utf8')) as Partial<State>;
    // Estado del formato viejo (sin windowIdx): reiniciar ventanas pero
    // conservar lo censado (el dedupe por key evita duplicar filas).
    state = { windowIdx: raw.windowIdx ?? 0, lastSheet: raw.windowIdx != null ? (raw.lastSheet ?? 0) : 0, total: raw.total ?? 0 };
  }
  if (fs.existsSync(OUT)) {
    for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        seen.add((JSON.parse(line) as IndexRow).key);
      } catch {
        /* ignorar línea corrupta */
      }
    }
  }
  console.log(
    `Ventanas: ${windows.length} | reanudando en ${windows[state.windowIdx]?.id ?? 'fin'} sheet ${state.lastSheet + 1} | censadas: ${seen.size}`,
  );

  for (let w = state.windowIdx; w < windows.length; w++) {
    const win = windows[w];
    let sheet = w === state.windowIdx ? state.lastSheet + 1 : 1;
    let done = false;
    while (!done) {
      const page = await fetchPage(sheetUrl(win, sheet));
      if (!page) {
        console.log(`  ${win.id} sheet ${sheet}: FALLÓ — reintento en próxima corrida`);
        fs.writeFileSync(STATE, JSON.stringify({ windowIdx: w, lastSheet: sheet - 1, total: seen.size }));
        throw new Error('fetch agotado — relanzar para continuar');
      }
      const items = parseItems(page.html, win.id, sheet);
      // 404 o página sin items = fin de la ventana
      if (page.status === 404 || items.length === 0) {
        done = true;
        break;
      }
      const fresh = items.filter((i) => !seen.has(i.key));
      fresh.forEach((i) => seen.add(i.key));
      if (fresh.length > 0) {
        fs.appendFileSync(OUT, fresh.map((i) => JSON.stringify(i)).join('\n') + '\n');
      }
      fs.writeFileSync(STATE, JSON.stringify({ windowIdx: w, lastSheet: sheet, total: seen.size }));
      sheet++;
      await sleep(DELAY_MS);
    }
    console.log(`  ✅ ${win.id} completa (${sheet - 1} páginas) — censadas: ${seen.size}`);
    fs.writeFileSync(STATE, JSON.stringify({ windowIdx: w + 1, lastSheet: 0, total: seen.size }));
  }

  const porAnio: Record<string, number> = {};
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as IndexRow;
      porAnio[r.anio] = (porAnio[r.anio] || 0) + 1;
    } catch {
      /* skip */
    }
  }
  console.log('\n══ CENSO COMPLETO ══');
  console.log('Total únicas:', seen.size);
  Object.keys(porAnio)
    .sort()
    .forEach((y) => console.log(`  ${y}: ${porAnio[y]}`));
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
