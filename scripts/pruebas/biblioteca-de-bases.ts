#!/usr/bin/env tsx
/**
 * La evaluación de bases del documento 14 de César (16/10/2026), en lo
 * que se puede comprobar sin gastar modelo.
 *
 * `npx tsx scripts/pruebas/biblioteca-de-bases.ts`
 *
 *   · Obras como servicios similares: se detecta la frase de las bases de
 *     Socos (C-1) y no se dispara con la de la segunda convocatoria, que
 *     ya la corrigió, ni con un servicio PARA una obra.
 *   · Los literales que nombra el análisis («los literales g), h), i) y
 *     j)») y los de una norma («literal d) del numeral 87.1 del artículo
 *     87 de la Ley»), que no son de las bases.
 *   · La columna de la norma en el orden de César.
 *   · La biblioteca: con un vector de la propia biblioteca en lugar del de
 *     Gemini y una «elección» simulada, solo pasan las fuentes que existen
 *     y el artículo de la Ley que está en el fragmento. Toca la base de
 *     datos (solo lectura).
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { obrasComoSimilares, precedentesEnLaBiblioteca } from '../../src/lib/evaluacion/bases/similares-obras';
import { literalesMencionados } from '../../src/lib/evaluacion/bases/ubicacion';
import { fundamentarConLaBiblioteca, normaEnJerarquia } from '../../src/lib/evaluacion/bases/biblioteca';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}

void (async () => {
  console.log('\nObras como servicios similares');
  const socosC1 =
    'En el caso de consorcios, todos los integrantes deben contar con la condición de micro y pequeña empresa. Se consideran servicios similares a los siguientes: Elaboración o instalación o montaje y/o fabricación de techos o coberturas en general o puentes y otras estructuras metálicas; así como la ejecución de obras en general o edificaciones u obras civiles de recreación y deporte que hayan incluido componentes de instalación de coberturas metálicas, montaje de estructuras metálicas o techados de planchas metálicas/Aluzinc. Acreditación: La experiencia del postor en la especialidad se acredita con copia simple de (i) contratos u órdenes de servicios…';
  const socosC2 =
    'Se consideran servicios similares a los siguientes: Elaboración e instalación o montaje y/o fabricación de techos metálicos o coberturas con estructuras metálicos en general o puentes con estructuras metálicas y otras estructuras metálicas. Acreditación: La experiencia del postor…';
  const paraUnaObra =
    'Se consideran servicios similares a los siguientes: servicios de imprimación y colocación de carpeta asfáltica en frío para la obra denominada «Mejoramiento de la calle 123». Acreditación: …';
  const c1 = obrasComoSimilares(socosC1);
  comprobar('Socos C-1: se detecta', c1.length === 1, c1);
  comprobar('…y la frase es literal del texto', c1.length === 1 && socosC1.includes(c1[0].frase) && /ejecución de obras en general/.test(c1[0].frase));
  comprobar('Socos C-2 (corregida): no se dispara', obrasComoSimilares(socosC2).length === 0);
  comprobar('un servicio PARA una obra: no se dispara', obrasComoSimilares(paraUnaObra).length === 0);

  console.log('\nLiterales nombrados');
  comprobar(
    '«los literales g), h), i) y j) del numeral 2.2.1.1»',
    JSON.stringify(literalesMencionados('La inclusión directa de los literales g), h), i) y j) del numeral 2.2.1.1 vulnera…')) ===
      JSON.stringify(['g)', 'h)', 'i)', 'j)']),
    literalesMencionados('La inclusión directa de los literales g), h), i) y j) del numeral 2.2.1.1 vulnera…'),
  );
  comprobar(
    '«literal d) del numeral 87.1 del artículo 87 de la Ley» no es de las bases',
    literalesMencionados('De conformidad con el literal d) del numeral 87.1 del artículo 87 de la Ley').length === 0,
  );

  console.log('\nOrden de César en la columna de la norma');
  const norma = normaEnJerarquia('Bases Estándar de Licitación Pública para Bienes y numeral 44.6 del artículo 44 del Reglamento aprobado por Decreto Supremo N° 009-2025-EF', [
    { tipo: 'opinion', numero: 'Opinión N° 001-2026/DTN', documentId: 'x', criterio: '…' },
    { tipo: 'resolucion_tce', numero: 'Resolución N° 5325-2026-TCP-S6', documentId: 'y', criterio: '…' },
    { tipo: 'ley', numero: 'artículo 5 de la Ley N° 32069', documentId: 'z', criterio: '…' },
  ]);
  const orden = ['artículo 5 de la Ley', 'Reglamento', 'Bases Estándar', 'Resolución N° 5325', 'Opinión N° 001'].map((t) => norma.indexOf(t));
  comprobar('Ley → Reglamento → bases estándar → Tribunal → OECE', orden.every((x, i) => x >= 0 && (i === 0 || x > orden[i - 1])), norma);
  const repetida = normaEnJerarquia('artículo 73 del Reglamento aprobado por Decreto Supremo N° 009-2025-EF', [
    { tipo: 'reglamento', numero: 'numeral 73.1 del artículo 73 del Reglamento de la Ley N° 32069', documentId: 'z', criterio: '…' },
  ]);
  comprobar('el mismo artículo no se repite con otra forma', !/73\.1/.test(repetida), repetida);

  console.log('\nBiblioteca (solo lectura)');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const precedentes = await precedentesEnLaBiblioteca(sb);
  comprobar(
    'los cuatro precedentes de César están en la biblioteca',
    precedentes.length === 4,
    precedentes.map((p) => p.numero),
  );

  // Un vector de la propia biblioteca: el de un fragmento de la 5325, que
  // trata justo de obras como servicios similares.
  const { data: doc } = await sb.from('normative_documents').select('id').eq('number', 'Resolución N° 5325-2026-TCP-S6').single();
  const { data: trozo } = await sb
    .from('normative_chunks')
    .select('embedding')
    .eq('document_id', (doc as { id: string }).id)
    .eq('chunk_index', 45)
    .single();
  const vector = JSON.parse((trozo as { embedding: string }).embedding) as number[];
  let fragmentosVistos = '';
  const fuentes = await fundamentarConLaBiblioteca(
    sb,
    [
      { id: 'p1', titulo: 'Obras como servicios similares', texto: socosC1.slice(100, 500), analisis: 'Servicio que admite obras como similares.', norma: '' },
      { id: 'p2', titulo: 'Otro problema', texto: 'Plazo de entrega', analisis: 'Plazo.', norma: '' },
    ],
    {
      dependencias: {
        embeber: async () => vector,
        // Elige F1 y F2 de p1, un F99 que no existe y, para p2, un
        // artículo inventado sobre el primer fragmento de la Ley.
        elegir: async (_s, prompt) => {
          fragmentosVistos = prompt;
          const leyDeP2 = (prompt.split('=== OBSERVACIÓN p2')[1] ?? '').match(/\[F(\d+)\] ley/)?.[1];
          return {
            texto: JSON.stringify({
              observaciones: [
                { id: 'p1', fuentes: [{ f: 'F99', criterio: 'no existe' }, ...['F4', 'F5', 'F6', 'F7'].map((f) => ({ f, criterio: 'criterio de prueba' }))] },
                { id: 'p2', fuentes: leyDeP2 ? [{ f: `F${leyDeP2}`, articulo: 'numeral 999.9 del artículo 999', criterio: 'inventado' }] : [] },
              ],
            }),
            entrada: 0,
            salida: 0,
          };
        },
      },
    },
  );
  comprobar('la búsqueda trae resoluciones y pronunciamientos', /resolucion_tce/.test(fragmentosVistos) && /pronunciamiento/.test(fragmentosVistos));
  const p1 = fuentes.get('p1') ?? [];
  comprobar('F99 (inexistente) no pasa; las demás sí, con su número de la biblioteca', p1.length >= 1 && p1.every((f) => f.numero && f.documentId), p1);
  const numeros = p1.map((f) => f.numero);
  console.log('      citadas para p1:', numeros.join(' · '));
  const { data: existen } = await sb.from('normative_documents').select('number').in('number', numeros);
  comprobar('cada número citado existe en normative_documents', (existen ?? []).length === new Set(numeros).size, numeros);
  comprobar('el artículo inventado de la Ley no pasa', (fuentes.get('p2') ?? []).length === 0, fuentes.get('p2'));

  console.log(fallos ? `\n${fallos} comprobación(es) fallaron.` : '\nTodo en orden.');
  process.exit(fallos ? 1 : 0);
})();
