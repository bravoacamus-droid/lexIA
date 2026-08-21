/**
 * Preguntas que piden enumerar casos, no explicar una norma.
 *
 * POR QUÉ EXISTE
 *
 * César pidió el 21/08/2026 "al menos 10 casos que resolvió el Tribunal
 * respecto a los FACTORES DE EVALUACIÓN, específicamente sobre la
 * 'Integridad en la contratación pública'". El chat devolvió otras
 * resoluciones y se dejó fuera cinco que él conoce, todas en la
 * biblioteca y todas sobre ese factor.
 *
 * No era un fallo de ranking: medido, hay 1 178 documentos que tratan
 * esa misma frase. Ningún orden por parecido va a poner justo esos cinco
 * arriba. El problema es anterior: a "dame diez casos" se respondía con
 * quince FRAGMENTOS ordenados por parecido, cuando lo que hace falta son
 * diez DOCUMENTOS distintos que traten el tema.
 *
 * Este módulo reconoce esa clase de pregunta y saca la frase con la que
 * hay que buscar. Lo que se busca es la frase LITERAL: cuando alguien
 * escribe el nombre exacto de un factor de evaluación o de una
 * infracción, ese nombre es mejor pista que cualquier vector.
 */

export interface PeticionEnumeracion {
  /** Cuántos casos pide. Sin número explícito, diez. */
  cantidad: number;
  /**
   * Frases con las que buscar, en orden de confianza.
   *
   * Lo entrecomillado va primero: si el usuario se molestó en poner
   * comillas, ha escrito el nombre exacto de la figura.
   */
  frases: string[];
}

/** Verbos y sustantivos con los que se pide una lista de casos. */
const PIDE_LISTA =
  /\b(?:casos?|resoluciones|pronunciamientos|opiniones|ejemplos|precedentes|antecedentes)\b/i;

/** "10 casos", "al menos 10", "diez resoluciones". */
const EN_LETRAS: Record<string, number> = {
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  quince: 15,
  veinte: 20,
};

/** Comillas de todo tipo, que es como la gente marca el nombre exacto. */
const ENTRECOMILLADO = /[«"“”']([^«»"“”']{6,90})[»"“”']/g;

/**
 * Palabras que no valen como frase de búsqueda por sí solas: aparecen en
 * cualquier resolución y traerían la biblioteca entera.
 */
const DEMASIADO_COMUNES = new Set([
  'contratación pública',
  'contrataciones del estado',
  'tribunal de contrataciones',
  'recurso de apelación',
  'buena pro',
  'procedimiento de selección',
]);

export function detectarEnumeracion(texto: string): PeticionEnumeracion | null {
  if (!PIDE_LISTA.test(texto)) return null;

  // El número solo cuenta si acompaña a la palabra que pide la lista:
  // "10 casos" sí, "artículo 10" no.
  const cerca = texto.match(
    /\b(?:al menos\s+|por lo menos\s+|m[íi]nimo\s+)?(\d{1,3}|cinco|seis|siete|ocho|nueve|diez|quince|veinte)\s+(?:casos?|resoluciones|pronunciamientos|opiniones|ejemplos|precedentes)\b/i,
  );
  const bruto = cerca?.[1]?.toLowerCase();
  const cantidad = bruto
    ? EN_LETRAS[bruto] ?? Math.min(Math.max(parseInt(bruto, 10) || 10, 1), 30)
    : 10;

  const frases: string[] = [];
  const vistas = new Set<string>();
  for (const m of texto.matchAll(ENTRECOMILLADO)) {
    const frase = m[1].trim();
    const clave = frase.toLowerCase();
    if (vistas.has(clave) || DEMASIADO_COMUNES.has(clave)) continue;
    // Una frase de una sola palabra no delimita nada.
    if (!/\s/.test(frase)) continue;
    vistas.add(clave);
    frases.push(frase);
  }

  // Sin comillas no se inventa una frase: buscar por lo que uno cree que
  // quiso decir el usuario es justo lo que ya hace la búsqueda normal, y
  // esta vía solo aporta cuando hay un nombre exacto que perseguir.
  if (frases.length === 0) return null;

  return { cantidad, frases: frases.slice(0, 2) };
}
