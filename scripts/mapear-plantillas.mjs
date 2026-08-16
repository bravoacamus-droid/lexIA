#!/usr/bin/env node
/**
 * Mapea las 15 plantillas de César: secciones de cada una y, sobre todo,
 * QUÉ TEXTO COMPARTEN.
 *
 * Por qué importa lo segundo: codificar quince plantillas transcribiendo
 * cada párrafo por separado garantiza que a la tercera se cuele una
 * variante. La cláusula antisoborno, la responsabilidad por vicios
 * ocultos o la acreditación de experiencia aparecen casi idénticas en
 * varias. Las que son EXACTAMENTE iguales van una sola vez a un módulo
 * común; las que difieren aunque sea en una palabra, no —y conviene
 * saber cuáles son, porque esa palabra suele ser deliberada.
 *
 * Uso:
 *   node scripts/mapear-plantillas.mjs              → secciones
 *   node scripts/mapear-plantillas.mjs --comunes    → párrafos repetidos
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join('docs', 'estructura-requerimiento');

function walk(d, out = []) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

const archivos = walk(RAIZ)
  .filter((f) => !f.includes('ESTRUCTURA PARA GENERADOR'))
  .sort();

/** Un título de sección: línea corta, en mayúsculas, sin tabla ni corchete. */
const esTitulo = (l) => {
  const t = l.trim();
  if (t.length < 10 || t.length > 90) return false;
  if (/^[|>[]/.test(t)) return false;
  if (/[a-záéíóúñ]/.test(t.replace(/\bde\b|\by\b|\bo\b|\bla\b|\bel\b|\blos\b|\blas\b|\bpara\b|\ben\b/gi, ''))) return false;
  return /^[A-ZÁÉÍÓÚÑ]/.test(t);
};

if (process.argv.includes('--comunes')) {
  // ── Párrafos que se repiten entre plantillas ────────────────────────
  const donde = new Map(); // párrafo normalizado → Set(archivos)
  const muestra = new Map(); // párrafo normalizado → texto original

  for (const f of archivos) {
    const texto = readFileSync(f, 'utf8');
    for (const p of texto.split(/\n\s*\n/)) {
      const t = p.trim();
      // Solo párrafos sustanciales de prosa: ni tablas, ni instrucciones
      // entre corchetes, ni títulos.
      if (t.length < 180) continue;
      if (t.startsWith('|') || t.startsWith('[') || t.startsWith('<!--')) continue;
      const clave = t.replace(/\s+/g, ' ').toLowerCase();
      if (!donde.has(clave)) {
        donde.set(clave, new Set());
        muestra.set(clave, t);
      }
      donde.get(clave).add(f);
    }
  }

  // --min N limita a los párrafos presentes en al menos N plantillas.
  // --texto los vuelca íntegros, para transcribirlos sin intermediarios.
  const iMin = process.argv.indexOf('--min');
  const min = iMin > 0 ? Number(process.argv[iMin + 1]) : 2;
  const completo = process.argv.includes('--texto');

  const repetidos = [...donde.entries()]
    .filter(([, s]) => s.size >= min)
    .sort((a, b) => b[1].size - a[1].size);

  if (completo) {
    console.log(`Párrafos presentes en ${min} o más plantillas: ${repetidos.length}\n`);
    for (const [clave, s] of repetidos) {
      console.log(`━━━ ${s.size} plantillas · ${muestra.get(clave).length} caracteres`);
      console.log(muestra.get(clave));
      console.log();
    }
    process.exit(0);
  }

  console.log(`Párrafos idénticos en 2 o más plantillas: ${repetidos.length}\n`);
  for (const [clave, archivosSet] of repetidos) {
    const t = muestra.get(clave);
    console.log(`── en ${archivosSet.size} plantillas · ${t.length} caracteres`);
    console.log(`   ${t.replace(/\s+/g, ' ').slice(0, 150)}…`);
    for (const a of archivosSet) console.log(`     · ${a.replace(RAIZ + '\\', '').replace(RAIZ + '/', '')}`);
    console.log();
  }
  const totalChars = repetidos.reduce(
    (n, [c, s]) => n + muestra.get(c).length * (s.size - 1),
    0,
  );
  console.log(`Transcripción que se evita reutilizando: ${totalChars.toLocaleString('es-PE')} caracteres.`);
} else {
  // ── Secciones de cada plantilla ─────────────────────────────────────
  for (const f of archivos) {
    const lineas = readFileSync(f, 'utf8').split('\n');
    const titulos = [];
    lineas.forEach((l, i) => {
      if (esTitulo(l)) titulos.push(`${String(i + 1).padStart(5)}  ${l.trim()}`);
    });
    console.log(`\n══════ ${f.replace(RAIZ + '\\', '').replace(RAIZ + '/', '')}`);
    console.log(`       ${lineas.length} líneas · ${titulos.length} títulos`);
    for (const t of titulos) console.log(t);
  }
}
