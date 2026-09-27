/**
 * La ruta de continuación de un documento: quién sigue, qué documento le
 * toca y en qué plazo.
 *
 * César (27/09/2026): «La ruta debe ser dinámica, no una cadena fija»; el
 * plazo, «el que resulte de la norma aplicable, el tipo de contrato y el
 * hito comprobado en el expediente. Si falta la fecha de recepción que
 * inicia el cómputo, A-LexIA la solicitará y no inventará un vencimiento».
 * Por eso el plazo sale solo de los cálculos del sistema (calculos.ts),
 * que ya exigen la regla y la fecha de inicio; si no hay cálculo, no hay
 * plazo.
 */
import type { Actuacion, Perfil } from './catalogo';
import type { AnalisisDeActuacion, Calculo, PasoDeLaCadena } from './tipos';

const mismo = (a: string, b: Perfil) => a === b || (b === 'titular' && a === 'aga');

/** El paso que sigue al del perfil que emite, y los que vienen después. */
export function siguientePaso(a: AnalisisDeActuacion, perfil: Perfil): { siguiente: PasoDeLaCadena | null; despues: PasoDeLaCadena[] } {
  const i = a.cadena.findIndex((p) => mismo(p.perfil, perfil));
  const resto = (i >= 0 ? a.cadena.slice(i + 1) : a.cadena).filter((p) => !p.hecho && !mismo(p.perfil, perfil));
  return { siguiente: resto[0] ?? null, despues: resto.slice(1) };
}

/** Qué cálculo da el plazo del paso siguiente, por actuación. */
const PLAZO: Partial<Record<Actuacion, string[]>> = {
  ampliacion_plazo: ['Plazo de la Entidad para pronunciarse'],
  liquidacion: ['Plazo para pronunciarse sobre la liquidación', 'Plazo para presentar la liquidación'],
  reconocimiento_pago: ['Plazo de pago'],
  resolucion: ['Plazo del apercibimiento'],
  complementario: ['Plazo para la contratación complementaria'],
};

export function plazoDelSiguientePaso(a: AnalisisDeActuacion): Calculo | null {
  for (const concepto of PLAZO[a.actuacion] ?? []) {
    const c = a.calculos.find((x) => x.concepto === concepto);
    if (c) return c;
  }
  return null;
}

/**
 * Si la figura pedida no corresponde, su cadena no es la ruta: seguirla
 * sería tramitar lo que el análisis acaba de descartar.
 */
export const MENSAJE_SIN_FIGURA =
  'La figura solicitada no corresponde: la ruta de continuación se arma cuando se defina la figura que sí corresponde (analizando el caso con ella) o se emita el documento que descarta motivadamente la solicitada.';

/** Para la ficha de control: la ruta en líneas de texto. */
export function rutaEnTexto(a: AnalisisDeActuacion, perfil: Perfil, nombre: (p: string) => string): string[] {
  if (!a.figura.corresponde) return [MENSAJE_SIN_FIGURA];
  const { siguiente, despues } = siguientePaso(a, perfil);
  if (!siguiente) return ['Este documento cierra la cadena de la actuación: sigue notificarlo, formalizarlo o registrarlo según corresponda.'];
  const plazo = plazoDelSiguientePaso(a);
  return [
    `Siguiente actuación: ${nombre(siguiente.perfil)} — ${siguiente.documento}${siguiente.condicion ? ` (${siguiente.condicion})` : ''}.`,
    'Insumo que debe recibir: el documento formalmente emitido (con número, fecha y firma) y sus anexos; el borrador de A-LexIA no lo reemplaza.',
    ...(despues.length
      ? [`Después, únicamente si corresponde: ${despues.map((p) => `${nombre(p.perfil)}: ${p.documento.charAt(0).toLowerCase() + p.documento.slice(1)}`).join(' → ')}.`]
      : []),
    plazo
      ? `Plazo: ${plazo.resultado}. ${plazo.detalle} (${plazo.base}).`
      : 'Plazo: el que resulte de la norma aplicable y del hito comprobado en el expediente; no se fija sin la fecha que inicia el cómputo.',
  ];
}
