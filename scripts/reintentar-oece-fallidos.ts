#!/usr/bin/env tsx
/**
 * Prepara el REINTENTO de las opiniones y pronunciamientos que nunca
 * llegaron a entrar.
 *
 * Mismo mecanismo que reintentar-resoluciones-fallidas.ts: el archivo de
 * estado anota cada documento procesado, con éxito o sin él, y la
 * ingesta salta todo lo anotado. Eso la hace reanudable, pero también
 * condena a no entrar nunca al que falló por algo transitorio.
 *
 * En esta tanda importa de más porque 16 de los fallos fueron por bytes
 * nulos en el PDF —"unsupported Unicode escape sequence"—, un problema
 * que ya está corregido en el ingestor. Se comprobó descargando uno de
 * los afectados: el saneador quita el carácter y el documento entra. Sin
 * depurar el archivo de estado, esos 16 quedarían fuera para siempre por
 * un fallo que ya no existe.
 *
 * Guarda una copia del archivo original antes de reescribirlo.
 *
 * Uso:
 *   npx tsx scripts/reintentar-oece-fallidos.ts           (simula)
 *   npx tsx scripts/reintentar-oece-fallidos.ts --apply
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ESTADO = join(process.cwd(), 'data', 'oece-ingesta.state.jsonl');
const APPLY = process.argv.includes('--apply');

interface Registro { id: string; estado: string; detalle?: string }

function main() {
  if (!existsSync(ESTADO)) {
    console.error('No existe el archivo de estado.');
    process.exit(1);
  }

  const registros: Registro[] = [];
  for (const l of readFileSync(ESTADO, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    try { registros.push(JSON.parse(l) as Registro); } catch { /* línea corrupta */ }
  }

  const conExito = new Set(registros.filter((r) => r.estado === 'ok').map((r) => r.id));
  const nuncaEntraron = [...new Set(registros.filter((r) => r.estado !== 'ok').map((r) => r.id))]
    .filter((id) => !conExito.has(id));

  const motivos = new Map<string, string>();
  for (const r of registros) {
    if (nuncaEntraron.includes(r.id)) motivos.set(r.id, r.detalle || r.estado);
  }
  const resumen = new Map<string, number>();
  for (const m of motivos.values()) {
    const k = m.slice(0, 50);
    resumen.set(k, (resumen.get(k) || 0) + 1);
  }

  console.log(`Registros en el archivo: ${registros.length}`);
  console.log(`Documentos con éxito:    ${conExito.size}`);
  console.log(`Nunca entraron:          ${nuncaEntraron.length}\n`);
  console.log('Motivo del último intento:');
  [...resumen.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log(`  ${String(v).padStart(4)} × ${k}`),
  );

  const nuevas = registros.filter((r) => r.estado === 'ok');
  console.log(`\nEl archivo pasaría de ${registros.length} a ${nuevas.length} registros.`);
  console.log(`Al relanzar, la ingesta reintentaría ${nuncaEntraron.length} documentos.`);

  if (!APPLY) {
    console.log('\n(simulación — ejecuta con --apply)');
    return;
  }

  copyFileSync(ESTADO, `${ESTADO}.bak`);
  writeFileSync(ESTADO, nuevas.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`\n✅ archivo depurado · copia en ${ESTADO}.bak`);
  console.log('   Relanza la ingesta para que reintente las pendientes.');
}

main();
