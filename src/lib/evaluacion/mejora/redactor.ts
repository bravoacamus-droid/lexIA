/**
 * De los hallazgos de la auditoría a la versión mejorada.
 *
 * César pidió, en «Estructura de A-LexIA», que la evaluación del
 * requerimiento permita «identificar observaciones y generar una versión
 * mejorada o perfeccionada del requerimiento antes de continuar con la
 * contratación». Hasta ahora la evaluación terminaba en la lista de
 * hallazgos: la corrección la escribía otro.
 *
 * Cada hallazgo se trata por separado y en tres pasos:
 *
 *   1. Se busca su sustento en la biblioteca —bases estándar y Ley
 *      primero— y se comprueba. El auditor se equivoca: marcó como
 *      crítico exigir comprobantes de pago para la experiencia con
 *      privados, que es literalmente lo que piden las bases estándar.
 *      Un hallazgo que la norma no respalda se descarta y se dice por qué.
 *   2. Si procede, el modelo copia del documento el tramo exacto que hay
 *      que cambiar y lo devuelve corregido, tocando solo lo que el
 *      hallazgo pide. Lo que depende de una decisión del área usuaria
 *      —años, plazos, cantidades— va con un hueco, no con una cifra
 *      inventada.
 *   3. Se comprueba que ese tramo exista tal cual en el documento y se
 *      auditan las citas contra el sustento.
 *
 * Nada se aplica aquí. El resultado se guarda y el usuario decide qué
 * entra en la versión mejorada.
 */
import { generateText } from 'ai';
import { generatorModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { auditarCitas, type BuscarEnBiblioteca } from '@/lib/normativa/citas';
import { normalizar, pasajeAlrededor, ubicar, ubicarCita } from './texto';
import type { BuscarSustento } from './sustento';
import type { Mejora, Veredicto } from './tipos';

export interface HallazgoAuditado {
  id: string;
  categoria: string;
  severidad: string;
  titulo: string;
  ubicacion: string;
  extracto_literal: string;
  descripcion: string;
  recomendacion: string;
  fundamento_normativo?: Array<{ norma: string; articulo?: string }>;
}

export interface PeticionDeMejora {
  documento: string;
  hallazgos: HallazgoAuditado[];
  objeto?: string;
  buscarSustento: BuscarSustento;
  /** Para auditar citas; se inyecta en las pruebas. */
  buscarEnBiblioteca?: BuscarEnBiblioteca;
  /** Cuántos hallazgos a la vez. */
  simultaneos?: number;
  /** Para llevar la cuenta del consumo del modelo. */
  alUsar?: (uso: { entrada: number; salida: number }) => void;
}

const REGLAS = `
REGLAS QUE NO SE NEGOCIAN

1. El auditor puede equivocarse. Antes de corregir, compruébalo con el
   SUSTENTO. Si las bases estándar, la Ley N° 32069 o su Reglamento dicen
   lo mismo que el requerimiento, o lo exigen, el hallazgo NO procede:
   veredicto "descartar", y explica en "motivo" qué dice la norma.
2. Si el problema es de redacción —una ambigüedad, una contradicción
   entre apartados, un dato que falta, un error material— no hace falta
   norma para corregirlo: veredicto "aplicar".
3. Si lo que hay que poner depende de una decisión que solo puede tomar
   el área usuaria —cantidades, años de experiencia, plazos, montos,
   características técnicas—, veredicto "decide_area". Propón el texto
   con un hueco entre corchetes donde va esa decisión, por ejemplo
   «[precisar los años de experiencia, sustentados en la indagación de
   mercado]», y di en "decisionPendiente" qué tiene que decidir.
4. La corrección es MÍNIMA: cambia solo lo que el hallazgo exige. No
   reescribas el estilo, no reordenes, no añadas lo que el hallazgo no
   pide. Todo lo demás queda como lo escribió el área usuaria.
5. "textoOriginal" es un tramo COPIADO LITERALMENTE del PASAJE, carácter
   por carácter, y dentro de un solo párrafo: en el PASAJE los párrafos
   van separados por una línea en blanco. Elige el tramo más corto que
   contenga lo que cambia, una oración o parte de ella. Nunca lo resumas,
   nunca lo corrijas, nunca juntes dos párrafos.
6. "textoMejorado" es ese mismo tramo ya corregido, completo, listo para
   reemplazarlo.
7. Cita solo normas que aparezcan en el SUSTENTO, completas: «artículo
   <N> de la Ley N° 32069», «numeral <N.N> del Reglamento aprobado por
   Decreto Supremo N° 009-2025-EF», «las bases estándar de <procedimiento>».
   El régimen vigente es la Ley N° 32069 y su Reglamento; la Ley N° 30225
   y su TUO están derogados y el OSCE es hoy el OECE. Si el requerimiento
   cita el régimen derogado, corregir esa cita sí procede.
8. No inventes cifras, artículos, numerales ni nombres. Si no está en el
   PASAJE ni en el SUSTENTO, va en un hueco.
9. "motivo" va al expediente del área usuaria: no hables del auditor, de
   «el hallazgo» ni de «la observación del auditor». Explica directamente
   qué dice la norma y por qué el texto del requerimiento debe cambiar o
   puede quedarse como está.
10. Español del Perú, registro formal. Devuelve ÚNICAMENTE el JSON.
`.trim();

const FORMA = `
{
  "veredicto": "aplicar" | "descartar" | "decide_area",
  "motivo": "<dos a cuatro oraciones: qué dice la norma y por qué procede o no>",
  "textoOriginal": "<tramo literal del PASAJE; vacío si se descarta>",
  "textoMejorado": "<el tramo corregido; vacío si se descarta>",
  "decisionPendiente": "<qué decide el área usuaria; vacío si no aplica>"
}
`.trim();

const VEREDICTOS: Veredicto[] = ['aplicar', 'descartar', 'decide_area'];

function prompt(h: HallazgoAuditado, pasaje: string | null, sustento: string, objeto?: string): string {
  const fundamento = (h.fundamento_normativo ?? [])
    .map((f) => `${f.norma}${f.articulo ? `, art. ${f.articulo}` : ''}`)
    .join('; ');
  return `Eres especialista en contratación pública del Perú y revisas un
REQUERIMIENTO (términos de referencia o especificaciones técnicas) que
elaboró el área usuaria${objeto ? `, para: ${objeto}` : ''}. Un auditor
automático marcó el posible problema que sigue. Compruébalo contra el
SUSTENTO y, si procede, propone la corrección mínima del texto.

${REGLAS}

HALLAZGO DEL AUDITOR
· Tipo: ${h.categoria} (${h.severidad})
· ${h.titulo}
· Dónde: ${h.ubicacion || '(no indicado)'}
· Lo que cita del documento: «${h.extracto_literal}»
· Por qué lo marca: ${h.descripcion}
· Qué recomienda: ${h.recomendacion}
${fundamento ? `· Normas que invoca (sin comprobar): ${fundamento}` : ''}

${pasaje ? `PASAJE DEL REQUERIMIENTO\n${pasaje}` : 'El pasaje citado por el auditor no se encontró en el documento. Si no puedes identificar un tramo literal, deja "textoOriginal" vacío.'}

${sustento ? `SUSTENTO NORMATIVO DISPONIBLE\n${sustento}` : 'No hay sustento normativo disponible: no cites ninguna norma y no descartes por razones normativas.'}

FORMA DE LA RESPUESTA
${FORMA}`;
}

async function mejorarUno(h: HallazgoAuditado, p: PeticionDeMejora): Promise<Mejora> {
  const tramo = h.extracto_literal ? ubicarCita(p.documento, h.extracto_literal) : null;
  const pasaje = tramo ? pasajeAlrededor(p.documento, tramo) : null;
  const sustento = await p.buscarSustento(
    `${h.titulo}. ${h.descripcion} ${h.extracto_literal}`.slice(0, 900),
  );

  let salida: Record<string, unknown> = {};
  try {
    const { text, usage } = await generateText({
      model: generatorModel,
      prompt: prompt(h, pasaje, sustento, p.objeto),
      temperature: 0.1,
    });
    p.alUsar?.({ entrada: usage?.promptTokens ?? 0, salida: usage?.completionTokens ?? 0 });
    salida = parseJsonLoose<Record<string, unknown>>(text);
  } catch (e) {
    console.error('[mejora] el modelo no respondió para', h.id, (e as Error).message);
  }

  const texto = (k: string) => (typeof salida[k] === 'string' ? (salida[k] as string).trim() : '');
  let veredicto: Veredicto = VEREDICTOS.includes(salida.veredicto as Veredicto)
    ? (salida.veredicto as Veredicto)
    : 'decide_area';
  let motivo = texto('motivo');
  let textoOriginal = veredicto === 'descartar' ? '' : texto('textoOriginal');
  let textoMejorado = veredicto === 'descartar' ? '' : texto('textoMejorado');
  const decisionPendiente = veredicto === 'decide_area' ? texto('decisionPendiente') : '';

  if (!motivo && Object.keys(salida).length === 0) {
    motivo = 'No se pudo comprobar este hallazgo. Revísalo a mano antes de corregir el requerimiento.';
  }
  // Una «corrección» que deja el texto igual no es una corrección.
  if (veredicto !== 'descartar' && textoOriginal && normalizar(textoOriginal).texto === normalizar(textoMejorado).texto) {
    textoMejorado = '';
  }
  if (veredicto !== 'descartar' && !textoMejorado) {
    textoOriginal = '';
  }

  // El tramo tiene que estar en el documento, y una sola vez cerca de
  // donde citó el auditor.
  const anclado = Boolean(textoOriginal) && ubicar(p.documento, textoOriginal) !== null;

  const auditoria = await auditarCitas(`${motivo}\n${textoMejorado}`, sustento, p.buscarEnBiblioteca);

  // Si no hay nada que proponer, lo que queda es la decisión del área.
  if (veredicto === 'aplicar' && !textoMejorado) veredicto = 'decide_area';

  return {
    hallazgoId: h.id,
    veredicto,
    motivo,
    textoOriginal,
    textoMejorado,
    decisionPendiente: decisionPendiente || undefined,
    anclado,
    avisos: auditoria.avisos,
    incluir: veredicto !== 'descartar' && anclado && Boolean(textoMejorado),
  };
}

export async function proponerMejoras(p: PeticionDeMejora): Promise<Mejora[]> {
  const simultaneos = Math.max(1, p.simultaneos ?? 4);
  const salida: Mejora[] = new Array(p.hallazgos.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(simultaneos, p.hallazgos.length) }, async () => {
      while (siguiente < p.hallazgos.length) {
        const i = siguiente++;
        salida[i] = await mejorarUno(p.hallazgos[i], p);
      }
    }),
  );
  return salida;
}
