#!/usr/bin/env tsx
/**
 * Cuántas cifras afirma el chat que no salen de ningún fragmento.
 *
 * POR QUÉ EXISTE
 *
 * El 31/08/2026 César mostró una pregunta de examen generada por el
 * chat: el plazo para apelar contra el otorgamiento de la buena pro,
 * respuesta «tres (3) días hábiles», con su cita al lado. El Reglamento
 * dice ocho —artículo 304.1—. De los veintiséis fragmentos que se le
 * pasaron, ninguno contenía ese artículo: la cifra no salió de la norma
 * y aun así llevaba cita.
 *
 * Preguntada de frente esa misma cuestión se responde bien. El fallo
 * aparece al pedir en bloque —«genérame quince preguntas sobre toda la
 * fase de selección»—, porque la búsqueda se hace una vez, con la
 * petición, y no con cada una de las quince. El modelo escribe mucho
 * más de lo que tiene delante y rellena con lo que recuerda.
 *
 * QUÉ MIDE
 *
 * Se pide el cuestionario, se saca lo que el chat da por bueno —la
 * alternativa marcada y su sustento, no los distractores, que por
 * oficio no están en la norma— y de ahí las cifras con unidad. Cada una
 * se busca en los fragmentos que se le dieron. La que no esté es una
 * cifra afirmada sin respaldo. No se juzga si es verdadera: se juzga si
 * el sistema podía saberlo.
 *
 * CÓMO SE USA
 *
 *   npx tsx scripts/medir-cifras-inventadas.ts --vueltas 4
 *   npx tsx scripts/medir-cifras-inventadas.ts --vueltas 4 --guardar tmp/antes.json
 *   ... se hace el cambio ...
 *   npx tsx scripts/medir-cifras-inventadas.ts --vueltas 4 --comparar tmp/antes.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { recuperar } from './lib/banco-chat';
import type { ChatSource } from '../src/lib/supabase/types';

const PETICIONES = [
  {
    id: 'seleccion',
    texto:
      'Genera 15 preguntas de opción múltiple con 4 alternativas sobre la Fase de Selección, indicando la respuesta correcta y su sustento normativo.',
    porque: 'la petición exacta en la que César encontró la cifra inventada',
  },
  {
    id: 'ejecucion',
    texto:
      'Elabora 10 preguntas de examen con alternativas sobre la ejecución contractual, con la respuesta correcta y el artículo que la sustenta.',
    porque: 'la misma forma de petición, otro tema',
  },
  {
    id: 'preparatorias',
    texto:
      'Prepárame un cuestionario de 12 preguntas con alternativas sobre las actuaciones preparatorias, señalando la alternativa correcta y su sustento.',
    porque: 'tercer tema, para que la medida no dependa de uno solo',
  },
];

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

/** Las cifras con unidad de un texto: «ocho (8) días hábiles». */
export function cifrasDe(texto: string): Cifra[] {
  const salida: Cifra[] = [];
  const vistas = new Set<string>();
  const re =
    /\b([a-záéíóúñ]+|\d{1,4}(?:[.,]\d{1,3})?)\s*(?:\(\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*\)\s*)?(d[ií]as h[áa]biles|d[ií]as calendario|UIT|por ciento|%)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const enLetra = PALABRA[m[1].toLowerCase()];
    const aNumero = (x: string) => parseFloat(x.replace(',', '.'));
    const valor = m[2] ? aNumero(m[2]) : (enLetra ?? aNumero(m[1]));
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
  // En los documentos la misma cifra aparece con coma o con punto.
  const escrito = String(c.valor).replace('.', '[.,]');
  const numero = letra ? `(?:${escrito}|${letra})` : escrito;
  const re = new RegExp(`\\b${numero}\\b[^.]{0,40}?${unidad}`, 'i');
  return fragmentos.some((f) => re.test(f.snippet));
}

/**
 * De una tanda de preguntas de examen, lo que el chat afirma: la
 * alternativa que marca como correcta y el sustento que le pone.
 *
 * Los distractores quedan fuera a propósito. No están en la norma por
 * definición —ese es su oficio— y contarlos daba cuatro falsos
 * positivos de siete la primera vez que se midió esto.
 */
export function loAfirmado(texto: string): string {
  const trozos: string[] = [];

  // Primero se parte por pregunta y solo después se busca dentro. Al
  // revés —bloques delimitados por «Respuesta correcta»— bastaba con
  // que el modelo rotulara una sola pregunta de otra manera para que el
  // bloque abarcase dos y se colaran las alternativas de la vecina.
  const preguntas = texto.split(/(?=^#{1,4}\s|^\s*(?:\*\*)?Pregunta\s+\d)/m);

  for (const pregunta of preguntas) {
    const marcada = pregunta.match(/Respuesta correcta:?[ *_]*([A-D])\b/i);
    // Sin marca no se adivina: una pregunta cuya clave no se reconoce
    // se deja fuera de la medida en vez de contarla a ojo.
    if (!marcada) continue;
    const letra = marcada[1].toUpperCase();
    const antesDeLaClave = pregunta.slice(0, marcada.index ?? 0);

    const marcas = [...antesDeLaClave.matchAll(/(?:^|[\s*·-])([A-D])[).]\s/gm)];
    for (let k = 0; k < marcas.length; k++) {
      if (marcas[k][1].toUpperCase() !== letra) continue;
      const desde = (marcas[k].index ?? 0) + marcas[k][0].length;
      const hasta =
        k + 1 < marcas.length ? (marcas[k + 1].index ?? antesDeLaClave.length) : antesDeLaClave.length;
      trozos.push(antesDeLaClave.slice(desde, hasta));
    }

    const sustento = pregunta.slice(marcada.index ?? 0).match(/Sustento[^:]{0,20}:([^]*)/i);
    if (sustento) trozos.push(sustento[1]);
  }
  return trozos.join('\n');
}

interface Medida {
  peticion: string;
  afirmadas: number;
  sinRespaldo: number;
  vueltas: number;
  ejemplos: string[];
}

interface Informe {
  fecha: string;
  vueltas: number;
  medidas: Medida[];
}

function opcion(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const vueltas = Number(opcion('--vueltas') ?? 3);
  const guardarEn = opcion('--guardar');
  const compararCon = opcion('--comparar');

  console.log(`\nMidiendo ${PETICIONES.length} petición(es) × ${vueltas} vueltas\n`);

  const medidas: Medida[] = [];
  for (const p of PETICIONES) {
    const m: Medida = { peticion: p.id, afirmadas: 0, sinRespaldo: 0, vueltas: 0, ejemplos: [] };
    for (let v = 1; v <= vueltas; v++) {
      const fuentes = await recuperar(p.texto);
      const { text } = await generateText({
        model: chatModel,
        system: buildChatSystemPrompt(fuentes, null, [], null),
        messages: [{ role: 'user', content: p.texto }],
        temperature: 0.2,
      });
      if (process.env.VOLCAR) await (await import('node:fs/promises')).writeFile(`tmp/medicion/salida-${p.id}-${v}.md`, text, 'utf8');
      const afirmado = loAfirmado(text);
      const cifras = cifrasDe(afirmado);
      const huerfanas = cifras.filter((c) => !estaRespaldada(c, fuentes));
      m.afirmadas += cifras.length;
      m.sinRespaldo += huerfanas.length;
      m.vueltas += 1;
      for (const c of huerfanas.slice(0, 2)) {
        // Solo la línea donde está la cifra. Una ventana de caracteres
        // se saltaba la frontera entre una alternativa y la siguiente y
        // hacía parecer que se estaban contando distractores.
        const linea = afirmado.split('\n').find((l) => l.includes(c.frase)) ?? c.frase;
        m.ejemplos.push(linea.trim().slice(0, 150));
      }
      process.stdout.write(`\r   ${p.id}: vuelta ${v}/${vueltas}`);
    }
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    medidas.push(m);
  }

  const previo: Informe | null = compararCon
    ? (JSON.parse(await readFile(compararCon, 'utf8')) as Informe)
    : null;

  for (const m of medidas) {
    const p = PETICIONES.find((x) => x.id === m.peticion)!;
    const tasa = m.afirmadas === 0 ? 0 : m.sinRespaldo / m.afirmadas;
    console.log(`══ ${m.peticion} · ${p.porque}`);
    console.log(
      `   ${m.sinRespaldo} de ${m.afirmadas} cifras afirmadas sin respaldo (${Math.round(tasa * 100)} %) en ${m.vueltas} vueltas`,
    );
    const antes = previo?.medidas.find((x) => x.peticion === m.peticion);
    if (antes) {
      const tasaAntes = antes.afirmadas === 0 ? 0 : antes.sinRespaldo / antes.afirmadas;
      const delta = tasa - tasaAntes;
      console.log(
        `   antes ${Math.round(tasaAntes * 100)} % · ${
          Math.abs(delta) < 0.05
            ? 'igual dentro del ruido'
            : delta < 0
              ? `MEJORA (${Math.round(delta * 100)} pts)`
              : `EMPEORA (+${Math.round(delta * 100)} pts)`
        }`,
      );
    }
    for (const e of m.ejemplos.slice(0, 2)) console.log(`     · …${e}…`);
    console.log('');
  }

  const afirmadas = medidas.reduce((a, m) => a + m.afirmadas, 0);
  const sinRespaldo = medidas.reduce((a, m) => a + m.sinRespaldo, 0);
  const tasa = afirmadas === 0 ? 0 : sinRespaldo / afirmadas;
  console.log(
    `── Global: ${sinRespaldo} de ${afirmadas} cifras afirmadas sin respaldo (${Math.round(tasa * 100)} %)\n`,
  );

  if (guardarEn) {
    await mkdir(dirname(guardarEn), { recursive: true });
    await writeFile(
      guardarEn,
      JSON.stringify({ fecha: new Date().toISOString(), vueltas, medidas } as Informe, null, 2),
      'utf8',
    );
    console.log(`   Guardado en ${guardarEn}\n`);
  }
}

// Solo mide cuando se ejecuta este archivo. `probar-medidor-cifras.ts`
// importa las dos funciones de extracción para comprobarlas con textos
// conocidos, y sin esta guarda importarlas lanzaba una medición entera
// contra la API.
if (process.argv[1]?.includes('medir-cifras-inventadas')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
