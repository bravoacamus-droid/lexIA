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

  // Lo que hace la flecha: intercambiar con la anterior. Se eligen dos
  // que salgan siempre en el documento; una subsección "de
  // corresponder" apagada no aparece y no se puede comparar.
  const visibles = (madre.subsecciones ?? []).filter((h) => !h.condicion).map((h) => h.id);
  const [a, b] = visibles;
  const posA = original.indexOf(a);
  const posB = original.indexOf(b);
  const reordenado = [...original];
  reordenado[posA] = b;
  reordenado[posB] = a;
  r.ordenHijas[madre.id] = reordenado;
  const movido = hijasOrdenadas(madre, r).map((h) => h.id);
  comprobar('al mover, cambia el orden', movido[posA] === b && movido[posB] === a);

  const doc = ensamblarRequerimiento(p, r, { cuantia: 20_000 });
  const numerales = [...doc.markdown.matchAll(/^#### (\d+\.\d+)\. (.+)$/gm)].map((m) => m[2]);
  // Se compara con el título de la subsección que se movió, no con uno
  // escrito a mano: al añadir apartados nuevos al formato, la primera
  // subsección cambia y la prueba se caía sin que nada estuviera mal.
  const titulos = new Map((madre.subsecciones ?? []).map((h) => [h.id, h.titulo]));
  comprobar(
    'y el documento sale con el orden nuevo',
    numerales[0] === titulos.get(b),
    `${numerales[0]} ≠ ${titulos.get(b)}`,
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

// ── Observaciones 29 y 31: plazos por sistema y cierre del entregable ─
function hoja5() {
  console.log("\n── Obs. 29: los cuadros de plazo según el sistema de entrega ──");
  const p = obtenerPlantilla('uit-eett')!;
  const esperado: Record<string, { filas: number; mantenimiento: boolean }> = {
    llave_en_mano: { filas: 3, mantenimiento: false },
    llave_en_mano_mantenimiento: { filas: 4, mantenimiento: true },
    suministro_comodato: { filas: 2, mantenimiento: false },
  };

  for (const [sistema, quePide] of Object.entries(esperado)) {
    const r = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
    r.opciones.sistema_entrega = sistema;
    const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
    const cuadros = [...doc.markdown.matchAll(/\| N\.° \| Prestación \| Plazo \| Inicio del cómputo \|/g)].length;
    const filas = (doc.markdown.match(/\| 0\d \| /g) ?? []).length;
    comprobar(`${sistema}: abre un solo cuadro`, cuadros === 1, `${cuadros}`);
    comprobar(`${sistema}: con sus ${quePide.filas} prestaciones`, filas === quePide.filas, `${filas}`);
    comprobar(
      `${sistema}: ${quePide.mantenimiento ? 'incluye' : 'no incluye'} el mantenimiento`,
      /\| Mantenimiento \|/.test(doc.markdown) === quePide.mantenimiento,
    );
  }

  // Sin sistema elegido no hay cuadro que abrir.
  const sinSistema = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
  sinSistema.opciones.sistema_entrega = 'no_aplica';
  const doc = ensamblarRequerimiento(p, sinSistema, { cuantia: 30_000 });
  comprobar(
    'con "no aplica" no se abre ninguno',
    !/\| Prestación \| Plazo \|/.test(doc.markdown),
  );

  // Y el inicio del cómputo viene escrito del formato: no lo redacta
  // nadie.
  const conSistema = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
  conSistema.opciones.sistema_entrega = 'llave_en_mano';
  const conFilas = ensamblarRequerimiento(p, conSistema, { cuantia: 30_000 });
  comprobar(
    'el inicio del cómputo ya viene escrito',
    conFilas.markdown.includes('A partir del día siguiente de la recepción de los bienes.'),
  );

  console.log("\n── Obs. 31: la condición que faltaba en el entregable ──");
  for (const [id, cierre] of [
    ['uit-eett', 'las EETT'],
    ['uit-tdr', 'los Términos de Referencia'],
  ] as const) {
    const plantilla = obtenerPlantilla(id)!;
    const r = normalizarRespuestas(respuestasVacias(), 'Contratación de prueba');
    r.condiciones.tiene_entregables = true;
    r.tablas.entregables = [['1', 'Informe final', '10 días', 'Detalle']];
    r.campos.entregables_canal = 'mesadepartes@entidad.gob.pe';
    const salida = ensamblarRequerimiento(plantilla, r, { cuantia: 30_000 });
    comprobar(
      `${id}: el entregable cierra con la condición del formato`,
      salida.markdown.includes('Mesa de Partes virtual de la Entidad y/o correo electrónico'),
    );
    comprobar(`${id}: y remite a ${cierre}`, salida.markdown.includes(cierre));
    comprobar(
      `${id}: con el canal que puso la entidad`,
      salida.markdown.includes('mesadepartes@entidad.gob.pe'),
    );
  }
}

// ── Observaciones 33, 34 y 36: penalidades y conformidad ─────────────
function hoja6() {
  console.log("\n── Obs. 33 y 34: los textos que faltaban en las penalidades ──");
  const cierre =
    'Tanto el monto como el plazo se refieren, según corresponda, al monto vigente del contrato';
  for (const id of ['uit-eett', 'uit-tdr', 'uit-locadores']) {
    const p = obtenerPlantilla(id)!;
    const r = normalizarRespuestas(respuestasVacias(), 'Contratación de prueba');
    const doc = ensamblarRequerimiento(p, r, { cuantia: 20_000 });
    comprobar(`${id}: la penalidad por mora cierra como el formato`, doc.markdown.includes(cierre));
  }

  // El encabezado del cuadro de otras penalidades va SOLO donde el
  // formato lo trae: está en el ANEXO 1 y no en el 2 ni en el 3.
  // Añadirlo donde no está sería inventar texto en un documento que se
  // firma, y la auditoría contra los Word lo cazaría.
  const encabezado = 'Adicionalmente a la penalidad por mora, se aplicarán las siguientes penalidades:';
  for (const [id, deberia] of [
    ['uit-eett', true],
    ['uit-tdr', false],
    ['uit-locadores', false],
  ] as const) {
    const p = obtenerPlantilla(id)!;
    const r = normalizarRespuestas(respuestasVacias(), 'Contratación de prueba');
    r.condiciones.tiene_otras_penalidades = true;
    r.tablas.otras_penalidades = [['1', 'Incumple el uniforme', '0.5 UIT', 'Informe del supervisor']];
    const doc = ensamblarRequerimiento(p, r, { cuantia: 20_000 });
    comprobar(
      `${id}: ${deberia ? 'abre' : 'no abre'} el cuadro con la frase del formato`,
      doc.markdown.includes(encabezado) === deberia,
    );
  }

  console.log("\n── Obs. 36: el órgano que da la conformidad ──");
  const p = obtenerPlantilla('uit-tdr')!;
  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de prueba');
  r.campos.area_conformidad = 'Unidad de Tecnologías de la Información';
  r.campos.objeto_conformidad = 'el informe mensual del servicio';
  const doc = ensamblarRequerimiento(p, r, { cuantia: 20_000 });
  comprobar(
    'en servicios ya no se redacta: sale el texto del formato',
    doc.markdown.includes('en calidad de área usuaria, es el competente para emitir la conformidad'),
  );
  comprobar(
    'con el plazo de siete días del formato',
    doc.markdown.includes('plazo máximo de siete (7) días calendario'),
  );
  comprobar('y los dos huecos rellenos', doc.markdown.includes('Unidad de Tecnologías de la Información') && doc.markdown.includes('el informe mensual del servicio'));

  const bienes = obtenerPlantilla('uit-eett')!;
  const bloques = todosLosBloques(bienes.secciones);
  comprobar(
    'en bienes hay ventana para las condiciones de la conformidad',
    bloques.some((b) => 'id' in b && b.id === 'condiciones_conformidad'),
  );
}

// ── Observaciones 30, 38 y 40: lugar, personal clave y acreditación ──
function hoja7() {
  console.log("\n── Obs. 30: el lugar de entrega, según el modelo ──");
  const p = obtenerPlantilla('uit-eett')!;
  const r = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
  r.condiciones.tiene_prestaciones_accesorias = true;
  r.condiciones.exige_personal_clave = true;
  r.condiciones.exige_experiencia = true;
  r.campos.lugar_entrega = 'Av. Los Próceres N.° 1234, San Juan de Miraflores, Lima';
  const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });

  comprobar('se separa en prestación principal', doc.markdown.includes('Prestación principal'));
  comprobar(
    'con el párrafo del formato, no un campo suelto',
    doc.markdown.includes('se entregan en el almacén de la entidad') &&
      doc.markdown.includes('salvo días feriados'),
  );
  comprobar('y con la prestación accesoria', doc.markdown.includes('Prestación accesoria'));

  // El cuadro de varios lugares solo si se llena.
  comprobar(
    'sin varios lugares, no aparece el cuadro de distribución',
    !doc.markdown.includes('| Lugar de entrega | Dirección |'),
  );
  r.tablas.lugares_entrega = [['Almacén Central', 'Av. Los Próceres 1234', 'L-V 8:30-17:30']];
  const conVarios = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
  comprobar('y con ellos, sí', conVarios.markdown.includes('Almacén Central'));

  // Sin prestaciones accesorias, ese apartado no se abre.
  const sinAccesorias = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
  sinAccesorias.campos.lugar_entrega = 'x';
  const doc2 = ensamblarRequerimiento(p, sinAccesorias, { cuantia: 30_000 });
  comprobar(
    'sin prestaciones accesorias no se pregunta por su lugar',
    !doc2.markdown.includes('Prestación accesoria'),
  );

  console.log("\n── Obs. 38 y 40: personal clave y acreditación ──");
  comprobar(
    'la tercera columna del personal clave es la del formato',
    doc.markdown.includes('Profesión y grado o título profesional requerido'),
  );
  comprobar(
    'y el cuadro cierra con su advertencia',
    doc.markdown.includes('no materia de evaluación al momento de la recepción de las cotizaciones'),
  );
  for (const id of ['uit-eett', 'uit-tdr']) {
    const plantilla = obtenerPlantilla(id)!;
    const rr = normalizarRespuestas(respuestasVacias(), 'Contratación de prueba');
    rr.condiciones.exige_experiencia = true;
    const salida = ensamblarRequerimiento(plantilla, rr, { cuantia: 30_000 });
    comprobar(`${id}: la experiencia separa requisitos de acreditación`, salida.markdown.includes('Acreditación:'));
  }
}

// ── Hoja 8 (servicios): pago, sistema de entrega, plazo y lugar ──────
function hoja8() {
  console.log("\n── Hoja 8: los textos de servicios, según el modelo ──");
  const p = obtenerPlantilla('uit-tdr')!;
  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de mantenimiento');
  r.condiciones.tiene_prestaciones_accesorias = true;
  r.opciones.modalidad_pago = 'suma_alzada';
  r.opciones.sistema_entrega = 'diseno_operacion';
  r.campos.plazo_servicio = 'trescientos sesenta y cinco (365)';
  r.campos.lugar_servicio = 'Av. Abancay N.° 491, Cercado de Lima';
  const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });

  comprobar(
    'la modalidad de pago cita el artículo 130, como el formato',
    doc.markdown.includes(
      'El contrato se rige por la modalidad de pago de SUMA ALZADA, de conformidad con el artículo 130 del Reglamento.',
    ),
  );
  comprobar(
    'el sistema de entrega cita el artículo 129',
    doc.markdown.includes('sistema de entrega de Diseño de la operación y mantenimiento, de conformidad con el artículo 129 del Reglamento.'),
  );
  comprobar(
    'el plazo sale con el párrafo del formato, no como campo suelto',
    doc.markdown.includes(
      'Los servicios materia de la presente convocatoria se prestan en el plazo de trescientos sesenta y cinco (365) días calendario',
    ),
  );
  comprobar(
    'y con el hito de cómputo que trae el formato',
    doc.markdown.includes('notificación de la orden de servicio o suscripción del contrato'),
  );
  comprobar('el lugar también', doc.markdown.includes('El servicio se presta en Av. Abancay'));
  comprobar(
    'y hay lugar y plazo para la prestación accesoria',
    (doc.markdown.match(/Prestación accesoria/g) ?? []).length >= 2,
  );

  // Las cinco modalidades del formato, incluida la que faltaba.
  const modalidad = todosLosBloques(p.secciones).find(
    (b) => 'id' in b && b.id === 'modalidad_pago',
  ) as { opciones?: Array<{ valor: string }> } | undefined;
  comprobar(
    `están las cinco modalidades de pago (${modalidad?.opciones?.length ?? 0})`,
    (modalidad?.opciones?.length ?? 0) === 5,
  );
  comprobar(
    'incluido el pago por consumo, que faltaba',
    !!modalidad?.opciones?.some((o) => o.valor === 'pago_consumo'),
  );
}

// ── Hoja 9 (servicios): los campos que faltaban y la garantía ────────
function hoja9() {
  console.log("\n── Hoja 9: campos del formato que no estaban en servicios ──");
  const p = obtenerPlantilla('uit-tdr')!;
  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de mantenimiento');
  r.condiciones.tiene_garantia_prestacion = true;
  r.condiciones.requiere_documentacion_suscripcion = true;
  r.condiciones.tiene_compatibilizacion = true;
  r.campos.garantia_periodo = 'seis (6) meses';
  r.campos.compatibilizacion = 'Informe N.° 012-2026-UTI';
  r.redacciones.descripcion_general = 'Mantenimiento preventivo de equipos de aire acondicionado.';
  r.redacciones.documentacion_suscripcion = 'Copia del certificado de habilitación vigente.';
  const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });

  for (const apartado of [
    'Descripción general del servicio a contratar',
    'Documentación para la suscripción (perfeccionamiento) del contrato',
    'Documento que aprobó la compatibilización del requerimiento',
  ]) {
    comprobar(`está "${apartado.slice(0, 48)}"`, doc.markdown.includes(apartado));
  }
  comprobar('y recogen lo que escribió la entidad', doc.markdown.includes('Informe N.° 012-2026-UTI'));

  // Los dos que son "de corresponder" no salen si no se encienden.
  const minimo = normalizarRespuestas(respuestasVacias(), 'Servicio de mantenimiento');
  const doc2 = ensamblarRequerimiento(p, minimo, { cuantia: 30_000 });
  comprobar(
    'la suscripción y la compatibilización solo salen si corresponden',
    !doc2.markdown.includes('Documentación para la suscripción') &&
      !doc2.markdown.includes('compatibilización del requerimiento'),
  );
  comprobar(
    'la descripción general, en cambio, va siempre',
    doc2.markdown.includes('Descripción general del servicio a contratar'),
  );

  console.log("\n── Hoja 9: la garantía de servicios, como en bienes ──");
  comprobar(
    'las condiciones ya vienen escritas',
    doc.markdown.includes('La Entidad comunicará las observaciones mediante correo electrónico') &&
      doc.markdown.includes('dentro de los dos (2) días hábiles siguientes'),
  );
  comprobar(
    'y del período solo se rellena el plazo',
    doc.markdown.includes('El período de garantía será de seis (6) meses'),
  );
  comprobar(
    'el alcance sigue redactándolo el área usuaria, que depende del servicio',
    todosLosBloques(p.secciones).some(
      (b) => 'id' in b && b.id === 'garantia_prestacion' && b.clase === 'redactado',
    ),
  );
}

// ── Pendientes: visita y muestra, adelanto directo ───────────────────
function visitasYAdelanto() {
  console.log("\n── Obs. 27: la visita y la muestra son dos cosas ──");
  const p = obtenerPlantilla('uit-eett')!;
  const bloques = todosLosBloques(p.secciones);
  const visita = bloques.find((b) => 'id' in b && b.id === 'visitas') as { ejemplo?: string } | undefined;
  const muestra = bloques.find((b) => 'id' in b && b.id === 'muestras') as { ejemplo?: string } | undefined;
  comprobar('la visita tiene su propio apartado', !!visita);
  comprobar('y la muestra el suyo', !!muestra);
  comprobar('ya no están en un solo campo', !bloques.some((b) => 'id' in b && b.id === 'visitas_muestras'));
  // "El ejemplo debe mostrarse completo": los del formato pasan de
  // trescientos caracteres, no son media frase.
  comprobar(`el ejemplo de la visita va entero (${visita?.ejemplo?.length ?? 0})`, (visita?.ejemplo?.length ?? 0) > 300);
  comprobar(`y el de la muestra también (${muestra?.ejemplo?.length ?? 0})`, (muestra?.ejemplo?.length ?? 0) > 300);

  console.log("\n── Obs. 32: el adelanto directo, según el modelo ──");
  const r = normalizarRespuestas(respuestasVacias(), 'Adquisición de bienes');
  r.condiciones.otorga_adelanto = true;
  r.campos.adelanto_cantidad = 'un (1)';
  r.campos.adelanto_porcentaje = '20';
  r.campos.adelanto_plazo_solicitud = 'ocho (8)';
  r.campos.adelanto_plazo_entrega = 'siete (7)';
  const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
  comprobar(
    'sale el párrafo con el número de adelantos y el porcentaje',
    doc.markdown.includes('La entidad contratante otorgará un (1) adelantos directos por el 20'),
  );
  comprobar(
    'el plazo para solicitarlo',
    doc.markdown.includes('El contratista debe solicitar los adelantos dentro de los ocho (8) días'),
  );
  comprobar(
    'y el plazo en que la Entidad lo entrega',
    doc.markdown.includes('La Entidad otorgará el adelanto dentro de los siete (7) días calendario'),
  );
  // Estaban duplicados: los dos párrafos vivían también dentro del
  // plazo de entrega, donde no pintan nada.
  const veces = (doc.markdown.match(/El contratista debe solicitar los adelantos/g) ?? []).length;
  comprobar('y el adelanto sale una sola vez en el documento', veces === 1, `${veces} veces`);
}

// ── Obs. 37: los requisitos del proveedor, ordenados ─────────────────
function requisitosDelProveedor() {
  console.log("\n── Obs. 37: \"en LexIA no está ordenado, está todo el texto junto\" ──");
  let comoParrafo = 0;
  const sueltos: string[] = [];
  for (const p of listarPlantillas()) {
    const r = normalizarRespuestas(respuestasVacias(), 'Contratación de prueba');
    const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });
    // Los siete requisitos del proveedor salían en un solo párrafo.
    const i = doc.markdown.indexOf('Contar con RUC activo');
    if (i < 0) continue;
    const linea = doc.markdown.slice(i - 2, doc.markdown.indexOf('\n', i));
    if (!linea.trimStart().startsWith('- ')) {
      comoParrafo++;
      sueltos.push(p.id);
    }
  }
  comprobar(
    'los requisitos del proveedor salen como enumeración, no como párrafo',
    comoParrafo === 0,
    sueltos.join(', '),
  );

  const p = obtenerPlantilla('uit-tdr')!;
  const doc = ensamblarRequerimiento(p, normalizarRespuestas(respuestasVacias(), 'x'), {
    cuantia: 20_000,
  });
  const renglones = (doc.markdown.match(/^- (Contar con RUC|Realizar actividades|Registro Nacional|Código de cuenta|Persona natural|No tener impedimento|Contar con correo)/gm) ?? []).length;
  comprobar(`y son los siete del formato (${renglones})`, renglones === 7);
}

// ── Últimos pendientes: pago, personal, infraestructura, MYPE ────────
function ultimosPendientes() {
  console.log("\n── Pago, personal, infraestructura y acreditación ──");
  const p = obtenerPlantilla('uit-tdr')!;
  const r = normalizarRespuestas(respuestasVacias(), 'Servicio de prueba');
  r.condiciones.tiene_prestaciones_accesorias = true;
  r.condiciones.exige_personal_clave = true;
  r.condiciones.exige_personal_no_clave = true;
  r.condiciones.exige_infraestructura = true;
  r.condiciones.exige_equipamiento = true;
  r.condiciones.exige_capacidad_tecnica = true;
  const doc = ensamblarRequerimiento(p, r, { cuantia: 30_000 });

  // Forma y requisitos de pago: principal y accesoria.
  comprobar('la forma de pago se rotula como prestación principal', doc.markdown.includes('Prestación principal'));
  comprobar(
    'y remite al numeral donde se detalla la accesoria',
    doc.markdown.includes('se establecen de manera independiente en el numeral'),
  );

  // Personal clave y no clave, con los cuadros del formato.
  comprobar('está el personal clave', doc.markdown.includes('Personal clave'));
  comprobar('y el personal no clave', doc.markdown.includes('Personal no clave'));
  comprobar(
    'con las cinco columnas del no clave',
    doc.markdown.includes('| Cargo y/o responsabilidad | Cant. | Profesión y grado o título profesional requerido | Experiencia mínima | Capacitación |'),
  );

  // Infraestructura estratégica y cierre del equipamiento.
  comprobar('está la infraestructura estratégica', doc.markdown.includes('Infraestructura estratégica'));
  comprobar(
    'y el equipamiento cierra con su advertencia',
    doc.markdown.includes('no materia de evaluación al momento de la recepción de las cotizaciones'),
  );

  // La acreditación del personal clave, que "ya está definida".
  comprobar(
    'la experiencia del personal clave trae su regla de valoración',
    doc.markdown.includes('se debe valorar de manera integral'),
  );
  comprobar(
    'y su acreditación, con el traslape y los meses sin días',
    doc.markdown.includes('La experiencia del personal clave se acreditará') &&
      doc.markdown.includes('sólo se considerará una vez el periodo traslapado'),
  );

  // El MYPE: está donde el modelo lo trae y no donde no.
  const conMype = ['ps-servicios-general', 'ps-mantenimiento-vial', 'ps-servicios-comparacion-precios'];
  for (const id of conMype) {
    const plantilla = obtenerPlantilla(id);
    if (!plantilla) continue;
    // Unas plantillas lo ponen como subsección y otras como un párrafo
    // dentro de la experiencia, según lo traiga su formato. Lo que
    // importa es que el monto exigido a la MYPE se pueda fijar.
    const tieneMype = todosLosBloques(plantilla.secciones).some(
      (b) =>
        ('id' in b && b.id === 'experiencia_monto_mype') ||
        (b.clase === 'parrafo' && b.campos.some((c) => c.id === 'experiencia_monto_mype')),
    );
    comprobar(`${id}: tiene el régimen para micro y pequeña empresa`, tieneMype);
  }
  const sinMype = obtenerPlantilla('ps-servicios-consultoria');
  if (sinMype) {
    comprobar(
      'y consultoría no, porque su formato no lo trae',
      !todosLosBloques(sinMype.secciones).some(
        (b) =>
          ('id' in b && b.id === 'experiencia_monto_mype') ||
          (b.clase === 'parrafo' && b.campos.some((c) => c.id === 'experiencia_monto_mype')),
      ),
    );
  }
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
  hoja5();
  hoja6();
  hoja7();
  hoja8();
  hoja9();
  visitasYAdelanto();
  requisitosDelProveedor();
  ultimosPendientes();

  console.log(
    fallos === 0
      ? '\n✅ Las observaciones resueltas siguen resueltas.'
      : `\n❌ ${fallos} observación(es) sin cumplir.`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
