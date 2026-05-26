#!/usr/bin/env tsx
/**
 * Elimina docs sin chunks (orphaned) para que el seed los regenere.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: docs } = await supabase
    .from('normative_documents')
    .select('id, number');
  if (!docs) return;

  for (const d of docs as Array<{ id: string; number: string | null }>) {
    const { count } = await supabase
      .from('normative_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', d.id);
    if ((count || 0) === 0) {
      console.log(`Eliminando huérfano: ${d.number || d.id}`);
      await supabase.from('normative_documents').delete().eq('id', d.id);
    }
  }
  console.log('Limpieza OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
