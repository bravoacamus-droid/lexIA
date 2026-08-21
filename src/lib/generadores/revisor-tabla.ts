/**
 * Revisión de una tabla del requerimiento.
 *
 * POR QUÉ EXISTE
 *
 * César, el 19/08/2026: "en todos los casos como este que se llena de
 * manera manual debe haber la opción de la IA para mejorar su redacción
 * y/o verificar su cumplimiento". Hasta ahora la ayuda solo alcanzaba a
 * los apartados de texto; las tablas —plazos de las accesorias,
 * entregables, personal clave, penalidades— se llenaban a mano y nadie
 * las miraba, y son justo donde viven los plazos y las cifras.
 *
 * QUÉ DEVUELVE
 *
 * Dos cosas separadas a propósito:
 *
 *   · `observaciones`: qué está mal o falta, fila por fila. Es lo que
 *     de verdad sirve para "verificar su cumplimiento", y no toca nada.
 *   · `filas`: la tabla con la redacción mejorada, con la MISMA forma
 *     —mismas filas y mismas columnas—. Se ofrece para aplicar, y el
 *     usuario decide.
 *
 * Lo que no hace: añadir ni quitar filas, ni cambiar los datos. Un
 * plazo, un importe o un nombre son decisiones del área usuaria. Si algo
 * de eso está mal, se dice en una observación.
 */
import type { BloqueTabla, PlantillaRequerimiento } from './plantilla-tipos';

export interface ObservacionTabla {
  /** Fila a la que se refiere, empezando en 1; 0 si es de la tabla entera. */
  fila: number;
  tipo: 'norma' | 'coherencia' | 'redaccion' | 'falta';
  detalle: string;
}

export interface RevisionTabla {
  observaciones: ObservacionTabla[];
  /** Misma tabla con mejor redacción, o null si no había nada que mejorar. */
  filas: string[][] | null;
}

const TIPOS: ObservacionTabla['tipo'][] = ['norma', 'coherencia', 'redaccion', 'falta'];

export function promptTablaSistema(
  plantilla: PlantillaRequerimiento,
  bloque: BloqueTabla,
): string {
  return `Eres LexIA, revisor jurídico en Contrataciones del Estado peruano (Ley N° 32069 y su Reglamento, DS N° 009-2025-EF).

Revisas UNA tabla del documento "${plantilla.encabezado} — ${plantilla.subtitulo}": "${bloque.etiqueta}".

REGLAS QUE NO PUEDES ROMPER:
- Devuelve SOLO un objeto JSON, sin texto alrededor y sin vallas de código.
- NO cambies los datos: plazos, cantidades, importes, nombres y fechas son decisiones del área usuaria. Si alguno te parece incorrecto, contrario a la norma o incoherente con el resto, dilo en una observación; no lo corrijas.
- NO añadas ni quites filas. "filas" debe tener exactamente el mismo número de filas y de columnas que la tabla que recibes, en el mismo orden.
- En "filas" solo mejoras la redacción: completar una frase, ajustar el registro, quitar ambigüedad. Si una celda ya está bien, devuélvela igual. Si no hay nada que mejorar en toda la tabla, devuelve "filas": null.
- Una celda vacía que debería tener contenido es una observación de tipo "falta"; no la rellenes tú.
- No inventes norma. Cita artículo o numeral solo si aparece en el sustento que se te entrega.
- Sé breve y concreto. Una tabla correcta devuelve pocas observaciones o ninguna, y eso es una respuesta válida.

FORMA DEL JSON:
{
  "observaciones": [
    { "fila": 1, "tipo": "norma" | "coherencia" | "redaccion" | "falta", "detalle": "qué ocurre, en una frase" }
  ],
  "filas": [["celda", "celda"], ["celda", "celda"]]
}`;
}

export function promptTablaUsuario(opts: {
  denominacion: string;
  bloque: BloqueTabla;
  filas: string[][];
  sustento: string;
}): string {
  const partes: string[] = [];
  partes.push(`CONTRATACIÓN: ${opts.denominacion}`);
  partes.push(`\nQUÉ PIDE ESTA TABLA: ${opts.bloque.instruccion ?? opts.bloque.etiqueta}`);
  partes.push(`\nCOLUMNAS: ${opts.bloque.columnas.join(' | ')}`);
  partes.push(
    `\nCONTENIDO ACTUAL (${opts.filas.length} filas):\n` +
      opts.filas
        .map((f, i) => `${i + 1}. ${f.map((c) => (c.trim() ? c.trim() : '(vacía)')).join(' | ')}`)
        .join('\n'),
  );
  if (opts.sustento.trim()) {
    partes.push(`\nSUSTENTO NORMATIVO DISPONIBLE:\n${opts.sustento.trim()}`);
  }
  partes.push('\nDevuelve ahora el JSON de la revisión.');
  return partes.join('\n');
}

/**
 * Filtra lo que devuelve el modelo.
 *
 * Una tabla propuesta que no tiene la misma forma que la original se
 * descarta entera: aplicarla movería datos de columna y el usuario vería
 * un plazo donde iba un lugar. Es preferible quedarse solo con las
 * observaciones.
 */
export function depurarRevisionTabla(
  crudo: unknown,
  original: string[][],
): RevisionTabla {
  const vacio: RevisionTabla = { observaciones: [], filas: null };
  if (!crudo || typeof crudo !== 'object') return vacio;
  const c = crudo as Record<string, unknown>;

  const observaciones: ObservacionTabla[] = [];
  for (const bruto of Array.isArray(c.observaciones) ? c.observaciones : []) {
    if (!bruto || typeof bruto !== 'object') continue;
    const o = bruto as Record<string, unknown>;
    const detalle = typeof o.detalle === 'string' ? o.detalle.trim() : '';
    if (detalle.length < 10) continue;
    const fila = typeof o.fila === 'number' && Number.isFinite(o.fila) ? Math.trunc(o.fila) : 0;
    observaciones.push({
      // Una fila fuera de rango se trata como observación de la tabla.
      fila: fila >= 1 && fila <= original.length ? fila : 0,
      tipo: TIPOS.includes(o.tipo as ObservacionTabla['tipo'])
        ? (o.tipo as ObservacionTabla['tipo'])
        : 'redaccion',
      detalle,
    });
    if (observaciones.length === 40) break;
  }

  let filas: string[][] | null = null;
  const propuestas = c.filas;
  if (
    Array.isArray(propuestas) &&
    propuestas.length === original.length &&
    propuestas.every(
      (f, i) =>
        Array.isArray(f) &&
        f.length === original[i].length &&
        f.every((celda) => typeof celda === 'string'),
    )
  ) {
    const limpias = (propuestas as string[][]).map((f) => f.map((celda) => celda.trim()));
    // Si no cambia nada, no se ofrece: un botón que no hace nada
    // desgasta más que la ausencia del botón.
    const cambia = limpias.some((f, i) => f.some((celda, j) => celda !== original[i][j].trim()));
    if (cambia) filas = limpias;
  }

  return { observaciones, filas };
}
