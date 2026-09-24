#!/usr/bin/env tsx
/**
 * Las reglas de «Generar requerimiento» que no dependen del modelo.
 *
 * `npx tsx scripts/pruebas/generacion.ts`
 *
 * Salen de la prueba del 23/09/2026 con un servicio de limpieza, en la
 * que el generador dejaba 48 apartados en blanco y escribía cosas que no
 * debían estar en el Word:
 *
 *   · El texto fijo del formato no se vuelve a redactar. El procedimiento
 *     de penalidades de César salía reescrito y con «[Pendiente: número]»
 *     donde él había puesto «cinco (05) días hábiles».
 *   · Un «No corresponde establecer…» es la señal de apagar el apartado,
 *     no un párrafo para el documento.
 *   · Una fila de cuadro escrita con barras es una fila, no una celda.
 */
import { obtenerPlantilla } from '../../src/lib/generadores/plantillas';
import { normalizarRespuestas, respuestasVacias } from '../../src/lib/generadores/ensamblador';
import { apartadosPorRedactar, motivoNoCorresponde } from '../../src/lib/generadores/redaccion-masiva';
import { depurarDistribucion, destinosDistribucion } from '../../src/lib/generadores/distribuidor';
import type { Seccion } from '../../src/lib/generadores/plantilla-tipos';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
}

console.log('── El texto fijo del formato no se redacta ──');
const p = obtenerPlantilla('ps-servicios-general')!;
const r = normalizarRespuestas(respuestasVacias(), 'Servicio de limpieza', p);
const conTextoDelFormato: string[] = [];
const rec = (s: Seccion) => {
  for (const b of s.bloques) if (b.clase === 'redactado' && b.predeterminado) conTextoDelFormato.push(b.id);
  (s.subsecciones ?? []).forEach(rec);
};
p.secciones.forEach(rec);
const porRedactar = new Set(apartadosPorRedactar(p, r).map((x) => x.bloque.id));
comprobar(
  `la plantilla trae apartados con texto del formato (${conTextoDelFormato.length})`,
  conTextoDelFormato.length > 0,
);
comprobar(
  'ninguno entra en la redacción',
  conTextoDelFormato.every((id) => !porRedactar.has(id)),
  conTextoDelFormato.filter((id) => porRedactar.has(id)).join(', '),
);
comprobar('el procedimiento de penalidades, en concreto', !porRedactar.has('procedimiento_penalidades'));

console.log('\n── «No corresponde» es una señal, no un párrafo ──');
for (const [texto, esperado] of [
  ['No corresponde establecer soporte técnico para la presente contratación, porque el objeto no involucra componentes tecnológicos. Además…', true],
  ['No aplica: el servicio no requiere visita.', true],
  ['No se requiere plan de trabajo para esta contratación.', true],
  ['El contratista deberá presentar el plan de trabajo en cinco días.', false],
  ['Normalmente no corresponde exigir… pero aquí sí.', false],
] as const) {
  const m = motivoNoCorresponde(texto);
  comprobar(`${esperado ? 'reconoce' : 'no confunde'}: «${texto.slice(0, 50)}…»`, !!m === esperado, String(m));
}
comprobar(
  'y el motivo es la primera frase',
  motivoNoCorresponde('No corresponde X, porque Y. Además Z.') === 'No corresponde X, porque Y.',
);

console.log('\n── Las filas de un cuadro ──');
const destinos = destinosDistribucion(p, r);
const items = destinos.find((d) => d.destino === 'tablas' && d.id === 'items');
const personal = destinos.find((d) => d.destino === 'tablas' && d.id === 'personal_no_clave');
comprobar('el formato tiene el cuadro de servicios y el de personal no clave', !!items && !!personal);
if (items && personal) {
  const reparto = depurarDistribucion(
    {
      asignaciones: [
        { apartado_id: 'items', texto: ['1 | Servicio de limpieza y desinfección'], confianza: 'alta' },
        { apartado_id: 'personal_no_clave', filas: [['Operarios de limpieza', '6', '', '', '']], confianza: 'alta' },
      ],
    },
    destinos,
    [],
  );
  const filaItems = reparto.asignaciones.find((a) => a.apartado_id === 'items')?.filas?.[0];
  comprobar(
    'una fila escrita con barras se parte en sus celdas',
    filaItems?.[0] === '1' && filaItems?.[1] === 'Servicio de limpieza y desinfección',
    JSON.stringify(filaItems),
  );
  const filaPersonal = reparto.asignaciones.find((a) => a.apartado_id === 'personal_no_clave')?.filas?.[0];
  comprobar(
    'y una fila a medias se conserva, con sus celdas vacías',
    filaPersonal?.length === personal.columnas!.length && filaPersonal[1] === '6',
    JSON.stringify(filaPersonal),
  );
}

console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ Las reglas de la generación se cumplen.');
process.exit(fallos ? 1 : 0);
