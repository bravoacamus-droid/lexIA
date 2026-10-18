/**
 * Une los resultados del reconocimiento de voz en un solo texto.
 *
 * POR QUÉ
 *
 * En Chrome de computadora, con el dictado continuo, cada resultado es un
 * trozo nuevo («qué es» y luego «la capacidad máxima»), y basta con
 * concatenarlos. En Chrome de Android cada resultado trae la frase
 * ACUMULADA («Qué», «Qué es», «Qué es la», «Qué es la capacidad»…), y al
 * concatenarlos el cuadro del chat quedaba así (César, 17/10/2026, desde
 * su celular): «Qué Qué es Qué es la Qué es la Qué es la capacidad…».
 *
 * Aquí cada resultado se une al texto por superposición de palabras:
 *   · si el nuevo empieza con todo lo anterior, lo reemplaza (Android);
 *   · si empieza con el final de lo anterior, se agrega solo lo que falta;
 *   · si no se superponen, se agrega entero (computadora);
 *   · si ya está contenido al final, no se repite.
 */

const normal = (p: string) =>
  p
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

function palabras(t: string): string[] {
  return t.split(/\s+/).filter(Boolean);
}

/** Une `nuevo` al texto `previo` sin repetir lo que ya está. */
export function unirTrozo(previo: string, nuevo: string): string {
  const a = palabras(previo);
  const b = palabras(nuevo);
  if (b.length === 0) return previo.trim();
  if (a.length === 0) return b.join(' ');
  const na = a.map(normal);
  const nb = b.map(normal);
  // El nuevo contiene a todo lo anterior al principio: es la frase acumulada.
  if (na.length <= nb.length && na.every((w, i) => w === nb[i])) return b.join(' ');
  // El nuevo ya está dentro de lo anterior (llega repetido o más corto).
  for (let i = 0; i + nb.length <= na.length; i++) {
    if (nb.every((w, j) => w === na[i + j])) return a.join(' ');
  }
  // La mayor superposición entre el final de lo anterior y el principio del nuevo.
  for (let k = Math.min(na.length, nb.length); k > 0; k--) {
    let coincide = true;
    for (let j = 0; j < k; j++) {
      if (na[na.length - k + j] !== nb[j]) {
        coincide = false;
        break;
      }
    }
    if (coincide) return [...a, ...b.slice(k)].join(' ');
  }
  return [...a, ...b].join(' ');
}

/** El texto de todos los resultados de una sesión de dictado. */
export function unirResultados(trozos: string[]): string {
  return trozos.reduce((acc, t) => unirTrozo(acc, t), '').trim();
}
