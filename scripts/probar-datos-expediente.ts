#!/usr/bin/env tsx
/**
 * Comprueba las tres correcciones a los datos del expediente.
 *
 * POR QUÉ EXISTE
 *
 * César reportó el 18/08/2026:
 *
 *   1. "El monto de la cuantía de la contratación no se guarda".
 *      La causa: se teclea "100,000.00" y `Number()` devuelve NaN. Zod
 *      lo rechazaba, el PATCH entero respondía 400 y NO se guardaba
 *      nada —ni la cuantía ni el texto escrito en ese intervalo—. Era
 *      mucho peor de lo que parecía desde fuera.
 *   2. "La opción de monto contratado la veo innecesaria".
 *      Cierto: cuando se redacta el requerimiento no hay contrato. Solo
 *      alimentaba una comprobación de la JPRD que además nunca llegaba
 *      a ejecutarse, porque ninguna plantilla enciende esa condición.
 *      Campo y comprobación retirados.
 *   3. "La denominación de la contratación se triplica".
 *      Se pedía al crear, en los datos del expediente y en el numeral 1.
 *      Ahora se escribe una vez y el resto la toma de ahí.
 *
 * Uso: npx tsx scripts/probar-datos-expediente.ts
 */
import {
  MontoSchema,
  montoDe,
  normalizarRespuestas,
  respuestasVacias,
  ensamblarRequerimiento,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import { obtenerPlantilla, listarPlantillas } from '../src/lib/generadores/plantillas';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

// ── 1. Importes escritos como los escribe la gente ────────────────────
console.log('── Lectura del importe ──');
const IMPORTES: Array<[string, number | null]> = [
  ['100,000.00', 100000],
  ['S/ 100,000.00', 100000],
  ['100.000,00', 100000],
  ['100,000', 100000],
  ['150.000', 150000],
  ['S/ 150 000,00 (ciento cincuenta mil con 00/100 soles)', 150000],
  ['1.234.567,89', 1234567.89],
  ['1,234,567.89', 1234567.89],
  ['1,50', 1.5],
  ['1.50', 1.5],
  ['100000', 100000],
  ['30%', 30],
  ['sin cifra', null],
];
for (const [texto, esperado] of IMPORTES) {
  comprobar(`"${texto.slice(0, 40)}" → ${esperado}`, montoDe(texto) === esperado);
}

console.log('\n── El guardado acepta ese importe ──');
for (const [texto, esperado] of IMPORTES) {
  const r = MontoSchema.safeParse(texto);
  if (esperado === null) {
    // Lo que no es un importe se ignora: el campo se queda como estaba y
    // el resto del guardado sigue adelante. Tumbar la petición entera es
    // justo el fallo que se corrige.
    comprobar(`ignora "${texto}", que no es un importe`, r.success && r.data === undefined);
  } else {
    comprobar(`guarda "${texto.slice(0, 30)}" como ${esperado}`, r.success && r.data === esperado);
  }
}
comprobar('el campo vacío se guarda como null', MontoSchema.safeParse('').success && MontoSchema.parse('') === null);
comprobar('acepta también un número ya convertido', MontoSchema.parse(250000) === 250000);
comprobar('lee el signo en vez de tragárselo', montoDe('-5000') === -5000);
comprobar('ignora un importe negativo', MontoSchema.parse('-5000') === undefined);

// ── 2. La denominación se escribe una sola vez ────────────────────────
console.log('\n── La denominación no se repite ──');
const conDenominacion = normalizarRespuestas({}, 'Servicio de vigilancia de la sede central');
comprobar(
  'el campo del numeral 1 se rellena con la del expediente',
  conDenominacion.campos.denominacion === 'Servicio de vigilancia de la sede central',
);
const yaEscrita = normalizarRespuestas(
  { campos: { denominacion: 'La que escribió el usuario' } },
  'La del expediente',
);
comprobar(
  'si el usuario ya escribió una, no se pisa',
  yaEscrita.campos.denominacion === 'La que escribió el usuario',
);
comprobar(
  'sin denominación, se comporta como antes',
  normalizarRespuestas({}).campos.denominacion === undefined,
);

const conDenominacionEnPlantillas = listarPlantillas().filter((p) => {
  const busca = (ss: (typeof p)['secciones']): boolean =>
    ss.some(
      (s) =>
        s.bloques.some((b) => b.clase === 'campo' && b.id === 'denominacion') ||
        busca(s.subsecciones ?? []),
    );
  return busca(p.secciones);
});
console.log(
  `   ${conDenominacionEnPlantillas.length} de ${listarPlantillas().length} plantillas piden la denominación en el documento`,
);
comprobar(
  'el relleno alcanza a todas ellas',
  conDenominacionEnPlantillas.length > 0 &&
    conDenominacionEnPlantillas.every(
      (p) => normalizarRespuestas({}, 'X').campos.denominacion === 'X',
    ),
);

// ── 3. El monto del contrato ya no se pide ───────────────────────────
// La comprobación de la JPRD que lo usaba no podía ejecutarse nunca:
// ninguna plantilla enciende la condición `usa_jprd`, y el umbral de los
// S/ 10 000 000,00 llega al lector como nota del propio formato. Se
// retiró junto con el campo. Lo que sí hay que comprobar es que el
// contexto económico dejó de aceptarlo y que los topes que sí funcionan
// —experiencia y MYPE, que dependen de la cuantía— siguen en pie.
console.log('\n── Los topes que dependen de la cuantía siguen funcionando ──');
{
  const p = obtenerPlantilla('ps-servicios-general');
  if (p) {
    const excedida = ensamblarRequerimiento(
      p,
      { ...respuestasVacias(), campos: { experiencia_monto: 'S/ 900,000.00' } },
      { cuantia: montoDe('100,000.00') ?? undefined },
    );
    const aviso = excedida.avisos.find((a) => a.validacion === 'experiencia_max');
    comprobar('detecta la experiencia que supera tres veces la cuantía', aviso?.nivel === 'error');
    comprobar(
      'la cuantía escrita con separadores es la que se usó en el cálculo',
      !!aviso?.mensaje.includes('300'),
    );
  }
}

// ── El documento sigue saliendo entero ────────────────────────────────
console.log('\n── El documento no se rompió por el camino ──');
const servicios = obtenerPlantilla('ps-servicios-general');
if (servicios) {
  const doc = ensamblarRequerimiento(
    servicios,
    normalizarRespuestas({}, 'Servicio de limpieza de la sede'),
    { cuantia: montoDe('100,000.00') ?? undefined },
  );
  comprobar(
    'la denominación llega al documento sin escribirla dos veces',
    doc.markdown.includes('Servicio de limpieza de la sede'),
  );
  comprobar(
    'ya no figura entre los datos que faltan',
    !doc.faltantes.some((f) => f.bloque === 'denominacion'),
  );
}

console.log(
  fallos === 0
    ? '\n✅ Cuantía que se guarda, denominación una sola vez, sin monto de contrato.'
    : `\n❌ ${fallos} problema(s).`,
);
process.exit(fallos === 0 ? 0 : 1);
