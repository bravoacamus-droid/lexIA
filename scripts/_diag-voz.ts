import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { searchNormativa } from '../src/lib/ai/voice-search';

async function main() {
  const q = 'nos notificaron la buena pro pero la entidad se demora en firmar y ya pasaron dos semanas, qué podemos hacer';
  const r = await searchNormativa({ query: q, match_count: 8 });
  console.log('resultados:', r.length);
  r.forEach((x: any, i) => console.log(`  [${i + 1}] type="${x.type}" | ${(x.citation || '').slice(0, 48)}`));
  console.log('\ntipos devueltos:', [...new Set(r.map((x: any) => x.type))].join(', '));
}
main().catch((e) => console.error('ERR', e.message));
