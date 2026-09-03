#!/usr/bin/env tsx
/**
 * Cifras afirmadas que no están en ningún fragmento.
 *
 * POR QUÉ EXISTE
 *
 * El 31/08/2026 César mostró una pregunta de examen generada por el
 * chat: «¿cuál es el plazo para interponer apelación contra el
 * otorgamiento de la buena pro en licitaciones públicas?», respuesta
 * «tres (3) días hábiles», con su cita al lado. El Reglamento dice ocho
 * (artículo 304.1). Al revisar los fragmentos que se le pasaron al
 * modelo en esa respuesta: ninguno de los veintiséis contenía el
 * artículo 304 ni los ocho días. La cifra no salió de la norma, y aun
 * así llevaba cita.
 *
 * Preguntada de frente, esa misma cuestión se responde bien —lo mide
 * `probar-respuestas-cesar.ts`—. El fallo aparece cuando se le pide
 * GENERAR en bloque: un cuestionario de quince preguntas sobre toda una
 * fase. La recuperación se hace con la petición («genera quince
 * preguntas…»), no con cada una de las quince, así que el modelo escribe
 * mucho más de lo que tiene delante y rellena con lo que recuerda.
 *
 * CÓMO SE MIDE
 *
 * Se pide el cuestionario, se sacan de la respuesta todas las cifras con
 * unidad —días hábiles, días calendario, UIT, por ciento— y se busca
 * cada una en los fragmentos que se le dieron. La que no esté es una
 * cifra afirmada sin respaldo. No se juzga si es verdadera: se juzga si
 * el sistema podía saberlo.
 *
 * Uso: npx tsx scripts/probar-cifras-inventadas.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { embedOne } from '../src/lib/ai/embeddings';
import type { ChatSource } from '../src/lib/supabase/types';

config({ path: join(process.cwd(), '.env.local'), override: true });

const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

const PETICIONES = [
  {
    id: 'cuestionario-seleccion',
    texto:
      'Genera 15 preguntas de opción múltiple con 4 alternativas sobre la Fase de Selección, indicando la respuesta correcta y su sustento normativo.',
    porque: 'la petición exacta en la que César encontró la cifra inventada',
  },
  {
    id: 'cuestionario-ejecucion',
    texto:
      'Elabora 10 preguntas de examen con alternativas sobre la ejecución contractual, con la respuesta correcta y el artículo que la sustenta.',
    porque: 'la misma forma de petición, otro tema, para ver si es general',
  },
];

interface Fragmento {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
}

/** La recuperación de la ruta del chat, replicada. */
async function recuperar(pregunta: string): Promise<ChatSource[]> {
  const emb = await embedOne(pregunta, 'RETRIEVAL_QUERY');
  const { data, error } = await admin.rpc('hybrid_search', {
    query_text: pregunta,
    query_embedding: emb,
    match_count: 15,
    filter_type: null,
  });
  if (error) throw new Error(`hybrid_search: ${error.message}`);

  const aFuente = (c: Fragmento): ChatSource => ({
    chunk_id: c.chunk_id,
    doc_id: c.document_id,
    doc_title: c.doc_title,
    doc_type: c.doc_type as ChatSource['doc_type'],
    doc_number: c.doc_number,
    snippet: c.content,
  });

  let fuentes = ((data ?? []) as Fragmento[]).map(aFuente);
  const deCapa1 = await Promise.all(
    (['ley', 'reglamento', 'directiva'] as const).map(async (tipo) => {
      const { data: d } = await admin.rpc('hybrid_search', {
        query_text: pregunta.slice(0, 400),
        query_embedding: emb,
        match_count: 8,
        filter_type: tipo,
      });
      return (d ?? []) as Fragmento[];
    }),
  );
  const yaEstan = new Set(fuentes.map((s) => s.chunk_id));
  const norma = deCapa1
    .flat()
    .filter((c) => !yaEstan.has(c.chunk_id))
    .map(aFuente);
  return norma.length > 0 ? [...norma, ...fuentes] : fuentes;
}

const PALABRA: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, veinte: 20, treinta: 30, sesenta: 60, noventa: 90, cien: 100,
};

interface Cifra {
  valor: number;
  unidad: string;
  frase: string;
}

/** Saca de un texto las cifras con unidad: «ocho (8) días hábiles». */
function cifrasDe(texto: string): Cifra[] {
  const salida: Cifra[] = [];
  const vistas = new Set<string>();
  const re =
    /\b([a-záéíóúñ]+|\d{1,4})\s*(?:\(\s*(\d{1,4})\s*\)\s*)?(d[ií]as h[áa]biles|d[ií]as calendario|UIT|por ciento|%)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const enLetra = PALABRA[m[1].toLowerCase()];
    const valor = m[2] ? parseInt(m[2], 10) : (enLetra ?? parseInt(m[1], 10));
    if (!Number.isFinite(valor)) continue;
    const unidad = m[3].toLowerCase().replace(/[íì]/g, 'i').replace(/[áà]/g, 'a');
    const clave = `${valor}·${unidad}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push({ valor, unidad, frase: m[0].trim() });
  }
  return salida;
}

/** ¿Aparece esa cifra con esa unidad en alguno de los fragmentos? */
function estaRespaldada(c: Cifra, fragmentos: ChatSource[]): boolean {
  const letra = Object.keys(PALABRA).find((k) => PALABRA[k] === c.valor);
  const unidad = c.unidad
    .replace('dias habiles', 'd[ií]as h[áa]biles')
    .replace('dias calendario', 'd[ií]as calendario')
    .replace('por ciento', '(?:por ciento|%)')
    .replace('%', '(?:por ciento|%)');
  const numero = letra ? `(?:${c.valor}|${letra})` : String(c.valor);
  const re = new RegExp(`\\b${numero}\\b[^.]{0,40}?${unidad}`, 'i');
  return fragmentos.some((f) => re.test(f.snippet));
}

/**
 * De una tanda de preguntas de examen, lo que el chat afirma: la
 * alternativa que marca como correcta y el sustento que le pone.
 */
function loAfirmado(texto: string): string {
  const trozos: string[] = [];
  const reRespuesta = /Respuesta correcta:?[ *_]*([A-D])/gi;
  let m: RegExpExecArray | null;
  let previo = 0;
  while ((m = reRespuesta.exec(texto)) !== null) {
    const letra = m[1].toUpperCase();
    // La alternativa marcada, buscada hacia atrás dentro de la pregunta.
    const bloque = texto.slice(previo, m.index);
    previo = m.index + m[0].length;
    const reOpcion = new RegExp('^[^A-Za-z0-9]*' + letra + '[).][ ]?(.+)$', 'gmi');
    let o: RegExpExecArray | null;
    while ((o = reOpcion.exec(bloque)) !== null) trozos.push(o[1]);
    // Y el sustento, que va detrás.
    const cola = texto.slice(m.index, m.index + 600);
    const sustento = cola.match(/Sustento[^:]{0,20}:([^]*?)(?=Pregunta|$)/i);
    if (sustento) trozos.push(sustento[1]);
  }
  return trozos.join('\n');
}

async function main() {
  let sinRespaldo = 0;
  let total = 0;

  for (const p of PETICIONES) {
    console.log(`\n══ ${p.id} · ${p.porque} ══`);
    const fuentes = await recuperar(p.texto);
    const system = buildChatSystemPrompt(fuentes, null, [], null);
    const { text } = await generateText({
      model: chatModel,
      system,
      messages: [{ role: 'user', content: p.texto }],
      temperature: 0.2,
    });

    // Solo se juzga lo que el chat da por bueno: la alternativa marcada
    // como correcta y su sustento. Los distractores de una pregunta de
    // opción múltiple no están en la norma por definición —ese es su
    // oficio— y contarlos daba cuatro falsos positivos de siete.
    if (process.env.VOLCAR) await (await import('node:fs/promises')).writeFile(`tmp/volcado-${p.id}.md`, text, 'utf8');
    const afirmado = loAfirmado(text);
    const cifras = cifrasDe(afirmado);
    const huerfanas = cifras.filter((c) => !estaRespaldada(c, fuentes));
    total += cifras.length;
    sinRespaldo += huerfanas.length;
    console.log(`   ${fuentes.length} fragmentos · ${cifras.length} cifras afirmadas`);
    if (huerfanas.length === 0) {
      console.log('     ✅ todas las cifras salen de algún fragmento');
    } else {
      console.log(`     ❌ ${huerfanas.length} sin respaldo en ningún fragmento:`);
      for (const c of huerfanas) {
        // El contexto se busca en lo afirmado, no en la respuesta
        // entera: buscándolo en la respuesta caía en el primer
        // distractor que dijera la misma cifra y despistaba.
        const i = afirmado.indexOf(c.frase);
        const contexto = afirmado
          .slice(Math.max(0, i - 100), i + c.frase.length + 60)
          .replace(/\s+/g, ' ');
        console.log(`        · «${c.frase}» → …${contexto}…`);
      }
    }
  }

  console.log(
    `\n${sinRespaldo === 0 ? '✅' : '❌'} ${sinRespaldo} de ${total} cifras afirmadas sin respaldo.\n`,
  );
  process.exit(sinRespaldo === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
