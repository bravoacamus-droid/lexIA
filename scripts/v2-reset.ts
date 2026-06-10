#!/usr/bin/env tsx
/**
 * Etapa 0 — Reset automático vía Supabase Admin APIs.
 *
 * Ejecuta los 3 pasos manuales del Dashboard sin intervención humana:
 *   1. SQL TRUNCATE de las 9 tablas de aplicación (Management API)
 *   2. Borrar todos los usuarios de auth.users excepto los protegidos (Auth Admin API)
 *   3. Vaciar el contenido de todos los buckets de Storage (Storage Admin API)
 *
 * Requiere en .env.local:
 *   SUPABASE_ACCESS_TOKEN      (Management API)
 *   SUPABASE_SERVICE_ROLE_KEY  (Auth + Storage admin)
 *   SUPABASE_PROJECT_REF       (ej. "uccschvusivqldaprsfq")
 *   NEXT_PUBLIC_SUPABASE_URL
 *
 * Lista blanca de emails que NO se borran (admins / cliente):
 */
const PROTECTED_EMAILS = ['bravo.a.camus@gmail.com'];

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { join } from 'node:path';

config({ path: join(process.cwd(), '.env.local') });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

if (!SERVICE_KEY || !PROJECT_REF || !SUPABASE_URL) {
  console.error('Faltan variables de entorno. Revisa .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Orden de borrado: HOJAS PRIMERO. Cuando una tabla padre tiene
// ON DELETE CASCADE, borrar el padre arrastra los hijos — pero
// hacemos el orden explícito por claridad y para no depender de las FK.
const TABLES_IN_DELETE_ORDER = [
  'user_annotations',
  'user_saved_documents',
  'user_folders',
  'chat_messages',
  'chat_conversations',
  'evaluations',
  'generated_documents',
  'normative_chunks',
  'normative_documents',
] as const;

async function step1_truncate() {
  console.log('\n[1/3] Vaciando tablas de aplicación vía REST ...');
  for (const table of TABLES_IN_DELETE_ORDER) {
    const { error, count } = await admin
      .from(table)
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`  ${table}: error → ${error.message}`);
    } else {
      console.log(`  ${table}: ${count ?? 0} fila(s) borrada(s)`);
    }
  }

  // Conteo final por tabla.
  console.log('  Conteos post-reset:');
  for (const table of TABLES_IN_DELETE_ORDER) {
    const { count, error } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.warn(`    ${table}: error → ${error.message}`);
    } else {
      console.log(`    ${table}: ${count ?? 0}`);
    }
  }
}

async function step2_deleteUsers() {
  console.log('\n[2/3] Borrando usuarios de prueba (excepto protegidos) ...');
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const users = data.users || [];
  console.log(`  Total usuarios actuales: ${users.length}`);

  let deleted = 0;
  let kept = 0;
  for (const u of users) {
    const email = (u.email || '').toLowerCase();
    if (PROTECTED_EMAILS.includes(email)) {
      console.log(`  Conservado: ${email}`);
      kept++;
      continue;
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.warn(`  Falló borrar ${email}: ${delErr.message}`);
    } else {
      console.log(`  Borrado: ${email || u.id}`);
      deleted++;
    }
  }
  console.log(`  Total borrados: ${deleted} · conservados: ${kept}`);
}

async function step3_emptyStorage() {
  console.log('\n[3/3] Vaciando buckets de Storage ...');
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;
  if (!buckets || buckets.length === 0) {
    console.log('  No hay buckets — nada que vaciar.');
    return;
  }

  for (const b of buckets) {
    console.log(`  Bucket "${b.name}":`);
    let totalRemoved = 0;
    // Recursivo: lista carpetas top-level y borra todo lo que contienen.
    async function purge(prefix: string) {
      const { data: items, error: lsErr } = await admin.storage
        .from(b.name)
        .list(prefix, { limit: 1000 });
      if (lsErr) throw lsErr;
      if (!items) return;

      const filePaths: string[] = [];
      const subFolders: string[] = [];
      for (const it of items) {
        const fullPath = prefix ? `${prefix}/${it.name}` : it.name;
        if ((it as { id: string | null }).id === null) {
          subFolders.push(fullPath);
        } else {
          filePaths.push(fullPath);
        }
      }
      if (filePaths.length > 0) {
        const { error: rmErr } = await admin.storage
          .from(b.name)
          .remove(filePaths);
        if (rmErr) {
          console.warn(`    Falló borrado en "${prefix}": ${rmErr.message}`);
        } else {
          totalRemoved += filePaths.length;
        }
      }
      for (const sub of subFolders) await purge(sub);
    }
    await purge('');
    console.log(`    Archivos borrados: ${totalRemoved}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  LexIA v2 · Reset automatizado');
  console.log('  Proyecto:', PROJECT_REF);
  console.log('═══════════════════════════════════════════════════');
  await step1_truncate();
  await step2_deleteUsers();
  await step3_emptyStorage();
  console.log('\n✓ Reset completo. Listo para reconstrucción.');
}

main().catch((e) => {
  console.error('\n✗ Falló:', e);
  process.exit(1);
});
