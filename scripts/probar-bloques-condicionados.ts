#!/usr/bin/env tsx
/**
 * Bloques que dependen de la opción elegida.
 *
 * POR QUÉ EXISTE
 *
 * César, sobre la subcontratación (19/08/2026): "al seleccionar que sí
 * va a haber subcontratación, debe habilitarse una opción para que el
 * área usuaria pueda establecer las partidas y/o condiciones que NO
 * pueden ser subcontratadas". Y su .docx dice lo mismo: la alternativa
 * que permite subcontratar continúa con "Se consideran prestaciones
 * esenciales que no pueden ser materia de subcontratación las
 * siguientes: […]".
 *
 * La plantilla solo sabía condicionar secciones enteras con un
 * interruptor, así que se añadió `visibleSi`. Lo delicado no es que
 * aparezca en pantalla: es que CUATRO piezas distintas deciden qué
 * existe —el documento, el índice, la revisión global y el reparto de
 * proyectos— y las cuatro tienen que decir lo mismo. Si el índice cuenta
 * como pendiente algo que el documento no incluye, el usuario persigue
 * un apartado que no existe.
 *
 * Uso: npx tsx scripts/probar-bloques-condicionados.ts
 */
import {
  ensamblarRequerimiento,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import { construirIndice } from '../src/lib/generadores/indice';
import { inventarioRevisable } from '../src/lib/generadores/revisor';
import { destinosDistribucion } from '../src/lib/generadores/distribuidor';
import { listarPlantillas, obtenerPlantilla } from '../src/lib/generadores/plantillas';
import type { Bloque, Seccion } from '../src/lib/generadores/plantilla-tipos';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

const ID = 'prestaciones_no_subcontratables';
const TEXTO = 'La supervisión del servicio y la custodia de los valores.';

// ── 1. Está donde tiene que estar ─────────────────────────────────────
console.log('── Dónde está el apartado condicionado ──');
const conSubcontratacion = listarPlantillas().filter((p) => {
  const busca = (ss: Seccion[]): boolean =>
    ss.some(
      (s) =>
        s.bloques.some((b) => b.clase === 'opcion' && b.id === 'subcontratacion') ||
        busca(s.subsecciones ?? []),
    );
  return busca(p.secciones);
});
console.log(`   ${conSubcontratacion.length} plantillas permiten o prohíben subcontratar`);

for (const p of conSubcontratacion) {
  const busca = (ss: Seccion[]): Bloque | null => {
    for (const s of ss) {
      const b = s.bloques.find((x) => 'id' in x && x.id === ID);
      if (b) return b;
      const h = busca(s.subsecciones ?? []);
      if (h) return h;
    }
    return null;
  };
  const bloque = busca(p.secciones);
  comprobar(`${p.id}: tiene el apartado de prestaciones no subcontratables`, !!bloque);
  if (bloque && 'visibleSi' in bloque) {
    comprobar(
      `${p.id}: condicionado a que se permita subcontratar`,
      bloque.visibleSi?.opcion === 'subcontratacion' && bloque.visibleSi?.valor === 'permitida',
    );
  }
}

// La alternativa tiene que anunciar la lista, como en el .docx.
for (const p of conSubcontratacion) {
  const busca = (ss: Seccion[]): string[] => {
    const out: string[] = [];
    for (const s of ss) {
      for (const b of s.bloques) {
        if (b.clase === 'opcion' && b.id === 'subcontratacion') {
          out.push(...b.opciones.map((o) => o.texto));
        }
      }
      out.push(...busca(s.subsecciones ?? []));
    }
    return out;
  };
  const textos = busca(p.secciones);
  // Solo donde el formato contempla subcontratar hasta el 40%. En los
  // menores a 8 UIT su .docx únicamente trae la prohibición, así que ahí
  // no hay ninguna frase que anunciar.
  if (!textos.some((t) => t.includes('40%'))) continue;
  comprobar(
    `${p.id}: la alternativa que permite subcontratar anuncia las prestaciones esenciales`,
    textos.some((t) => t.includes('prestaciones esenciales que no pueden ser materia')),
  );
}

// ── 2. Las cuatro piezas dicen lo mismo ───────────────────────────────
const plantilla = obtenerPlantilla('ps-servicios-general');
if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');

const base: RespuestasRequerimiento = {
  ...respuestasVacias(),
  campos: { denominacion: 'Servicio de procesamiento de efectivo' },
};

const estados = [
  { nombre: 'sin elegir nada', opciones: {} as Record<string, string>, visible: false },
  { nombre: 'con la subcontratación prohibida', opciones: { subcontratacion: 'prohibida' }, visible: false },
  { nombre: 'con la subcontratación permitida', opciones: { subcontratacion: 'permitida' }, visible: true },
];

for (const estado of estados) {
  console.log(`\n── ${estado.nombre} ──`);
  const r: RespuestasRequerimiento = {
    ...base,
    opciones: estado.opciones,
    redacciones: { [ID]: TEXTO },
  };

  const doc = ensamblarRequerimiento(plantilla, r, {});
  comprobar(
    estado.visible ? 'el texto sale en el documento' : 'el texto NO sale en el documento',
    doc.markdown.includes(TEXTO) === estado.visible,
  );

  const vacio = ensamblarRequerimiento(plantilla, { ...base, opciones: estado.opciones }, {});
  comprobar(
    estado.visible
      ? 'sin rellenarlo, cuenta como pendiente'
      : 'sin rellenarlo, NO cuenta como pendiente',
    vacio.faltantes.some((f) => f.bloque === ID) === estado.visible,
  );

  const indice = construirIndice(plantilla, { ...base, opciones: estado.opciones });
  comprobar(
    'el índice dice lo mismo que el documento',
    indice.flatMap((g) => g.entradas).some((e) => e.id === ID) === estado.visible,
  );

  const revision = inventarioRevisable(plantilla, r);
  comprobar(
    'la revisión global lo mira solo si existe',
    revision.some((a) => a.id === ID) === estado.visible,
  );

  const destinos = destinosDistribucion(plantilla, r);
  comprobar(
    'el reparto de un proyecto solo lo ofrece si existe',
    destinos.some((d) => d.id === ID) === estado.visible,
  );
}

// ── 3. Lo demás no se ha movido ───────────────────────────────────────
console.log('\n── Lo que no depende de ninguna opción sigue igual ──');
const conPermitida = ensamblarRequerimiento(
  plantilla,
  { ...base, opciones: { subcontratacion: 'permitida' } },
  {},
);
const conProhibida = ensamblarRequerimiento(
  plantilla,
  { ...base, opciones: { subcontratacion: 'prohibida' } },
  {},
);
comprobar(
  'la alternativa elegida es la que sale, en los dos casos',
  conPermitida.markdown.includes('puede subcontratar hasta un máximo del 40%') &&
    conProhibida.markdown.includes('Se encuentra prohibida la subcontratación'),
);
comprobar(
  'el resto del documento no cambia de tamaño por esto',
  Math.abs(conPermitida.markdown.length - conProhibida.markdown.length) < 400,
);

// ── 4. La lista se guarda como el documento la espera ─────────────────
console.log('\n── Un apartado de lista, escrito por viñetas ──');
const tres = ['Custodia de valores.', 'Supervisión del servicio.', 'Traslado de efectivo.'];
const docLista = ensamblarRequerimiento(
  plantilla,
  {
    ...base,
    opciones: { subcontratacion: 'permitida' },
    redacciones: { [ID]: tres.join('\n') },
  },
  {},
);
for (const t of tres) {
  comprobar(`"${t}" llega al documento`, docLista.markdown.includes(t));
}
comprobar(
  'y sale como lista, con su viñeta',
  tres.every((t) => docLista.markdown.includes(`- ${t}`)),
);

console.log(
  fallos === 0
    ? '\n✅ El apartado aparece solo si se permite subcontratar, y las cuatro piezas coinciden.'
    : `\n❌ ${fallos} problema(s).`,
);
process.exit(fallos === 0 ? 0 : 1);
