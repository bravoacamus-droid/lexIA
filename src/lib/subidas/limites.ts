/**
 * Cuánto pesa, como máximo, lo que se puede enviar en una petición.
 *
 * POR QUÉ EXISTE
 *
 * César subió el 22/08/2026 su "TDR. Servicio de traslado e instalación
 * de gabinete inteligente" —5,6 MB— y la pantalla respondió "Fallo al
 * leer el proyecto: JSON.parse: unexpected character at line 1 column
 * 1". Ese mensaje no lo escribe la aplicación: la petición ni siquiera
 * llegó a ella. El servidor donde vive LexIA corta los envíos que pasan
 * de cuatro megas y medio y contesta con una página de error, y la
 * pantalla intentaba leer esa página como si fuera la respuesta.
 *
 * Lo que había escrito era peor que inútil: las rutas anunciaban topes
 * de 10, 50 y hasta 100 MB que la plataforma nunca iba a dejar pasar. Un
 * límite que se promete y no se cumple hace que el usuario mande un
 * archivo grande, espere, y reciba un error que no explica nada.
 *
 * Así que el número vive aquí, uno solo, y lo miran la pantalla —antes
 * de enviar— y la ruta que recibe.
 */

/**
 * Cuatro megas, con margen por debajo del corte de la plataforma.
 *
 * El margen no es superstición: en una petición con formulario viajan
 * también los nombres de campo, las fronteras entre partes y las
 * cabeceras, y el archivo puede ir codificado. Apurar hasta el límite
 * exacto deja el fallo justo en la frontera, que es donde peor se
 * diagnostica.
 */
export const LIMITE_CUERPO_BYTES = 4 * 1024 * 1024;

/** "5,6 MB", para poder decírselo al usuario. */
export function enMegas(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
