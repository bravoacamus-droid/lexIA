/**
 * Las constancias de firma digital que los PDF oficiales repiten en cada
 * página, fuera del texto de la norma.
 *
 * POR QUÉ IMPORTAN
 *
 * Al extraer el texto quedan pegadas en medio del articulado, y en los
 * fragmentos con que busca el chat pesan como cualquier otra frase. El
 * artículo 21 de la Directiva N° 0007-2025-EF/54.01 —la fecha de cierre
 * de la Fase de Clasificación y Priorización— compartía su fragmento con
 * dos de estas constancias: casi la mitad del texto era la del MEF y la
 * de Firma Perú, y el chat no lo recuperaba. Contestaba con la
 * disposición transitoria que aplica la misma regla al periodo
 * 2026-2028 (César, 01/10/2026).
 *
 * Tres variantes:
 *   · OECE: «Esta es una copia auténtica imprimible… validador.xhtml» o
 *     «…ingresando la siguiente clave: XXXX».
 *   · MEF: «Esta es una copia auténtica imprimible… código de verificación
 *     XXXXXXXX», más el pie «Sede Central Jr. Junín N° 319…» y «Documento
 *     electrónico firmado digitalmente en el marco de la Ley N° 27269…».
 *   · Firma Perú: «La integridad del documento y la autoría de la(s)
 *     firma(s) pueden ser verificadas en: https://apps.firmaperu.gob.pe/…».
 */
const PATRONES: RegExp[] = [
  // OECE, MEF y Perú Compras («…verificador/ Clave: 3UMQL8I»): la
  // constancia larga, hasta su cierre.
  /(?:P[áa]g(?:ina)?\.?\s*\d+\s*de\s*\d+\s*)?Esta es una copia aut[ée]ntica imprimible[\s\S]{0,1200}?(?:validador\.xhtml|ingresando la siguiente clave:\s*\S+|c[óo]digo de verificaci[óo]n\s*:?\s*[A-Z0-9]{4,12}\b|Clave\s*:\s*[A-Z0-9]{4,12}\b)/gi,
  // MEF: el pie con la dirección de la sede.
  /Sede Central\s+Jr\.?\s*Jun[íi]n\s+N[°º]?\s*319,?\s*Lima\s*1\s*Tel\.?\s*\(511\)\s*311-5930\s*(?:www\.mef\.gob\.pe)?/gi,
  // Firma digital, con o sin la frase de la ley que la precede.
  /(?:Documento electr[óo]nico firmado digitalmente en el marco de la Ley N[°º]?\s*27269[\s\S]{0,120}?modificatorias\.\s*)?La integridad del documento y la autor[íi]a de la\(s\) firma\(s\) pueden ser verificadas en:?\s*https?:\/\/apps\.firmaperu\.gob\.pe\/web\/validador\.xhtml/gi,
];

export function sinConstancias(texto: string): string {
  let t = texto;
  for (const rx of PATRONES) t = t.replace(rx, ' ');
  return t.replace(/[ \t]{2,}/g, ' ');
}

/** ¿Tiene alguna? Para no reescribir lo que no cambia. */
export function tieneConstancias(texto: string): boolean {
  return PATRONES.some((rx) => {
    rx.lastIndex = 0;
    const hay = rx.test(texto);
    rx.lastIndex = 0;
    return hay;
  });
}
