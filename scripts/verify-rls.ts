#!/usr/bin/env tsx
/**
 * Verifica que TODAS las tablas en el schema public tengan RLS habilitado.
 * Lista cada tabla con su estado y las policies activas.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

/**
 * Same workaround as apply-migration: fetch() en Node 22 falla con 401 en
 * el Management API; curl con --data-binary @file funciona.
 */
async function query(sql: string): Promise<unknown> {
  const tmpFile = join(tmpdir(), `query-${Date.now()}.json`);
  writeFileSync(tmpFile, JSON.stringify({ query: sql }));
  const res = spawnSync(
    'curl',
    [
      '-sS',
      '-X', 'POST',
      '-H', `Authorization: Bearer ${ACCESS_TOKEN}`,
      '-H', 'Content-Type: application/json',
      '--data-binary', `@${tmpFile}`,
      '-w', '\n__STATUS__:%{http_code}',
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    ],
    { encoding: 'utf-8' },
  );
  try { unlinkSync(tmpFile); } catch { /* ignore */ }
  const out = (res.stdout || '') + (res.stderr || '');
  const m = out.match(/__STATUS__:(\d+)/);
  const status = m ? parseInt(m[1]) : 0;
  const body = out.replace(/\n?__STATUS__:\d+/, '').trim();
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP ${status}: ${body.slice(0, 200)}`);
  }
  return JSON.parse(body);
}

async function main() {
  console.log('Verificando RLS en schema public...\n');

  const tables = await query(`
    SELECT
      n.nspname AS schema,
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced,
      (SELECT count(*) FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
    ORDER BY c.relname;
  `);

  type Row = { table_name: string; rls_enabled: boolean; policy_count: number };
  const rows = tables as Row[];

  let ok = 0;
  let bad = 0;
  for (const r of rows) {
    const status = r.rls_enabled ? 'OK' : 'FALTA RLS';
    const flag = r.rls_enabled ? '+' : '!';
    console.log(`  ${flag} ${r.table_name.padEnd(28)} RLS=${r.rls_enabled.toString().padEnd(6)} policies=${r.policy_count}  [${status}]`);
    if (r.rls_enabled) ok += 1;
    else bad += 1;
  }

  console.log(`\nResumen: ${ok}/${rows.length} tablas con RLS habilitado.`);
  if (bad > 0) {
    console.log(`PROBLEMA: ${bad} tablas SIN RLS. Reaplicar 0002_rls.sql.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
