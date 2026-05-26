#!/usr/bin/env tsx
/**
 * Aplica migraciones SQL al proyecto Supabase usando la Management API.
 * Lee /supabase/migrations/*.sql en orden alfabético y ejecuta cada archivo
 * via el endpoint /v1/projects/{ref}/database/query.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('❌ Faltan SUPABASE_PROJECT_REF o SUPABASE_ACCESS_TOKEN en .env.local');
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

async function runSql(sql: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
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

  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }

  if (!res.ok) {
    return {
      ok: false,
      error: typeof json === 'object' && json && 'message' in json
        ? String((json as { message: string }).message)
        : text || `HTTP ${res.status}`,
    };
  }

  return { ok: true, data: json };
}

async function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`📦 Encontradas ${files.length} migraciones en ${MIGRATIONS_DIR}`);

  for (const file of files) {
    const path = join(MIGRATIONS_DIR, file);
    const sql = readFileSync(path, 'utf-8');
    process.stdout.write(`▶ ${file}... `);
    const result = await runSql(sql);
    if (!result.ok) {
      console.log('❌');
      console.error(`Error en ${file}:\n${result.error}\n`);
      process.exit(1);
    }
    console.log('✓');
  }

  console.log('\n✅ Todas las migraciones se aplicaron correctamente.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
