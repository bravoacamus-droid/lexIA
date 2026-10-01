#!/usr/bin/env tsx
/**
 * Arma el texto estructurado (texto_estructurado) de las normas de la
 * biblioteca desde su PDF oficial, con scripts/texto-estructurado.py.
 * Documento 11 de César (30/09/2026); ver migración 0080.
 *
 * De dónde sale el PDF de cada documento:
 *   · metadata.original_path — la carpeta que entregó César
 *     («DIRECTIVAS, LINEAMIENTOS Y OTROS/…»);
 *   · metadata.ingested_from — data/normativa/<tipo>/<archivo>;
 *   · metadata.pdf_url — se descarga (data/cache/pdfs, fuera de git).
 *
 * Control de calidad: si el texto armado no tiene una extensión parecida
 * a la del texto plano (entre 60 % y 150 % de las palabras) o no trae
 * ninguna estructura, se descarta y el visor sigue con el texto plano.
 * Se saltan las páginas sueltas de El Peruano (traen otras normas de la
 * misma página, a cuatro columnas): para esas sigue el formato actual.
 *
 * Uso: npx tsx scripts/estructurar-normas.ts [--rehacer] [--solo <id>] [--tipos ley,reglamento]
 */
import { config } from 'dotenv';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local'), override: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const REHACER = args.includes('--rehacer');
const SOLO = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;
const TIPOS = args.includes('--tipos')
  ? args[args.indexOf('--tipos') + 1].split(',')
  : ['ley', 'reglamento', 'directiva', 'lineamiento', 'codigo_etica', 'guia', 'resolucion', 'preguntas_frecuentes', 'directiva_entidad', 'tupa'];

const CARPETA_CESAR = join(process.cwd(), 'DIRECTIVAS, LINEAMIENTOS Y OTROS');
const CACHE = join(process.cwd(), 'data', 'cache', 'pdfs');

function buscarEn(dir: string, nombre: string): string | null {
  if (!existsSync(dir)) return null;
  for (const e of readdirSync(dir)) {
    const ruta = join(dir, e);
    if (statSync(ruta).isDirectory()) {
      const r = buscarEn(ruta, nombre);
      if (r) return r;
    } else if (e === nombre) return ruta;
  }
  return null;
}

async function pdfDe(meta: Record<string, unknown>): Promise<string | null> {
  const original = meta.original_path as string | undefined;
  if (original) {
    for (const base of [CARPETA_CESAR, process.cwd()]) {
      const r = join(base, original);
      if (existsSync(r) && /\.pdf$/i.test(r)) return r;
    }
  }
  const desde = meta.ingested_from as string | undefined;
  if (desde && /\.pdf$/i.test(desde)) {
    const r = buscarEn(join(process.cwd(), 'data', 'normativa'), desde);
    if (r) return r;
  }
  const url = meta.pdf_url as string | undefined;
  if (url) {
    mkdirSync(CACHE, { recursive: true });
    const destino = join(CACHE, `${createHash('md5').update(url).digest('hex')}.pdf`);
    if (!existsSync(destino)) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 4).toString() !== '%PDF') return null;
      writeFileSync(destino, buf);
    }
    return destino;
  }
  return null;
}

/** El número de la norma propia de una página de El Peruano: «0039-2025». */
async function numeroEsperado(d: { number: string | null; title: string; metadata: Record<string, unknown> | null; acto_clave?: string | null }): Promise<string | null> {
  const de = (t: string | null | undefined) => {
    const m = /N[°º.]?\s*(D?\d{2,6}\s*-\s*20\d{2})/i.exec(t || '');
    return m ? m[1].replace(/\s+/g, '') : null;
  };
  const porEtiqueta = de(d.metadata?.parte_etiqueta as string | undefined);
  if (porEtiqueta) return porEtiqueta;
  const porNombre = de(d.number) ?? de(d.title);
  if (porNombre && !/^Directiva/i.test(d.title)) return porNombre;
  if (d.acto_clave) {
    const { data } = await db.from('normative_acts').select('numero, documentos').eq('clave', d.acto_clave).maybeSingle();
    if (data && /^Resoluci/i.test(data.numero as string)) return de(data.numero as string);
  }
  return null;
}

/**
 * La norma propia dentro de una página de El Peruano: desde su sumilla y
 * su encabezado («RESOLUCIÓN DIRECTORAL N° 0039-2025-EF/54.01») hasta su
 * «Regístrese, comuníquese y publíquese» y la firma.
 */
function recortarAPropia(md: string, numero: string): string | null {
  const parrafos = md.split(/\n{2,}/);
  const corto = numero.replace(/^D?0*/, '');
  const [n, anio] = corto.split('-');
  // «RESOLUCIÓN DIRECTORAL» y «N° 0039-2025-EF/54.01» suelen ir en dos
  // párrafos seguidos (dos líneas centradas).
  const rxNumero = new RegExp(`^N[°º.]?\\s*D?0*${n}\\s*-\\s*${anio}\\b`, 'i');
  const rxTitulo = /^(RESOLUCI[ÓO]N|DECRETO\s+SUPREMO)\b/i;
  const limpio = (t: string | undefined) => (t ?? '').replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
  let inicio = -1;
  for (let i = 0; i < parrafos.length; i++) {
    const t = limpio(parrafos[i]);
    const enLinea = rxTitulo.test(t) && new RegExp(`N[°º.]?\\s*D?0*${n}\\s*-\\s*${anio}\\b`, 'i').test(t.slice(0, 80));
    if (enLinea) {
      inicio = i;
      break;
    }
    if (rxNumero.test(t) && rxTitulo.test(limpio(parrafos[i - 1]))) {
      inicio = i - 1;
      break;
    }
  }
  if (inicio < 0) return null;
  // La sumilla («Aprueban …») va justo antes del encabezado.
  const previo = parrafos[inicio - 1]?.replace(/\*\*/g, '').trim() ?? '';
  if (previo && previo.length < 400 && /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+n\b/.test(previo)) inicio -= 1;
  // El Peruano cierra cada norma con su código («2458560-1»). Es el fin
  // más fiable: lo que se publica con ella —la directiva que aprueba, sus
  // anexos— va antes del código.
  const codigo = parrafos.findIndex((p, i) => i > inicio && /^\**\d{6,}-\d+\**$/.test(p.trim()));
  if (codigo > inicio) return parrafos.slice(inicio, codigo).join('\n\n').trim();
  let fin = parrafos.findIndex((p, i) => i > inicio && /Reg[íi]strese[\s,]+(comun[íi]quese|y)\s/i.test(p));
  if (fin < 0) fin = parrafos.length - 1;
  // La firma: nombre y cargo, párrafos cortos después del «Regístrese…».
  let k = fin + 1;
  while (k < parrafos.length && k <= fin + 3) {
    const t = parrafos[k].replace(/\*\*/g, '').trim();
    // «2458560-1» es el código interno de El Peruano: cierra la norma.
    if (t.length > 140 || /^#/.test(t) || /^\d{6,}-\d+$/.test(t) || /^(RESOLUCI|DECRETO|Aprueban|Designan|Modifican|Disponen|Autorizan)/.test(t)) break;
    k++;
  }
  return parrafos.slice(inicio, k).join('\n\n').trim();
}

const palabras = (t: string) => (t.replace(/[#*|_>-]/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length;

void (async () => {
  let q = db
    .from('normative_documents')
    .select('id, type, number, title, metadata, raw_text, texto_estructurado, acto_clave')
    .in('type', TIPOS)
    .eq('oculto', false);
  if (SOLO) q = q.eq('id', SOLO);
  const { data, error } = await q;
  if (error) throw error;

  const resumen = { hechos: 0, sinPdf: 0, peruanoDiario: 0, rechazados: 0, yaEstaban: 0 };
  for (const d of data || []) {
    if (d.texto_estructurado && !REHACER) {
      resumen.yaEstaban++;
      continue;
    }
    const etiqueta = `${d.type.padEnd(13)} ${(d.number || d.title).slice(0, 60)}`;
    // Página suelta de El Peruano: trae la norma anterior y la siguiente.
    // Se recorta a la norma propia (ver recortarAPropia); si no se
    // encuentra su encabezado, queda con el formato actual.
    const diario = /^\s*\d*\s*NORMAS LEGALES/i.test(d.raw_text || '');
    const numero = diario ? await numeroEsperado(d) : null;
    if (diario && !numero) {
      resumen.peruanoDiario++;
      console.log(`  · ${etiqueta}  — página de El Peruano sin número reconocible, queda con el formato actual`);
      continue;
    }
    const pdf = await pdfDe(d.metadata || {});
    if (!pdf) {
      resumen.sinPdf++;
      console.log(`  ? ${etiqueta}  — sin PDF`);
      continue;
    }
    const r = spawnSync('python', [join('scripts', 'texto-estructurado.py'), pdf], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    // PyMuPDF imprime una sugerencia por la salida estándar: no es texto.
    // En Windows Python escribe CRLF: se normaliza antes de partir en párrafos.
    let md = (r.stdout || '').replace(/\r\n?/g, '\n').replace(/^Consider using the pymupdf_layout package[^\n]*?analysis\.\s*/, '').trim();
    if (diario && numero) {
      const propia = recortarAPropia(md, numero);
      if (!propia) {
        resumen.peruanoDiario++;
        console.log(`  · ${etiqueta}  — no encontré «${numero}» en la página de El Peruano, queda con el formato actual`);
        continue;
      }
      md = propia;
    }
    const razon = palabras(md) / Math.max(palabras(d.raw_text || ''), 1);
    const estructura = (md.match(/^#{1,5} /gm) || []).length;
    // Una página de El Peruano recortada tiene menos palabras que el texto
    // plano (que traía las normas vecinas): ahí solo se exige que no sobren.
    if (r.status !== 0 || md.length < 300 || (!diario && razon < 0.6) || razon > 1.5 || (!diario && estructura === 0)) {
      resumen.rechazados++;
      console.log(`  ✗ ${etiqueta}  — descartado (palabras ${Math.round(razon * 100)} %, encabezados ${estructura}${r.status ? ', error' : ''})`);
      continue;
    }
    const { error: e2 } = await db
      .from('normative_documents')
      .update({ texto_estructurado: md, texto_estructurado_at: new Date().toISOString() })
      .eq('id', d.id);
    if (e2) throw e2;
    resumen.hechos++;
    console.log(`  ✓ ${etiqueta}  — ${estructura} encabezados, palabras ${Math.round(razon * 100)} %`);
  }
  console.log('\n', resumen);
})();
