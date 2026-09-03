#!/usr/bin/env tsx
/**
 * Cuando genera un cuestionario, ¿acierta los hechos que ya conocemos?
 *
 * POR QUÉ ESTE MEDIDOR Y NO EL OTRO
 *
 * `medir-cifras-inventadas.ts` comprueba la trazabilidad: que cada cifra
 * afirmada esté en algún fragmento que se le pasó. Es útil, pero no
 * basta, porque una cifra puede estar en un fragmento y ser la
 * equivocada —de una opinión del régimen derogado, por ejemplo—.
 *
 * Lo que César reportó es de este otro tipo. Pidió quince preguntas
 * sobre la fase de selección y la número 16 decía que el plazo para
 * apelar contra el otorgamiento de la buena pro es de tres días
 * hábiles. El artículo 304.1 del Reglamento dice ocho. No es una cifra
 * sin respaldo: es una cifra equivocada, con su cita al lado.
 *
 * Así que aquí se comprueba el acierto, no la trazabilidad: se piden
 * cuestionarios, se buscan las preguntas que tratan de un hecho que
 * tenemos verificado contra la norma, y se mira qué contesta.
 *
 * Los hechos de abajo están comprobados en la base, uno a uno, no de
 * memoria. Cada uno lleva el artículo del que sale.
 *
 *   npx tsx scripts/medir-cuestionarios.ts --vueltas 5
 *   npx tsx scripts/medir-cuestionarios.ts --vueltas 5 --guardar tmp/antes.json
 *   npx tsx scripts/medir-cuestionarios.ts --vueltas 5 --comparar tmp/antes.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { recuperar } from './lib/banco-chat';
import { respuestasMarcadas } from './medir-cifras-inventadas';

interface Hecho {
  id: string;
  /**
   * ¿Esta pregunta trata del hecho?
   *
   * Es una función y no una expresión porque hace falta excluir: el
   * plazo para apelar son ocho días en un procedimiento competitivo y
   * cinco en uno abreviado —artículos 304.1 y 304.2—, así que una
   * pregunta sobre el abreviado NO trata del primer hecho. Medido con
   * una expresión sin excluir, tres respuestas correctas se contaron
   * como errores.
   */
  trata: (pregunta: string) => boolean;
  /** Lo que la norma dice. */
  correcto: RegExp;
  /** La equivocación conocida. */
  equivocado: RegExp;
  /** De dónde sale, verificado en la base. */
  norma: string;
}

const ABREVIADO = /abreviad|comparaci[óo]n de precios|selecci[óo]n de expertos|subasta inversa|no competitivo/i;

const HECHOS: Hecho[] = [
  {
    id: 'apelacion-procedimiento-competitivo',
    trata: (p) =>
      /(?:plazo|d[ií]as)/i.test(p) &&
      /apelaci[óo]n/i.test(p) &&
      /licitaci[óo]n p[úu]blica|concurso p[úu]blico|competitiv/i.test(p) &&
      !ABREVIADO.test(p),
    correcto: /(?:ocho|\b8\b)\s*(?:\(\s*8\s*\))?\s*d[ií]as h[áa]biles/i,
    equivocado: /(?:tres|\b3\b|cinco|\b5\b|diez|\b10\b)\s*(?:\(\s*\d+\s*\))?\s*d[ií]as/i,
    norma:
      'Artículo 304.1: ocho días hábiles desde la notificación en la Pladicop. Es la pregunta 16 que reportó César',
  },
  {
    id: 'apelacion-procedimiento-abreviado',
    trata: (p) => /(?:plazo|d[ií]as)/i.test(p) && /apelaci[óo]n/i.test(p) && ABREVIADO.test(p),
    correcto: /(?:cinco|\b5\b)\s*(?:\(\s*5\s*\))?\s*d[ií]as h[áa]biles/i,
    equivocado: /(?:ocho|\b8\b|tres|\b3\b|diez|\b10\b)\s*(?:\(\s*\d+\s*\))?\s*d[ií]as/i,
    norma:
      'Artículo 304.2: cinco días hábiles en concurso o licitación abreviados, expertos y comparación de precios. Es el supuesto vecino, para que no se confundan',
  },
  {
    id: 'cotizaciones-contrato-menor',
    trata: (p) =>
      /contratos? menor/i.test(p) &&
      // Solo lo que trata del precio. «Determina» o «selecciona» a
      // secas capturaban preguntas sobre cómo se perfecciona el
      // contrato o quién elabora el requerimiento, que son otra cosa.
      /precio|valor por dinero|cotizaci|indagaci|interacci[óo]n con el mercado/i.test(p),
    correcto: /cotizacion/i,
    equivocado: /indagaci[óo]n de condiciones competitivas/i,
    norma: 'Artículo 228.2: la DEC solicita y recibe cotizaciones a través de la Pladicop',
  },
];

const PETICIONES = [
  'Genera 15 preguntas de opción múltiple con 4 alternativas sobre la Fase de Selección, indicando la respuesta correcta y su sustento normativo.',
  'Elabora 12 preguntas de examen con alternativas sobre los recursos impugnativos y los contratos menores, con la respuesta correcta y el artículo que la sustenta.',
];

interface Medida {
  hecho: string;
  salio: number;
  acerto: number;
  fallo: number;
  ejemplos: string[];
}

interface Informe {
  fecha: string;
  vueltas: number;
  medidas: Medida[];
}

/** El margen de una proporción medida sobre n casos (Wald, 95 %). */
function margen(p: number, n: number): number {
  if (n === 0) return 1;
  return 1.96 * Math.sqrt(Math.max(p * (1 - p), 0.05) / n);
}

function opcion(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const vueltas = Number(opcion('--vueltas') ?? 4);
  const guardarEn = opcion('--guardar');
  const compararCon = opcion('--comparar');

  console.log(`\n${PETICIONES.length} petición(es) × ${vueltas} vueltas\n`);

  const medidas = new Map<string, Medida>(
    HECHOS.map((h) => [h.id, { hecho: h.id, salio: 0, acerto: 0, fallo: 0, ejemplos: [] }]),
  );

  let hechas = 0;
  for (const peticion of PETICIONES) {
    for (let v = 1; v <= vueltas; v++) {
      const fuentes = await recuperar(peticion);
      const { text } = await generateText({
        model: chatModel,
        system: buildChatSystemPrompt(fuentes, null, [], null),
        messages: [{ role: 'user', content: peticion }],
        temperature: 0.2,
      });
      if (process.env.VOLCAR) await (await import('node:fs/promises')).writeFile(`tmp/medicion/cuest-${hechas}.md`, text, 'utf8');
      hechas++;
      process.stdout.write(`\r   ${hechas}/${PETICIONES.length * vueltas} cuestionarios`);

      for (const r of respuestasMarcadas(text)) {
        for (const h of HECHOS) {
          if (!h.trata(r.pregunta)) continue;
          const m = medidas.get(h.id)!;
          const dicho = `${r.marcada} ${r.sustento}`;
          m.salio++;
          if (h.correcto.test(dicho)) m.acerto++;
          else if (h.equivocado.test(dicho)) {
            m.fallo++;
            if (m.ejemplos.length < 3) m.ejemplos.push(dicho.replace(/\s+/g, ' ').slice(0, 170));
          } else if (m.ejemplos.length < 3) {
            m.ejemplos.push(`(ni lo uno ni lo otro) ${dicho.replace(/\s+/g, ' ').slice(0, 150)}`);
          }
        }
      }
    }
  }
  process.stdout.write('\r' + ' '.repeat(50) + '\r');

  const previo: Informe | null = compararCon
    ? (JSON.parse(await readFile(compararCon, 'utf8')) as Informe)
    : null;

  for (const h of HECHOS) {
    const m = medidas.get(h.id)!;
    console.log(`══ ${h.id}`);
    console.log(`   ${h.norma}`);
    if (m.salio === 0) {
      console.log('   no salió en ningún cuestionario\n');
      continue;
    }
    const tasa = m.acerto / m.salio;
    console.log(
      `   salió ${m.salio} vez/veces · acertó ${m.acerto} (${Math.round(tasa * 100)} %) · se equivocó ${m.fallo}`,
    );
    const antes = previo?.medidas.find((x) => x.hecho === h.id);
    if (antes && antes.salio > 0) {
      const tasaAntes = antes.acerto / antes.salio;
      const delta = tasa - tasaAntes;
      // El margen depende de cuántas veces salió el hecho. Con un umbral
      // fijo, una sola respuesta de diferencia sobre cuatro se anunciaba
      // como «EMPEORA 25 puntos», que es leer ruido como señal.
      const ruido = margen(tasa, m.salio) + margen(tasaAntes, antes.salio);
      console.log(
        `   antes ${Math.round(tasaAntes * 100)} % (de ${antes.salio}) · ${
          Math.abs(delta) <= ruido
            ? 'igual dentro del ruido'
            : delta > 0
              ? `MEJORA (+${Math.round(delta * 100)} pts)`
              : `EMPEORA (${Math.round(delta * 100)} pts)`
        }`,
      );
    }
    for (const e of m.ejemplos) console.log(`     · ${e}`);
    console.log('');
  }

  if (guardarEn) {
    await mkdir(dirname(guardarEn), { recursive: true });
    await writeFile(
      guardarEn,
      JSON.stringify({ fecha: new Date().toISOString(), vueltas, medidas: [...medidas.values()] }, null, 2),
      'utf8',
    );
    console.log(`   Guardado en ${guardarEn}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
