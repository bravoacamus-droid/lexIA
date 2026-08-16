#!/usr/bin/env node
/**
 * Extrae a Markdown los documentos que César entregó en
 * "ESTRUCTURA DE REQUERIMIENTO", conservando las TABLAS.
 *
 * Por qué existe: un .docx es un zip con word/document.xml dentro, y una
 * extracción ingenua (quitar todas las etiquetas) aplana las tablas y
 * pierde filas y columnas. En estos documentos las tablas son medulares
 * —entregables, penalidades, requisitos de calificación, cronogramas—
 * así que hay que reconstruirlas.
 *
 * Salida: docs/estructura-requerimiento/**.md, uno por documento,
 * conservando la jerarquía de carpetas original.
 *
 * Uso: node scripts/extraer-estructura-requerimiento.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { join, dirname, sep } from 'node:path';

const ORIGEN = 'ESTRUCTURA DE REQUERIMIENTO';
const DESTINO = join('docs', 'estructura-requerimiento');

/** Lee una entrada del zip recorriendo su directorio central. */
function entradaZip(buf, nombre) {
  let fin = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) return null;
  const n = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(p + 10);
    const tamComp = buf.readUInt32LE(p + 20);
    const lenNom = buf.readUInt16LE(p + 28);
    const lenExtra = buf.readUInt16LE(p + 30);
    const lenCom = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    if (buf.toString('utf8', p + 46, p + 46 + lenNom) === nombre) {
      const lnNom = buf.readUInt16LE(off + 26);
      const lnExtra = buf.readUInt16LE(off + 28);
      const ini = off + 30 + lnNom + lnExtra;
      const datos = buf.subarray(ini, ini + tamComp);
      return metodo === 0 ? datos : inflateRawSync(datos);
    }
    p += 46 + lenNom + lenExtra + lenCom;
  }
  return null;
}

const desescapar = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

/** Texto plano de un fragmento de XML (párrafo o celda). */
function textoDe(xml) {
  let out = '';
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\s*\/>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] !== undefined) out += desescapar(m[1]);
    else if (m[0].startsWith('<w:tab')) out += ' ';
    else out += ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** ¿El párrafo es un encabezado? Se detecta por su estilo. */
function nivelEncabezado(xml) {
  const m = xml.match(/<w:pStyle w:val="([^"]+)"/);
  if (!m) return 0;
  const v = m[1].toLowerCase();
  if (/^heading(\d)/.test(v)) return Number(RegExp.$1);
  if (/^titulo(\d)/.test(v)) return Number(RegExp.$1);
  if (v.includes('title')) return 1;
  return 0;
}

/** Convierte una tabla de Word a Markdown. */
function tablaAMarkdown(xmlTabla) {
  const filas = [];
  const reFila = /<w:tr[\s>][\s\S]*?<\/w:tr>/g;
  let mf;
  while ((mf = reFila.exec(xmlTabla)) !== null) {
    const celdas = [];
    const reCelda = /<w:tc[\s>]([\s\S]*?)<\/w:tc>/g;
    let mc;
    while ((mc = reCelda.exec(mf[0])) !== null) {
      // Celdas combinadas horizontalmente: se repite el contenido para
      // no descuadrar la fila.
      const span = Number((mc[1].match(/<w:gridSpan w:val="(\d+)"/) || [])[1] || 1);
      const t = textoDe(mc[1]).replace(/\|/g, '\\|');
      celdas.push(t);
      for (let k = 1; k < span; k++) celdas.push('');
    }
    if (celdas.length) filas.push(celdas);
  }
  if (!filas.length) return '';

  const cols = Math.max(...filas.map((f) => f.length));
  const norm = filas.map((f) => [...f, ...Array(cols - f.length).fill('')]);
  const cab = norm[0];
  const cuerpo = norm.slice(1);
  const linea = (f) => `| ${f.join(' | ')} |`;
  return [
    linea(cab),
    `|${Array(cols).fill('---').join('|')}|`,
    ...cuerpo.map(linea),
  ].join('\n');
}

/** Recorre el cuerpo del documento en orden, párrafos y tablas. */
function documentoAMarkdown(xml) {
  const cuerpo = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [])[1] || xml;
  const partes = [];
  // Se recorren los bloques de primer nivel en el orden en que aparecen.
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>|<w:p\b[^>]*\/>/g;
  let m;
  while ((m = re.exec(cuerpo)) !== null) {
    const bloque = m[0];
    if (bloque.startsWith('<w:tbl')) {
      const md = tablaAMarkdown(bloque);
      if (md) partes.push('\n' + md + '\n');
      continue;
    }
    const t = textoDe(bloque);
    if (!t) { partes.push(''); continue; }
    const n = nivelEncabezado(bloque);
    partes.push(n > 0 ? `\n${'#'.repeat(Math.min(n + 1, 6))} ${t}\n` : t);
  }
  return partes
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function walk(d, out = []) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.docx') && !e.startsWith('~$')) out.push(p);
  }
  return out;
}

const archivos = walk(ORIGEN);
let totalChars = 0;
let totalTablas = 0;

console.log(`Extrayendo ${archivos.length} documentos…\n`);
for (const f of archivos) {
  const buf = readFileSync(f);
  const xml = entradaZip(buf, 'word/document.xml');
  if (!xml) { console.log(`  ⚠️  ${f} — sin document.xml`); continue; }
  const md = documentoAMarkdown(xml.toString('utf8'));
  const tablas = (md.match(/^\|---/gm) || []).length;
  totalChars += md.length;
  totalTablas += tablas;

  const relativo = f.split(sep).slice(1).join(sep).replace(/\.docx$/i, '.md');
  const destino = join(DESTINO, relativo);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `<!-- Extraído de: ${f} -->\n\n${md}\n`);
  console.log(`  ✅ ${String(md.length).padStart(7)} chars · ${String(tablas).padStart(3)} tablas · ${relativo}`);
}
console.log(`\nTotal: ${totalChars.toLocaleString('es-PE')} caracteres · ${totalTablas} tablas`);
console.log(`Salida en ${DESTINO}/`);
