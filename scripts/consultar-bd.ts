#!/usr/bin/env tsx
/**
 * Ejecuta una consulta de solo lectura y muestra el resultado en tabla.
 *
 * apply-migration.ts sirve para aplicar DDL, pero solo informa si la
 * sentencia se ejecutó: cuando el resultado es largo lo recorta y no se
 * puede leer. Para diagnosticar hace falta ver las filas.
 *
 * Uso: npx tsx scripts/consultar-bd.ts "select ..."
 *      npx tsx scripts/consultar-bd.ts --archivo consulta.sql
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

config({ path: join(process.cwd(), '.env.local'), override: true });

const token = (process.env.SUPABASE_ACCESS_TOKEN ?? '').trim().replace(/[\r\n"']/g, '');
const ref = (process.env.SUPABASE_PROJECT_REF ?? '').trim().replace(/[\r\n"']/g, '');

async function main() {
  const args = process.argv.slice(2);
  const sql =
    args[0] === '--archivo' ? readFileSync(args[1], 'utf8') : args.join(' ');
  if (!sql.trim()) {
    console.error('Uso: npx tsx scripts/consultar-bd.ts "select ..."');
    process.exit(1);
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    process.exit(1);
  }

  const filas = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(filas) || filas.length === 0) {
    console.log('(sin filas)');
    return;
  }
  console.log(`${filas.length} fila(s):\n`);
  for (const [i, f] of filas.entries()) {
    console.log(`── ${i + 1}`);
    for (const [k, v] of Object.entries(f)) {
      console.log(`   ${k.padEnd(22)} ${v === null ? '—' : String(v)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
