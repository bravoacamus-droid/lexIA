/**
 * Lectura tolerante del JSON que devuelve un modelo.
 *
 * Los modelos añaden vallas de código, un párrafo introductorio, comas
 * finales y comillas tipográficas aunque se les pida que no. Estaba
 * resuelto dentro de la ruta de evaluaciones; se saca aquí para que la
 * revisión del requerimiento —y lo que venga— no vuelva a escribirlo.
 */
export function parseJsonLoose<T>(text: string): T {
  // 1. Quitar fences markdown comunes
  const clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^[\s\S]*?(?=\{)/, '') // todo antes del primer {
    .trim();

  // 2. Si el JSON está completo, parsearlo directo
  try {
    return JSON.parse(clean) as T;
  } catch {
    /* sigue intentando */
  }

  // 3. Extraer el bloque más grande entre primer { y último }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`No JSON object found. Sample: ${text.slice(0, 200)}`);
  }
  const candidate = clean.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch (err) {
    // 4. Último intento: arreglar errores comunes (trailing commas, comillas inteligentes)
    const fixed = candidate
      .replace(/,(\s*[}\]])/g, '$1') // trailing commas
      .replace(/[“”]/g, '"') // comillas tipográficas
      .replace(/[‘’]/g, "'");
    try {
      return JSON.parse(fixed) as T;
    } catch {
      throw new Error(
        `Parse JSON falló: ${(err as Error).message}. Sample (primeros 300 chars del candidato): ${candidate.slice(0, 300)}`,
      );
    }
  }
}
