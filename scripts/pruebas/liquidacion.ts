#!/usr/bin/env tsx
/**
 * Los plazos de la liquidación (cuadro del numeral 215.6, confirmado por
 * César el 27/09/2026) y su cómputo en días calendario (numeral 105.3,
 * con el inciso 5 del artículo 183 del Código Civil).
 *
 * `npx tsx scripts/pruebas/liquidacion.ts`
 */
import { calcular } from '../../src/lib/ejecucion/calculos';
import type { Ficha } from '../../src/lib/ejecucion/tipos';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}
const ficha = {} as Ficha;
const calc = (tipo: string, conf: string | null, liq: string | null, hoy: string, hay = false) =>
  calcular({ actuacion: 'liquidacion', tipo: tipo as never, sistemaEntrega: null, ficha, respuestas: {}, fechaConformidad: conf, fechaLiquidacion: liq, hayPronunciamiento: hay, hoy });
const de = (r: ReturnType<typeof calc>, concepto: string) => r.find((c) => c.concepto === concepto);

console.log('\nObra: treinta días para presentar, cincuenta para pronunciarse');
let r = calc('obra', '2026-08-01', null, '2026-08-10');
comprobar('presentación hasta el 31 de agosto', de(r, 'Plazo para presentar la liquidación')?.resultado.includes('31 de agosto de 2026') === true, r);
r = calc('obra', '2026-08-01', '2026-08-25', '2026-10-20');
comprobar('presentada a tiempo', de(r, 'Oportunidad de la liquidación')?.resultado === 'Presentada dentro de plazo');
comprobar('sin pronunciamiento a los 50 días: consentida', /consentida/.test(de(r, 'Plazo para pronunciarse sobre la liquidación')?.resultado ?? ''));
r = calc('obra', '2026-08-01', '2026-08-25', '2026-10-20', true);
comprobar('con pronunciamiento en el expediente no se declara consentida', !/consentida o aprobada$/.test(de(r, 'Plazo para pronunciarse sobre la liquidación')?.resultado ?? ''));

console.log('\nConsultoría de obra: quince y treinta');
r = calc('consultoria_obra', '2026-08-06', '2026-09-01', '2026-09-27');
const op = de(r, 'Oportunidad de la liquidación');
comprobar('quince días: vencía el 21 de agosto', op?.detalle.includes('21 de agosto de 2026') === true, op?.detalle);
comprobar('tardía es un riesgo, no un impedimento (numeral 215.2)', op?.impide === false && /fuera del plazo/.test(op?.resultado ?? ''));
comprobar('treinta días para pronunciarse: 1 de octubre', de(r, 'Plazo para pronunciarse sobre la liquidación')?.resultado.includes('1 de octubre de 2026') === true);

console.log('\nÚltimo día inhábil (inciso 5 del artículo 183 del Código Civil)');
r = calc('consultoria_obra', '2026-08-08', null, '2026-08-10');
const d = de(r, 'Plazo para presentar la liquidación');
comprobar('el 23 de agosto es domingo: vence el lunes 24', d?.resultado.includes('24 de agosto de 2026') === true && /inhábil/.test(d?.detalle ?? ''), d);

console.log('\nBienes y servicios: no hay liquidación');
comprobar('no calcula nada', calc('bien', '2026-08-01', null, '2026-09-01').length === 0);

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : '\n✅ Todo en orden\n');
process.exit(fallos ? 1 : 0);
