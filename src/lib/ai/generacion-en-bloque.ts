/**
 * Cuando piden quince preguntas, hay que buscar quince veces.
 *
 * EL PROBLEMA
 *
 * La ruta del chat busca una vez, con lo que escribió el usuario. Eso
 * funciona cuando la pregunta es una: «¿en qué plazo se apela?» trae los
 * fragmentos del artículo 304. Pero cuando la petición es «genérame
 * quince preguntas de examen sobre la fase de selección», el texto de la
 * búsqueda habla de preguntas de examen, no de plazos, ni de garantías,
 * ni de nulidades. Llegan veintitantos fragmentos sobre generalidades y
 * el modelo tiene que escribir quince respuestas concretas: rellena con
 * lo que recuerda.
 *
 * Así salió el fallo que reportó César el 31/08/2026: una pregunta sobre
 * el plazo para apelar, respuesta «tres días hábiles» —el Reglamento
 * dice ocho—, con su cita al lado. Ninguno de los veintiséis fragmentos
 * que se le pasaron contenía ese artículo.
 *
 * QUÉ HACE ESTO
 *
 * Reconoce la petición de generar en bloque y, antes de responder, le
 * pide al modelo los temas concretos que va a tratar. Cada tema se busca
 * por separado y todo se junta. Cuesta una llamada corta de más y evita
 * que el modelo escriba sobre lo que no tiene delante.
 *
 * No cambia nada para una pregunta normal: si no reconoce la forma, no
 * se activa.
 */
import { generateText } from 'ai';
import { chatModel } from './gemini';

export interface PeticionEnBloque {
  /** Cuántas piezas se piden, si se dice. */
  cuantas: number | null;
  /** Qué se pide: preguntas, casos, supuestos… */
  que: string;
}

/**
 * ¿Es una petición de generar varias piezas de golpe?
 *
 * Se pide el verbo y el sustantivo en plural para no confundirla con
 * una pregunta corriente que mencione la palabra «preguntas».
 */
export function detectarGeneracionEnBloque(texto: string): PeticionEnBloque | null {
  const t = texto.trim();
  const verbo =
    /\b(gen[ée]rame|genera|generar|elabora|elaborar|prep[áa]rame|prepara|redacta|redactar|arma|arm[áa]me|dise[ñn]a|form[uú]lame|formula|cre[ae]?me|crea|hazme|haz|dame|list[ae]?me|plantea|plant[ée]ame)\b/i;
  const cosa =
    /\b(preguntas|cuestionario|examen|ex[áa]menes|casos|supuestos|ejercicios|balotario|test|[íi]tems)\b/i;
  if (!verbo.test(t) || !cosa.test(t)) return null;

  // Un número explícito hace la petición inequívoca; sin él se exige que
  // el sustantivo vaya en plural o sea un cuestionario, para no
  // dispararse con «hazme una pregunta».
  const num = t.match(/\b(\d{1,3})\s+(?:preguntas|casos|supuestos|ejercicios|[íi]tems)\b/i);
  const cuantas = num ? parseInt(num[1], 10) : null;
  if (cuantas === null && !/\b(preguntas|cuestionario|balotario|examen|casos|supuestos)\b/i.test(t)) {
    return null;
  }
  if (cuantas !== null && cuantas < 3) return null;

  return { cuantas, que: (t.match(cosa)?.[1] ?? 'preguntas').toLowerCase() };
}

/** Cuántos temas se piden como mucho, para no disparar el coste. */
const TOPE_TEMAS = 10;

/**
 * Los temas concretos que la respuesta va a tratar, en forma de
 * consultas de búsqueda.
 *
 * Se le pide al modelo que los nombre en el vocabulario de la norma
 * —«plazo para interponer recurso de apelación»— y no como títulos de
 * examen, porque lo que sale de aquí va directo a la búsqueda.
 */
export async function temasDeLaPeticion(peticion: string, cuantos: number): Promise<string[]> {
  const { text } = await generateText({
    model: chatModel,
    temperature: 0,
    system:
      'Eres un asistente de contratación pública peruana. Devuelves SOLO una lista, ' +
      'una línea por tema, sin numerar y sin explicar nada.',
    messages: [
      {
        role: 'user',
        content:
          `Un usuario pide esto:\n\n"${peticion}"\n\n` +
          `Enumera ${cuantos} temas concretos de la normativa de contrataciones que esa respuesta ` +
          'debería cubrir. Cada línea debe ser una consulta de búsqueda en el vocabulario de la ' +
          'norma (por ejemplo: "plazo para interponer recurso de apelación contra la buena pro"), ' +
          'no un título de examen. Nada más que las líneas.',
      },
    ],
  });

  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((l) => l.length > 12 && l.length < 200)
    .slice(0, TOPE_TEMAS);
}
