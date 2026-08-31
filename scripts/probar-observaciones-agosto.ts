#!/usr/bin/env tsx
/**
 * Las observaciones de César de agosto, comprobadas una a una.
 *
 * POR QUÉ EXISTE
 *
 * El 31/08/2026 entregó "4. OBSERVACIONES A LEXIA CONTRATACIONES —
 * AGOSTO": nueve hojas sobre el generador de requerimientos, con
 * capturas señalando qué cambiar, divididas en dos bloques —bienes y
 * servicios— con muchas observaciones comunes a los dos.
 *
 * Este guion las va fijando conforme se resuelven, para que una no se
 * lleve por delante a otra. Cada comprobación dice de qué observación
 * viene.
 *
 * Uso: npx tsx scripts/probar-observaciones-agosto.ts
 */
import JSZip from 'jszip';
import { listarPlantillas, obtenerPlantilla } from '../src/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  hijasOrdenadas,
  normalizarRespuestas,
  respuestasVacias,
} from '../src/lib/generadores/ensamblador';
import { markdownToDocxBuffer } from '../src/lib/docx-from-markdown';
import { condicionesPorApartado } from '../src/lib/generadores/indice';
import { destinosDistribucion } from '../src/lib/generadores/distribuidor';
import type { Bloque, Seccion } from '../src/lib/generadores/plantilla-tipos';

let fallos = 0;
const comprobar = (que: string, ok: boolean, detalle?: string) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

/** Recorre todas las secciones de una plantilla, incluidas las hijas. */
function todasLasSecciones(secciones: Seccion[]): Seccion[] {
  return secciones.flatMap((s) => [s, ...todasLasSecciones(s.subsecciones ?? [])]);
}

function todosLosBloques(secciones: Seccion[]): Bloque[] {
  return todasLasSecciones(secciones).flatMap((s) => s.bloques);
}

// ── Observación 4: el tipo de letra y el tamaño, como los modelos ─────
async function tipografia() {
  console.log('\n── Obs. 4: "el tipo de letra, tamaño… debe ser como los modelos" ──');
  // Medido en los Word de César: Arial, cuerpo a 10 puntos (sz 20),
  // secundarios a 9 (18) y notas a 8 (16). Nada por encima de 12.
  const plantilla = obtenerPlantilla('uit-tdr')!;
  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de prueba');
  r.campos.finalidad = 'Garantizar la continuidad del servicio institucional.';
  const doc = ensamblarRequerimiento(plantilla, r, { cuantia: 20_000 });
  const buffer = await markdownToDocxBuffer(doc.markdown, {
    title: 'TÉRMINOS DE REFERENCIA',
    subtitle: plantilla.subtitulo,
  });

  const zip = await JSZip.loadAsync(buffer);
  const estilos = await zip.file('word/styles.xml')!.async('string');
  const cuerpo = await zip.file('word/document.xml')!.async('string');

  const porDefecto = /<w:docDefaults>[\s\S]*?<\/w:docDefaults>/.exec(estilos)?.[0] ?? '';
  comprobar(
    'la fuente por defecto del documento es Arial',
    /w:ascii="Arial"/.test(porDefecto),
    /w:ascii="([^"]+)"/.exec(porDefecto)?.[1],
  );
  comprobar(
    'y el cuerpo va a 10 puntos',
    /<w:sz w:val="20"/.test(porDefecto),
    /<w:sz w:val="(\d+)"/.exec(porDefecto)?.[1],
  );

  const fuentes = [...new Set([...cuerpo.matchAll(/w:ascii="([^"]+)"/g)].map((m) => m[1]))];
  comprobar(
    'ningún trozo del documento se sale de esa fuente',
    fuentes.every((f) => f === 'Arial'),
    fuentes.join(', '),
  );

  const tamanos = [...new Set([...cuerpo.matchAll(/<w:sz w:val="(\d+)"/g)].map((m) => Number(m[1])))];
  comprobar(
    `ningún texto pasa de 12 puntos (${tamanos.sort((a, b) => a - b).join(', ')})`,
    tamanos.every((t) => t <= 24),
  );

  // El azul de LexIA no pinta nada en un documento que firma la entidad.
  const colores = [...new Set([...cuerpo.matchAll(/<w:color w:val="([^"]+)"/g)].map((m) => m[1]))];
  comprobar(
    'los títulos van en negro, no en el color de la marca',
    !colores.some((c) => /^(4338CA|021D40|2E74B5|0563C1)$/i.test(c)),
    colores.join(', '),
  );
}

// ── Observación 5: el proyecto se reparte también a los cuadros ───────
function repartoACuadros() {
  console.log('\n── Obs. 5: "LexIA no reparte el contenido: al cuadro de otras penalidades…" ──');
  let sinCuadros = 0;
  let conColumnas = 0;
  for (const p of listarPlantillas()) {
    const r = normalizarRespuestas(respuestasVacias(), 'x');
    const destinos = destinosDistribucion(p, r);
    const tablas = todosLosBloques(p.secciones).filter((b) => b.clase === 'tabla');
    const ofrecidas = destinos.filter((d) => d.destino === 'tablas');
    if (tablas.length > 0 && ofrecidas.length === 0) sinCuadros++;
    conColumnas += ofrecidas.filter((d) => (d.columnas?.length ?? 0) > 0).length;
  }
  comprobar('todas las plantillas ofrecen sus cuadros al reparto', sinCuadros === 0, `${sinCuadros} sin ofrecer`);
  comprobar(`y cada cuadro va con sus columnas (${conColumnas} en total)`, conColumnas > 50);

  // Lo que sigue intocable: el texto que manda el formato.
  const plantilla = obtenerPlantilla('ps-servicios-general') ?? listarPlantillas()[0];
  const destinos = destinosDistribucion(plantilla, normalizarRespuestas(respuestasVacias(), 'x'));
  const clases = new Map(
    todosLosBloques(plantilla.secciones)
      .filter((b) => 'id' in b && typeof b.id === 'string')
      .map((b) => [(b as { id: string }).id, b.clase]),
  );
  const intocados = destinos.filter((d) => ['fijo', 'opcion', 'nota', 'titulo'].includes(clases.get(d.id) ?? ''));
  comprobar(
    'y el texto invariable y las opciones siguen fuera del reparto',
    intocados.length === 0,
    intocados.map((d) => d.id).join(', '),
  );
}

// ── Observación 6: cada interruptor, al lado de su apartado ───────────
function interruptores() {
  console.log('\n── Obs. 6: "el botón de activación… al costado de cada condición" ──');
  // La pantalla ya no tiene el panel de arriba: cada apartado "de
  // corresponder" lleva el suyo. Lo que hay que garantizar es lo de
  // siempre: que no quede ninguna condición sin sitio donde encenderse.
  let huerfanas = 0;
  const detalle: string[] = [];
  for (const p of listarPlantillas()) {
    const declaradas = new Set<string>();
    for (const s of todasLasSecciones(p.secciones)) {
      if (s.condicion) declaradas.add(s.condicion);
      for (const b of s.bloques) {
        const c = 'visibleSi' in b ? b.visibleSi?.condicion : undefined;
        if (c) declaradas.add(c);
      }
    }
    const alcanzables = new Set(
      condicionesPorApartado(p.secciones).flatMap((g) => g.condiciones.map((c) => c.id)),
    );
    for (const c of declaradas) {
      if (!alcanzables.has(c)) {
        huerfanas++;
        detalle.push(`${p.id}:${c}`);
      }
    }
  }
  comprobar(
    'ninguna condición se queda sin interruptor en las quince plantillas',
    huerfanas === 0,
    detalle.slice(0, 4).join(', '),
  );

  // Y que cada una tenga un título con el que presentarse: el
  // interruptor vive ahora junto al apartado y su etiqueta es lo único
  // que lo identifica.
  let sinTitulo = 0;
  for (const p of listarPlantillas()) {
    for (const g of condicionesPorApartado(p.secciones)) {
      for (const c of g.condiciones) if (!c.titulo.trim()) sinTitulo++;
    }
  }
  comprobar('y todas tienen un título con el que presentarse', sinTitulo === 0);
}

// ── Observación 18: finalidad, objetivo y antecedentes, numerados ─────
function numeralesDeCabecera() {
  console.log('\n── Obs. 18: "cada uno debe tener una numeración (2, 3 y 4 respectivamente)" ──');
  for (const id of ['uit-tdr', 'uit-eett', 'uit-locadores']) {
    const p = obtenerPlantilla(id)!;
    const titulos = p.secciones.map((s) => s.titulo);
    comprobar(
      `${id}: la finalidad pública es el numeral 2`,
      titulos[1] === 'FINALIDAD PÚBLICA',
      titulos[1],
    );
    comprobar(
      `${id}: el objetivo es el 3`,
      titulos[2] === 'OBJETIVO DE LA CONTRATACIÓN',
      titulos[2],
    );
    comprobar(
      `${id}: los antecedentes son el 4`,
      titulos[3]?.startsWith('ANTECEDENTES Y/O JUSTIFICACIÓN'),
      titulos[3],
    );
  }

  // Y que salgan así en el documento, no solo en la estructura.
  const p = obtenerPlantilla('uit-tdr')!;
  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de prueba');
  r.redacciones.finalidad = 'Finalidad de prueba.';
  r.redacciones.objetivo_general = 'Objetivo de prueba.';
  r.redacciones.antecedentes = 'Antecedentes de prueba.';
  const doc = ensamblarRequerimiento(p, r, { cuantia: 20_000 });
  comprobar(
    'y el documento los numera 2, 3 y 4',
    /2\.\s*FINALIDAD PÚBLICA/i.test(doc.markdown) &&
      /3\.\s*OBJETIVO DE LA CONTRATACIÓN/i.test(doc.markdown) &&
      /4\.\s*ANTECEDENTES/i.test(doc.markdown),
  );
  comprobar(
    'y el texto del área usuaria sale bajo cada uno',
    doc.markdown.includes('Antecedentes de prueba.'),
  );
}

// ── Observación 8 y 20: los campos del formato, con su ejemplo ────────
function camposDelFormato() {
  console.log('\n── Obs. 8 y 20: campos que faltaban, con el ejemplo completo ──');
  for (const [id, quePide] of [
    ['uit-tdr', ['finalidad', 'objetivo_general', 'antecedentes']],
    ['uit-eett', ['finalidad', 'objetivo_general', 'antecedentes']],
  ] as const) {
    const p = obtenerPlantilla(id)!;
    const bloques = todosLosBloques(p.secciones);
    for (const q of quePide) {
      const b = bloques.find((x) => 'id' in x && x.id === q) as { ejemplo?: string } | undefined;
      comprobar(`${id}: existe "${q}"`, !!b);
      // El ejemplo, completo: media frase no se entiende, que era la
      // queja. Los del formato pasan de cien caracteres.
      comprobar(
        `${id}: y trae el ejemplo del formato, entero`,
        (b?.ejemplo?.length ?? 0) > 100,
        `${b?.ejemplo?.length ?? 0} caracteres`,
      );
    }
  }
}

// ── Observación 19: subir y bajar en todos los numerales ─────────────
function ordenDeSubnumerales() {
  console.log("\n── Obs. 19: \"subir y bajar… para todos los numerales\" ──");
  const p = obtenerPlantilla('uit-tdr')!;
  const madre = p.secciones.find((s) => (s.subsecciones?.length ?? 0) >= 4)!;
  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de prueba');

  const original = hijasOrdenadas(madre, r).map((h) => h.id);
  comprobar('sin tocar nada, manda el orden del formato', original.join() === (madre.subsecciones ?? []).map((h) => h.id).join());

  // Lo que hace la flecha: intercambiar con la anterior.
  r.ordenHijas[madre.id] = [original[1], original[0], ...original.slice(2)];
  const movido = hijasOrdenadas(madre, r).map((h) => h.id);
  comprobar('al mover, cambia el orden', movido[0] === original[1] && movido[1] === original[0]);

  const doc = ensamblarRequerimiento(p, r, { cuantia: 20_000 });
  const numerales = [...doc.markdown.matchAll(/^#### (\d+\.\d+)\. (.+)$/gm)].map((m) => m[2]);
  comprobar(
    'y el documento sale con el orden nuevo',
    numerales[0]?.startsWith('Actividades'),
    numerales.slice(0, 2).join(' | '),
  );

  // Un orden guardado que ya no cuadre con la plantilla no puede
  // perder apartados: es una preferencia, no una fuente de verdad.
  r.ordenHijas[madre.id] = ['ya_no_existe', original[2]];
  const conBasura = hijasOrdenadas(madre, r).map((h) => h.id);
  comprobar(
    'un orden viejo no pierde ningún numeral',
    conBasura.length === original.length && original.every((id) => conBasura.includes(id)),
  );
}

// ── Observación 21: un cuadro por bien, con su título ────────────────
function cuadrosPorBien() {
  console.log("\n── Obs. 21: \"cuadros independientes… con un título\" ──");
  const p = obtenerPlantilla('uit-eett')!;
  const tabla = todosLosBloques(p.secciones).find(
    (b) => 'id' in b && b.id === 'caracteristicas_por_item',
  ) as { repetible?: { etiquetaTitulo: string } } | undefined;
  comprobar('el cuadro de características admite repetirse', !!tabla?.repetible);

  const r = normalizarRespuestas(respuestasVacias(), 'Adquisición de mobiliario');
  r.tablas.caracteristicas_por_item = [['01', 'Material', 'Melamina de 18 mm']];
  r.gruposTabla.caracteristicas_por_item = [
    { titulo: 'Bien N.° 02: Silla ergonómica', filas: [['01', 'Respaldo', 'Malla transpirable']] },
    { titulo: 'Bien N.° 03: Archivador', filas: [['01', 'Cuerpo', 'Metálico']] },
  ];
  const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
  comprobar('cada cuadro sale con su título', doc.markdown.includes('**Bien N.° 02: Silla ergonómica**'));
  comprobar('y con sus filas', doc.markdown.includes('Malla transpirable') && doc.markdown.includes('Metálico'));
  comprobar('sin perder el primero', doc.markdown.includes('Melamina de 18 mm'));

  // Un cuadro añadido y dejado en blanco no ensucia el documento.
  r.gruposTabla.caracteristicas_por_item = [{ titulo: '', filas: [['', '', '']] }];
  const limpio = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
  const cuadros = (limpio.markdown.match(/\| N\.° \| Caracter/g) ?? []).length;
  comprobar('un cuadro vacío no se emite', cuadros === 1, `${cuadros} cuadros`);
}

// ── Observación 24: títulos cambiables y campos que se agrandan ──────
async function opcionesYCampos() {
  console.log("\n── Obs. 24: \"predeterminadas… deben permitir cambiar su texto\" ──");
  const p = obtenerPlantilla('ps-servicios-general')!;
  const accesorias = todasLasSecciones(p.secciones).filter((s) => s.condicion?.startsWith('accesoria_'));
  comprobar(
    `las prestaciones accesorias se pueden renombrar (${accesorias.length})`,
    accesorias.length >= 3 && accesorias.every((s) => s.renombrable === true),
  );

  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de vigilancia');
  r.condiciones.tiene_prestaciones_accesorias = true;
  r.condiciones.accesoria_mantenimiento = true;
  r.redacciones.mantenimiento = 'Monitoreo permanente de las cámaras.';
  r.titulos.mantenimiento = 'Monitoreo y seguimiento';
  const doc = ensamblarRequerimiento(p, r, { cuantia: 500_000 });
  comprobar('el documento sale con el título que puso la entidad', doc.markdown.includes('Monitoreo y seguimiento'));
  comprobar(
    'y no con el del formato',
    !doc.markdown.includes('Mantenimiento preventivo y/o correctivo'),
  );

  // Sin renombrar, manda el formato: el título propio es una opción, no
  // un requisito.
  const r2 = normalizarRespuestas(respuestasVacias(), 'Servicio de vigilancia');
  r2.condiciones.tiene_prestaciones_accesorias = true;
  r2.condiciones.accesoria_mantenimiento = true;
  r2.redacciones.mantenimiento = 'x';
  const doc2 = ensamblarRequerimiento(p, r2, { cuantia: 500_000 });
  comprobar('sin tocarlo, manda el título del formato', doc2.markdown.includes('Mantenimiento preventivo y/o correctivo'));

  // Un numeral del formato oficial NO se renombra: es lo que la norma
  // manda que diga.
  const fijas = todasLasSecciones(p.secciones).filter((x) => !x.condicion?.startsWith('accesoria_'));
  comprobar(
    'los numerales del formato no se pueden renombrar',
    fijas.every((x) => !x.renombrable),
    fijas.filter((x) => x.renombrable).map((x) => x.id).join(', '),
  );

  // Y los campos, que se agrandan desde la esquina.
  const { readFile } = await import('node:fs/promises');
  const base = await readFile('src/components/ui/textarea.tsx', 'utf8');
  comprobar('el campo de texto se puede agrandar desde la esquina', /'resize max-w-full'/.test(base));
  const form = await readFile('src/components/app/requerimiento-plantilla/bloques.tsx', 'utf8');
  comprobar('y ninguno del requerimiento lo tiene desactivado', !form.includes('resize-none'));
}

// ── Observaciones 25, 26 y 28: cuadros del formato y garantía ────────
function hoja4() {
  console.log("\n── Obs. 25 y 28: cuadros que el formato trae y LexIA no tenía ──");
  const p = obtenerPlantilla('uit-eett')!;
  const bloques = todosLosBloques(p.secciones);
  const cuadro = (id: string) =>
    bloques.find((b) => 'id' in b && b.id === id) as
      | { clase: string; columnas?: string[]; complementaria?: boolean }
      | undefined;

  const envase = cuadro('envase_cuadro');
  comprobar('el envase admite el cuadro del formato', envase?.clase === 'tabla');
  comprobar(
    'con sus columnas',
    envase?.columnas?.join(' | ') === 'Aspecto a precisar | Descripción',
    envase?.columnas?.join(' | '),
  );
  comprobar('y el campo de redacción sigue estando', !!cuadro('envase'));

  const sistema = cuadro('sistema_entrega_detalle');
  comprobar('el sistema de entrega admite detallar sus prestaciones', sistema?.clase === 'tabla');
  comprobar(
    'con las columnas del formato',
    sistema?.columnas?.join(' | ') === 'N.° | Prestación | Detalle del servicio',
    sistema?.columnas?.join(' | '),
  );

  // Vacíos no ensucian el documento: acompañan a un texto que ya lo
  // resuelve.
  const r = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
  r.condiciones.requiere_envase = true;
  const vacio = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
  comprobar(
    'un cuadro complementario vacío no deja rastro en el documento',
    !/No aplica: envase|No aplica: detalle/i.test(vacio.markdown),
  );

  r.tablas.envase_cuadro = [['Peso neto del producto', '500 g por envase']];
  r.opciones.sistema_entrega = 'llave_en_mano';
  r.tablas.sistema_entrega_detalle = [['01', 'Instalación', 'Montaje y pruebas preliminares']];
  const lleno = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
  comprobar('y lleno sale con lo escrito', lleno.markdown.includes('500 g por envase'));
  comprobar('lo mismo el del sistema de entrega', lleno.markdown.includes('Montaje y pruebas preliminares'));

  console.log("\n── Obs. 26: la garantía comercial ya viene escrita en el formato ──");
  const sinRedactar = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
  sinRedactar.campos.garantia_periodo = 'doce (12) meses';
  const doc = ensamblarRequerimiento(p, sinRedactar, { cuantia: 30_000 });
  comprobar(
    'el alcance sale sin que nadie lo redacte',
    doc.markdown.includes('comprende contra defectos de diseño y/o fabricación'),
  );
  comprobar(
    'y las condiciones también',
    doc.markdown.includes('línea telefónica fija o móvil') &&
      doc.markdown.includes('dentro de cinco (5) días calendario'),
  );
  comprobar(
    'lo único que se rellena es el período',
    doc.markdown.includes('El período de garantía será de doce (12) meses'),
  );
  comprobar(
    'ya no se pide redactar la garantía entera',
    !bloques.some((b) => 'id' in b && b.id === 'garantia_alcance'),
  );
}

void (async () => {
  await tipografia();
  repartoACuadros();
  interruptores();
  numeralesDeCabecera();
  camposDelFormato();
  ordenDeSubnumerales();
  cuadrosPorBien();
  await opcionesYCampos();
  hoja4();

  console.log(
    fallos === 0
      ? '\n✅ Las observaciones resueltas siguen resueltas.'
      : `\n❌ ${fallos} observación(es) sin cumplir.`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
