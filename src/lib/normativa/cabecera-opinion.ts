/**
 * La cabecera de una opinión de la Dirección Técnico Normativa.
 *
 * Documento 11 de César (30/09/2026): «la redacción del encabezado de las
 * opiniones, tales como: solicitante, asunto y referencia, debe
 * mejorarse». El texto plano de la ingesta la deja pegada al párrafo de
 * la constancia de firma digital («Esta es una copia auténtica
 * imprimible…»), que además se repite al inicio de cada página.
 *
 * Aquí se quita esa constancia de todo el texto y se separan los datos
 * de la cabecera para mostrarlos como en el documento original:
 *
 *   Jesús María, 05 de Enero del 2026
 *   OPINIÓN N° D000001-2026-OECE-DTN            Expediente N° 105783
 *                                               T.D. N° 31950100
 *   SOLICITANTE : …
 *   ASUNTO      : …
 *   REFERENCIA  : …
 */
import { sinConstancias } from './constancias';

export interface CabeceraDeOpinion {
  lugarFecha: string | null;
  expediente: string | null;
  td: string | null;
  solicitante: string | null;
  asunto: string | null;
  referencia: string | null;
}

/** La constancia de firma digital del OECE / OSCE, en cualquier página. */
const RX_CONSTANCIA =
  /(?:P[áa]g(?:ina)?\.?\s*\d+\s*de\s*\d+\s*)?Esta es una copia aut[ée]ntica imprimible[\s\S]{0,1200}?(?:validador\.xhtml|ingresando la siguiente clave:\s*\S+)/gi;

export function sinConstanciaDeFirma(texto: string): string {
  return sinConstancias(texto.replace(RX_CONSTANCIA, ' '));
}

export function separarCabeceraDeOpinion(raw: string): { cabecera: CabeceraDeOpinion | null; resto: string } {
  const texto = sinConstanciaDeFirma(raw);
  const cabeza = texto.slice(0, 2500);
  const campo = (rx: RegExp) => {
    const m = rx.exec(cabeza);
    return m ? m[1].replace(/\s+/g, ' ').trim().replace(/[.;]$/, '') : null;
  };
  const solicitante = campo(/SOLICITANTE\s*:\s*([\s\S]+?)(?=\s+ASUNTO\s*:)/i);
  const asunto = campo(/ASUNTO\s*:\s*([\s\S]+?)(?=\s+REFERENCIA\s*:)/i);
  const referencia = campo(/REFERENCIA\s*:\s*([\s\S]+?)(?=\s+(?:1\.?\s+ANTECEDENTES?|I\.\s+ANTECEDENTES?|ANTECEDENTES?\b|1\.\s+[A-ZÁÉÍÓÚ]{4,}))/i);
  if (!solicitante && !asunto) return { cabecera: null, resto: texto };

  const cabecera: CabeceraDeOpinion = {
    lugarFecha: campo(/((?:Jes[úu]s Mar[íi]a|San Isidro|Lima|Magdalena del Mar)\s*,\s*\d{1,2}\s+de\s+\w+\s+del?\s+\d{4})/i),
    expediente: campo(/Expediente\s*N[°º.]?\s*([\w-]+)/i),
    td: campo(/T\.\s*D\.\s*(?:N[°º.]?\s*)?([\w-]+)/i),
    solicitante,
    asunto,
    referencia,
  };
  // El cuerpo empieza en los antecedentes; si no se encuentran, después de la referencia.
  const inicio = texto.search(/(?:^|\s)(?:1\.?\s+ANTECEDENTES?|I\.\s+ANTECEDENTES?)\b/i);
  const resto = inicio >= 0 ? texto.slice(inicio).trim() : texto;
  return { cabecera, resto };
}
