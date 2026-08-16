/**
 * Arma un requerimiento completo de punta a punta y lo exporta a Word.
 *
 * Sirve para dos cosas:
 *  · comprobar que plantilla → ensamblador → docx funciona sin pasar por
 *    la interfaz ni gastar tokens del modelo;
 *  · producir un documento concreto que César pueda abrir y corregir
 *    antes de convertir las catorce plantillas restantes.
 *
 * Las redacciones NO las inventa este script: toma los `ejemplo` de la
 * propia plantilla, que son la redacción modelo que escribió César. Así
 * el documento de muestra refleja su formato, no el mío.
 *
 * Uso: npx tsx scripts/probar-ensamblador-requerimiento.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PLANTILLA_BIENES_GENERAL } from '../src/lib/generadores/plantillas/bienes-general';
import {
  ensamblarRequerimiento,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import type { Seccion, Bloque } from '../src/lib/generadores/plantilla-tipos';
import { markdownToDocxBuffer } from '../src/lib/docx-from-markdown';

const SALIDA = join('tmp', 'requerimiento-muestra');

// ── Caso: el mismo de los ejemplos de la plantilla ────────────────────
const r: RespuestasRequerimiento = respuestasVacias();

r.campos = {
  organo: 'Oficina General de Administración',
  actividad_poi: 'Acondicionamiento de ambientes administrativos — POI 2026',
  numero_cmn: 'CMN-2026-000432',
  denominacion: 'Adquisición de muebles de melamina para oficinas administrativas',
  garantia_periodo: 'Doce (12) meses contados desde la conformidad',
  lugar_entrega:
    'Almacén Central de la Entidad, Av. Los Constructores N° 1450, San Borja, Lima. Recepción de lunes a viernes de 08:30 a 16:30 horas.',
  plazo_entrega: 'Treinta (30) días calendario contados desde el día siguiente de la notificación de la orden de compra',
  plazo_respuesta: 'Cinco (05) días calendario',
  vicios_ocultos_plazo: 'Un (01) año',
  experiencia_monto:
    'S/ 180 000,00 (ciento ochenta mil con 00/100 soles)',
  bienes_similares:
    'mobiliario de oficina en melamina, madera o derivados, incluyendo escritorios, credenzas, armarios, estantes y módulos de atención',
  solicitante_nombre: 'María Elena Quispe Ramírez',
  solicitante_cargo: 'Jefa de la Oficina de Abastecimiento',
  solicitante_fecha: '15 de agosto de 2026',
};

r.opciones = {
  forma_contratacion: 'item_unico',
  modalidad_pago: 'suma_alzada',
  sistema_entrega: 'no_aplica',
  subcontratacion: 'prohibida',
};

r.tablas = {
  items: [
    ['01', '25', 'Unidad', 'Escritorio de oficina en melamina con cajonera lateral de tres cajones'],
    ['02', '25', 'Unidad', 'Silla giratoria ergonómica con apoyabrazos regulables'],
    ['03', '10', 'Unidad', 'Armario de melamina de dos cuerpos con puertas batientes y cerradura'],
  ],
  entregables: [
    ['01', '30 días calendario', 'Entrega total de los bienes en el almacén central', 'Guía de remisión y acta de recepción'],
  ],
  instituciones_arbitrales: [
    ['1', 'Cámara de Comercio de Lima', '20107063057'],
    ['2', 'Centro de Análisis y Resolución de Conflictos de la PUCP', '20155945860'],
    ['3', 'Centro de Arbitraje de AmCham Perú', '20128946251'],
  ],
  personal_clave: [],
};

// Condiciones: solo lo que aplica a una compra de mobiliario. Las demás
// secciones ("Transporte", "Seguros", "Visitas y muestras", el régimen
// MYPE) quedan fuera del documento, como manda la plantilla.
r.condiciones = {
  tiene_condiciones_operacion: false,
  tiene_prestaciones_accesorias: false,
  requiere_envase: false,
  incluye_transporte: false,
  requiere_seguros: false,
  requiere_repuestos: false,
  requiere_muestras: false,
  sistema_entrega_especial: false,
  otorga_adelanto: false,
  tiene_otras_penalidades: false,
  entidad_provee_recursos: false,
  exige_habilitacion: false,
  aplica_mype: false,
  exige_capacidad_tecnica: false,
};

// ── Redacciones: se toman los `ejemplo` de la plantilla ───────────────
const recorrer = (ss: Seccion[]) => {
  for (const s of ss) {
    for (const b of s.bloques as Bloque[]) {
      if (b.clase === 'redactado' && b.ejemplo) r.redacciones[b.id] = b.ejemplo;
    }
    if (s.subsecciones) recorrer(s.subsecciones);
  }
};
recorrer(PLANTILLA_BIENES_GENERAL.secciones);

// Dos bloques no traen ejemplo en la plantilla; se redactan aquí para
// que el documento de muestra no quede con huecos visibles.
r.redacciones.garantia_alcance =
  'El proveedor otorgará garantía comercial sobre la totalidad de los bienes entregados, cubriendo defectos de fabricación, fallas estructurales y desperfectos en herrajes y correderas. Ante un desperfecto, el proveedor atenderá el requerimiento dentro de los cinco (05) días hábiles siguientes a la comunicación de la Entidad, reponiendo o reparando el bien sin costo adicional. El proveedor consignará un teléfono y un correo electrónico de contacto para la atención de la garantía.';
r.redacciones.conformidad =
  'La conformidad de la prestación es otorgada por la Oficina General de Administración, en su calidad de área usuaria, dentro de los siete (07) días calendario de producida la entrega. La verificación comprende la cantidad, las características técnicas y el estado de los bienes conforme a lo establecido en el presente requerimiento.';

// ── Ensamblado ────────────────────────────────────────────────────────
async function main() {
  const doc = ensamblarRequerimiento(PLANTILLA_BIENES_GENERAL, r, {
    cuantia: 95_000,
    montoContrato: 95_000,
  });

  mkdirSync(SALIDA, { recursive: true });
  writeFileSync(join(SALIDA, 'requerimiento.md'), doc.markdown, 'utf8');

  const buffer = await markdownToDocxBuffer(doc.markdown, {
    title: PLANTILLA_BIENES_GENERAL.encabezado,
    subtitle: PLANTILLA_BIENES_GENERAL.subtitulo,
  });
  writeFileSync(join(SALIDA, 'requerimiento.docx'), buffer);

  console.log(`Markdown: ${doc.markdown.length.toLocaleString('es-PE')} caracteres`);
  console.log(`Word:     ${buffer.length.toLocaleString('es-PE')} bytes`);
  console.log(`Secciones omitidas por no corresponder: ${doc.omitidas.length}`);
  for (const o of doc.omitidas) console.log(`  · ${o}`);

  console.log(`\nDatos pendientes: ${doc.faltantes.length}`);
  for (const f of doc.faltantes) console.log(`  · ${f.seccion} → ${f.etiqueta}`);

  console.log(`\nAvisos de topes normativos: ${doc.avisos.length}`);
  for (const a of doc.avisos) console.log(`  ${a.nivel === 'error' ? '❌' : '⚠️ '} ${a.mensaje}`);

  console.log(`\nSalida en ${SALIDA}/`);

  // ── Comprobación de que los topes SÍ saltan ─────────────────────────
  // Un validador que nunca se queja es indistinguible de uno que no
  // funciona. Se repite el ensamblado con cifras fuera de rango.
  console.log('\n── Comprobación de los topes ──');
  const excedido = {
    ...r,
    campos: {
      ...r.campos,
      // 3 veces la cuantía son S/ 285 000; se pide el doble.
      experiencia_monto: 'S/ 570 000,00 (quinientos setenta mil con 00/100 soles)',
      adelanto_porcentaje: '40',
      experiencia_monto_mype: 'S/ 90 000,00 (noventa mil con 00/100 soles)',
    },
    condiciones: { ...r.condiciones, usa_jprd: true },
  };
  const conAvisos = ensamblarRequerimiento(PLANTILLA_BIENES_GENERAL, excedido, {
    cuantia: 95_000,
    montoContrato: 95_000,
  });
  const esperados = ['adelanto_directo_max', 'experiencia_max', 'experiencia_mype', 'jprd_umbral'];
  const obtenidos = conAvisos.avisos.map((a) => a.validacion);
  for (const e of esperados) {
    const ok = obtenidos.includes(e);
    console.log(`  ${ok ? '✅' : '❌'} ${e}`);
    if (!ok) process.exitCode = 1;
  }
  for (const a of conAvisos.avisos) console.log(`     ${a.mensaje}`);

  // Y que sin cuantía lo diga en vez de callar.
  const sinCuantia = ensamblarRequerimiento(PLANTILLA_BIENES_GENERAL, r, {});
  const avisa = sinCuantia.avisos.some((a) => a.nivel === 'advertencia');
  console.log(`  ${avisa ? '✅' : '❌'} avisa cuando no hay cuantía con la que contrastar`);
  if (!avisa) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
