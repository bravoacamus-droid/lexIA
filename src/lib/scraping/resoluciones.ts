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
 *
 * LA SIGLA DEL TRIBUNAL (César, documento 13, 10/10/2026): «las siglas
 * de las resoluciones le falta "TCE o TCP", según corresponda. Esto trae
 * como consecuencia al poner en el buscador y tratar de ubicar una
 * resolución, este no identifica la resolución consultada». Al unificar
 * se había dejado fuera la sigla —«8493-2026-S2»— y nadie cita así: la
 * numeración oficial es «8493-2026-TCP-S2» (Tribunal de Contrataciones
 * Públicas, Ley N° 32069) o «…-TCE-S2» (Tribunal de Contrataciones del
 * Estado, régimen anterior). Desde entonces la sigla va en el número y
 * se saca del propio texto de la resolución, no de la fecha: en abril y
 * mayo de 2025 convivieron las dos. Lo ya cargado se corrigió con
 * scripts/corregir-siglas-resoluciones.ts.
 */

export type SiglaDelTribunal = 'TCE' | 'TCP';

export interface ClaveDeResolucion {
  numero: string;
  anio: number;
  /** «S2»; «S?» si no se sabe. */
  sala: string;
  /** «TCP» o «TCE», si la fuente la trae. */
  sigla?: SiglaDelTribunal | null;
}

function aSigla(s: string | undefined | null): SiglaDelTribunal | null {
  const t = (s ?? '').toUpperCase();
  return t === 'TCE' || t === 'TCP' ? t : null;
}

/**
 * La clave desde la URL de la ficha (…/normas-legales/8203743-05191-2026-tcp-s6)
 * o desde un título (Resolución N.° 8391-2026-TCP-S5).
 */
export function claveDeResolucion(texto: string): ClaveDeResolucion | null {
  const slug = texto.match(/\/normas-legales\/\d+-0*(\d{1,5})-((?:19|20)\d{2})-(tc[ep])-?(?:s(\d))?/i);
  if (slug) {
    return { numero: slug[1], anio: Number(slug[2]), sala: slug[4] ? `S${slug[4]}` : 'S?', sigla: aSigla(slug[3]) };
  }
  // «TCE-TCP-S6» (sic, la 4069-2025) y «TCP- S5»: vale la última sigla,
  // la que va pegada a la sala.
  const t = texto.match(/0*(\d{1,5})\s*-\s*((?:19|20)\d{2})(?:\s*-\s*(?:(TC[EP])\s*-?\s*)+)?(?:\s*-?\s*S(\d))?/i);
  if (!t) return null;
  return { numero: t[1], anio: Number(t[2]), sala: t[4] ? `S${t[4]}` : 'S?', sigla: aSigla(t[3]) };
}

/**
 * El número como lo guarda la biblioteca: «Resolución N° 8493-2026-TCP-S2».
 *
 * Sin ceros de relleno: los propios PDF no se ponen de acuerdo
 * («Resolución Nº 07748-2026-TCP-S4» y «Resolución Nº 6141-2026-TCP-S5»
 * conviven, y la ficha de gob.pe tampoco es constante), así que el
 * correlativo va como número y el buscador acepta las dos formas (ver
 * src/lib/busqueda/numero-de-documento.ts).
 */
export function numeroDeResolucion(c: ClaveDeResolucion): string {
  return `Resolución N° ${c.numero}-${c.anio}-${c.sigla ? `${c.sigla}-` : ''}${c.sala}`;
}

/**
 * Las formas en que pudo quedar guardado el mismo número: con cada sigla
 * y sin ella. Sirve para saber si una resolución ya está antes de
 * descargarla, cuando la sigla definitiva depende de un texto que aún no
 * se ha leído.
 */
export function variantesDeNumeroDeResolucion(c: ClaveDeResolucion): string[] {
  return [
    numeroDeResolucion({ ...c, sigla: 'TCP' }),
    numeroDeResolucion({ ...c, sigla: 'TCE' }),
    numeroDeResolucion({ ...c, sigla: null }),
  ];
}

export interface EncabezadoDeResolucion {
  /** El correlativo sin ceros: «9056». Vacío si solo se leyó el membrete. */
  numero: string;
  anio: number;
  /** La sigla que acompaña al número en el encabezado. */
  sigla: SiglaDelTribunal | null;
  sala: string | null;
  /** La que corresponde al nombre del membrete: «…Públicas» o «…del Estado». */
  membrete: SiglaDelTribunal | null;
}

/**
 * Lo que dice la primera página: «Tribunal de Contrataciones Públicas
 * Resolución Nº 09056-2026-TCP-S3 Página 1 de 12».
 *
 * Solo se mira el arranque del texto: más abajo se citan otras
 * resoluciones y se tomaría la equivocada. Los PDF traen de todo, y se
 * tolera: «Nº 0 5128-2025-TCP-S1», «Nº 6290 2026-TCP-S2»,
 * «Nº 08198--2026-TCP-S4», «TCP- S5», «04069-2025-TCE-TCP-S6».
 */
export function encabezadoDeResolucion(texto: string): EncabezadoDeResolucion | null {
  const inicio = texto.slice(0, 700).replace(/\s+/g, ' ');
  // Con el texto mal decodificado de algunos PDF: «P˙blicas», «ResoluciÛn N∫».
  const nombre = inicio.match(/Tribunal\s+de\s+Contrataciones\s+(P\S{1,2}blicas|del\s+Estado)/i);
  const membrete: SiglaDelTribunal | null = nombre ? (/^p/i.test(nombre[1]) ? 'TCP' : 'TCE') : null;
  const m = inicio.match(
    /Resoluci\S{1,2}n\s*N[^0-9]{0,6}?((?:\d\s?){1,6}?)(?:\s*[-–]+\s*|\s+)((?:19|20)\d{2})(?:[\s\-–]+(?:(TC[EP])[\s\-–]*)+)?(?:[\s\-–]*S\s*[-–]?\s*(\d)\b)?/i,
  );
  if (!m) return membrete ? { numero: '', anio: 0, sigla: null, sala: null, membrete } : null;
  return {
    numero: String(Number(m[1].replace(/\s/g, ''))),
    anio: Number(m[2]),
    sigla: aSigla(m[3]),
    sala: m[4] ? `S${m[4]}` : null,
    membrete,
  };
}

export interface SiglaDecidida {
  sigla: SiglaDelTribunal | null;
  origen: 'encabezado' | 'membrete' | 'ficha de gob.pe' | null;
  /** Las fuentes no coinciden o el texto no la trae: conviene revisarla. */
  dudosa: boolean;
  motivo?: string;
}

/**
 * La sigla de una resolución: la que ella misma se pone.
 *
 * NO se deduce de la fecha. En abril y mayo de 2025 el Tribunal pasó de
 * «del Estado» a «Públicas» y durante semanas salieron resoluciones con
 * el membrete nuevo y la numeración vieja («Tribunal de Contrataciones
 * Públicas — Resolución Nº 03094-2025-TCE-S6»), o con la ficha de gob.pe
 * en TCP y el PDF en TCE.
 *
 * Reglas, en orden:
 *  1. La sigla que acompaña al número en el encabezado. Si la ficha de
 *     gob.pe dice lo mismo, es segura (aunque el membrete diga otra).
 *  2. Si el encabezado y la ficha discrepan y el membrete está con la
 *     ficha, el propio texto se contradice: desempata la ficha (la
 *     publicación oficial). Si no, gana el encabezado. Ambas, dudosas.
 *  3. Sin número legible en el encabezado, la del membrete.
 *  4. Sin nada en el texto, la de la ficha, marcada como dudosa.
 */
export function decidirSigla(texto: string, siglaDeLaFicha?: SiglaDelTribunal | null): SiglaDecidida {
  const e = encabezadoDeResolucion(texto);
  const ficha = siglaDeLaFicha ?? null;
  if (e?.sigla) {
    // El número del encabezado y la ficha coinciden: es la numeración
    // oficial aunque el membrete sea otro. Pasa en cientos de 2026: salas
    // que siguen numerando «…-TCE-S1» bajo el membrete «…Públicas», y la
    // ficha de gob.pe lo publica igual.
    if (!ficha || ficha === e.sigla) {
      const contradice = e.membrete && e.membrete !== e.sigla;
      return contradice && !ficha
        ? { sigla: e.sigla, origen: 'encabezado', dudosa: true, motivo: `el encabezado dice ${e.sigla} y el membrete ${e.membrete}` }
        : { sigla: e.sigla, origen: 'encabezado', dudosa: false };
    }
    // El texto se contradice y la ficha está con el membrete: desempata ella.
    if (e.membrete === ficha) {
      return {
        sigla: ficha,
        origen: 'ficha de gob.pe',
        dudosa: true,
        motivo: `el encabezado dice ${e.sigla}; el membrete y la ficha de gob.pe, ${ficha}`,
      };
    }
    return { sigla: e.sigla, origen: 'encabezado', dudosa: true, motivo: `el texto dice ${e.sigla} y la ficha de gob.pe ${ficha}` };
  }
  if (e?.membrete) {
    return ficha && ficha !== e.membrete
      ? { sigla: e.membrete, origen: 'membrete', dudosa: true, motivo: `el membrete dice ${e.membrete} y la ficha de gob.pe ${ficha}` }
      : { sigla: e.membrete, origen: 'membrete', dudosa: false };
  }
  if (ficha) return { sigla: ficha, origen: 'ficha de gob.pe', dudosa: true, motivo: 'el texto no trae la sigla' };
  return { sigla: null, origen: null, dudosa: true, motivo: 'ni el texto ni la ficha traen la sigla' };
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
