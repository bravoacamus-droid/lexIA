/**
 * Aplica la migración 0030 usando el Management API de Supabase
 * (POST /v1/projects/{ref}/database/query) que requiere el PAT
 * SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF (ya presentes en .env.local).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'fs';

async function main() {
  const pat = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!pat || !ref) {
    console.error('❌ Faltan SUPABASE_ACCESS_TOKEN o SUPABASE_PROJECT_REF');
    process.exit(1);
  }

  const sql = fs.readFileSync(
    'supabase/migrations/0030_training_qa_pairs.sql',
    'utf-8',
  );

  console.log('Aplicando migración 0030 al proyecto', ref, '...');
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ Error ${res.status}:`, text);
    process.exit(1);
  }
  console.log('✓ Migración aplicada correctamente');
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j) && j.length > 0) console.log(j.slice(0, 5));
  } catch {
    /* no JSON */
  }
}

main().catch(console.error);
