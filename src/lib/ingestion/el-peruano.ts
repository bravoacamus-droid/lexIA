/**
 * Una norma sacada de una página de El Peruano.
 *
 * gob.pe publica algunas normas no con su PDF propio sino con la página
 * del diario oficial en que salieron, y en esa página van otras normas
 * de otras entidades. El Acuerdo de Sala Plena N° 001-2024/TCE, por
 * ejemplo, comparte página con la designación de una ejecutiva de la
 * OEFA; el 001-2022/TCE, con una autorización de la SMV. Ingestado tal
 * cual, el documento del Tribunal aparece en la búsqueda por un texto
 * que no es suyo.
 *
 * El Peruano cierra cada disposición con su código de despacho —siete
 * dígitos, guion, un dígito: «2272073-1»—. Lo que queda entre el código
 * anterior y el siguiente es una sola norma. Aquí se busca el tramo que
 * contiene la señal de la norma buscada y se descarta el resto, junto
 * con las cabeceras de página («46 NORMAS LEGALES Miércoles 20 de marzo
 * de 2024 El Peruano /»).
 *
 * Si el texto no es una página de El Peruano, o no hay códigos de
 * despacho, o la señal no aparece, se devuelve tal cual: recortar a
 * ciegas sería peor que dejar el ruido.
 */

//
// El lector de PDF a veces pega las piezas sin espacios —«85NORMAS
// LEGALESSábado 2 de diciembre de 2023El Peruano /»— y la transcripción
// las separa con barras —«El Peruano / Miércoles 27 de octubre de 2021 /
// NORMAS LEGALES 31»—: todos los separadores son opcionales.
const DIA = '(?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)';
const FECHA = `${DIA}\\s*\\d{1,2}\\s*de\\s*[a-záéíóú]+\\s*de\\s*\\d{4}`;
const CABECERA = new RegExp(
  `\\s*(?:\\d{1,3}\\s*)?NORMAS LEGALES\\s*${FECHA}\\s*\\/?\\s*El Peruano\\s*\\/?` +
    `|\\s*El Peruano\\s*\\/?\\s*${FECHA}\\s*\\/?\\s*NORMAS LEGALES\\s*\\d{1,3}` +
    `|\\s*(?:\\d{1,3}\\s*)?NORMAS LEGALES\\s*${FECHA}`,
  'gi',
);

/**
 * La separata «Precedentes vinculantes», donde salen los acuerdos de
 * Sala Plena desde 2025, lleva su propia cabecera de página.
 */
const CABECERA_SEPARATA =
  /\s*\d{1,3}\s+El Peruano\s+(?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\s+\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4}\s+PRECEDENTES VINCULANTES\s*\(Constitucionales, Judiciales y Administrativos\)|\s*PRECEDENTES VINCULANTES\s*\(Constitucionales, Judiciales y Administrativos\)\s+El Peruano\s+(?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\s+\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4}\s+\d{1,3}/gi;

/** Y su portada: el número del diario, el lema del año y el fundador. */
const PORTADA = /A[ñn]o\s+[IVXLC]+\s*\/\s*N[º°]\s*\d+[\s\S]{0,500}?SIM[OÓ]N BOL[IÍ]VAR\s*/i;

/** «2272073-1»: el código de despacho que cierra cada disposición. */
// En las páginas antiguas, cuya capa de texto es un OCR del propio
// diario, el guion sale a veces como punto: «1530999.1».
const DESPACHO = /\b\d{6,8}[-.]\d\b/g;

/**
 * El sello de la firma digital de Editora Perú. Va al pie de CADA
 * página, no solo de la última: se quita el sello y nada más, o se
 * pierde todo lo que sigue —así se quedó el Acuerdo N° 007-2021/TCE en
 * 893 caracteres la primera vez—.
 */
const FIRMA_EDITORA =
  /\s*Firmado (?:digitalmente )?por:\s*Editora Per[uú](?:\s*Fecha:\s*\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)?/gi;

export function esPaginaDeElPeruano(texto: string): boolean {
  return /NORMAS LEGALES|PRECEDENTES VINCULANTES/.test(texto) && /El Peruano|editoraperu/i.test(texto);
}

export function recortarDeElPeruano(texto: string, senal: RegExp): string {
  if (!esPaginaDeElPeruano(texto)) return texto;
  const limpio = texto
    .replace(PORTADA, '')
    .replace(CABECERA, ' ')
    .replace(CABECERA_SEPARATA, ' ')
    .replace(FIRMA_EDITORA, '');
  const donde = limpio.search(senal);
  if (donde < 0) return texto;

  const despachos = [...limpio.matchAll(DESPACHO)].map((m) => ({
    inicio: m.index ?? 0,
    fin: (m.index ?? 0) + m[0].length,
  }));
  if (despachos.length === 0) return limpio.trim();

  const antes = despachos.filter((d) => d.fin <= donde).pop();
  const despues = despachos.find((d) => d.inicio >= donde);
  return limpio
    .slice(antes ? antes.fin : 0, despues ? despues.inicio : limpio.length)
    // En la separata el código lleva una letra delante: «J-2400961-1».
    .replace(/\s*[A-Z]-$/, '')
    .trim();
}
