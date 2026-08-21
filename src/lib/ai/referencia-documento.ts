/**
 * Detección de referencias a un documento concreto en la pregunta.
 *
 * POR QUÉ EXISTE
 *
 * César pidió el 17/08/2026 el resumen de la "Resolución N° 8902-2025-S2"
 * y el chat respondió que no estaba en la base. Estaba: 22 fragmentos y
 * 58 KB de texto. Lo que falla es el método de búsqueda.
 *
 * Un número de resolución no significa NADA para un embedding: "8902" y
 * "8903" son casi idénticos como vectores y completamente distintos como
 * documentos. Y la búsqueda por palabras exige que casen todos los
 * términos de la frase, cosa que ningún fragmento cumple. Resultado: se
 * devolvían resoluciones con números parecidos —8903, 8907, 8962— y no
 * la pedida.
 *
 * Cuando el usuario nombra un documento, no hay que buscarlo por
 * parecido: hay que ir a buscarlo. Este módulo reconoce la referencia
 * para que quien la use consulte el documento por su número.
 */

export interface ReferenciaDocumento {
  /** Texto tal como lo escribió el usuario. */
  textoOriginal: string;
  /** Núcleo del identificador: "8902-2025". */
  numero: string;
  /**
   * El correlativo como número, sin ceros de relleno.
   *
   * Es la clave buena. La biblioteca guarda "Resolución N° 1727-2026-S2"
   * y César escribió "01727-2026-TCP-S2": comparar cadenas fallaba por
   * un cero. `correlativo_num` está poblado en las 15 399 resoluciones,
   * en las 726 opiniones y en 2 418 de los 2 422 pronunciamientos, y ya
   * normaliza los rellenos —"D000028-2026-OECE-DTN" es el 28—.
   */
  correlativo: number;
  /** Año de cuatro cifras: "2026". */
  anio: string;
  /**
   * Sufijo de sala o dirección: "S2", "DTN", "OSCE-DGR". Puede faltar.
   *
   * Se le quita el acrónimo del Tribunal cuando precede a la sala: la
   * gente escribe "TCP-S2" y la biblioteca guarda "S2". Lo que no se
   * toca es un sufijo con significado propio, como "OSCE-DGR".
   */
  sufijo: string | null;
  /** Tipo deducido de la palabra que precede al número, si la hay. */
  tipo: string | null;
  /** Patrón para comparar contra `normative_documents.number`. */
  patron: string;
}

/** "TCP-S2" y "TCE-S4" son la sala 2 y la 4; el acrónimo sobra. */
function limpiarSufijo(sufijo: string | undefined): string | null {
  if (!sufijo) return null;
  const limpio = sufijo.replace(/^(?:TCP|TCE)[-–]?(?=S\d)/i, '');
  return limpio || null;
}

/** Palabra que nombra el documento → tipo en la biblioteca. */
const TIPOS: Array<[RegExp, string]> = [
  [/resoluci[óo]n/i, 'resolucion_tce'],
  [/opini[óo]n/i, 'opinion'],
  [/pronunciamiento/i, 'pronunciamiento'],
  [/directiva/i, 'directiva'],
  [/lineamiento/i, 'lineamiento'],
];

/**
 * Extrae las referencias a documentos que aparezcan en el texto.
 *
 * Se buscan identificadores con forma "número-año" y, opcionalmente, un
 * sufijo de sala o dirección. Se mira hasta 40 caracteres hacia atrás
 * para deducir de qué tipo de documento se habla; sin esa palabra el
 * tipo queda nulo y la búsqueda abarca todos.
 *
 * No se aceptan referencias sin año: "la resolución 8902" a secas es
 * ambigua entre ejercicios y traería el documento equivocado, que es
 * peor que no traer ninguno.
 */
export function detectarReferencias(texto: string): ReferenciaDocumento[] {
  const encontradas: ReferenciaDocumento[] = [];
  const vistos = new Set<string>();

  // "8902-2025-S2", "023-2024/DTN", "384-2024/OSCE-DGR", "001-2025-OECECD"
  const re = /(\d{1,5})\s*[-–]\s*(20\d{2})(?:\s*[-–/]\s*([A-Za-zÁÉÍÓÚÑ][A-Za-z0-9ÁÉÍÓÚÑ.-]{0,14}))?/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const [completo, num, anio, sufijo] = m;
    const numero = `${num}-${anio}`;
    const clave = `${numero}|${sufijo ?? ''}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const contexto = texto.slice(Math.max(0, m.index - 40), m.index);
    let tipo: string | null = null;
    for (const [patron, t] of TIPOS) {
      if (patron.test(contexto)) {
        tipo = t;
        break;
      }
    }

    encontradas.push({
      textoOriginal: completo.trim(),
      numero,
      correlativo: Number(num),
      anio: anio,
      sufijo: limpiarSufijo(sufijo),
      tipo,
      // Queda como respaldo para los pocos documentos sin correlativo:
      // se compara por el núcleo, sin los ceros de relleno.
      patron: `%${Number(num)}-${anio}%`,
    });
  }

  return encontradas;
}

/**
 * Cuántos fragmentos traer de un documento pedido por su nombre y en qué
 * orden.
 *
 * Una resolución del Tribunal reparte lo que importa entre el principio
 * —sumilla, antecedentes, la controversia— y el final —el análisis y el
 * RESUELVE—. Quedarse con los primeros deja fuera la posición del
 * Tribunal, que es justo la mitad de lo que preguntó César. Por eso se
 * toman los primeros y los últimos cuando el documento no cabe entero.
 */
export function seleccionarFragmentos<T>(fragmentos: T[], tope = 14): T[] {
  if (fragmentos.length <= tope) return fragmentos;
  const inicio = Math.ceil(tope * 0.6);
  const fin = tope - inicio;
  return [...fragmentos.slice(0, inicio), ...fragmentos.slice(-fin)];
}
