/**
 * La revisión de la sección específica, capítulo por capítulo.
 *
 * La sección específica la llena la Entidad: elige factores, fija
 * montos, escribe el requerimiento. Ahí no se busca texto que falte
 * —faltan, con razón, las opciones que no eligió— sino lo que César
 * pide detectar: exigencias no previstas, restricciones injustificadas,
 * instrucciones del estándar que no se cumplieron, inconsistencias.
 *
 * La referencia es el mismo capítulo de la bases estándar, entero: con
 * los corchetes, que a menudo dicen el límite —«MONTO QUE NO PODRÁ SER
 * MAYOR A TRES VECES LA CUANTÍA»—, y con las instrucciones azules para
 * la Entidad —«obligatoriamente deben considerarse mínimo dos factores
 * de evaluación. Estos factores deben sumar 100 puntos»—.
 *
 * Lo que el modelo no pueda citar literal de las bases no se reporta: si
 * la cita no aparece, el hallazgo se descarta.
 */
import { generateText } from 'ai';
import { generatorModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { auditarCitas, type BuscarEnBiblioteca } from '@/lib/normativa/citas';
import { ubicarCita } from '@/lib/evaluacion/mejora/texto';
import type { BuscarSustento } from '@/lib/evaluacion/mejora/sustento';
import type { CapituloDeLasBases } from './capitulos';
import type { HallazgoBases, Severidad, TipoHallazgoBases } from './tipos';

const TIPOS: TipoHallazgoBases[] = [
  'modificacion_indebida',
  'omision',
  'exigencia_no_prevista',
  'restriccion_injustificada',
  'inconsistencia',
];
const SEVERIDADES: Severidad[] = ['critico', 'alto', 'medio', 'bajo'];

/** Lo que se le da al modelo de cada texto, como mucho. */
const TOPE_BASES = 70_000;
const TOPE_ESTANDAR = 32_000;

const FORMA = `
{
  "hallazgos": [
    {
      "tipo": "exigencia_no_prevista" | "restriccion_injustificada" | "modificacion_indebida" | "omision" | "inconsistencia",
      "severidad": "critico" | "alto" | "medio" | "bajo",
      "titulo": "<una línea>",
      "numeral": "<numeral de las bases, p. ej. 3.2 o 2.2.1.1; vacío si no lo tiene>",
      "enLasBases": "<texto de las bases copiado literalmente, una o dos oraciones>",
      "enElEstandar": "<lo que dice el estándar o su instrucción en ese punto>",
      "analisis": "<dos a cuatro oraciones: por qué es un problema>",
      "norma": "<la norma que se vulnera o sustenta, o el estándar>",
      "paraElProveedor": { "tipo": "observacion" | "consulta", "solicitud": "<qué se pide al comité>" },
      "paraLaEntidad": "<qué corregir antes de publicar>"
    }
  ]
}`.trim();

/**
 * Lo que hay que comprobar en cada capítulo, sí o sí.
 *
 * Sin lista, la revisión encontraba cosas distintas cada vez: en dos
 * pasadas sobre las mismas bases del CPA 008-2026, una vio que el factor
 * de integridad daba cinco puntos a quien presenta el ISO 37001 y
 * también a quien no, y la otra no. Esa es justo la clase de error que
 * tiene que salir siempre.
 */
function listaDeComprobacion(titulo: string): string {
  const t = titulo.toUpperCase();
  if (/EVALUACI/.test(t)) {
    return `· Que haya al menos dos factores de evaluación y que sumen cien puntos.
· Que en cada factor quien no presenta, no acredita o no mejora el mínimo reciba 0 puntos, y que el puntaje crezca con la mejora (nunca al revés).
· Que los puntajes máximos respeten los que fija el estándar entre corchetes.
· Que los coeficientes de ponderación sumen 1.00 y estén en los rangos del estándar.
· Que la forma de acreditar cada factor sea la del estándar.`;
  }
  if (/REQUERIMIENTO/.test(t)) {
    return `· Requisitos de calificación: montos de facturación y experiencia dentro de los límites que el estándar fija entre corchetes; medios de acreditación solo los del estándar.
· Exigencias que restrinjan la concurrencia: ubicación geográfica, marcas, antigüedad, certificaciones, licencias o documentos no previstos.
· Penalidades: cada una con su supuesto, su forma de cálculo y su procedimiento de verificación; que la suma no exceda el 10 % del monto vigente.
· Plazo de ejecución determinado y coherente en todo el capítulo.`;
  }
  if (/PROCEDIMIENTO/.test(t)) {
    return `· Documentos para la admisión: solo los del estándar (y los excepcionales que él mismo autoriza).
· Documentos facultativos y bonificaciones previstas por el estándar.
· Documentos para perfeccionar el contrato: solo los del estándar o los sustentados en la estrategia de contratación.
· Plazos y requisitos coherentes con el resto de las bases.`;
  }
  if (/PROFORMA|CONTRATO/.test(t)) {
    return `· Que las cláusulas del estándar estén y que no se hayan alterado sus condiciones.
· Que las penalidades coincidan con las del requerimiento y tengan su cuadro completo.
· Que no queden instrucciones para la Entidad en el texto final.`;
  }
  return `· Que los datos del procedimiento (objeto, cuantía, sistema de contratación, plazo, financiamiento) sean coherentes entre sí.`;
}

function prompt(c: CapituloDeLasBases, procedimiento: string, sustento: string, desdePdf: boolean): string {
  return `Eres especialista en contratación pública del Perú —Ley N° 32069, Ley
General de Contrataciones Públicas, y su Reglamento aprobado por Decreto
Supremo N° 009-2025-EF—. Revisas el ${c.rotulo} — ${c.titulo} de unas
BASES de ${procedimiento}, comparándolo con el mismo capítulo de las BASES
ESTÁNDAR que aprobó el OECE para ese procedimiento.

Cómo leer el ESTÁNDAR:
· El texto normal es el que debe figurar en las bases.
· Lo que va [ENTRE CORCHETES] lo llena la Entidad; a veces dice el límite
  de lo que puede poner.
· ⟦Instrucción para la Entidad: …⟧ son las reglas que la Entidad debe
  cumplir al llenar el capítulo. No figuran en las bases finales.

Busca SOLO problemas reales, de estos tipos:
· exigencia_no_prevista: las bases piden un documento, requisito o
  condición que ni el estándar ni la normativa prevén en ese sitio.
· restriccion_injustificada: un requisito, factor o condición que limita
  la concurrencia más allá de lo que el estándar permite: montos sobre el
  límite, plazos o experiencia desproporcionados, marcas, certificaciones
  no exigibles.
· modificacion_indebida: se cambió texto que el estándar no deja cambiar,
  o se incumplió una ⟦Instrucción⟧ (por ejemplo, factores que no suman
  cien puntos o menos de dos factores).
· omision: falta contenido que el estándar exige en este capítulo.
· inconsistencia: el capítulo se contradice (plazos, montos, cantidades).

REGLAS QUE NO SE NEGOCIAN
1. Llenar los corchetes, elegir entre las opciones del estándar y quitar
   las instrucciones es lo que la Entidad debe hacer: eso NO es un
   hallazgo. Que falte una opción que la Entidad no eligió, tampoco.
2. "enLasBases" es texto de las BASES copiado literalmente, carácter por
   carácter. Si no puedes copiarlo literal, no reportes el hallazgo. En
   una omisión, "enLasBases" puede ir vacío y "enElEstandar" dice lo que
   falta.
3. Cita normas solo si están en el SUSTENTO o en el propio ESTÁNDAR, con
   su forma completa («numeral 44.6 del Reglamento aprobado por Decreto
   Supremo N° 009-2025-EF»). El régimen de la Ley N° 30225 está derogado.
4. Menos y ciertos: si no hay problemas, "hallazgos": []. No rellenes.
5. "paraElProveedor": "observacion" si se vulnera la norma o el estándar;
   "consulta" si es algo ambiguo que conviene aclarar. "solicitud" dice
   en una o dos oraciones qué se pide al comité.
6. Severidad: critico si es causal de nulidad o deja fuera a postores que
   cumplen; alto, medio o bajo según su efecto en la competencia.
7. Solo si el capítulo de las bases tiene menos de 1.500 caracteres, o
   remite expresamente a un documento aparte, trátalo como posiblemente
   incompleto: repórtalo como "consulta" de severidad "medio", pidiendo
   confirmar que el contenido completo forma parte de las bases. Nunca
   como omisión crítica.
8. No afirmes que algo es un derecho, una obligación o una causal de
   nulidad si no lo dicen el ESTÁNDAR o el SUSTENTO.
${
    desdePdf
      ? `9. El texto de las BASES se extrajo de un PDF: las tablas pierden su
   forma y sus celdas salen seguidas —el puntaje máximo de un factor puede
   quedar pegado a la primera opción—, los subíndices se pierden (c1 + c2
   sale «c + c») y pueden colarse números de página. Nada de eso es un
   hallazgo. Si un puntaje o un dato de una tabla parece contradictorio,
   repórtalo como "consulta" de severidad "medio" pidiendo confirmarlo,
   nunca como observación crítica.
`
      : ''
  }10. Español del Perú, registro formal. Devuelve ÚNICAMENTE el JSON.

COMPRUEBA EN ESTE CAPÍTULO, UNO POR UNO
${listaDeComprobacion(c.titulo)}

ESTÁNDAR — ${c.rotulo} ${c.titulo}
${c.estandar.slice(0, TOPE_ESTANDAR)}

BASES — ${c.rotulo} ${c.titulo} (${c.bases.length.toLocaleString('es-PE')} caracteres)
${c.bases.slice(0, TOPE_BASES)}${c.bases.length > TOPE_BASES ? '\n[… el capítulo sigue; se revisó la primera parte]' : ''}

${sustento ? `SUSTENTO NORMATIVO\n${sustento}` : 'No hay sustento normativo adicional: cita solo lo que diga el estándar.'}

FORMA DE LA RESPUESTA
${FORMA}`;
}

const texto = (o: Record<string, unknown>, k: string) => (typeof o[k] === 'string' ? (o[k] as string).trim() : '');

export interface PeticionDeRevision {
  capitulo: CapituloDeLasBases;
  procedimiento: string;
  /** Las bases vienen de un PDF: sus tablas llegan sin forma. */
  desdePdf?: boolean;
  buscarSustento: BuscarSustento;
  buscarEnBiblioteca?: BuscarEnBiblioteca;
  alUsar?: (uso: { entrada: number; salida: number }) => void;
}

/** Palabras de un texto, para comparar dos hallazgos. */
const palabrasDe = (t: string) =>
  new Set(
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z0-9]{3,}/g) ?? [],
  );

function parecido(a: string, b: string): number {
  const x = palabrasDe(a);
  const y = palabrasDe(b);
  if (x.size === 0 || y.size === 0) return 0;
  let comunes = 0;
  for (const w of x) if (y.has(w)) comunes++;
  return comunes / Math.min(x.size, y.size);
}

/** ¿Hablan dos hallazgos de lo mismo? Del mismo texto de las bases, o del mismo asunto si son omisiones. */
function mismoHallazgo(a: HallazgoBases, b: HallazgoBases): boolean {
  if (a.enLasBases && b.enLasBases) return parecido(a.enLasBases, b.enLasBases) >= 0.6;
  return parecido(`${a.titulo} ${a.enElEstandar ?? ''}`, `${b.titulo} ${b.enElEstandar ?? ''}`) >= 0.5;
}

const PESO: Record<Severidad, number> = { critico: 0, alto: 1, medio: 2, bajo: 3 };

/**
 * Dos pasadas por capítulo, en paralelo, y se juntan.
 *
 * Una sola pasada perdía hallazgos de una ejecución a otra; la segunda
 * —con algo más de temperatura— recoge lo que la primera no vio. Lo que
 * sale en las dos se cuenta una vez, con la severidad mayor. La
 * precisión la cuida la cita literal: lo que no esté en las bases se cae
 * en cualquiera de las dos.
 */
export async function revisarCapitulo(p: PeticionDeRevision): Promise<HallazgoBases[]> {
  const c = p.capitulo;
  const sustento = await p.buscarSustento(
    `${c.titulo} bases ${p.procedimiento} ${c.bases.slice(0, 600)}`.slice(0, 900),
  );

  const pasadas = await Promise.all(
    [0.1, 0.5].map(async (temperatura) => {
      try {
        const { text, usage } = await generateText({
          model: generatorModel,
          prompt: prompt(c, p.procedimiento, sustento, p.desdePdf ?? true),
          temperature: temperatura,
        });
        p.alUsar?.({ entrada: usage?.promptTokens ?? 0, salida: usage?.completionTokens ?? 0 });
        const crudo = parseJsonLoose<{ hallazgos?: unknown }>(text);
        return Array.isArray(crudo.hallazgos) ? (crudo.hallazgos as Record<string, unknown>[]) : [];
      } catch (e) {
        console.error('[bases] una pasada de la revisión falló:', c.rotulo, (e as Error).message);
        return [] as Record<string, unknown>[];
      }
    }),
  );

  const salida: HallazgoBases[] = [];
  let n = 0;
  for (const h of pasadas.flat()) {
    const tipo = TIPOS.includes(h.tipo as TipoHallazgoBases) ? (h.tipo as TipoHallazgoBases) : null;
    if (!tipo) continue;
    const enLasBases = texto(h, 'enLasBases');
    // La cita tiene que estar en el capítulo: si no, el hallazgo se cae.
    if (enLasBases && !ubicarCita(c.bases, enLasBases)) {
      console.warn('[bases] cita no encontrada, se descarta:', c.rotulo, enLasBases.slice(0, 80));
      continue;
    }
    if (!enLasBases && tipo !== 'omision') continue;
    const prov = (h.paraElProveedor ?? {}) as Record<string, unknown>;
    const analisis = texto(h, 'analisis');
    const norma = texto(h, 'norma');
    const candidato: HallazgoBases = {
      id: '',
      tipo,
      severidad: SEVERIDADES.includes(h.severidad as Severidad) ? (h.severidad as Severidad) : 'medio',
      titulo: texto(h, 'titulo') || 'Observación a las bases',
      seccion: 'Específica',
      capitulo: `${c.rotulo} — ${c.titulo}`,
      numeral: texto(h, 'numeral'),
      enLasBases,
      ...(texto(h, 'enElEstandar') ? { enElEstandar: texto(h, 'enElEstandar') } : {}),
      analisis,
      norma,
      paraElProveedor: {
        tipo: prov.tipo === 'consulta' ? 'consulta' : 'observacion',
        solicitud: texto(prov, 'solicitud'),
      },
      paraLaEntidad: texto(h, 'paraLaEntidad'),
      origen: 'revision',
      avisos: [],
    };
    const repetido = salida.findIndex((x) => mismoHallazgo(x, candidato));
    if (repetido >= 0) {
      // Se queda el más grave de los dos.
      if (PESO[candidato.severidad] < PESO[salida[repetido].severidad]) {
        salida[repetido] = { ...candidato, id: salida[repetido].id };
      }
      continue;
    }
    n += 1;
    salida.push({ ...candidato, id: `${c.rotulo.replace(/\s+/g, '-').toLowerCase()}-${n}` });
  }

  // Las citas se auditan al final, una vez por hallazgo que queda.
  for (const h of salida) {
    h.avisos = (await auditarCitas(`${h.analisis}\n${h.norma}`, `${sustento}\n${c.estandar}`, p.buscarEnBiblioteca)).avisos;
  }
  return salida;
}
