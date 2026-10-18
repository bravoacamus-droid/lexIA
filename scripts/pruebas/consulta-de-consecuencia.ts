#!/usr/bin/env tsx
/**
 * La consulta por la consecuencia de un defecto de la oferta (César,
 * documento 15, 17/10/2026): «¿corresponde no admitir la oferta o no
 * otorgar el puntaje?».
 *
 * `npx tsx scripts/pruebas/consulta-de-consecuencia.ts`
 *
 * Sin llamadas al modelo:
 *   - el filtro deja pasar la pregunta de César y otras de la misma forma,
 *     y no las de los bancos del chat (scripts/lib/banco-chat.ts) ni las
 *     de exigencias o del tema, que tienen su propio camino;
 *   - las formas afines de la figura y los pares que se buscan;
 *   - las frases de decisión de las cuatro resoluciones que César espera,
 *     leídas de la base (por id de documento, nunca barriendo
 *     normative_chunks): cada una con la consecuencia que aplicó.
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import {
  pareceConsultaDeConsecuencia,
  conAfines,
  paresDeLaConsecuencia,
  decisionesDelDocumento,
  citarDecision,
} from '../../src/lib/ai/consulta-de-consecuencia';
import { pareceConsultaDeCriterio } from '../../src/lib/ai/consulta-de-criterio';
import { CASOS } from '../lib/banco-chat';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle).slice(0, 400)}` : ''}`);
  if (!ok) fallos++;
}

const CESAR =
  'En las bases establece respecto al plazo de entrega: Los bienes objeto de la contratación serán entregados en un plazo contractual total máximo de ochenta (80) días calendario, computado a partir del día siguiente de la suscripción del contrato. El postor en el plazo de entrega estableció: Mediante el presente, con pleno conocimiento de las condiciones que se exigen en las bases del procedimiento de selección de la referencia, me comprometo a entregar los bienes objeto del presente procedimiento de selección en el plazo de 10 (DIEZ) DIAS CALENDARIOS (PARA LA PRIMERA ENTREGA), contados desde el día siguiente del perfeccionamiento del contrato o notificación de la orden de compra según corresponda. Al respecto, al poner una condición en el anexo 12 una condición adicional "o notificación de la orden de compra según corresponda", por esta condición corresponde no admitir su oferta o no otorgar el puntaje de acuerdo a lo establecido en los factores de evaluación o si corresponde otorgar el puntaje que corresponde';

void (async () => {
  console.log('\nEl filtro');
  comprobar('pasa la pregunta de César', pareceConsultaDeConsecuencia(CESAR));
  for (const q of [
    'Si en la declaración jurada de garantía comercial ofreció 25 meses y en otro folio 6 meses, ¿se le quita el puntaje o se descalifica?',
    '¿La falta de firma en el Anexo N° 3 es subsanable o corresponde declarar no admitida la oferta?',
    'plazo de entrega condición adicional anexo 12 orden de compra no admitir oferta o no otorgar puntaje',
  ])
    comprobar(`pasa: «${q.slice(0, 70)}…»`, pareceConsultaDeConsecuencia(q));
  for (const q of [
    '¿En una adquisición de un bien se puede pedir ser partner?',
    '¿En un concurso de servicios de fabricación e instalación de estructuras metálicas puede acreditarse la experiencia del postor con contratos de ejecución de obras?',
    '¿Cuál es el plazo para apelar la buena pro?',
    '¿Cuántos puntos se otorgan en el factor de evaluación de plazo de entrega?',
  ])
    comprobar(`no pasa: «${q.slice(0, 70)}…»`, !pareceConsultaDeConsecuencia(q));
  const delBanco = CASOS.filter((p) => pareceConsultaDeConsecuencia(p.pregunta)).map((p) => p.pregunta.slice(0, 80));
  comprobar(`ninguna de las ${CASOS.length} preguntas del banco del chat entra por aquí`, delBanco.length === 0, delBanco);
  comprobar('la de César no entra como consulta de exigencia (no es «¿se puede exigir?»)', !pareceConsultaDeCriterio(CESAR));

  console.log('\nFormas afines y pares');
  const afines = conAfines(['condición adicional', 'inicio del cómputo']);
  comprobar('«condición adicional» trae «condición distinta»', afines.includes('condición distinta'), afines);
  comprobar('«inicio del cómputo» trae «cómputo del plazo» (dentro del tope de 5)', afines.length <= 5, afines);
  comprobar('sin tildes también', conAfines(['condicion adicional']).includes('condición distinta'));
  const pares = paresDeLaConsecuencia({
    defecto: 'x',
    consecuencias: [],
    afectado: ['anexo n° 12', 'plazo de entrega'],
    figura: ['condición distinta'],
    elemento: ['orden de compra'],
  });
  comprobar(
    'cada figura con cada afectado; lo añadido por el postor no se cruza',
    pares.length === 6 && pares.some(([a, f]) => a === 'anexo n° 12' && f === 'condición distinta') && !pares.flat().includes('orden de compra'),
    pares,
  );

  console.log('\nLas etiquetas de la decisión');
  for (const [frase, etiqueta] of [
    ['Revocar la no admisión de la oferta del proveedor X S.A.C., y tenerla por admitida.', '[ADMITIR la oferta]'],
    ['Revocar la decisión del oficial de compra de tener por no admitida la oferta presentada por el CONSORCIO X.', '[ADMITIR la oferta]'],
    ['Por tanto, no corresponde retirar el puntaje otorgado al Consorcio X.', '[MANTENER u OTORGAR el puntaje]'],
    ['En consecuencia, corresponde revocar los treinta (30) puntos asignados a la oferta del Adjudicatario.', '[NO OTORGAR o REVOCAR el puntaje]'],
  ] as const)
    comprobar(`«${frase.slice(0, 60)}…» → ${etiqueta}`, citarDecision(frase).startsWith(etiqueta), citarDecision(frase));

  console.log('\nLas frases de decisión (de la base)');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: { persistSession: false },
  });
  const casos: Array<{ numero: string; aplica: RegExp; noAplica: RegExp; voto?: RegExp; etiqueta: string }> = [
    { numero: '6259-2025-TCP-S1', aplica: /no\s+admitida|revocar\s+la\s+admisi/i, noAplica: /^(?!\(voto).*revocar\s+el\s+puntaje/i, voto: /puntaje/i, etiqueta: '[NO ADMITIR la oferta]' },
    { numero: '8674-2026-TCP-S4', aplica: /no\s+admisi/i, noAplica: /asignaci[óo]n\s+del\s+puntaje/i, etiqueta: '[NO ADMITIR la oferta]' },
    { numero: '7895-2026-TCP-S3', aplica: /no\s+asignaci[óo]n\s+del\s+puntaje/i, noAplica: /no\s+admitida|no\s+admisi[óo]n/i, etiqueta: '[NO OTORGAR o REVOCAR el puntaje]' },
    { numero: '5768-2026-TCP-S2', aplica: /treinta\s+\(30\)\s+puntos/i, noAplica: /declara\s+no\s+admitida/i, etiqueta: '[NO OTORGAR o REVOCAR el puntaje]' },
  ];
  for (const c of casos) {
    const correlativo = Number(c.numero.split('-')[0]);
    const { data: docs, error } = await sb
      .from('normative_documents')
      .select('id, number')
      .eq('type', 'resolucion_tce')
      .eq('correlativo_num', correlativo)
      .ilike('number', `%${c.numero.slice(c.numero.indexOf('-') + 1)}%`);
    if (error) throw new Error(error.message);
    const doc = (docs ?? [])[0] as { id: string; number: string } | undefined;
    if (!doc) {
      comprobar(`${c.numero} está en la biblioteca`, false);
      continue;
    }
    const { data: filas, error: e2 } = await sb
      .from('normative_chunks')
      .select('chunk_index, content')
      .eq('document_id', doc.id)
      .order('chunk_index');
    if (e2) throw new Error(e2.message);
    const frases = decisionesDelDocumento((filas ?? []) as Array<{ chunk_index: number; content: string }>);
    const mayoria = frases.filter((f) => !f.startsWith('(voto'));
    comprobar(`${doc.number}: dice la consecuencia que aplicó`, mayoria.some((f) => c.aplica.test(f)), frases);
    comprobar(`${doc.number}: no la confunde con la otra`, !mayoria.some((f) => c.noAplica.test(f)), frases);
    comprobar(
      `${doc.number}: la frase de la decisión lleva la etiqueta ${c.etiqueta}`,
      mayoria.some((f) => c.aplica.test(f) && citarDecision(f).startsWith(c.etiqueta)),
      mayoria.map(citarDecision),
    );
    if (c.voto) comprobar(`${doc.number}: el voto singular va marcado como tal`, frases.some((f) => f.startsWith('(voto') && c.voto!.test(f)), frases);
  }

  console.log(fallos === 0 ? '\nTodo en orden.' : `\n${fallos} comprobación(es) fallida(s).`);
  process.exit(fallos === 0 ? 0 : 1);
})();
