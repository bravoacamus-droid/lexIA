import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { formatNormativaText } from '../src/lib/normativa/format-raw';

config({ path: '.env.local' });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: doc } = await admin
    .from('normative_documents')
    .select('id, number, raw_text')
    .ilike('number', '%346-2026%')
    .maybeSingle();

  if (!doc) {
    console.log('Doc no encontrado');
    return;
  }

  const raw = (doc as { raw_text: string }).raw_text;
  console.log('\n═══════════ RAW (primeros 2000 chars) ═══════════\n');
  console.log(raw.slice(0, 2000));

  const formatted = formatNormativaText(raw);
  console.log('\n\n═══════════ FORMATEADO (primeros 3000 chars) ═══════════\n');
  console.log(formatted.slice(0, 3000));
}

main().catch(console.error);
