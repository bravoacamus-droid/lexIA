#!/usr/bin/env tsx
/**
 * Las penalidades como las calcula César en sus informes (27/09/2026):
 * mora u «otras penalidades» de la tabla, el histórico acumulado y el tope
 * del 10 %, que en la Ley N.° 32069 es uno solo para las dos (numeral
 * 119.2) y en el régimen anterior es uno para cada tipo (numeral 161.2 del
 * D.S. N.° 344-2018-EF, que recoge la Opinión N° D000035-2025-OECE-DTN).
 * Y el adicional en un contrato menor, que no procede (numeral 229.1).
 *
 * Los números son los de sus informes: E26 (vigilancia, S/ 40.00 × 48),
 * E24 (limpieza, régimen anterior, S/ 80.00 × 2 con S/ 10,980.00 antes),
 * E22 (uniformes, S/ 27.50 × 12).
 *
 * `npx tsx scripts/pruebas/penalidades.ts`
 */
import { calcular, otrasPenalidades, type Insumos } from '../../src/lib/ejecucion/calculos';
import { condicionesAplicables, type Contexto } from '../../src/lib/ejecucion/matriz';
import { siguientePregunta, type EstadoParaPreguntar } from '../../src/lib/ejecucion/preguntas';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}

const insumos = (p: Partial<Insumos>): Insumos => ({
  actuacion: 'penalidad',
  tipo: 'servicios',
  sistemaEntrega: null,
  ficha: { monto_original: { valor: 'S/ 741,880.08' }, monto_vigente: { valor: 'S/ 640,339.68' }, plazo_dias: { valor: '730' } },
  respuestas: {},
  hoy: '2026-09-27',
  regimen: 'ley_32069',
  ...p,
});
const calc = (i: Insumos, concepto: string) => calcular(i).find((c) => c.concepto === concepto);

console.log('\nLas infracciones, como las escribe César');
const l = otrasPenalidades('Infracción N.° 01: Entrega extemporánea del Plan de Seguridad: S/ 40.00 × 48\nPrendas excedentes: S/ 27.50 x 12\n- Retraso en guías: S/ 80.00 por 2\nPenalidad fija S/ 330.00');
comprobar('lee «S/ 40.00 × 48»', l.infracciones[0]?.total === 1920 && l.infracciones[0].descripcion === 'Infracción N.° 01: Entrega extemporánea del Plan de Seguridad', l);
comprobar('lee «x 12»', l.infracciones[1]?.total === 330, l);
comprobar('lee «por 2» con viñeta', l.infracciones[2]?.total === 160 && l.infracciones[2].descripcion === 'Retraso en guías', l);
comprobar('un monto solo es una vez', l.infracciones[3]?.total === 330 && l.infracciones[3].veces === 1, l);
const uit = otrasPenalidades('Por prenda: 0.5 % UIT × 12');
comprobar('lo que va en % de la UIT no se inventa: se pide en soles', uit.infracciones.length === 0 && uit.sinLeer.length === 1, uit);

console.log('\nE26 — otras penalidades, Ley N.° 32069');
const e26 = insumos({ respuestas: { tipo_penalidad: 'Otras penalidades', otras_penalidades: 'Entrega extemporánea del Plan de Seguridad: S/ 40.00 × 48', mora_previa: '0', otras_previas: '0' } });
comprobar('S/ 1,920.00, como el informe', calc(e26, 'Otras penalidades')?.resultado === 'S/ 1,920.00', calc(e26, 'Otras penalidades'));
comprobar('sin mora: no calcula la fórmula', !calc(e26, 'Penalidad por mora'));
const tope26 = calc(e26, 'Tope de penalidades');
comprobar('dentro del tope: se cobra el íntegro', tope26?.resultado === 'Dentro del tope: corresponde aplicar S/ 1,920.00', tope26);
comprobar('el tope es el 10 % del monto VIGENTE (S/ 64,033.97)', !!tope26?.detalle.includes('S/ 64,033.97'), tope26?.detalle);
// En producción (27/09) la auditoría bloqueó un informe que decía «mora
// anterior: S/ 0.00»: ese monto tiene que estar entre los valores.
comprobar('lo aplicado antes, aunque sea cero, está entre los valores que el informe puede citar', !!tope26?.valores?.includes('S/ 0.00'), tope26?.valores);

console.log('\nLey N.° 32069: mora y otras suman un solo tope');
const junto = insumos({
  ficha: { monto_vigente: { valor: 'S/ 10,000.00' }, plazo_dias: { valor: '100' } },
  respuestas: { tipo_penalidad: 'Ambas', dias_atraso: '5', otras_penalidades: 'Infracción: S/ 200.00 × 1', mora_previa: '300', otras_previas: '100' },
});
// Mora: 0.10 × 10,000 / (0.40 × 100) = 25 por día × 5 = 125. Otras 200.
// Antes 400; actual 325; acumulado 725 < 1,000.
comprobar('mora 125', calc(junto, 'Penalidad por mora')?.resultado === 'S/ 125.00', calc(junto, 'Penalidad por mora'));
comprobar('acumulado 725: dentro del tope, se aplica 325', calc(junto, 'Tope de penalidades')?.resultado === 'Dentro del tope: corresponde aplicar S/ 325.00', calc(junto, 'Tope de penalidades'));
const pasa = insumos({
  ficha: { monto_vigente: { valor: 'S/ 10,000.00' }, plazo_dias: { valor: '100' } },
  respuestas: { tipo_penalidad: 'Ambas', dias_atraso: '5', otras_penalidades: 'Infracción: S/ 200.00 × 1', mora_previa: '500', otras_previas: '400' },
});
// Antes 900; solo queda 100 del tope de 1,000.
comprobar('antes 900: solo quedan S/ 100.00 del tope', calc(pasa, 'Tope de penalidades')?.resultado === 'Se alcanza el tope del 10 %: corresponde aplicar S/ 100.00', calc(pasa, 'Tope de penalidades'));
comprobar('y avisa que se llegó a la penalidad máxima', !!calc(pasa, 'Penalidad máxima'));

console.log('\nE24 — régimen anterior: cada tipo con su tope');
const e24 = insumos({
  regimen: 'ley_30225',
  ficha: { monto_vigente: { valor: 'S/ 187,200.00' }, plazo_dias: { valor: '730' } },
  respuestas: { tipo_penalidad: 'Otras penalidades', otras_penalidades: 'Entrega tardía de guías: S/ 80.00 × 2', otras_previas: '10980', mora_previa: '0' },
});
comprobar('S/ 160.00, como el informe', calc(e24, 'Otras penalidades')?.resultado === 'S/ 160.00', calc(e24, 'Otras penalidades'));
comprobar('acumulado S/ 11,140.00: no supera el 10 % de otras penalidades', calc(e24, 'Tope de otras penalidades')?.resultado === 'Dentro del tope: corresponde aplicar S/ 160.00' && !!calc(e24, 'Tope de otras penalidades')?.detalle.includes('S/ 11,140.00'), calc(e24, 'Tope de otras penalidades'));
comprobar('en el régimen anterior no se usa el tope conjunto', !calc(e24, 'Tope de penalidades'));
comprobar('ni la fórmula de mora de la Ley N.° 32069', !calc(insumos({ regimen: 'ley_30225', respuestas: { dias_atraso: '3' } }), 'Penalidad por mora'));
comprobar('y las demás actuaciones del régimen anterior siguen sin cálculos', calcular(insumos({ regimen: 'ley_30225', actuacion: 'adicional', respuestas: { monto_adicional: '1000' } })).length === 0);

console.log('\nSin decir el tipo, la mora como antes');
comprobar('sin tipo_penalidad se calcula la mora', !!calc(insumos({ respuestas: { dias_atraso: '2' } }), 'Penalidad por mora'));

console.log('\nLas preguntas');
const estado = (respuestas: Record<string, string>, regimen: EstadoParaPreguntar['regimen'] = 'ley_32069'): EstadoParaPreguntar => ({
  actuacion: 'penalidad',
  perfil: 'dec',
  tipo: 'servicios',
  regimen,
  ficha: {},
  respuestas,
  clases: new Set(),
  hechoIdentificado: true,
  hechoAcreditado: true,
  montos: [],
  hayFechaSolicitud: false,
});
comprobar('primero pregunta qué penalidad es', siguientePregunta(estado({}))?.id === 'tipo_penalidad');
comprobar('solo otras: no pregunta por los días de atraso', siguientePregunta(estado({ tipo_penalidad: 'Otras penalidades' }))?.id === 'otras_penalidades');
comprobar('Ley N.° 32069: pregunta la mora anterior aunque hoy sean otras (el tope es conjunto)', siguientePregunta(estado({ tipo_penalidad: 'Otras penalidades', otras_penalidades: 'x: S/ 1.00 × 1' }))?.id === 'mora_previa');
comprobar('régimen anterior: con solo otras, no pregunta la mora anterior', siguientePregunta(estado({ tipo_penalidad: 'Otras penalidades', otras_penalidades: 'x: S/ 1.00 × 1' }, 'ley_30225'))?.id === 'otras_previas');

console.log('\nLas condiciones');
const ctx = (respuestas: Record<string, string>, regimen: Contexto['regimen'] = 'ley_32069'): Contexto => ({ perfil: 'dec', tipo: 'servicios', sistemaEntrega: null, supervisado: null, regimen, respuestas });
const ids = (c: Contexto) => condicionesAplicables('penalidad', c).map((x) => x.id);
comprobar('solo otras: sin fórmula de mora, con la infracción de la tabla', !ids(ctx({ tipo_penalidad: 'Otras penalidades' })).includes('formula') && ids(ctx({ tipo_penalidad: 'Otras penalidades' })).includes('infraccion'));
comprobar('régimen anterior: el tope de cada tipo', ids(ctx({}, 'ley_30225')).includes('tope_anterior') && !ids(ctx({}, 'ley_30225')).includes('tope'));

console.log('\nContrato menor: no admite adicionales (numeral 229.1)');
const menor = calcular(insumos({ actuacion: 'adicional', contratoMenor: true, ficha: { monto_original: { valor: 'S/ 40,000.00' } }, respuestas: { monto_adicional: '2000' } }));
const c229 = menor.find((c) => c.concepto === 'Contrato menor');
comprobar('lo marca como improcedente', c229?.impide === true && c229.base === 'numeral 229.1 del artículo 229 del Reglamento', menor);
comprobar('un contrato que no es menor, no', !calcular(insumos({ actuacion: 'adicional', ficha: { monto_original: { valor: 'S/ 40,000.00' } }, respuestas: { monto_adicional: '2000' } })).some((c) => c.concepto === 'Contrato menor'));

console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ Todo en orden\n');
process.exit(fallos ? 1 : 0);
