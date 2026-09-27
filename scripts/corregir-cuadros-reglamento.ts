#!/usr/bin/env tsx
/**
 * Rehace los cuadros y fórmulas que el PDF de Editora Perú aplana.
 *
 * El consolidado de la Ley 32069 y su Reglamento viene de un PDF: los
 * cuadros salen como una fila de palabras y las fracciones pierden su
 * raya. César lo señaló con el numeral 215.6 (27/09/2026): «no se logra
 * apreciar o diferenciar los plazos». Buscando lo mismo en el resto del
 * texto aparecieron tres fórmulas que se leían mal.
 *
 * Cada corrección reemplaza el tramo exacto en el texto completo (lo que
 * muestra la biblioteca) y en los fragmentos (lo que leen el chat y la
 * voz); los disparadores de normative_chunks actualizan la búsqueda. Si el
 * tramo ya no está —porque ya se corrigió o el texto cambió— se informa y
 * no se toca nada.
 *
 *   npx tsx scripts/corregir-cuadros-reglamento.ts [--simular]
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local'), override: true });
const limpio = (v?: string) => (v || '').trim().replace(/["\r]/g, '');
const supabase = createClient(limpio(process.env.NEXT_PUBLIC_SUPABASE_URL), limpio(process.env.SUPABASE_SERVICE_ROLE_KEY), {
  auth: { persistSession: false },
});
const SIMULAR = process.argv.includes('--simular');

/** El consolidado Ley 32069 + Reglamento (Editora Perú). */
const DOCUMENTO = '670afae4-9d5f-44f4-bd68-9d24eb1eaf8b';

const CORRECCIONES: Array<{ que: string; dice: string; debeDecir: string }> = [
  {
    que: 'Cuadro del numeral 215.6 (plazos de la liquidación)',
    dice:
      'son los siguientes: Plazo de ejecución contractual Plazo de presentación de la liquidación Plazo para pronunciarse sobre la liquidación Plazo para contestar el pronunciamiento Consultoría de obra quince días treinta días calendario quince días Ejecución de obra treinta días cincuenta días calendario quince días ',
    debeDecir: [
      'son los siguientes:',
      '',
      '| Plazo de ejecución contractual | Plazo de presentación de la liquidación | Plazo para pronunciarse sobre la liquidación | Plazo para contestar el pronunciamiento |',
      '|---|---|---|---|',
      '| Consultoría de obra | quince días | treinta días calendario | quince días |',
      '| Ejecución de obra | treinta días | cincuenta días calendario | quince días |',
      '',
      '',
    ].join('\n'),
  },
  {
    que: 'Fórmula de la penalidad por mora (numeral 120.1)',
    dice: 'Penalidad diaria = 0.10 x monto F x plazo',
    debeDecir: 'Penalidad diaria = (0.10 × monto) / (F × plazo)',
  },
  {
    // Los valores de F, en fila, el visor los partía como si «0.40» fuera
    // un numeral. En cuadro se leen de un golpe; cada celda conserva la
    // redacción del Reglamento.
    que: 'Valores de F de la penalidad por mora (numeral 120.1)',
    dice:
      'Donde F tiene los siguientes valores: Para bienes y servicios: F = 0.40 Para obras: a) Para plazos menores o iguales a sesenta días: F = 0.40. b) Para plazos entre sesenta y uno a ciento veinte días: F = 0.25. c) Para plazos mayores a ciento veinte días: F = 0.15 Para consultorías de obras: a) Para plazos menores o iguales a sesenta días: F = 0.40. b) Para plazos mayores a sesenta días: F = 0.25. ',
    debeDecir: [
      'Donde F tiene los siguientes valores:',
      '',
      '| Objeto | Plazo | F |',
      '|---|---|---|',
      '| Bienes y servicios | — | 0.40 |',
      '| Obras | a) Para plazos menores o iguales a sesenta días | 0.40 |',
      '| Obras | b) Para plazos entre sesenta y uno a ciento veinte días | 0.25 |',
      '| Obras | c) Para plazos mayores a ciento veinte días | 0.15 |',
      '| Consultorías de obras | a) Para plazos menores o iguales a sesenta días | 0.40 |',
      '| Consultorías de obras | b) Para plazos mayores a sesenta días | 0.25 |',
      '',
      '',
    ].join('\n'),
  },
  {
    que: 'Fórmula del puntaje de la oferta económica (numeral 74.2)',
    dice: 'Po = Mb x Pmax Mo',
    debeDecir: 'Po = (Mb × Pmax) / Mo',
  },
  {
    que: 'Fórmula del puntaje total (artículo 75)',
    dice: 'PTP =C1 PT+C2 Pe',
    debeDecir: 'PTP = C1 × Pt + C2 × Pe',
  },
];

void (async () => {
  const { data: doc, error } = await supabase.from('normative_documents').select('raw_text').eq('id', DOCUMENTO).single();
  if (error || !doc) throw new Error(error?.message ?? 'documento no encontrado');
  let texto = (doc as { raw_text: string }).raw_text;

  const { data: fragmentos, error: e2 } = await supabase
    .from('normative_chunks')
    .select('id, chunk_index, content')
    .eq('document_id', DOCUMENTO)
    .order('chunk_index');
  if (e2) throw new Error(e2.message);
  const porCambiar = new Map<string, { chunk_index: number; content: string }>();

  for (const c of CORRECCIONES) {
    const enTexto = texto.split(c.dice).length - 1;
    texto = texto.split(c.dice).join(c.debeDecir);
    const enFragmentos: number[] = [];
    for (const f of (fragmentos ?? []) as Array<{ id: string; chunk_index: number; content: string }>) {
      const actual = porCambiar.get(f.id)?.content ?? f.content;
      if (!actual.includes(c.dice)) continue;
      porCambiar.set(f.id, { chunk_index: f.chunk_index, content: actual.split(c.dice).join(c.debeDecir) });
      enFragmentos.push(f.chunk_index);
    }
    console.log(
      `${enTexto || enFragmentos.length ? '✎' : '·'} ${c.que}: ${enTexto} en el texto, fragmentos [${enFragmentos.join(', ')}]${
        enTexto || enFragmentos.length ? '' : ' — ya corregido o no encontrado'
      }`,
    );
  }

  if (SIMULAR) return console.log('\n(simulación: no se escribió nada)');
  const { error: e3 } = await supabase.from('normative_documents').update({ raw_text: texto }).eq('id', DOCUMENTO);
  if (e3) throw new Error(e3.message);
  for (const [id, f] of porCambiar) {
    const { error: e4 } = await supabase.from('normative_chunks').update({ content: f.content }).eq('id', id);
    if (e4) throw new Error(`fragmento ${f.chunk_index}: ${e4.message}`);
  }
  console.log(`\nListo: texto completo y ${porCambiar.size} fragmento(s) actualizados.`);
})();
