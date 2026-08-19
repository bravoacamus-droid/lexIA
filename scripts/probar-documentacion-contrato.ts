#!/usr/bin/env tsx
/**
 * La tabla de documentación para la suscripción del contrato.
 *
 * POR QUÉ EXISTE
 *
 * Dos correcciones de César (18/08/2026):
 *
 *   · La primera columna decía "Tipo de servicio". En su .docx lo puso
 *     así solo para ilustrar que el requisito cambia según el tipo de
 *     servicio; la columna real es el número de fila. Se cambia a "N.°".
 *   · La instrucción "Indicar la documentación adicional…" tiene que
 *     verse como advertencia, en rojo: no es un consejo, es la
 *     condición de qué puede exigirse y qué no.
 *
 * La tabla no está solo en la plantilla que él miraba: la llevan ocho de
 * las quince, y en dos de ellas la columna decía "Tipo de obra". La
 * corrección vale para todas —el mismo razonamiento se aplica igual—, y
 * eso es lo que se comprueba aquí.
 *
 * Uso: npx tsx scripts/probar-documentacion-contrato.ts
 */
import { ensamblarRequerimiento, respuestasVacias } from '../src/lib/generadores/ensamblador';
import { listarPlantillas } from '../src/lib/generadores/plantillas';
import type { Bloque, BloqueTabla, Seccion } from '../src/lib/generadores/plantilla-tipos';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

/** Todos los bloques de una plantilla, secciones anidadas incluidas. */
function todosLosBloques(secciones: Seccion[], out: Bloque[] = []): Bloque[] {
  for (const s of secciones) {
    out.push(...s.bloques);
    todosLosBloques(s.subsecciones ?? [], out);
  }
  return out;
}

const conTabla = listarPlantillas()
  .map((p) => ({
    plantilla: p,
    tabla: todosLosBloques(p.secciones).find(
      (b): b is BloqueTabla => b.clase === 'tabla' && b.id === 'documentacion_perfeccionamiento',
    ),
  }))
  .filter((x): x is { plantilla: (typeof x)['plantilla']; tabla: BloqueTabla } => !!x.tabla);

console.log('── Dónde está esta tabla ──');
console.log(`   ${conTabla.length} de ${listarPlantillas().length} plantillas la llevan`);
comprobar('se encontró en más de una: la corrección no era de un caso suelto', conTabla.length > 1);

console.log('\n── La primera columna ──');
for (const { plantilla, tabla } of conTabla) {
  comprobar(`${plantilla.subtitulo}: la primera columna es el número`, tabla.columnas[0] === 'N.°');
}
comprobar(
  'no queda ninguna con "Tipo de servicio" ni "Tipo de obra"',
  !conTabla.some((x) => /^Tipo de /.test(x.tabla.columnas[0])),
);
comprobar(
  'la segunda columna sigue siendo la documentación',
  conTabla.every((x) => x.tabla.columnas[1] === 'Documentación'),
);

console.log('\n── La instrucción, como advertencia ──');
const conInstruccion = conTabla.filter((x) =>
  x.tabla.instruccion?.startsWith('Indicar la documentación adicional'),
);
console.log(`   ${conInstruccion.length} la traen redactada así`);
for (const { plantilla, tabla } of conInstruccion) {
  comprobar(`${plantilla.subtitulo}: marcada como advertencia`, tabla.advertencia === true);
}
comprobar(
  'las que no traen esa instrucción no se marcan: su aviso ya es una nota aparte',
  conTabla
    .filter((x) => !x.tabla.instruccion)
    .every((x) => !x.tabla.advertencia),
);

console.log('\n── El documento no cambió por esto ──');
for (const { plantilla, tabla } of conTabla) {
  const doc = ensamblarRequerimiento(
    plantilla,
    {
      ...respuestasVacias(),
      condiciones: { exige_documentacion_contrato: true },
      tablas: { [tabla.id]: [['1', 'Constancia de habilitación vigente']] },
    },
    {},
  );
  comprobar(
    `${plantilla.subtitulo}: la tabla sale con la cabecera nueva`,
    doc.markdown.includes('| N.° | Documentación |') ||
      doc.markdown.includes('N.°') ,
  );
  comprobar(
    `${plantilla.subtitulo}: y con lo que se escribió dentro`,
    doc.markdown.includes('Constancia de habilitación vigente'),
  );
}

console.log(
  fallos === 0
    ? '\n✅ Columna "N.°" y advertencia en rojo, en las ocho plantillas que llevan la tabla.'
    : `\n❌ ${fallos} problema(s).`,
);
process.exit(fallos === 0 ? 0 : 1);
