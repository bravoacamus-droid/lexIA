#!/usr/bin/env tsx
/**
 * Crea subscriptions con trial de 30 días para usuarios en auth.users
 * que NO tengan fila en public.subscriptions.
 *
 * Útil cuando:
 *   - Hay usuarios creados antes de la migración 0006 (sin sub).
 *   - El trigger handle_new_user falló para algún registro.
 *   - Importas usuarios manualmente sin pasar por el flow OAuth.
 *
 * Es idempotente: si ya tienen sub, no toca nada.
 *
 * Uso:
 *   npx tsx scripts/backfill-subscriptions.ts            # 30 días de trial
 *   npx tsx scripts/backfill-subscriptions.ts --dry-run  # solo reporta
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRY = process.argv.includes('--dry-run');

async function main() {
  console.log('Buscando usuarios sin suscripción...\n');

  const { data: users, error: e1 } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (e1) throw e1;

  const allUsers = users.users || [];
  const { data: subs, error: e2 } = await supabase
    .from('subscriptions')
    .select('user_id');
  if (e2) throw e2;

  const withSub = new Set(
    ((subs || []) as Array<{ user_id: string }>).map((s) => s.user_id),
  );
  const missing = allUsers.filter((u) => !withSub.has(u.id));

  console.log(
    `Total usuarios: ${allUsers.length}  ·  con suscripción: ${allUsers.length - missing.length}  ·  faltantes: ${missing.length}\n`,
  );
  if (missing.length === 0) {
    console.log('Nada que hacer. ✓');
    return;
  }

  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const u of missing) {
    console.log(`  ${DRY ? 'DRY' : '+'} ${u.email || u.id}  ·  trial hasta ${trialEndsAt.slice(0, 10)}`);
    if (DRY) continue;
    const { error } = await supabase.from('subscriptions').insert({
      user_id: u.id,
      tier: 'free_trial',
      status: 'trialing',
      trial_ends_at: trialEndsAt,
    } as never);
    if (error) console.log(`    ✗ ${error.message}`);
  }

  if (!DRY) {
    console.log(`\n${missing.length} suscripciones creadas con trial hasta ${trialEndsAt}.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
