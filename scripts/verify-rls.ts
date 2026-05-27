#!/usr/bin/env tsx
/**
 * Verifica que TODAS las tablas en el schema public tengan RLS habilitado.
 * Lista cada tabla con su estado y las policies activas.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

async function query(sql: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
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
