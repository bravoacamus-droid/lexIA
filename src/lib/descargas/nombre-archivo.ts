/**
 * El nombre con el que se descarga un documento.
 *
 * POR QUÉ EXISTE ESTE MÓDULO
 *
 * Había una regla distinta en cada ruta de descarga, y tres de ellas
 * borraban las tildes: el acta salía como «Acta de evaluacin» porque
 * `\w` no cubre las letras acentuadas. Un documento que la entidad
 * archiva y remite no puede llegar con el nombre mutilado.
 *
 * Y no basta con limpiar el texto: `Content-Disposition` viaja en una
 * cabecera HTTP, que es ASCII. Un nombre con tildes puesto solo en
 * `filename="…"` llega a merced de cómo lo interprete cada navegador.
 * La forma correcta —RFC 6266— es mandar las dos: `filename` con una
 * versión sin tildes, para el cliente que no entienda más, y
 * `filename*` codificado en UTF-8, que es la que se usa cuando se
 * entiende.
 */

/** Caracteres que ningún sistema de archivos admite en un nombre. */
const PROHIBIDOS = /[<>:"/\\|?*\u0000-\u001F]/g;

/**
 * Limpia un texto para usarlo como nombre de archivo, conservando las
 * tildes, la eñe y los signos de puntuación corrientes.
 */
export function nombreDeArchivo(texto: string, respaldo = 'documento', tope = 90): string {
  const limpio = texto
    .replace(PROHIBIDOS, ' ')
    // Los puntos finales y los espacios al final los recorta Windows por
    // su cuenta, y entonces la extensión queda pegada al texto.
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '')
    .slice(0, tope)
    .trim();
  return limpio || respaldo;
}

/** La versión ASCII, para el `filename` de toda la vida. */
function sinTildes(texto: string): string {
  return (
    texto
      .normalize('NFD')
      // Se quitan los diacríticos ya separados por la normalización.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/["\\]/g, '')
      .trim() || 'documento'
  );
}

/**
 * El valor completo de `Content-Disposition` para una descarga.
 *
 * @param nombre  Nombre ya limpio, con su extensión.
 */
export function cabeceraDescarga(nombre: string): string {
  return `attachment; filename="${sinTildes(nombre)}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}
