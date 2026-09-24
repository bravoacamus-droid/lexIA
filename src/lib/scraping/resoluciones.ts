/**
 * Cómo se identifica una resolución del Tribunal, en un solo sitio.
 *
 * La ingesta masiva (scripts/ingest-resoluciones-tribunal.ts) y el
 * rastreador automático tenían cada uno su manera: la primera guardaba
 * «Resolución N° 8493-2026-S2» con la URL de la ficha de gob.pe; el
 * segundo, «8493-2026-TCP-S2» con la URL del PDF. Con dos formatos, la
 * restricción unique(type, number) no detenía un duplicado y el
 * rastreador no reconocía nada de lo que ya había traído la ingesta: lo
 * habría vuelto a descargar y vectorizar. Aquí se unifican.
 */

export interface ClaveDeResolucion {
  numero: string;
  anio: number;
  /** «S2»; «S?» si no se sabe. */
  sala: string;
}

/**
 * La clave desde la URL de la ficha (…/normas-legales/8203743-05191-2026-tcp-s6)
 * o desde un título (Resolución N.° 8391-2026-TCP-S5).
 */
export function claveDeResolucion(texto: string): ClaveDeResolucion | null {
  const slug = texto.match(/\/normas-legales\/\d+-0*(\d{1,5})-((?:19|20)\d{2})-tc[ep]-?(?:s(\d))?/i);
  if (slug) return { numero: slug[1], anio: Number(slug[2]), sala: slug[3] ? `S${slug[3]}` : 'S?' };
  const t = texto.match(/0*(\d{1,5})\s*-\s*((?:19|20)\d{2})(?:\s*-\s*TC[EP])?(?:\s*-\s*S(\d))?/i);
  if (!t) return null;
  return { numero: t[1], anio: Number(t[2]), sala: t[3] ? `S${t[3]}` : 'S?' };
}

/** El número como lo guarda la biblioteca: «Resolución N° 8493-2026-S2». */
export function numeroDeResolucion(c: ClaveDeResolucion): string {
  return `Resolución N° ${c.numero}-${c.anio}-${c.sala}`;
}

const MESES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

/**
 * La fecha en que se expidió: la última «Lima, 12 de agosto de 2026» del
 * texto que sea del año de la numeración (las fechas citadas en los
 * antecedentes suelen ser de otros años).
 */
export function fechaDeExpedicion(texto: string, anioEsperado: number): string | null {
  const re = /(?:Lima|Arequipa|Trujillo|Cusco|Piura)\s*,?\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})/gi;
  const hallazgos = [...texto.matchAll(re)];
  for (let i = hallazgos.length - 1; i >= 0; i--) {
    const [, dia, mesTxt, anio] = hallazgos[i];
    const mes = MESES[mesTxt.toLowerCase()];
    if (!mes || Number(anio) !== anioEsperado) continue;
    return `${anio}-${mes}-${String(dia).padStart(2, '0')}`;
  }
  return null;
}
