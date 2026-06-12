#!/usr/bin/env tsx
/**
 * Aplica una migración SQL al proyecto Supabase vía Management API.
 *
 * Uso:
 *   npx tsx scripts/apply-migration.ts supabase/migrations/0006_xxx.sql
 *
 * Requiere en .env.local:
 *   SUPABASE_ACCESS_TOKEN  (Personal Access Token con permisos sobre el proyecto)
 *   SUPABASE_PROJECT_REF
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

config({ path: join(process.cwd(), '.env.local') });

// dotenv en Windows a veces deja \r al final. Sanitizamos los env vars
// antes de inyectarlos al header HTTP (un \r en Authorization → 401).
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim().replace(/[\r\n"']/g, '');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF?.trim().replace(/[\r\n"']/g, '');

if (!TOKEN || !PROJECT_REF) {
  console.error('Faltan SUPABASE_ACCESS_TOKEN o SUPABASE_PROJECT_REF en .env.local');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Uso: npx tsx scripts/apply-migration.ts <ruta-al-sql>');
  process.exit(1);
}

// Lee el SQL eliminando BOM si lo hay (algunos editores Windows lo agregan).
const sql = readFileSync(file, 'utf-8').replace(/^﻿/, '');

import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';

async function main() {
  console.log(`Aplicando migración: ${file}`);
  console.log(`Proyecto: ${PROJECT_REF}`);

  // El endpoint /database/query rechaza con 401 cuando recibe ciertos
  // payloads desde fetch() de Node 22, pero curl con un archivo JSON
  // sí funciona de forma reproducible. Delegamos en curl para máxima
  // robustez con DDL grande (creates types, functions con $$, etc).
  const tmpFile = join(tmpdir(), `migration-${Date.now()}.json`);
  const payload = JSON.stringify({ query: sql });
  writeFileSync(tmpFile, payload, { encoding: 'utf-8' });

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const res = spawnSync(
    'curl',
    [
      '-sS',
      '-X', 'POST',
      '-H', `Authorization: Bearer ${TOKEN}`,
      '-H', 'Content-Type: application/json',
      '--data-binary', `@${tmpFile}`,
      '-w', '\n__HTTP_STATUS__:%{http_code}',
      url,
    ],
    { encoding: 'utf-8' },
  );

  try { unlinkSync(tmpFile); } catch { /* ignore */ }

  const out = (res.stdout || '') + (res.stderr || '');
  const statusMatch = out.match(/__HTTP_STATUS__:(\d+)/);
  const status = statusMatch ? parseInt(statusMatch[1]) : 0;
  const body = out.replace(/\n?__HTTP_STATUS__:\d+/, '').trim();

  if (status < 200 || status >= 300) {
    console.error(`✗ Falló (HTTP ${status}): ${body}`);
    process.exit(1);
  }
  console.log(`✓ Migración aplicada (HTTP ${status}).`);
  if (body.length > 0 && body.length < 500) console.log('  Resultado:', body);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
