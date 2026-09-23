/**
 * El Word del requerimiento.
 *
 * Lo compone `documentos/word.ts`, el mismo compositor del acta y de las
 * cartas: los modelos de César comparten casa y solo cambian medidas. Lo
 * que es propio del requerimiento es qué formato le toca: los anexos de
 * menores a 8 UIT van en la ficha de una columna; los procedimientos de
 * selección, con títulos numerados y el cuerpo sangrado.
 *
 * El Word no sale del Markdown: con él se perdía la forma de los quince
 * formatos. Ver `documentos/piezas.ts`.
 */
import { FORMATO_REQUERIMIENTO, FORMATO_REQUERIMIENTO_FICHA, piezasADocx } from '../documentos/word';
import type { Pieza } from '../documentos/piezas';
import type { PlantillaRequerimiento } from './plantilla-tipos';

export async function requerimientoADocx(
  piezas: Pieza[],
  plantilla: Pick<PlantillaRequerimiento, 'familia'>,
): Promise<Buffer> {
  return piezasADocx(
    piezas,
    plantilla.familia === 'menor_8_uit' ? FORMATO_REQUERIMIENTO_FICHA : FORMATO_REQUERIMIENTO,
  );
}
