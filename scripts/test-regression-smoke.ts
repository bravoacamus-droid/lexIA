/**
 * Smoke test de REGRESSION: verifica que los afinamientos para las
 * Q&A de César NO dañaron otros flujos.
 *
 * 1. Preguntas puntuales NO deben activar panorámica (sobre-expansión)
 * 2. Nuevos patrones ("detállame", "paso a paso") activan pero extraen
 *    tópico razonable
 * 3. Expansion de impedimentos/multa no rompe queries que solo
 *    mencionan la palabra de pasada
 * 4. Voz: penalización ley vieja respeta el filtro ley_30225
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import {
  isPanoramicQuery,
  extractCentralTopic,
  buildPanoramicFacets,
} from '../src/lib/ai/panoramic-query';
import { expandLegalQuery } from '../src/lib/ai/query-expansion';
import { searchNormativa } from '../src/lib/ai/voice-search';

async function main() {
  console.log('══ 1. Preguntas PUNTUALES no deben ser panorámicas ══');
  const puntuales = [
    '¿cuánto es el plazo para apelar en subasta inversa?',
    '¿qué establece el artículo 226?',
    'el postor presentó su oferta fuera de plazo, ¿procede descalificarlo?',
    '¿cuál es el monto máximo para contratación directa?',
    'la entidad puede resolver el contrato por incumplimiento?',
  ];
  let ok = 0;
  for (const q of puntuales) {
    const p = isPanoramicQuery(q);
    console.log(`  ${p ? '❌ FALSO POSITIVO' : '✅'} "${q.slice(0, 60)}"`);
    if (!p) ok++;
  }
  console.log(`  → ${ok}/${puntuales.length} correctas`);

  console.log('\n══ 2. Nuevos patrones extraen tópico razonable ══');
  const nuevas = [
    'detállame paso a paso el procedimiento de licitación pública',
    'en qué casos procede la contratación directa',
  ];
  for (const q of nuevas) {
    const p = isPanoramicQuery(q);
    const topic = p ? extractCentralTopic(q) : '(no panorámica)';
    const facets = p ? buildPanoramicFacets(topic) : [];
    console.log(`  ${p ? '✅' : '❌'} "${q.slice(0, 55)}"`);
    console.log(`     tópico: "${topic}" | facetas: ${facets.length}`);
  }

  console.log('\n══ 3. Expansion no sobre-dispara ══');
  const expansionTests: Array<[string, boolean]> = [
    // [query, deberíaExpandir]
    ['¿los impedimentos aplican a consorcios?', true], // impedimento → sí
    ['quiero registrar mi empresa en el RNP', false],
    ['¿cómo funciona la garantía de fiel cumplimiento?', false],
    ['si el ganador no firma el contrato qué pasa', true], // no firma → sí
  ];
  for (const [q, expected] of expansionTests) {
    const { expanded, focalQueries } = expandLegalQuery(q);
    const did = expanded.length > 0 || focalQueries.length > 0;
    const pass = did === expected;
    console.log(`  ${pass ? '✅' : '❌'} "${q.slice(0, 55)}" → expandió=${did} (esperado=${expected})`);
    if (did) console.log(`     focales: ${focalQueries.length}`);
  }

  console.log('\n══ 4. Voz: filtro ley_30225 desactiva penalización ══');
  // Con filtro 30225: los chunks de la ley vieja NO deben penalizarse
  const withOldFilter = await searchNormativa({
    query: '¿qué tipos de impedimentos de contratación existen?',
    match_count: 5,
    filter_law: ['ley_30225'],
  });
  console.log(`  Con filtro 30225: ${withOldFilter.length} resultados`);
  withOldFilter.slice(0, 3).forEach((r, i) =>
    console.log(`    [${i + 1}] ${r.citation.slice(0, 55)} sim=${r.similarity.toFixed(3)}`),
  );

  // Sin filtro: la ley 32069 debe dominar
  const noFilter = await searchNormativa({
    query: '¿qué tipos de impedimentos de contratación existen?',
    match_count: 5,
  });
  console.log(`  Sin filtro: ${noFilter.length} resultados`);
  noFilter.slice(0, 3).forEach((r, i) =>
    console.log(`    [${i + 1}] ${r.citation.slice(0, 55)} sim=${r.similarity.toFixed(3)}`),
  );
  const topIsCurrent = noFilter.length > 0 && /ley|reglamento/i.test(noFilter[0].type);
  console.log(`  ${topIsCurrent ? '✅' : '⚠️'} Sin filtro, el top-1 es fuente primaria vigente (${noFilter[0]?.type})`);
}

main().catch(console.error);
