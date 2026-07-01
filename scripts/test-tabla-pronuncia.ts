import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { formatForDisplay, formatNormativaText } from '../src/lib/normativa/format-raw';

config({ path: '.env.local' });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await admin
    .from('normative_documents')
    .select('raw_text')
    .ilike('number', '%346-2026%')
    .maybeSingle();

  const raw = (data as { raw_text: string }).raw_text;

  // Buscar la sección de tabla en el texto
  const tableStart = raw.indexOf('COD. SIGA');
  const contextStart = Math.max(0, tableStart - 300);
  const contextEnd = Math.min(raw.length, tableStart + 2000);
  const contextRaw = raw.slice(contextStart, contextEnd);

  console.log('\n═══════════════ RAW (con tabla) ═══════════════\n');
  console.log(contextRaw);

  console.log('\n\n═══════════════ MODO DISPLAY (biblioteca — tabla bonita) ═══════════════\n');
  const displayed = formatForDisplay(contextRaw);
  console.log(displayed);

  console.log('\n\n═══════════════ MODO STRIP (chunk-sheet — resumen) ═══════════════\n');
  const stripped = formatNormativaText(contextRaw);
  console.log(stripped);
}

main().catch(console.error);
