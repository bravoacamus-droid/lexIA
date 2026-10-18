/**
 * Prueba del dictado por voz: los resultados se unen sin repetir.
 * Uso: npx tsx scripts/pruebas/dictado.ts
 */
import { unirResultados } from '../../src/lib/voz/unir-dictado';

let fallas = 0;
function igual(obtenido: string, esperado: string, caso: string) {
  const ok = obtenido === esperado;
  if (!ok) fallas++;
  console.log(`${ok ? '✅' : '❌'} ${caso}${ok ? '' : `\n   obtenido: «${obtenido}»\n   esperado: «${esperado}»`}`);
}

// Chrome de Android: cada resultado trae la frase acumulada (captura de
// César del 17/10/2026).
igual(
  unirResultados([
    'Qué',
    'Qué es',
    'Qué es la',
    'Qué es la',
    'Qué es la capacidad',
    'Qué es la capacidad',
    'Qué es la capacidad máxima',
    'Qué es la capacidad máxima de',
    'Qué es la capacidad máxima de contratación',
  ]),
  'Qué es la capacidad máxima de contratación',
  'Android: frase acumulada',
);
igual(unirResultados(['Qué', 'Qué es', 'Qué es el', 'Qué es el rnp']), 'Qué es el rnp', 'Android: «Qué es el rnp»');

// Android tras una pausa: empieza una frase nueva.
igual(
  unirResultados(['Qué es el', 'Qué es el RNP', 'y cómo', 'y cómo me inscribo']),
  'Qué es el RNP y cómo me inscribo',
  'Android: segunda frase después de una pausa',
);

// Chrome de computadora: trozos sucesivos, el último parcial.
igual(unirResultados(['qué es la capacidad', ' máxima de contratación']), 'qué es la capacidad máxima de contratación', 'Computadora: trozos sucesivos');
igual(unirResultados(['Ampliación de plazo', ' en servicios', ' cuándo procede']), 'Ampliación de plazo en servicios cuándo procede', 'Computadora: tres trozos');

// Superposición parcial y mayúsculas o tildes distintas.
igual(unirResultados(['qué es la capacidad', 'Capacidad máxima de contratación']), 'qué es la capacidad máxima de contratación', 'Superposición parcial');
igual(unirResultados(['penalidad por mora', 'Penalidad por mora']), 'Penalidad por mora', 'Repetido: queda la versión más reciente');
igual(unirResultados(['Qué es', '']), 'Qué es', 'Resultado vacío');
igual(unirResultados([]), '', 'Sin resultados');

console.log(fallas ? `\n❌ ${fallas} caso(s) fallan` : '\n✅ El dictado une los resultados sin repetir.');
process.exit(fallas ? 1 : 0);
