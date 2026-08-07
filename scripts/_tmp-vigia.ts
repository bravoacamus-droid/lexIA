import { config } from 'dotenv';
import { join } from 'node:path';
config({ path: join(process.cwd(), '.env.local'), override: true });
const TOKEN = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const PROJECT = 'uccschvusivqldaprsfq';
async function sql(query: string) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : [];
}
async function main() {
  const inicio = Date.now();
  for (;;) {
    const idx = await sql(`select count(*)::int as n from pg_class where relname='normative_chunks_h_embedding_idx';`);
    if (idx[0].n > 0) {
      const t = await sql(`select pg_size_pretty(pg_relation_size('normative_chunks_h_embedding_idx')) as nuevo,
                                  pg_size_pretty(pg_relation_size('normative_chunks_embedding_idx')) as viejo,
                                  pg_size_pretty(pg_database_size(current_database())) as base;`);
      console.log(`\n✅ INDICE HALFVEC CONSTRUIDO tras ${((Date.now()-inicio)/60000).toFixed(0)} min de vigilancia`);
      console.log(`   indice halfvec ${t[0].nuevo}`);
      console.log(`   indice actual  ${t[0].viejo}`);
      console.log(`   base           ${t[0].base}`);
      return;
    }
    const p = await sql(`select blocks_done, blocks_total from pg_stat_progress_create_index;`);
    if (p.length === 0) {
      console.log('⚠️ no hay construccion en curso y el indice no existe — se detuvo sola');
      return;
    }
    const bd = Number(p[0].blocks_done), bt = Number(p[0].blocks_total);
    console.log(`  ${new Date().toISOString().slice(11,16)} · ${((bd/bt)*100).toFixed(1)}%`);
    await new Promise(r => setTimeout(r, 300000));
  }
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
