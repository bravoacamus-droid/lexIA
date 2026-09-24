/**
 * ¿El texto que sacó el lector de PDF se puede leer?
 *
 * Un PDF sin capa de texto se nota: sale vacío, y se transcribe. Pero
 * hay otro caso peor, porque no sale vacío: el PDF trae la capa de
 * texto con una codificación de fuente rota. El Acuerdo de Sala Plena
 * N° 007-2021/TCE, tal como lo publica gob.pe, da cosas como estas:
 *
 *   · «determinaciÛn», «p˙blica», «cu·l», «N∫»: los acentos leídos con
 *     la tabla de Mac en vez de la latina (ó → Û, ú → ˙, á → ·, º → ∫).
 *   · «FRQWUDWDFLyQ» separado por caracteres de control U+0003: las
 *     letras corridas tres puestos («contratación»), de una fuente
 *     subconjunto sin tabla de caracteres.
 *
 * Ese texto se trocea, se vectoriza y se guarda sin que nada falle, y
 * luego ninguna búsqueda lo encuentra. Aquí se detecta para que la
 * ingesta lo trate como un escaneo y lo transcriba de la imagen.
 *
 * Los umbrales dejan pasar el ruido suelto —una tilde mal leída en una
 * nota al pie— y saltan con el daño que se midió: 109 palabras con
 * acento de Mac y cientos de U+0003 en un acuerdo de trece mil
 * caracteres.
 */

/** Una letra, un acento leído con la tabla de Mac, otra letra: «ciÛn». */
const ACENTO_DE_MAC = /\p{L}[ÛÒ∫˙È·Ì¿]\p{L}/gu;

/** Caracteres de control que no son salto de línea ni tabulador. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function textoIlegible(texto: string): boolean {
  const acentosDeMac = (texto.match(ACENTO_DE_MAC) ?? []).length;
  const controles = (texto.match(CONTROL) ?? []).length;
  return acentosDeMac >= 5 || controles >= 20;
}
