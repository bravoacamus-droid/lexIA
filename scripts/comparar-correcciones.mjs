#!/usr/bin/env node
/**
 * Compara las plantillas corregidas que envía César contra la versión
 * que ya está codificada.
 *
 * Por qué a nivel de PÁRRAFO y no de línea: un diff de líneas sobre
 * documentos de mil líneas devuelve ruido de formato. Lo que importa es
 * qué párrafos aparecen, cuáles desaparecen y cuáles cambian de
 * redacción, porque de eso depende si hay que retocar la plantilla
 * codificada y volver a pasar el auditor.
 *
 * Uso: node scripts/comparar-correcciones.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const NUEVAS = join('docs', 'correciones');
const ORIGINALES = join('docs', 'estructura-requerimiento');

/** Dónde vive cada corrección dentro de la extracción original. */
const RUTAS = {
  '1. Ejecución de obras - Diseño y construcción.md':
    'PROCEDIMIENTOS DE SELECCIÓN/4. EJECUCIÓN DE OBRAS/1. Ejecución de obras - Diseño y construcción.md',
  '2. Ejecución de obras - Solo construcción.md':
    'PROCEDIMIENTOS DE SELECCIÓN/4. EJECUCIÓN DE OBRAS/2. Ejecución de obras - Solo construcción.md',
  '2. Bienes Estandarizados.md': 'PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/2. Bienes Estandarizados.md',
  '4. Servicios compración de precios.md':
    'PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/4. Servicios compración de precios.md',
};

const parrafos = (texto) =>
  texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0 && !p.startsWith('<!--'));

for (const archivo of readdirSync(NUEVAS)) {
  if (!archivo.endsWith('.md')) continue;
  const rutaOriginal = join(ORIGINALES, RUTAS[archivo] ?? archivo);
  if (!existsSync(rutaOriginal)) {
    console.log(`\n⚠️  ${archivo}: no se encontró la versión original en ${rutaOriginal}`);
    continue;
  }

  const antes = parrafos(readFileSync(rutaOriginal, 'utf8'));
  const despues = parrafos(readFileSync(NUEVAS + '/' + archivo, 'utf8'));

  const setAntes = new Set(antes);
  const setDespues = new Set(despues);
  const agregados = despues.filter((p) => !setAntes.has(p));
  const eliminados = antes.filter((p) => !setDespues.has(p));

  console.log(`\n${'═'.repeat(70)}`);
  console.log(archivo);
  console.log(`  antes: ${antes.length} párrafos · después: ${despues.length}`);
  console.log(`  agregados: ${agregados.length} · eliminados: ${eliminados.length}`);

  if (agregados.length) {
    console.log('\n  ── AGREGADO ─────────────────────────────');
    for (const p of agregados) console.log(`  + ${p.slice(0, 260)}${p.length > 260 ? '…' : ''}`);
  }
  if (eliminados.length) {
    console.log('\n  ── ELIMINADO ────────────────────────────');
    for (const p of eliminados) console.log(`  - ${p.slice(0, 260)}${p.length > 260 ? '…' : ''}`);
  }
}
