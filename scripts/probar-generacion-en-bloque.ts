#!/usr/bin/env tsx
/**
 * Cuándo se activa la búsqueda por temas, y cuándo no.
 *
 * Pedir quince preguntas dispara una llamada de más al modelo y diez
 * búsquedas: bien empleadas cuando de verdad hay que cubrir quince
 * asuntos, y un desperdicio —con más contexto del necesario— cuando la
 * pregunta era una sola. Lo que aquí se comprueba es el reconocimiento:
 * que se active con lo que debe y se quede quieto con lo demás.
 *
 *   npx tsx scripts/probar-generacion-en-bloque.ts
 */
import { detectarGeneracionEnBloque } from '../src/lib/ai/generacion-en-bloque';
import { CASOS } from './lib/banco-chat';

let fallos = 0;
function comprobar(que: string, ok: boolean) {
  console.log(`  ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
}

console.log('\nLAS PREGUNTAS DEL BANCO — no debe activarse en ninguna\n');
for (const c of CASOS) {
  comprobar(c.id, detectarGeneracionEnBloque(c.pregunta) === null);
}

console.log('\nPETICIONES EN BLOQUE — debe activarse\n');
const enBloque: Array<[string, number | null]> = [
  ['Genera 15 preguntas de opción múltiple sobre la Fase de Selección', 15],
  ['Elabora 10 preguntas de examen con alternativas sobre ejecución contractual', 10],
  ['Prepárame un cuestionario sobre actuaciones preparatorias', null],
  ['hazme un balotario para el examen de certificación', null],
  ['dame 20 casos prácticos sobre penalidades', 20],
];
for (const [texto, cuantas] of enBloque) {
  const d = detectarGeneracionEnBloque(texto);
  comprobar(`${texto.slice(0, 58)} → ${cuantas ?? 'sin número'}`, d !== null && d.cuantas === cuantas);
}

console.log('\nCASOS LÍMITE — mencionan las palabras, pero no piden un lote\n');
for (const texto of [
  '¿Puedo hacer una pregunta sobre el plazo de apelación?',
  'Explícame el cuestionario de la Directiva 007',
  '¿Qué preguntas debe absolver el comité en el pliego absolutorio?',
  'Dame el plazo para presentar consultas',
]) {
  comprobar(texto.slice(0, 58), detectarGeneracionEnBloque(texto) === null);
}

console.log(`\n${fallos === 0 ? 'Se activa donde toca.' : `${fallos} fallo(s).`}\n`);
process.exit(fallos === 0 ? 0 : 1);
