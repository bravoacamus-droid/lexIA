#!/usr/bin/env tsx
/**
 * Convierte los tres documentos de César en datos que el motor pueda usar.
 *
 * POR QUÉ EXISTE
 *
 * El 22/08/2026 César entregó seis documentos y un audio explicando cómo
 * debe evaluarse una oferta de servicios: tres etapas encadenadas
 * —admisión, calificación y evaluación— cada una con su metodología y
 * con los casos que ha resuelto el Tribunal sobre cada requisito.
 *
 * Esos casos no son adorno. Son, en sus palabras y en las del prompt,
 * "casos semilla": enseñan al sistema qué controversias existen sobre
 * cada requisito concreto. Pero vienen en un Word de 273 000 caracteres
 * y no se pueden meter enteros en cada consulta.
 *
 * Este guion los trocea POR REQUISITO y deja el resultado en
 * `src/lib/evaluacion/criterios.generado.ts`, para que al evaluar el
 * pacto de integridad se le den al modelo los casos del pacto de
 * integridad y no los de la garantía comercial.
 *
 * QUÉ SE COMPRUEBA AL GENERAR
 *
 * Que no se pierde ni se duplica texto: la suma de los trozos tiene que
 * ser el documento entero. Un troceo que se come un párrafo se lleva por
 * delante criterios del Tribunal sin que nadie se entere.
 *
 * Uso: npx tsx scripts/generar-criterios-evaluacion.ts
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { extraerTextoDocumento } from '../src/lib/ai/texto-documento';

const CARPETA = 'Evaluados de Ofertas';
const DESTINO = 'src/lib/evaluacion/criterios.generado.ts';

/**
 * Los encabezados de primer nivel de cada documento.
 *
 * Van escritos a mano, y a propósito. Detectarlos por la forma de la
 * línea —corta, sin punto final— confundía los subtítulos internos
 * ("Legibilidad y Trazabilidad", "Inconsistencias en fechas") con
 * requisitos, y partía en dos los casos de un mismo requisito. La lista
 * sale de los prompts de César y del acta, que nombran los mismos.
 */
const ESTRUCTURA: Array<{
  archivo: string;
  etapa: 'admision' | 'calificacion' | 'evaluacion';
  encabezados: Array<{ id: string; empiezaPor: string }>;
}> = [
  {
    archivo: '1. Casos resueltos por el tribunal - Requisitos de Admisión.docx',
    etapa: 'admision',
    encabezados: [
      { id: 'dj_datos_postor', empiezaPor: 'Declaración jurada de datos del postor' },
      { id: 'pacto_integridad', empiezaPor: 'Pacto de integridad' },
      { id: 'representacion', empiezaPor: 'Documento que acredite la representación' },
      { id: 'dj_veracidad_impedimentos', empiezaPor: 'Declaración jurada manifestando' },
      { id: 'promesa_consorcio', empiezaPor: 'Promesa de consorcio' },
      { id: 'desafectacion_impedimento', empiezaPor: 'Documentación que acredite la desafectación' },
    ],
  },
  {
    archivo: '2. Casos resueltos por el tribunal - Requisitos de Calificación.docx',
    etapa: 'calificacion',
    encabezados: [
      { id: 'habilitacion', empiezaPor: 'Requisitos de habilitación' },
      { id: 'experiencia_postor', empiezaPor: 'Experiencia del postor en la especialidad' },
      { id: 'experiencia_personal_clave', empiezaPor: 'Experiencia del personal clave' },
      { id: 'formacion_academica', empiezaPor: 'Formación académica del personal clave' },
      { id: 'capacitacion_personal_clave', empiezaPor: 'Capacitación del personal clave' },
      { id: 'equipamiento', empiezaPor: 'Equipamiento estratégico' },
      { id: 'infraestructura', empiezaPor: 'Infraestructura estratégica' },
      { id: 'consorcio', empiezaPor: 'Condiciones del consorcio' },
    ],
  },
  {
    archivo: '3. Casos resueltos por el tribunal - Factor de Evaluación.docx',
    etapa: 'evaluacion',
    encabezados: [
      { id: 'experiencia_adicional_postor', empiezaPor: 'Experiencia adicional del postor en la especialidad' },
      { id: 'experiencia_adicional_personal', empiezaPor: 'Experiencia adicional del personal clave' },
      { id: 'calificaciones_adicionales_personal', empiezaPor: 'Calificaciones adicionales del personal clave' },
      { id: 'capacitacion_personal_clave_factor', empiezaPor: 'Capacitación del personal clave' },
      { id: 'plazo_prestacion', empiezaPor: 'Plazo de prestación del servicio' },
      { id: 'sostenibilidad_social', empiezaPor: 'Sostenibilidad social' },
      { id: 'sostenibilidad_ambiental', empiezaPor: 'Sostenibilidad ambiental' },
      { id: 'integridad', empiezaPor: 'Integridad en la contratación pública' },
      { id: 'garantia_comercial', empiezaPor: 'Garantía comercial del postor' },
      { id: 'mejoras', empiezaPor: 'Mejoras al requerimiento' },
      { id: 'gestion_riesgos', empiezaPor: 'Gestión de riesgos' },
      { id: 'planificacion_detallada', empiezaPor: 'Planificación detallada' },
      { id: 'tecnologia_innovacion', empiezaPor: 'Tecnología y métodos innovadores' },
      { id: 'sistema_gestion_calidad', empiezaPor: 'Sistema de gestión de calidad' },
      { id: 'metodologia', empiezaPor: 'Metodología propuesta' },
      { id: 'capacitacion_entidad', empiezaPor: 'Capacitación al personal de la entidad' },
      { id: 'seguridad_salud', empiezaPor: 'Seguridad y salud' },
      { id: 'bim_bep', empiezaPor: 'Plan de ejecución BIM' },
      { id: 'propuesta_arquitectonica', empiezaPor: 'Propuesta Arquitectónica' },
      { id: 'oferta_economica', empiezaPor: 'Oferta económica' },
      { id: 'bonificacion_amazonia', empiezaPor: 'Ley de Promoción de la Inversión en la Amazonía' },
      { id: 'bonificacion_10', empiezaPor: 'Solicitud de Bonificación del 10%' },
      { id: 'bonificacion_5', empiezaPor: 'Solicitud de bonificación del cinco por ciento' },
    ],
  },
];

/** Las resoluciones que cita un bloque, para poder contarlas y verlas. */
function resolucionesDe(texto: string): string[] {
  const encontradas = texto.matchAll(/Resoluci[óo]n(?:es)?\s+N\.?\s*[°º]?\s*([\d-]+-[A-Z0-9-]+)/gi);
  return [...new Set([...encontradas].map((m) => m[1].replace(/[.,;]$/, '')))];
}

async function main() {
  const bloques: Array<{
    etapa: string;
    id: string;
    titulo: string;
    texto: string;
    resoluciones: string[];
  }> = [];

  for (const doc of ESTRUCTURA) {
    const buf = await readFile(join(CARPETA, doc.archivo));
    const f = new File([new Uint8Array(buf)], doc.archivo, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const { texto } = await extraerTextoDocumento(f);
    const lineas = texto.split('\n');

    // Dónde empieza cada requisito. Un mismo encabezado puede aparecer
    // dos veces —"Tecnología y métodos innovadores" sale en dos sitios—
    // y entonces sus dos tramos son del mismo requisito.
    const cortes: Array<{ id: string; titulo: string; linea: number }> = [];
    lineas.forEach((l, i) => {
      const limpia = l.trim();
      if (!limpia) return;
      for (const h of doc.encabezados) {
        if (limpia.toLowerCase().startsWith(h.empiezaPor.toLowerCase())) {
          cortes.push({ id: h.id, titulo: limpia, linea: i });
          return;
        }
      }
    });

    const faltan = doc.encabezados.filter((h) => !cortes.some((c) => c.id === h.id));
    if (faltan.length > 0) {
      throw new Error(
        `${doc.archivo}: no se encontraron los encabezados ${faltan.map((h) => h.id).join(', ')}`,
      );
    }

    // El texto de cada tramo llega hasta el corte siguiente.
    const porId = new Map<string, { titulo: string; partes: string[] }>();
    let cubiertas = cortes[0].linea; // la cabecera del documento no es de nadie
    cortes.forEach((c, i) => {
      const hasta = i + 1 < cortes.length ? cortes[i + 1].linea : lineas.length;
      const tramo = lineas.slice(c.linea, hasta);
      cubiertas += tramo.length;
      const previo = porId.get(c.id);
      if (previo) previo.partes.push(tramo.join('\n'));
      else porId.set(c.id, { titulo: c.titulo, partes: [tramo.join('\n')] });
    });

    if (cubiertas !== lineas.length) {
      throw new Error(
        `${doc.archivo}: el troceo cubre ${cubiertas} de ${lineas.length} líneas. ` +
          'Falta o sobra texto, y con él criterios del Tribunal.',
      );
    }

    for (const h of doc.encabezados) {
      const b = porId.get(h.id)!;
      const cuerpo = b.partes.join('\n\n').trim();
      bloques.push({
        etapa: doc.etapa,
        id: h.id,
        titulo: b.titulo,
        texto: cuerpo,
        resoluciones: resolucionesDe(cuerpo),
      });
    }

    console.log(
      `${doc.archivo}\n   ${lineas.length} líneas · ${doc.encabezados.length} requisitos · troceo completo`,
    );
  }

  const cabecera = `/**
 * Criterios del Tribunal por requisito. GENERADO — no editar a mano.
 *
 * Sale de los tres documentos que entregó César el 22/08/2026, troceados
 * por requisito con \`scripts/generar-criterios-evaluacion.ts\`. Para
 * cambiar algo, se cambia el Word y se vuelve a generar.
 *
 * Son los "casos semilla" de los que habla su prompt: no un catálogo
 * cerrado de jurisprudencia, sino el mapa de qué controversias existen
 * sobre cada requisito. El motor le da al modelo solo el bloque del
 * requisito que está evaluando.
 */

export interface CriterioRequisito {
  /** Etapa a la que pertenece. */
  etapa: 'admision' | 'calificacion' | 'evaluacion';
  id: string;
  /** Como lo titula César en su documento. */
  titulo: string;
  /** Criterios y casos, tal cual los redactó. */
  texto: string;
  /** Resoluciones citadas en el bloque. */
  resoluciones: string[];
}

export const CRITERIOS: CriterioRequisito[] = ${JSON.stringify(bloques, null, 2)};

/** El bloque de un requisito, para inyectarlo en su evaluación. */
export function criteriosDe(id: string): CriterioRequisito | undefined {
  return CRITERIOS.find((c) => c.id === id);
}
`;

  await mkdir('src/lib/evaluacion', { recursive: true });
  await writeFile(DESTINO, cabecera, 'utf8');

  const total = bloques.reduce((n, b) => n + b.resoluciones.length, 0);
  console.log(`\n${bloques.length} requisitos · ${total} resoluciones citadas`);
  console.log(`escrito en ${DESTINO}`);
  for (const b of bloques) {
    console.log(
      `   ${b.etapa.padEnd(12)} ${b.id.padEnd(38)} ${String(b.texto.length).padStart(6)} car · ${String(
        b.resoluciones.length,
      ).padStart(3)} resoluciones`,
    );
  }
}

void main();
