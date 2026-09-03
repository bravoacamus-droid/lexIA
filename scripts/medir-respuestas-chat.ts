#!/usr/bin/env tsx
/**
 * Cuánto acierta el chat, no si aprueba.
 *
 * POR QUÉ EXISTE
 *
 * `probar-respuestas-cesar.ts` da un aprobado o un suspenso, y con este
 * modelo eso miente en las dos direcciones. El 01/09/2026, midiendo un
 * cambio en la recuperación, la misma batería dio tres ejecuciones
 * limpias, dos con dos fallos y seis limpias otra vez, sin tocar nada
 * entre medias. Con ese instrumento no se puede decidir si un cambio en
 * el prompt mejora: es justo lo que ya pasó en agosto, cuando se
 * añadieron dos reglas al prompt, parecieron buenas y resultó que
 * hundían una pregunta de 83 % a 25 %.
 *
 * Este script pregunta lo mismo muchas veces y da la proporción de
 * acierto por comprobación. Y guarda el resultado, para poder comparar
 * el antes y el después de un cambio en vez de fiarse de una corrida.
 *
 * CÓMO SE USA
 *
 *   npx tsx scripts/medir-respuestas-chat.ts --vueltas 10
 *   npx tsx scripts/medir-respuestas-chat.ts --vueltas 10 --guardar tmp/antes.json
 *   ... se hace el cambio ...
 *   npx tsx scripts/medir-respuestas-chat.ts --vueltas 10 --comparar tmp/antes.json
 *
 * CÓMO SE LEE
 *
 * Una diferencia pequeña entre dos medidas no es una mejora ni un
 * empeoramiento: es ruido. El script lo dice por cada comprobación, con
 * el margen que corresponde al número de vueltas, en vez de dejar que
 * uno se ilusione con un 90 % frente a un 80 % medidos sobre diez.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CASOS, juzgar, responder, type Caso, type Comprobacion } from './lib/banco-chat';

/** Cuántas preguntas se lanzan a la vez. */
const A_LA_VEZ = 3;

interface Medida {
  clave: string;
  nombre: string;
  caso: string;
  aciertos: number;
  vueltas: number;
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

/** Reparte el trabajo sin lanzarlo todo de golpe contra la API. */
async function enTandas<T, R>(cosas: T[], aLaVez: number, hacer: (c: T) => Promise<R>) {
  const salida: R[] = [];
  for (let i = 0; i < cosas.length; i += aLaVez) {
    salida.push(...(await Promise.all(cosas.slice(i, i + aLaVez).map(hacer))));
  }
  return salida;
}

function barra(proporcion: number, ancho = 20): string {
  const llenos = Math.round(proporcion * ancho);
  return '█'.repeat(llenos) + '·'.repeat(ancho - llenos);
}

/**
 * El margen de una proporción medida sobre n vueltas (Wald, 95 %).
 *
 * Sirve para lo único que importa aquí: saber si dos medidas se
 * distinguen o si la diferencia cabe dentro del ruido.
 */
function margen(p: number, n: number): number {
  if (n === 0) return 1;
  return 1.96 * Math.sqrt(Math.max(p * (1 - p), 0.01) / n);
}

async function main() {
  const vueltas = Number(opcion('--vueltas') ?? 5);
  const guardarEn = opcion('--guardar');
  const compararCon = opcion('--comparar');
  const soloCaso = opcion('--caso');

  const casos = soloCaso ? CASOS.filter((c) => c.id === soloCaso) : CASOS;
  if (casos.length === 0) {
    console.error(`No hay ningún caso con id «${soloCaso}».`);
    process.exit(1);
  }

  console.log(`\nMidiendo ${casos.length} pregunta(s) × ${vueltas} vueltas\n`);

  // Cada (caso, vuelta) es una unidad de trabajo independiente.
  const trabajos: Array<{ caso: Caso; vuelta: number }> = [];
  for (const caso of casos) {
    for (let v = 1; v <= vueltas; v++) trabajos.push({ caso, vuelta: v });
  }

  const acumulado = new Map<string, Medida>();
  let hechos = 0;
  let fallosDeRed = 0;

  const resultados = await enTandas(trabajos, A_LA_VEZ, async ({ caso }) => {
    try {
      const { texto } = await responder(caso.pregunta);
      const comprobaciones = juzgar(caso, texto);
      hechos++;
      process.stdout.write(`\r   ${hechos}/${trabajos.length} respuestas`);
      return { caso, comprobaciones };
    } catch (e) {
      fallosDeRed++;
      process.stdout.write(`\r   ${hechos}/${trabajos.length} respuestas (${fallosDeRed} fallidas)`);
      return { caso, comprobaciones: [] as Comprobacion[] };
    }
  });

  process.stdout.write('\r' + ' '.repeat(60) + '\r');

  for (const { caso, comprobaciones } of resultados) {
    for (const c of comprobaciones) {
      const m = acumulado.get(c.clave) ?? {
        clave: c.clave,
        nombre: c.nombre,
        caso: caso.id,
        aciertos: 0,
        vueltas: 0,
      };
      m.aciertos += c.ok ? 1 : 0;
      m.vueltas += 1;
      acumulado.set(c.clave, m);
    }
  }

  const medidas = [...acumulado.values()];
  const previo: Informe | null = compararCon
    ? (JSON.parse(await readFile(compararCon, 'utf8')) as Informe)
    : null;

  let casoActual = '';
  for (const m of medidas) {
    if (m.caso !== casoActual) {
      casoActual = m.caso;
      const caso = CASOS.find((c) => c.id === m.caso)!;
      console.log(`\n══ ${caso.id}`);
      console.log(`   ${caso.pregunta.slice(0, 88)}…`);
    }
    const p = m.aciertos / m.vueltas;
    const linea = `   ${barra(p)} ${String(Math.round(p * 100)).padStart(3)} %  ${String(m.aciertos)}/${m.vueltas}  ${m.nombre}`;

    const antes = previo?.medidas.find((x) => x.clave === m.clave);
    if (!antes) {
      console.log(linea);
      continue;
    }
    const pAntes = antes.aciertos / antes.vueltas;
    const delta = p - pAntes;
    const ruido = margen(p, m.vueltas) + margen(pAntes, antes.vueltas);
    const señal =
      Math.abs(delta) <= ruido
        ? 'igual dentro del ruido'
        : delta > 0
          ? `MEJORA (+${Math.round(delta * 100)} pts)`
          : `EMPEORA (${Math.round(delta * 100)} pts)`;
    console.log(`${linea}\n${' '.repeat(28)}antes ${Math.round(pAntes * 100)} % · ${señal}`);
  }

  const totalAciertos = medidas.reduce((a, m) => a + m.aciertos, 0);
  const totalVueltas = medidas.reduce((a, m) => a + m.vueltas, 0);
  const global = totalVueltas === 0 ? 0 : totalAciertos / totalVueltas;

  console.log(
    `\n── Acierto global: ${Math.round(global * 100)} % (${totalAciertos}/${totalVueltas} comprobaciones)`,
  );
  console.log(
    `   Margen a ${vueltas} vueltas: ±${Math.round(margen(global, totalVueltas) * 100)} puntos. ` +
      'Una diferencia menor que eso no es una mejora, es ruido.',
  );
  if (fallosDeRed > 0) console.log(`   ${fallosDeRed} respuesta(s) no se pudieron generar.`);

  if (guardarEn) {
    const informe: Informe = { fecha: new Date().toISOString(), vueltas, medidas };
    await mkdir(dirname(guardarEn), { recursive: true });
    await writeFile(guardarEn, JSON.stringify(informe, null, 2), 'utf8');
    console.log(`\n   Guardado en ${guardarEn} para comparar después.`);
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
