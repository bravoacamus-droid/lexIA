#!/usr/bin/env tsx
/**
 * Alternativas de una opción y advertencias del formato.
 *
 * POR QUÉ EXISTE
 *
 * César, sobre la forma de contratación (18/08/2026):
 *
 *   · "Las opciones deben dejar agregar (al solo seleccionar se siente
 *     que no se ha elegido la opción requerida)". Además de que se note
 *     al elegir —eso es pantalla—, ninguna de las tres alternativas
 *     tiene por qué encajar en toda entidad: ahora se puede redactar la
 *     propia y esa es la que va al documento.
 *   · "La advertencia amarilla debe estar en rojo", y la de la Ficha de
 *     Homologación "debe ser reubicada debajo del recuadro de los
 *     servicios requeridos y encima de la forma de contratación".
 *
 * Lo que hay que comprobar aquí es que la alternativa propia llega al
 * documento como cualquier otra, que sin escribirla cuenta como
 * pendiente, y que la nota se movió en las TRES plantillas que la
 * llevan —no solo en la que él estaba mirando— sin que ninguna
 * plantilla pierda un solo bloque.
 *
 * Uso: npx tsx scripts/probar-opciones-y-notas.ts
 */
import {
  OPCION_PROPIA,
  campoOpcionPropia,
  ensamblarRequerimiento,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import { inventarioRevisable } from '../src/lib/generadores/revisor';
import { listarPlantillas, obtenerPlantilla } from '../src/lib/generadores/plantillas';
import type { Seccion } from '../src/lib/generadores/plantilla-tipos';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

const plantilla = obtenerPlantilla('ps-servicios-general');
if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');

const ID = 'forma_contratacion';
const base: RespuestasRequerimiento = {
  ...respuestasVacias(),
  campos: { denominacion: 'Servicio de procesamiento de efectivo' },
  tablas: { items: [['1', 'Servicio de procesamiento de efectivo y monedas']] },
};

// ── 1. Elegir una de las del formato sigue igual ──────────────────────
console.log('── Las alternativas del formato ──');
const delFormato = ensamblarRequerimiento(
  plantilla,
  { ...base, opciones: { [ID]: 'item_unico' } },
  {},
);
comprobar(
  'la alternativa elegida sale literal',
  delFormato.markdown.includes('La contratación comprende un único ítem'),
);
comprobar(
  'y solo esa: las otras dos no aparecen',
  !delFormato.markdown.includes('por ítems independientes') &&
    !delFormato.markdown.includes('por paquete único'),
);
comprobar(
  'ya no figura entre los pendientes',
  !delFormato.faltantes.some((f) => f.bloque === ID),
);

// ── 2. La alternativa que redacta la entidad ──────────────────────────
console.log('\n── La alternativa propia ──');
const PROPIA =
  'La contratación comprende dos ítems independientes: el procesamiento de efectivo y el traslado de valores, pudiendo los proveedores presentar oferta por uno o por ambos.';
const conPropia = ensamblarRequerimiento(
  plantilla,
  {
    ...base,
    opciones: { [ID]: OPCION_PROPIA },
    campos: { ...base.campos, [campoOpcionPropia(ID)]: PROPIA },
  },
  {},
);
comprobar('va al documento como cualquier otra', conPropia.markdown.includes(PROPIA));
comprobar(
  'y desplaza a las del formato',
  !conPropia.markdown.includes('La contratación comprende un único ítem'),
);
comprobar('no queda como pendiente', !conPropia.faltantes.some((f) => f.bloque === ID));

const sinEscribir = ensamblarRequerimiento(
  plantilla,
  { ...base, opciones: { [ID]: OPCION_PROPIA } },
  {},
);
comprobar(
  'elegir "la nuestra" y no escribirla cuenta como pendiente',
  sinEscribir.faltantes.some((f) => f.bloque === ID),
);
comprobar('y en el documento sale marcado', sinEscribir.markdown.includes('PENDIENTE'));

const sinElegir = ensamblarRequerimiento(plantilla, base, {});
comprobar(
  'sin elegir nada sigue siendo un pendiente',
  sinElegir.faltantes.some((f) => f.bloque === ID),
);
comprobar(
  'la clave de la alternativa propia no puede chocar con un campo del formato',
  !listarPlantillas().some((p) => {
    const busca = (ss: Seccion[]): boolean =>
      ss.some(
        (s) =>
          s.bloques.some((b) => 'id' in b && typeof b.id === 'string' && b.id.includes('__')) ||
          busca(s.subsecciones ?? []),
      );
    return busca(p.secciones);
  }),
);

console.log('\n── La revisión global la mira ──');
const inventario = inventarioRevisable(plantilla, {
  ...base,
  opciones: { [ID]: OPCION_PROPIA },
  campos: { ...base.campos, [campoOpcionPropia(ID)]: PROPIA },
});
comprobar(
  'la alternativa propia entra en la revisión',
  inventario.some((a) => a.id === campoOpcionPropia(ID)),
);
comprobar(
  'las del formato no: son invariables y no hay nada que revisar',
  !inventarioRevisable(plantilla, { ...base, opciones: { [ID]: 'item_unico' } }).some((a) =>
    a.id.startsWith(ID),
  ),
);

// ── 3. La advertencia, encima de la forma de contratación ─────────────
console.log('\n── Dónde queda la advertencia de la Ficha de Homologación ──');
const conNota = listarPlantillas().filter((p) => {
  const busca = (ss: Seccion[]): boolean =>
    ss.some(
      (s) =>
        s.bloques.some((b) => b.clase === 'nota' && b.texto.includes('Ficha de Homologación')) ||
        busca(s.subsecciones ?? []),
    );
  return busca(p.secciones);
});
console.log(`   la llevan ${conNota.length} plantillas`);
comprobar('se movió en todas, no solo en la que él miraba', conNota.length === 3);

for (const p of conNota) {
  const busca = (ss: Seccion[]): Seccion | null => {
    for (const s of ss) {
      if (s.bloques.some((b) => b.clase === 'nota' && b.texto.includes('Ficha de Homologación'))) {
        return s;
      }
      const h = busca(s.subsecciones ?? []);
      if (h) return h;
    }
    return null;
  };
  const s = busca(p.secciones);
  if (!s) continue;
  const iTabla = s.bloques.findIndex((b) => b.clase === 'tabla');
  const iNota = s.bloques.findIndex(
    (b) => b.clase === 'nota' && b.texto.includes('Ficha de Homologación'),
  );
  const iOpcion = s.bloques.findIndex((b) => b.clase === 'opcion');
  comprobar(
    `${p.subtitulo}: debajo de la tabla y encima de la forma de contratación`,
    iTabla >= 0 && iNota > iTabla && iOpcion > iNota,
  );
}

// ── 4. Ninguna plantilla perdió nada al mover el bloque ───────────────
console.log('\n── Nada se perdió al mover ──');
for (const p of conNota) {
  const doc = ensamblarRequerimiento(
    p,
    { ...respuestasVacias(), campos: { denominacion: 'X' } },
    {},
  );
  comprobar(
    `${p.subtitulo}: la advertencia sigue saliendo en el documento`,
    doc.markdown.includes('Ficha de Homologación'),
  );
}

console.log(
  fallos === 0
    ? '\n✅ Alternativa propia en el documento y advertencia en su sitio.'
    : `\n❌ ${fallos} problema(s).`,
);
process.exit(fallos === 0 ? 0 : 1);
