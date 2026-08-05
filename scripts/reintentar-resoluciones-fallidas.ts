#!/usr/bin/env tsx
/**
 * Prepara el REINTENTO de las resoluciones que nunca llegaron a entrar.
 *
 * El archivo de estado anota cada resolución procesada, con éxito o sin
 * él, y la ingesta salta todo lo anotado. Eso la hace reanudable, pero
 * también significa que un fallo transitorio —un timeout de escritura,
 * un corte de red— condenaba a esa resolución a no entrar nunca.
 *
 * Este script depura el archivo: conserva solo las claves que ALGUNA VEZ
 * quedaron en 'ok' y descarta las anotaciones de las que no. Al relanzar
 * la ingesta, esas vuelven a la cola. Lo que ya está en la biblioteca no
 * se toca: el deduplicador de la ingesta lo detecta por clave.
 *
 * Guarda una copia del archivo original antes de reescribirlo.
 *
 * Uso:
 *   npx tsx scripts/reintentar-resoluciones-fallidas.ts           (simula)
 *   npx tsx scripts/reintentar-resoluciones-fallidas.ts --apply
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ESTADO = join(process.cwd(), 'data', 'tcp-ingesta.state.jsonl');
const APPLY = process.argv.includes('--apply');

interface Registro { key: string; estado: string; detalle?: string }

function main() {
  if (!existsSync(ESTADO)) {
    console.error('No existe el archivo de estado.');
    process.exit(1);
  }

  const lineas = readFileSync(ESTADO, 'utf8').split('\n').filter((l) => l.trim());
  const registros: Registro[] = [];
  for (const l of lineas) {
    try { registros.push(JSON.parse(l) as Registro); } catch { /* línea corrupta */ }
  }

  const conExito = new Set(registros.filter((r) => r.estado === 'ok').map((r) => r.key));
  const nuncaEntraron = [...new Set(registros.filter((r) => r.estado !== 'ok').map((r) => r.key))]
    .filter((k) => !conExito.has(k));

  // Motivo del ÚLTIMO intento de cada una, para saber qué esperar.
  const motivos = new Map<string, string>();
  for (const r of registros) {
    if (nuncaEntraron.includes(r.key)) motivos.set(r.key, r.detalle || r.estado);
  }
  const resumen = new Map<string, number>();
  for (const m of motivos.values()) {
    const k = m.slice(0, 50);
    resumen.set(k, (resumen.get(k) || 0) + 1);
  }

  console.log(`Registros en el archivo: ${registros.length}`);
  console.log(`Claves con éxito:        ${conExito.size}`);
  console.log(`Nunca entraron:          ${nuncaEntraron.length}\n`);
  console.log('Motivo del último intento:');
  [...resumen.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log(`  ${String(v).padStart(4)} × ${k}`),
  );

  const nuevas = registros.filter((r) => r.estado === 'ok');
  console.log(`\nEl archivo pasaría de ${registros.length} a ${nuevas.length} registros.`);
  console.log(`Al relanzar, la ingesta reintentaría ${nuncaEntraron.length} resoluciones.`);

  if (!APPLY) {
    console.log('\n(simulación — ejecuta con --apply)');
    return;
  }

  const copia = `${ESTADO}.bak`;
  copyFileSync(ESTADO, copia);
  writeFileSync(ESTADO, nuevas.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`\n✅ archivo depurado · copia del original en ${copia}`);
  console.log('   Relanza la ingesta para que reintente las pendientes.');
}

main();
