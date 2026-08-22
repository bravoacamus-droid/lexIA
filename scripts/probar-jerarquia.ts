#!/usr/bin/env tsx
/**
 * La norma manda sobre el criterio que la interpreta.
 *
 * POR QUÉ EXISTE
 *
 * César preguntó el 21/08/2026 por las condiciones para aprobar una
 * ampliación de plazo y el chat respondió "siete (7) días hábiles". El
 * numeral 142.3 del Reglamento dice diez. Los siete salían de una
 * Opinión escrita bajo la norma anterior. En otra pregunta sobre plazos
 * respondió quince donde el artículo 200 dice diez.
 *
 * Medido antes de tocar nada: de los quince fragmentos que recuperaba
 * esa pregunta, CATORCE eran opiniones de 2021 a 2024 y uno solo era
 * norma. Cinco decían "siete días" y dos "diez". El modelo hizo lo que
 * cualquiera haría con ese material.
 *
 * Uso: npx tsx scripts/probar-jerarquia.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';
import {
  BLOQUE_JERARQUIA,
  etiquetaJerarquia,
  ordenarPorJerarquia,
  rangoDe,
  TIPOS_CAPA_1,
} from '../src/lib/ai/jerarquia';

config({ path: join(process.cwd(), '.env.local'), override: true });
const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

// ── 1. Las tres capas ─────────────────────────────────────────────────
console.log('── Cada documento en su capa ──');
for (const [tipo, capa] of [
  ['ley', 1], ['reglamento', 1], ['directiva', 1], ['bases_estandar', 1],
  ['resolucion_tce', 2], ['pronunciamiento', 2], ['opinion', 2],
  ['guia', 3], ['manual_seace', 3], ['lineamiento', 3],
] as const) {
  comprobar(`${tipo} → capa ${capa}`, rangoDe(tipo).capa === capa);
}
comprobar('un tipo desconocido cae en orientación, no en norma', rangoDe('lo_que_sea').capa === 3);
comprobar('la capa 1 se puede pedir a la búsqueda', TIPOS_CAPA_1.includes('reglamento'));

console.log('\n── El orden con el que lee el modelo ──');
const mezcla = [
  { doc_type: 'opinion', similarity: 0.9 },
  { doc_type: 'guia', similarity: 0.95 },
  { doc_type: 'reglamento', similarity: 0.4 },
  { doc_type: 'resolucion_tce', similarity: 0.8 },
  { doc_type: 'ley', similarity: 0.3 },
];
const ordenada = ordenarPorJerarquia(mezcla);
comprobar('la Ley va primera aunque se parezca menos', ordenada[0].doc_type === 'ley');
comprobar('el Reglamento va segundo', ordenada[1].doc_type === 'reglamento');
comprobar('la opinión queda por detrás del Tribunal', 
  ordenada.findIndex((x) => x.doc_type === 'opinion') >
  ordenada.findIndex((x) => x.doc_type === 'resolucion_tce'));
comprobar('la guía va la última pese a ser la más parecida', ordenada[4].doc_type === 'guia');
comprobar('la etiqueta dice la capa', etiquetaJerarquia('opinion').startsWith('CAPA 2'));

console.log('\n── Las reglas que recibe el modelo ──');
// El bloque va formateado a columna, así que las frases se cortan en
// varias líneas: se compara sobre el texto con los espacios juntados.
const reglas = BLOQUE_JERARQUIA.replace(/\s+/g, ' ');
for (const frase of [
  'Ningún criterio interpretativo',
  'contradecir una norma de superior jerarquía',
  'Un plazo, un requisito o un umbral se responden SIEMPRE con la capa 1',
  'NO elijas automáticamente el más reciente',
  'Ley N° 30225',
]) {
  comprobar(`incluye "${frase.slice(0, 46)}…"`, reglas.includes(frase));
}

// ── 2. Contra la base: la pregunta que falló ──────────────────────────
void (async () => {
  console.log('\n── La pregunta de César, contra la base ──');
  const q =
    'CUALES SON LAS CONDICIONES PARA QUE SE APRUEBA UNA SOLICITUD DE AMPLIACION DE PLAZO EN CASO DE BIENES';
  const emb = await embedOne(q, 'RETRIEVAL_QUERY');

  const normal = await admin.rpc('hybrid_search', {
    query_text: q,
    query_embedding: emb as unknown as number[],
    match_count: 15,
    filter_type: null,
  });
  const base = (normal.data ?? []) as Array<{ chunk_id: string; doc_type: string; content: string }>;
  const capa1Antes = base.filter((c) => rangoDe(c.doc_type).capa === 1).length;
  console.log(`   la búsqueda por parecido trae ${capa1Antes} de ${base.length} fragmentos de norma`);

  const dirigida = await Promise.all(
    ['ley', 'reglamento', 'directiva'].map(async (tipo) => {
      const { data } = await admin.rpc('hybrid_search', {
        query_text: q.slice(0, 400),
        query_embedding: emb as unknown as number[],
        match_count: 3,
        filter_type: tipo,
      });
      return (data ?? []) as Array<{ chunk_id: string; doc_type: string; content: string }>;
    }),
  );
  const ya = new Set(base.map((c) => c.chunk_id));
  const norma = dirigida.flat().filter((c) => !ya.has(c.chunk_id));
  const todas = ordenarPorJerarquia([...norma, ...base]);

  comprobar('la búsqueda dirigida añade norma', norma.length > 0);
  comprobar(
    'el modelo pasa a ver norma entre las tres primeras fuentes',
    todas.slice(0, 3).every((c) => rangoDe(c.doc_type).capa === 1),
  );
  const plazoCorrecto = /diez\s*(?:\(10\)\s*)?d[íi]as/i;
  comprobar(
    'el artículo 142 con su plazo de diez días está entre lo recuperado',
    todas.some((c) => /142\.\d/.test(c.content) && plazoCorrecto.test(c.content)),
  );
  const primeras = todas.slice(0, 5).map((c) => c.content).join(' ');
  comprobar('y aparece antes que cualquier opinión', plazoCorrecto.test(primeras));

  console.log('\n── Otra pregunta de plazos, la de obras ──');
  const q2 = '¿Cuál es el plazo para solicitar la ampliación de plazo en ejecución de obras?';
  const emb2 = await embedOne(q2, 'RETRIEVAL_QUERY');
  const dirigida2 = await Promise.all(
    ['ley', 'reglamento'].map(async (tipo) => {
      const { data } = await admin.rpc('hybrid_search', {
        query_text: q2,
        query_embedding: emb2 as unknown as number[],
        match_count: 3,
        filter_type: tipo,
      });
      return (data ?? []) as Array<{ doc_type: string; content: string }>;
    }),
  );
  const norma2 = dirigida2.flat();
  comprobar('también trae norma', norma2.length > 0);
  comprobar(
    'con el plazo de diez días, no los quince que respondió',
    norma2.some((c) => plazoCorrecto.test(c.content)),
  );

  console.log(
    fallos === 0
      ? '\n✅ La norma llega, va primera y las reglas de jerarquía están en el prompt.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
