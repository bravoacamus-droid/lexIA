#!/usr/bin/env tsx
/**
 * El índice del documento dice lo mismo que el Word.
 *
 * POR QUÉ EXISTE
 *
 * César pidió (18/08/2026) que el panel derecho marque con X roja lo que
 * falta y con palomita verde lo completado, que lleve al apartado al
 * pulsarlo y que se desplace por su cuenta.
 *
 * Lo delicado no es pintar iconos: es que ahora hay DOS sitios que
 * deciden si un apartado está completo —el índice, en el navegador y a
 * cada tecla, y el ensamblador, en el servidor y al exportar—. Si se
 * separan, el usuario ve todo en verde y el Word sale con huecos, que es
 * peor que no tener índice.
 *
 * Así que esta prueba compara las dos listas apartado por apartado en
 * las quince plantillas y en varios estados de llenado. Si alguien
 * cambia una regla en un sitio y no en el otro, esto se cae.
 *
 * Uso: npx tsx scripts/probar-indice.ts
 */
import {
  OPCION_PROPIA,
  campoOpcionPropia,
  ensamblarRequerimiento,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import {
  anclaApartado,
  anclaBloque,
  construirIndice,
  resumenIndice,
} from '../src/lib/generadores/indice';
import { listarPlantillas, obtenerPlantilla } from '../src/lib/generadores/plantillas';
import type { Bloque, PlantillaRequerimiento, Seccion } from '../src/lib/generadores/plantilla-tipos';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

/** Enciende todas las condiciones: así se recorre el formato entero. */
function todasLasCondiciones(secciones: Seccion[], acc: Record<string, boolean> = {}) {
  for (const s of secciones) {
    if (s.condicion) acc[s.condicion] = true;
    if (s.subsecciones) todasLasCondiciones(s.subsecciones, acc);
  }
  return acc;
}

/** Rellena todo lo que se puede rellenar, para el caso "documento hecho". */
function rellenarTodo(p: PlantillaRequerimiento, r: RespuestasRequerimiento) {
  const bloques = (bs: Bloque[]) => {
    for (const b of bs) {
      if (b.clase === 'campo') r.campos[b.id] = 'dato';
      else if (b.clase === 'parrafo') for (const c of b.campos) r.campos[c.id] = 'dato';
      else if (b.clase === 'redactado') r.redacciones[b.id] = 'Texto redactado del apartado.';
      else if (b.clase === 'tabla') {
        r.tablas[b.id] = Array.from({ length: Math.max(b.minimo ?? 0, 1) }, (_, i) =>
          b.columnas.map((_c, j) => (j === 0 ? String(i + 1) : 'contenido')),
        );
      } else if (b.clase === 'opcion') r.opciones[b.id] = b.opciones[0].valor;
    }
  };
  const rec = (s: Seccion) => {
    bloques(s.bloques);
    for (const h of s.subsecciones ?? []) rec(h);
  };
  for (const s of p.secciones) rec(s);
  return r;
}

// ── 1. Índice y ensamblador dicen lo mismo, en las quince ─────────────
console.log('── El índice coincide con el documento ──');
for (const plantilla of listarPlantillas()) {
  const condiciones = todasLasCondiciones(plantilla.secciones);

  for (const [caso, respuestas] of [
    ['en blanco', { ...respuestasVacias(), condiciones }] as const,
    [
      'a medio llenar',
      {
        ...respuestasVacias(),
        condiciones,
        campos: { denominacion: 'Contratación de prueba' },
      },
    ] as const,
    [
      'completo',
      rellenarTodo(plantilla, { ...respuestasVacias(), condiciones }),
    ] as const,
  ]) {
    const doc = ensamblarRequerimiento(plantilla, respuestas, {});
    const indice = construirIndice(plantilla, respuestas);

    const pendientesIndice = new Set(
      indice.flatMap((g) => g.entradas.filter((e) => e.estado === 'pendiente').map((e) => e.id)),
    );
    const pendientesDoc = new Set(doc.faltantes.map((f) => f.bloque));

    const soloIndice = [...pendientesIndice].filter((x) => !pendientesDoc.has(x));
    const soloDoc = [...pendientesDoc].filter((x) => !pendientesIndice.has(x));
    const ok = soloIndice.length === 0 && soloDoc.length === 0;
    if (!ok) {
      console.log(`   ❌ ${plantilla.subtitulo} (${caso})`);
      if (soloIndice.length) console.log(`        el índice marca de más: ${soloIndice.join(', ')}`);
      if (soloDoc.length) console.log(`        el documento marca de más: ${soloDoc.join(', ')}`);
      fallos++;
    }
  }
}
if (fallos === 0) {
  console.log('   ✅ las quince plantillas, en blanco, a medias y completas');
}

// ── 2. Los estados ────────────────────────────────────────────────────
console.log('\n── Verde, roja y gris ──');
const plantilla = obtenerPlantilla('ps-servicios-general');
if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');
const condiciones = todasLasCondiciones(plantilla.secciones);

const enBlanco = construirIndice(plantilla, { ...respuestasVacias(), condiciones });
const entradas = enBlanco.flatMap((g) => g.entradas);
comprobar('un apartado obligatorio vacío sale como pendiente', entradas.some((e) => e.estado === 'pendiente'));
// Los apartados opcionales están repartidos por las plantillas; se busca
// en todas para no depender de que esta en concreto tenga alguno.
const hayOpcionales = listarPlantillas().some((p) =>
  construirIndice(p, { ...respuestasVacias(), condiciones: todasLasCondiciones(p.secciones) })
    .flatMap((g) => g.entradas)
    .some((e) => e.estado === 'opcional'),
);
comprobar('un apartado opcional vacío NO se marca en rojo: no falta, es que no aplica', hayOpcionales);
comprobar('nada aparece completo si no se ha escrito nada', !entradas.some((e) => e.estado === 'completo'));

const conAlgo = construirIndice(plantilla, {
  ...respuestasVacias(),
  condiciones,
  campos: { denominacion: 'Servicio de vigilancia' },
});
comprobar(
  'al escribir un dato, ese apartado pasa a completo',
  conAlgo.flatMap((g) => g.entradas).find((e) => e.id === 'denominacion')?.estado === 'completo',
);

// La alternativa propia de una opción: elegida sin escribir sigue en rojo.
const opcionSinTexto = construirIndice(plantilla, {
  ...respuestasVacias(),
  condiciones,
  opciones: { forma_contratacion: OPCION_PROPIA },
});
comprobar(
  'elegir "redactar la nuestra" y dejarla vacía sigue en rojo',
  opcionSinTexto
    .flatMap((g) => g.entradas)
    .find((e) => e.id === 'forma_contratacion')?.estado === 'pendiente',
);
const opcionConTexto = construirIndice(plantilla, {
  ...respuestasVacias(),
  condiciones,
  opciones: { forma_contratacion: OPCION_PROPIA },
  campos: { [campoOpcionPropia('forma_contratacion')]: 'La contratación comprende dos ítems.' },
});
comprobar(
  'y al escribirla pasa a verde',
  opcionConTexto
    .flatMap((g) => g.entradas)
    .find((e) => e.id === 'forma_contratacion')?.estado === 'completo',
);

// Una fila en blanco no completa una tabla.
const filaVacia = construirIndice(plantilla, {
  ...respuestasVacias(),
  condiciones,
  tablas: { items: [['', '']] },
});
comprobar(
  'agregar una fila y dejarla en blanco no completa la tabla',
  filaVacia.flatMap((g) => g.entradas).find((e) => e.id === 'items')?.estado === 'pendiente',
);
comprobar(
  'y el documento opina lo mismo',
  ensamblarRequerimiento(
    plantilla,
    { ...respuestasVacias(), condiciones, tablas: { items: [['', '']] } },
    {},
  ).faltantes.some((f) => f.bloque === 'items'),
);

// ── 3. Solo entra lo que va en el documento ───────────────────────────
console.log('\n── Lo apagado no ocupa sitio en el índice ──');
const sinCondiciones = construirIndice(plantilla, respuestasVacias());
comprobar(
  'una sección "de corresponder" apagada no aparece',
  !sinCondiciones.some((g) => g.titulo.includes('Visita al lugar')),
);
comprobar(
  'y encendida sí',
  construirIndice(plantilla, { ...respuestasVacias(), condiciones }).some((g) =>
    g.titulo.includes('Visita al lugar'),
  ),
);

const conExtra = construirIndice(plantilla, {
  ...respuestasVacias(),
  condiciones,
  extras: [{ id: 'extra:1', titulo: 'Coordinaciones internas', texto: '' }],
});
comprobar(
  'un apartado propio de la entidad también está en el índice',
  conExtra.some((g) => g.titulo === 'Coordinaciones internas'),
);
comprobar(
  'y vacío sale en rojo',
  conExtra.find((g) => g.id === 'extra:1')?.pendientes === 1,
);

// ── 4. Los enlaces del índice llevan a algún sitio ────────────────────
console.log('\n── Cada entrada apunta a un ancla ──');
const completo = construirIndice(plantilla, { ...respuestasVacias(), condiciones });
comprobar('ninguna entrada se queda sin ancla', completo.every((g) => g.entradas.every((e) => !!e.ancla)));
comprobar('ningún grupo se queda sin ancla', completo.every((g) => !!g.ancla));
comprobar(
  'las anclas de apartado y de bloque no se pisan',
  anclaApartado('x') !== anclaBloque('x'),
);
const anclas = completo.flatMap((g) => g.entradas.map((e) => e.ancla));
comprobar(
  'un párrafo con huecos se ancla por su primer hueco, no queda suelto',
  anclas.every((a) => a.startsWith('bloque-')),
);
// El índice tiene que poder desplegar el apartado antes de saltar: si
// no sabe a cuál pertenece cada entrada, el enlace lleva a algo plegado
// y no se ve nada.
const raices = new Set(completo.filter((g) => g.nivel === 1).map((g) => g.id));
comprobar(
  'cada grupo sabe de qué apartado de primer nivel cuelga',
  completo.every((g) => raices.has(g.raiz)),
);
comprobar(
  'una subsección apunta al apartado que la contiene, no a sí misma',
  completo.some((g) => g.nivel > 1 && g.raiz !== g.id),
);

// ── 5. El resumen ─────────────────────────────────────────────────────
console.log('\n── Las cuentas de la cabecera ──');
const res = resumenIndice(completo);
comprobar('suma todas las entradas', res.total === completo.flatMap((g) => g.entradas).length);
comprobar(
  'y separa completas, pendientes y opcionales',
  res.completas + res.pendientes + res.opcionales === res.total,
);

console.log(
  fallos === 0
    ? '\n✅ El índice dice exactamente lo mismo que el documento.'
    : `\n❌ ${fallos} problema(s).`,
);
process.exit(fallos === 0 ? 0 : 1);
