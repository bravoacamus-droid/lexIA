/**
 * Preguntas sobre si se puede exigir algo: «¿en una adquisición de un bien
 * se puede pedir ser partner?».
 *
 * POR QUÉ ES UN CASO APARTE
 *
 * No tienen un sí o un no general. El OECE —en pronunciamientos y
 * opiniones— y el Tribunal han resuelto la misma exigencia en sentidos
 * distintos según qué se compraba, para qué se pidió y en qué etapa: el
 * Pronunciamiento N.° 566-2026/OECE-DSAT suprime la exigencia de ser
 * partner; el 486-2025, el 355-2024 y el 066-2024 la admiten con formas
 * flexibles de acreditación o la llevan al perfeccionamiento del
 * contrato. El chat contestaba «sí se puede» con uno o dos de ellos
 * (César, 01/10/2026). Lo que él pide:
 *
 *   · una respuesta orientativa, no un sí o un no;
 *   · el análisis que haría un especialista: qué se compra, para qué se
 *     exige, qué prestación garantiza, si hay un medio menos restrictivo
 *     y qué reveló la interacción con el mercado;
 *   · TODAS las fuentes que tratan el punto, separadas por la posición
 *     que sostienen, para que el usuario decida con cuál se queda.
 *
 * QUÉ HACE
 *
 * Un filtro barato por la forma de la pregunta y, si pasa, una llamada
 * corta al modelo rápido que decide si de verdad se pregunta por una
 * exigencia y devuelve los términos literales con que esa exigencia
 * aparece en los documentos («partner», «distribuidor autorizado»). Con
 * esos términos la ruta trae, por frase exacta, los pronunciamientos,
 * opiniones y resoluciones que los contienen —la misma búsqueda que la
 * búsqueda avanzada de la biblioteca—, y el modelo recibe la lista y la
 * estructura de respuesta.
 */
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';

/**
 * La forma de una pregunta por una exigencia: un verbo de poder o deber
 * y uno de pedir. Es solo el filtro previo: deja pasar de más y la
 * llamada al modelo decide.
 */
const FORMA =
  /\b(?:puede|pueden|podr[íi]a|podr[íi]an|debe|deben|corresponde|cabe|es\s+(?:v[áa]lido|legal|posible|procedente|correcto|viable)|est[áa]\s+permitido|se\s+permite|es\s+restrictivo|vulnera|restringe)\b[\s\S]{0,80}?\b(?:pedir|exigir|solicitar|requerir|incluir|incorporar|consignar|establecer|considerar|poner|condicionar|acreditar|calificar)\b|\b(?:exigir|pedir|solicitar|requerir)\b[\s\S]{0,40}?\b(?:es\s+v[áa]lido|es\s+legal|procede|restring|direcciona)/i;

export function pareceConsultaDeCriterio(texto: string): boolean {
  return texto.length >= 20 && texto.length <= 1200 && FORMA.test(texto);
}

export interface ConsultaDeCriterio {
  /** La exigencia por la que se pregunta, en pocas palabras. */
  exigencia: string;
  /** Qué se contrata, si la pregunta lo dice. */
  objeto: string | null;
  /** Expresiones literales con que la exigencia aparece en los documentos. */
  terminos: string[];
}

const SISTEMA = `Clasificas consultas sobre contrataciones públicas peruanas.

Responde SOLO un JSON, sin markdown:
{"es_exigencia": true|false, "exigencia": "...", "objeto": "..."|null, "terminos": ["...", "..."]}

- es_exigencia: true si se pregunta si una entidad PUEDE, DEBE o NO DEBE exigir, pedir o incluir un requisito, condición, documento, certificación, experiencia, marca o característica en el requerimiento, las bases o la oferta. False para preguntas de plazos, procedimientos, definiciones o qué dice un artículo.
- exigencia: la exigencia, en 2 a 6 palabras ("ser partner del fabricante").
- objeto: lo que se contrata si la pregunta lo dice ("bienes", "servicio de limpieza"), si no null.
- terminos: de 1 a 3 expresiones CORTAS (1 a 3 palabras, minúsculas) tal como aparecerían escritas en un pronunciamiento o en unas bases para nombrar esa exigencia. La primera, la palabra clave misma. Incluye sinónimos reales del rubro, no paráfrasis. Ejemplo para "ser partner": ["partner", "distribuidor autorizado", "representante autorizado"]. Ejemplo para "certificado ISO 9001": ["iso 9001", "certificación iso"].`;

/** null si no es una consulta por una exigencia, o si el modelo no respondió a tiempo. */
export async function analizarConsultaDeCriterio(
  texto: string,
  tiempoMs = 4000,
): Promise<ConsultaDeCriterio | null> {
  if (!pareceConsultaDeCriterio(texto)) return null;
  try {
    const { text } = await generateText({
      model: fastModel,
      system: SISTEMA,
      prompt: texto.slice(0, 1200),
      temperature: 0,
      maxTokens: 160,
      abortSignal: AbortSignal.timeout(tiempoMs),
    });
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const crudo = JSON.parse(json) as {
      es_exigencia?: boolean;
      exigencia?: string;
      objeto?: string | null;
      terminos?: unknown;
    };
    if (!crudo.es_exigencia) return null;
    const terminos = (Array.isArray(crudo.terminos) ? crudo.terminos : [])
      .map((t) => String(t).trim().toLowerCase())
      // Una expresión de más de tres palabras ya no aparece literal.
      .filter((t) => t.length >= 3 && t.length <= 40 && t.split(/\s+/).length <= 3)
      .slice(0, 3);
    if (terminos.length === 0) return null;
    return {
      exigencia: String(crudo.exigencia ?? terminos[0]).trim().slice(0, 80),
      objeto: crudo.objeto ? String(crudo.objeto).trim().slice(0, 80) : null,
      terminos,
    };
  } catch (e) {
    console.warn('[criterio] omitido:', (e as Error).message);
    return null;
  }
}

/**
 * De los fragmentos de un documento que contienen la exigencia, los que
 * dicen qué se DECIDIÓ.
 *
 * El primero y el último no bastan. En el Pronunciamiento N.° 566-2026
 * el primero solo enumera los cuestionamientos y el último transcribe
 * las bases ya corregidas —con el texto suprimido, que en el PDF va
 * tachado y en el texto extraído se lee como vigente—; la supresión
 * definitiva está en el del medio. El chat lo contó al revés.
 */
const DECISION =
  /\b(?:no\s+acoger|acoger|acoge|suprim|supresi[óo]n|corresponde|dispone|disponer|declar|resuelve|resolvi[óo]|se\s+adecuar|dejar[áa]?\s+sin\s+efecto|este\s+(?:Organismo|Colegiado)|en\s+ese\s+sentido|por\s+lo\s+que)/gi;

export function elegirFragmentosDeCriterio<T extends { indice: number; contenido: string }>(
  fragmentos: T[],
  termino: string,
  tope = 3,
): T[] {
  if (fragmentos.length <= tope) return fragmentos;
  const t = termino.toLowerCase();
  const puntuados = fragmentos.map((f) => {
    const texto = f.contenido.toLowerCase();
    const menciones = texto.split(t).length - 1;
    const decisiones = (f.contenido.match(DECISION) ?? []).length;
    return { f, puntos: decisiones * 2 + Math.min(menciones, 4) };
  });
  // Lo mejor puntuado, y en el orden del documento: planteamiento antes que decisión.
  return puntuados
    .sort((a, b) => b.puntos - a.puntos || b.f.indice - a.f.indice)
    .slice(0, tope)
    .map((x) => x.f)
    .sort((a, b) => a.indice - b.indice);
}

export interface DocumentoDeCriterio {
  tipo: string;
  numero: string | null;
  titulo: string;
  fecha: string | null;
  termino: string;
}

const NOMBRE_TIPO: Record<string, string> = {
  pronunciamiento: 'Pronunciamiento',
  opinion: 'Opinión',
  resolucion_tce: 'Resolución del Tribunal',
  acuerdo_sala_plena: 'Acuerdo de Sala Plena',
};

/**
 * Las instrucciones de respuesta, con la lista de documentos que
 * contienen la exigencia.
 */
export function bloqueDeCriterio(c: ConsultaDeCriterio, documentos: DocumentoDeCriterio[]): string {
  const lista = documentos
    .map((d) => {
      const nombre = d.numero && /\d/.test(d.numero) ? d.numero : d.titulo;
      const tipo = NOMBRE_TIPO[d.tipo] ?? d.tipo;
      return `  - ${nombre.startsWith(tipo.split(' ')[0]) ? nombre : `${tipo} ${nombre}`}${d.fecha ? ` (${d.fecha})` : ''} — contiene «${d.termino}»`;
    })
    .join('\n');

  return `

═══════════════════════════════════════════════════════
CONSULTA SOBRE UNA EXIGENCIA: «${c.exigencia}»${c.objeto ? ` — objeto: ${c.objeto}` : ''}
═══════════════════════════════════════════════════════
Esta pregunta NO se responde con un «sí se puede» ni con un «está prohibido». El OECE (pronunciamientos de la DSAT, opiniones de la DTN) y el Tribunal han resuelto exigencias como esta en sentidos distintos según qué se contrataba, para qué se pidió y en qué etapa. Tu trabajo es dar una orientación y poner delante del usuario las posiciones con sus documentos, para que decida con cuál se queda en su caso. Esta estructura prevalece sobre la de «Marco normativo / Análisis del caso».
${
  documentos.length > 0
    ? `
DOCUMENTOS DE LA BIBLIOTECA QUE TRATAN LA EXIGENCIA (los que más la discuten, del más reciente al más antiguo; de cada uno tienes entre las fuentes los fragmentos donde se plantea y donde se decide):
${lista}

Los emitidos por el OSCE (numeración «/OSCE-DGR», hasta abril de 2025) resolvieron bajo la Ley N° 30225: su razonamiento puede seguir sirviendo, pero dilo al citarlos.

Cuidado al leer lo que se decidió en un pronunciamiento: cuando el OECE ordena «adecuar» un acápite de las bases, transcribe el texto con lo suprimido TACHADO, y en el texto que tienes el tachado se lee igual que el resto. No concluyas de esa transcripción que la exigencia se mantiene: guíate por lo que pidió el participante, por lo que dijo la entidad y por si el cuestionamiento se ACOGIÓ o NO SE ACOGIÓ.
`
    : ''
}
ESTRUCTURA OBLIGATORIA:

## Respuesta orientativa
Dos a cuatro oraciones. La regla de fondo, sin «depende» vacío: en qué condiciones sí es posible y por qué no corresponde incorporarla automáticamente. Y la recomendación para el caso ordinario: si la finalidad puede garantizarse con requisitos menos restrictivos (especificaciones técnicas, garantía comercial, soporte, originalidad, verificación en la recepción y conformidad), dilo.

## Marco normativo
Los artículos de la Ley N° 32069, del Reglamento y de las directivas que regulan el punto (el requerimiento y sus límites, la libre concurrencia, los requisitos de calificación, los documentos para perfeccionar el contrato), cada uno con su número y su cita [N]. Un artículo sin [N] no se escribe: si no lo tienes en los fragmentos, no lo nombres aunque recuerdes de qué trata.

## Análisis
Cinco preguntas, cada una como ### con la respuesta que dan los documentos y su cita:
### 1. ¿Qué se contrata?
### 2. ¿Para qué se exige?
### 3. ¿Qué prestación concreta garantiza?
### 4. ¿Hay un medio menos restrictivo que logre lo mismo?
### 5. ¿Qué reveló la interacción con el mercado?
(Indagación de mercado, consultas y observaciones, cuántos proveedores podían cumplirla.)

## Posiciones en los pronunciamientos, opiniones y resoluciones
Agrupa los documentos por la posición que sostienen, cada grupo como ### con un nombre que la describa (por ejemplo «Se admite si está sustentada y con formas flexibles de acreditación», «Se exige recién para perfeccionar el contrato», «Se suprime por restringir la concurrencia»). Bajo cada una, un punto por documento: **su número completo y fecha** — qué se pidió en ese procedimiento, qué decidió el OECE o el Tribunal y por qué [N]. Clasifica por lo que se RESOLVIÓ, no por lo que alegó el participante o la entidad. Quien SUPRIME la exigencia por completo y quien la MANTIENE en otra etapa (por ejemplo, para perfeccionar el contrato) sostienen posiciones distintas: van en grupos distintos aunque los dos la saquen de la admisión. El régimen anterior no es motivo para apartar un documento: si sostiene una posición, va en ella, con la advertencia. Incluye TODOS los documentos de las fuentes que traten la exigencia, no uno por posición. Los que solo mencionan la exigencia de paso —una sanción por presentar una carta falsa, por ejemplo— no sostienen ninguna posición: van al final en «### Otros casos que la mencionan», con una línea cada uno.

## Conclusión y recomendación práctica
Qué conviene hacer a la entidad (cómo sustentarla y en qué etapa pedirla, si procede) y al postor (cómo cuestionarla o acreditarla), y qué riesgo corre cada uno. Cierra recordando que la elección de la posición depende del caso concreto y de su sustento.`;
}
