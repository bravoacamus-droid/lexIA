/**
 * Endereza el markdown que devuelve el modelo antes de pintarlo.
 *
 * POR QUÉ EXISTE
 *
 * El prompt traía los encabezados escritos como `**## Marco normativo
 * aplicable**`, con las negritas envolviendo la almohadilla. El modelo
 * copiaba la forma al pie de la letra, y markdown entonces no ve un
 * encabezado sino un párrafo en negrita cuyo texto empieza por «##».
 * En pantalla salía la almohadilla a la vista y el título pegado al
 * párrafo siguiente. Lo reportó César el 31/08/2026 sobre el chat, y
 * afectaba a 181 de las 340 respuestas guardadas.
 *
 * El prompt ya está corregido, pero esas respuestas siguen en la base y
 * se releen cada vez que alguien abre la conversación. Además, el
 * modelo se desvía de lo que se le pide más a menudo de lo que
 * conviene suponer: enderezarlo al pintar cubre las dos cosas.
 *
 * Se limita a lo que es inequívocamente un error de forma. No toca el
 * contenido, no reescribe las citas y no adivina intenciones.
 */

/** Un encabezado envuelto en negritas, solo o con dos puntos al final. */
const ENCABEZADO_EN_NEGRITA = /^[ \t]*(?:\*\*|__)[ \t]*(#{1,6})[ \t]*(.+?)[ \t]*(?:\*\*|__)[ \t]*:?[ \t]*$/gm;

/** Una almohadilla sin el espacio que markdown exige detrás. */
const SIN_ESPACIO = /^([ \t]*#{1,6})(?=[^\s#])/gm;

export function normalizarMarkdownModelo(texto: string): string {
  if (!texto) return texto;

  let salida = texto.replace(ENCABEZADO_EN_NEGRITA, (_, almohadillas, titulo) => {
    // Las negritas de dentro del título sí se quedan; lo que sobra es
    // el par que envolvía la línea entera.
    return `${almohadillas} ${String(titulo).trim()}`;
  });

  salida = salida.replace(SIN_ESPACIO, '$1 ');

  // Un encabezado pegado al párrafo anterior se pinta igual, pero uno
  // pegado al texto que le sigue en la misma línea no: eso ya no es un
  // encabezado para markdown. No se parte, porque no hay forma de saber
  // dónde acaba el título; se deja como está.
  return salida;
}
