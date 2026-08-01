import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';

/**
 * Reescribe la consulta del usuario a TERMINOLOGÍA JURÍDICA para
 * recuperar la norma base.
 *
 * PROBLEMA GENERAL que resuelve (detectado 01/08/2026): los usuarios
 * preguntan en lenguaje coloquial de caso ("si la entidad no tiene listo
 * el contrato dentro de los tres días de haber subsanado nuestra
 * oferta...") mientras la norma usa vocabulario técnico ("cuando la
 * entidad contratante no cumpla con perfeccionar el contrato... el
 * postor ganador puede requerir su cumplimiento"). El embedding de la
 * pregunta coloquial se parece más a pronunciamientos —que narran casos
 * con ese mismo registro informal y son mucho más numerosos— que al
 * artículo que responde exactamente. Resultado: el chat contestaba
 * "en los fragmentos disponibles no aparece regulado" pese a que SÍ
 * está regulado.
 *
 * Esto sustituye la necesidad de escribir un patrón a mano por cada
 * tema: el modelo genera las frases de búsqueda técnicas para
 * CUALQUIER consulta. Las expansiones manuales de query-expansion.ts se
 * mantienen porque codifican vocabulario verificado del corpus para los
 * temas más consultados.
 *
 * Las frases resultantes se usan SOLO para buscar, nunca como contenido
 * de la respuesta, así que una imprecisión del modelo no puede
 * introducir información falsa: a lo sumo recupera fragmentos menos
 * pertinentes.
 */

const SYSTEM = `Eres un asistente de BÚSQUEDA en normativa peruana de contrataciones públicas (Ley N° 32069 y su Reglamento DS 009-2025-EF).

Recibes la consulta de un usuario, a menudo en lenguaje coloquial o narrada como un caso. Devuelves 2 frases de búsqueda en TERMINOLOGÍA JURÍDICA que probablemente aparezcan en el articulado que resuelve esa consulta.

REGLAS:
- Solo 2 líneas, una frase por línea, sin numeración, sin viñetas, sin explicaciones.
- Cada frase de 5 a 12 palabras.
- Usa los términos que emplea la norma: perfeccionamiento del contrato, buena pro, postor ganador, entidad contratante, penalidad por mora, resolución del contrato, ampliación de plazo, prestación adicional, impedimento, nulidad, recurso de apelación, etc.
- NO inventes números de artículo. Si no estás seguro del número, omítelo y describe el supuesto.
- Si la consulta ya está en lenguaje técnico, reformúlala igual con sinónimos normativos.

EJEMPLO
Consulta: "la entidad no tiene listo el contrato y ya pasaron los días, qué hago para no tener problemas"
Respuesta:
entidad contratante no cumple con perfeccionar el contrato dentro del plazo
postor ganador requiere el cumplimiento y deja de estar obligado a suscribir`;

/**
 * @returns hasta 2 frases de búsqueda en registro jurídico. Array vacío
 *   si el modelo falla o excede el tiempo — el retrieval continúa
 *   normalmente, así que esta mejora nunca puede romper una respuesta.
 */
export async function rewriteToLegalQueries(
  query: string,
  timeoutMs = 2500,
): Promise<string[]> {
  const q = query.trim();
  // Consultas muy cortas ("¿qué es el requerimiento?") ya son precisas;
  // reescribirlas agrega latencia sin beneficio.
  if (q.length < 40) return [];

  try {
    const result = await Promise.race([
      generateText({
        model: fastModel,
        system: SYSTEM,
        prompt: q,
        temperature: 0,
        maxTokens: 90,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      ),
    ]);

    return result.text
      .split('\n')
      .map((l) => l.replace(/^[\s\-*\d.)]+/, '').trim())
      .filter((l) => l.length >= 15 && l.length <= 160)
      .slice(0, 2);
  } catch (err) {
    console.warn('[query-rewrite] omitido:', (err as Error).message);
    return [];
  }
}
