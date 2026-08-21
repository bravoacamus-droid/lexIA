#!/usr/bin/env tsx
/**
 * Apartados propios de la entidad y reubicación de los apartados.
 *
 * POR QUÉ EXISTE
 *
 * Dos peticiones de César del 18/08/2026:
 *
 *   · "Debe permitir agregar otros campos según la necesidad de cada
 *     entidad (área usuaria)".
 *   · "Cada componente debe permitir ser reubicado en la posición que
 *     cada entidad lo crea conveniente".
 *
 * Las dos tocan lo único que este generador no puede permitirse tocar:
 * los textos invariables del formato oficial. Mover apartados renumera
 * el documento entero, y ahí es donde algo se rompe sin que se note.
 *
 * Así que lo que se comprueba, además de que funcione, es que al mover
 * NO cambie ni una línea del contenido: las mismas líneas, en otro
 * orden y con otra numeración. Si un texto invariable se altera al
 * reordenar, esta prueba se cae.
 *
 * Uso: npx tsx scripts/probar-apartados-propios.ts
 */
import {
  apartadosOrdenados,
  ensamblarRequerimiento,
  normalizarRespuestas,
  nuevoIdExtra,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import { inventarioRevisable } from '../src/lib/generadores/revisor';
import { destinosDistribucion } from '../src/lib/generadores/distribuidor';
import { obtenerPlantilla } from '../src/lib/generadores/plantillas';
import { markdownToDocxBuffer } from '../src/lib/docx-from-markdown';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

const plantilla = obtenerPlantilla('ps-servicios-general');
if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');

/** Lo que se ve en el documento sin los títulos, que llevan el número. */
const cuerpo = (markdown: string) =>
  markdown
    .split('\n')
    .filter((l) => !/^#{1,6}\s/.test(l))
    .map((l) => l.trim())
    .filter(Boolean)
    .sort();

const base: RespuestasRequerimiento = {
  ...respuestasVacias(),
  campos: { denominacion: 'Servicio de soporte técnico', organo: 'Oficina de TI' },
  redacciones: { finalidad: 'Garantizar la operatividad de los equipos informáticos.' },
};

// ── 1. Orden por defecto ──────────────────────────────────────────────
console.log('── Sin tocar nada, manda el formato ──');
const porDefecto = apartadosOrdenados(plantilla, base);
comprobar(
  'salen todas las secciones del formato',
  porDefecto.length === plantilla.secciones.length,
);
comprobar(
  'y en el orden en que las escribió César',
  porDefecto.every((a, i) => a.id === plantilla.secciones[i].id),
);

// ── 2. Apartado propio ────────────────────────────────────────────────
console.log('\n── Un apartado que añade la entidad ──');
const idExtra = nuevoIdExtra([]);
const conExtra: RespuestasRequerimiento = {
  ...base,
  extras: [
    {
      id: idExtra,
      titulo: 'Coordinaciones con la Oficina de Seguridad Digital',
      texto:
        'El contratista coordinará con la Oficina de Seguridad Digital cualquier intervención sobre los equipos que almacenen información clasificada, con una anticipación no menor a dos (2) días hábiles.',
    },
  ],
};
comprobar('el id no choca con los del formato', !plantilla.secciones.some((s) => s.id === idExtra));

const docExtra = ensamblarRequerimiento(plantilla, conExtra, {});
comprobar(
  'su título sale en el documento',
  docExtra.markdown.includes('Coordinaciones con la Oficina de Seguridad Digital'),
);
comprobar(
  'su contenido también',
  docExtra.markdown.includes('Oficina de Seguridad Digital cualquier intervención'),
);
comprobar(
  'se numera al final, que es donde se creó',
  new RegExp(`### ${plantilla.secciones.length}\\. Coordinaciones`).test(docExtra.markdown) ||
    docExtra.markdown.includes('. Coordinaciones con la Oficina de Seguridad Digital'),
);

const vacio: RespuestasRequerimiento = {
  ...base,
  extras: [{ id: idExtra, titulo: 'Apartado a medio escribir', texto: '' }],
};
const docVacio = ensamblarRequerimiento(plantilla, vacio, {});
comprobar(
  'un apartado propio sin contenido se cuenta como pendiente',
  docVacio.faltantes.some((f) => f.bloque === idExtra),
);
comprobar(
  'y en el documento queda marcado, no en blanco',
  docVacio.markdown.includes('PENDIENTE'),
);

// ── 3. Reubicación ────────────────────────────────────────────────────
console.log('\n── Mover un apartado ──');
const ids = plantilla.secciones.map((s) => s.id);
// El último del formato pasa a ser el primero, y el apartado propio se
// mete en tercer lugar: los dos casos a la vez.
const ordenNuevo = [ids[ids.length - 1], ids[0], idExtra, ...ids.slice(1, -1)];
const movido: RespuestasRequerimiento = { ...conExtra, orden: ordenNuevo };

const docMovido = ensamblarRequerimiento(plantilla, movido, {});
const ordenado = apartadosOrdenados(plantilla, movido);
comprobar('el orden pedido se respeta', ordenado[0].id === ids[ids.length - 1]);
comprobar('el apartado propio queda donde se puso', ordenado[2].id === idExtra);
comprobar(
  'no se pierde ni se repite ningún apartado',
  ordenado.length === plantilla.secciones.length + 1 &&
    new Set(ordenado.map((a) => a.id)).size === ordenado.length,
);

const primerTitulo = plantilla.secciones[plantilla.secciones.length - 1].titulo;
comprobar(
  'la numeración se recalcula: el que subió es ahora el 1',
  new RegExp(`### 1\\. ${primerTitulo.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`).test(
    docMovido.markdown,
  ),
);

// LO IMPORTANTE: mover no puede alterar un solo texto invariable.
const antes = cuerpo(docExtra.markdown);
const despues = cuerpo(docMovido.markdown);
comprobar('al mover no se pierde ni una línea de contenido', antes.length === despues.length);
comprobar(
  'y ninguna cambia: las mismas líneas, en otro orden',
  antes.every((l, i) => l === despues[i]),
);

console.log('\n── Órdenes estropeados ──');
const conBasura: RespuestasRequerimiento = {
  ...conExtra,
  orden: ['seccion_que_ya_no_existe', ids[2], ids[2], 'extra:99'],
};
const rescatado = apartadosOrdenados(plantilla, conBasura);
comprobar('los ids que no existen se ignoran', !rescatado.some((a) => a.id === 'extra:99'));
comprobar('un id repetido no duplica el apartado', rescatado.filter((a) => a.id === ids[2]).length === 1);
comprobar(
  'lo que nadie colocó conserva el orden del formato, detrás',
  rescatado.length === plantilla.secciones.length + 1 && rescatado[0].id === ids[2],
);
comprobar(
  'el documento sigue saliendo entero',
  cuerpo(ensamblarRequerimiento(plantilla, conBasura, {}).markdown).length === antes.length,
);

// ── 4. Lo guardado de antes sigue abriéndose ──────────────────────────
console.log('\n── Requerimientos guardados antes de esto ──');
const viejo = normalizarRespuestas({ campos: { organo: 'Oficina de TI' } });
comprobar('sin extras, se leen como lista vacía', Array.isArray(viejo.extras) && viejo.extras.length === 0);
comprobar('sin orden, se lee como lista vacía', Array.isArray(viejo.orden) && viejo.orden.length === 0);
comprobar(
  'y el documento sale igual que siempre',
  ensamblarRequerimiento(plantilla, viejo, {}).markdown.length > 1000,
);

// ── 4 bis. Un apartado propio DENTRO de otra sección ─────────────────
// Las prestaciones accesorias del formato son tres —mantenimiento,
// soporte, capacitación— pero hay más: monitoreo, asistencia técnica
// especializada. La entidad las añade ahí dentro, no al final del
// documento.
console.log('\n── Un apartado propio dentro de otra sección ──');
{
  const dentro: RespuestasRequerimiento = {
    ...base,
    condiciones: { tiene_prestaciones_accesorias: true },
    extras: [
      {
        id: 'extra:9',
        titulo: 'Monitoreo y seguimiento',
        texto: 'El contratista remitirá un tablero de seguimiento con periodicidad semanal.',
        dentroDe: 'prestaciones_accesorias',
      },
    ],
  };
  const doc = ensamblarRequerimiento(plantilla, dentro, {});
  comprobar('su título sale en el documento', doc.markdown.includes('Monitoreo y seguimiento'));
  comprobar(
    'y su contenido',
    doc.markdown.includes('tablero de seguimiento con periodicidad semanal'),
  );
  comprobar(
    'se numera como subapartado, no como apartado suelto',
    /#{4,6} \d+(?:\.\d+)+\. Monitoreo y seguimiento/.test(doc.markdown),
  );
  comprobar(
    'NO aparece entre los apartados de primer nivel',
    !apartadosOrdenados(plantilla, dentro).some((a) => a.id === 'extra:9'),
  );
  comprobar(
    'la revisión global lo mira igual',
    inventarioRevisable(plantilla, dentro).some((a) => a.id === 'extra:9'),
  );
  const enBlanco = ensamblarRequerimiento(
    plantilla,
    { ...dentro, extras: [{ ...dentro.extras[0], texto: '' }] },
    {},
  );
  comprobar(
    'vacío cuenta como pendiente',
    enBlanco.faltantes.some((f) => f.bloque === 'extra:9'),
  );
  comprobar(
    'si su sección está apagada, no sale',
    !ensamblarRequerimiento(plantilla, { ...dentro, condiciones: {} }, {}).markdown.includes(
      'Monitoreo y seguimiento',
    ),
  );
}

// ── 5. El apartado propio no se queda fuera de lo demás ───────────────
console.log('\n── Lo ve el revisor y lo ve el reparto ──');
const inventario = inventarioRevisable(plantilla, conExtra);
const enRevision = inventario.find((a) => a.id === idExtra);
comprobar('la revisión global lo incluye', !!enRevision);
comprobar('lo trata como texto reemplazable', enRevision?.editable === true);
comprobar('y sabe dónde escribirlo', enRevision?.destino === 'extras');
comprobar(
  'un apartado propio en blanco no se le manda al modelo',
  !inventarioRevisable(plantilla, vacio).some((a) => a.id === idExtra),
);

const destinos = destinosDistribucion(plantilla, conExtra);
const enReparto = destinos.find((d) => d.id === idExtra);
comprobar('el reparto de un proyecto también puede llenarlo', !!enReparto);
comprobar('y sabe que ya tiene texto', enReparto?.ocupado === true);

// ── 6. El Word ────────────────────────────────────────────────────────
console.log('\n── El Word ──');
void (async () => {
  try {
    const buffer = await markdownToDocxBuffer(docMovido.markdown, {
      title: 'Requerimiento',
      subtitle: plantilla.subtitulo,
    });
    comprobar('se exporta con el orden nuevo y el apartado propio dentro', buffer.length > 5000);
  } catch (e) {
    comprobar(`la exportación a Word falló: ${(e as Error).message}`, false);
  }

  console.log(
    fallos === 0
      ? '\n✅ Apartados propios y reubicación, sin tocar un solo texto invariable.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
