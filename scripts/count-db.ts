import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local') });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { count: docs } = await supabase
    .from('normative_documents')
    .select('id', { count: 'exact', head: true });
  const { count: chunks } = await supabase
    .from('normative_chunks')
    .select('id', { count: 'exact', head: true });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Documentos totales: ${docs}`);
  console.log(`Chunks totales: ${chunks}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { data: byType } = await supabase.from('normative_documents').select('type');
  const counts: Record<string, number> = {};
  for (const r of (byType as Array<{ type: string }>) || []) {
    counts[r.type] = (counts[r.type] || 0) + 1;
  }
  console.log('Por tipo:');
  for (const [t, c] of Object.entries(counts).sort()) {
    console.log(`  ${t.padEnd(20)} ${c}`);
  }
}

main().catch(console.error);
