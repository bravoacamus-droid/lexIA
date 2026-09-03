#!/usr/bin/env tsx
/**
 * El medidor de cifras, medido.
 *
 * Este instrumento ha dado tres lecturas falsas seguidas: contó los
 * distractores como si el chat los afirmara, mostró el contexto de la
 * respuesta equivocada, y al trocear las alternativas se llevó las
 * cuatro cuando venían en una sola línea. Un medidor así hace tomar
 * decisiones peores que no medir nada, de modo que aquí se le pasan
 * textos conocidos y se comprueba qué saca.
 *
 *   npx tsx scripts/probar-medidor-cifras.ts
 */
import { loAfirmado, cifrasDe } from './medir-cifras-inventadas';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  console.log(`  ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) {
    fallos++;
    if (detalle) console.log(`      ${detalle}`);
  }
}

console.log('\nUNA ALTERNATIVA POR LÍNEA — el formato habitual\n');

const porLineas = `### 3. ¿Cuál es el plazo máximo que tiene la Entidad?
* A) Diez días desde la suscripción del contrato.
* B) Veintidós días desde la suscripción del contrato [3].
* C) Treinta días calendario desde la buena pro.
* D) Cinco días hábiles desde el perfeccionamiento.

* **Respuesta correcta:** B
* **Sustento normativo:** Artículo 176, numeral 176.3 del Reglamento.`;

const a1 = loAfirmado(porLineas);
comprobar('saca la alternativa marcada', /Veintidós días/.test(a1), a1);
comprobar('y no las demás', !/Diez días|Treinta días|Cinco días/.test(a1), a1);
comprobar('y el sustento', /176\.3/.test(a1), a1);

console.log('\nLAS CUATRO EN UNA LÍNEA — el formato que rompía la medida\n');

const enUnaLinea = `### 5. ¿Qué plazo hay? - A) No menor de 10 días calendario. - B) No menor de 15 días hábiles. - C) No menor de 22 días hábiles. - D) Sin plazo.
**Respuesta correcta:** C
**Sustento:** Artículo 64 del Reglamento.`;

const a2 = loAfirmado(enUnaLinea);
comprobar('saca solo la marcada', /22 días hábiles/.test(a2), a2);
comprobar('y no los distractores', !/10 días calendario|15 días hábiles/.test(a2), a2);

console.log('\nVARIAS PREGUNTAS SEGUIDAS — no deben mezclarse\n');

const dos = `### 1. ¿Uno?
* A) Tres días hábiles.
* B) Ocho días hábiles.
* **Respuesta correcta:** B

### 2. ¿Dos?
* A) Diez días calendario.
* B) Veinte días calendario.
* **Respuesta correcta:** A`;

const a3 = loAfirmado(dos);
comprobar('coge la B de la primera', /Ocho días hábiles/.test(a3), a3);
comprobar('y la A de la segunda', /Diez días calendario/.test(a3), a3);
comprobar('sin colar las otras dos', !/Tres días hábiles|Veinte días calendario/.test(a3), a3);

console.log('\nUNA PREGUNTA SIN CLAVE RECONOCIBLE — se deja fuera, no se adivina\n');

const sinClave = `### 1. ¿Uno?
* A) Tres días hábiles.
* B) Ocho días hábiles.
**Clave:** B

### 2. ¿Dos?
* A) Diez días calendario.
* B) Veinte días calendario.
**Respuesta correcta:** A`;

const a4 = loAfirmado(sinClave);
comprobar('mide la que sí tiene clave', /Diez días calendario/.test(a4), a4);
comprobar('y no cuenta nada de la que no la tiene', !/Tres días|Ocho días/.test(a4), a4);


console.log('\nALTERNATIVAS EN MINÚSCULA Y CLAVE CON TEXTO — el formato real\n');

const minusculas = `### 1. ¿Plazo para apelar?
* a) Cinco (5) días hábiles.
* b) Ocho (8) días hábiles desde la notificación en la Pladicop.
* c) Tres (3) días hábiles.

**Respuesta correcta:** b) Ocho (8) días hábiles desde la notificación en la Pladicop.
**Sustento legal:** Artículo 304, numeral 304.1 del Reglamento.`;

const a5 = loAfirmado(minusculas);
comprobar('lee la alternativa en minúscula', /Ocho \(8\) días hábiles/.test(a5), a5);
comprobar('y no las otras', !/Cinco \(5\)|Tres \(3\)/.test(a5), a5);


console.log('\nLAS CIFRAS QUE SE EXTRAEN\n');

const c = cifrasDe('El plazo es de ocho (8) días hábiles y la penalidad llega al 10 % del monto.');
comprobar('lee «ocho (8) días hábiles»', c.some((x) => x.valor === 8 && x.unidad === 'dias habiles'));
comprobar('lee el porcentaje', c.some((x) => x.valor === 10 && /ciento|%/.test(x.unidad)));
comprobar('y no inventa una tercera', c.length === 2, JSON.stringify(c));

const dec = cifrasDe('La penalidad diaria es de 0,05 % del monto y el tope es 10 %.');
comprobar('lee un decimal con coma', dec.some((x) => x.valor === 0.05), JSON.stringify(dec));
comprobar('y no lo confunde con un 5', !dec.some((x) => x.valor === 5), JSON.stringify(dec));

console.log(`\n${fallos === 0 ? 'El medidor mide lo que dice medir.' : `${fallos} fallo(s): la medida no es de fiar.`}\n`);
process.exit(fallos === 0 ? 0 : 1);
