/**
 * Las partes de un acto normativo.
 *
 * ## El problema que resuelve
 *
 * Una directiva no es un archivo: es un acto con varias piezas —el texto
 * de la directiva, la resolución que la aprueba, las que la modifican y
 * sus anexos—, y cada pieza se ingirió como un documento propio. Como
 * todas llevan el mismo título, la biblioteca las pintaba una debajo de
 * otra y parecían duplicados. César lo reportó el 23/09/2026: «aquí se
 * duplica 7 veces (solo debe haber dos…)».
 *
 * Aquí se decide **a qué acto pertenece cada documento** y **qué papel
 * cumple dentro de él**, para poder mostrar el acto una sola vez con sus
 * partes dentro. No se borra nada: las siete piezas siguen existiendo,
 * son consultables y el buscador las sigue encontrando; lo que cambia es
 * que se presentan como lo que son.
 *
 * ## De dónde sale el dato
 *
 * De la ingesta de los documentos que entregó el cliente:
 *   · `metadata.package_folder` — la carpeta del acto. Es la agrupación.
 *   · `number` — el nombre de la pieza dentro de la carpeta, que puede
 *     ser una etiqueta escrita a mano («Resolución que modifica por
 *     primera vez») o el nombre del PDF de gob.pe
 *     («resolucion-n-065-2025-oece-pre»).
 */

/** Qué papel cumple un documento dentro de su acto. */
export type PapelDeParte = 'norma' | 'modificatoria' | 'aprueba' | 'anexo' | 'otro';

export interface ParteDeActo {
  papel: PapelDeParte;
  /** Cómo se nombra la pieza en pantalla. */
  etiqueta: string;
  /** El número de resolución, si se pudo leer del nombre. */
  resolucion: string | null;
  /** Las modificatorias van después de la norma; los anexos, al final. */
  orden: number;
}

const ORDEN: Record<PapelDeParte, number> = {
  norma: 0,
  aprueba: 1,
  modificatoria: 2,
  otro: 3,
  anexo: 4,
};

const NOMBRE: Record<PapelDeParte, string> = {
  norma: 'Texto de la norma',
  aprueba: 'Resolución que la aprueba',
  modificatoria: 'Modificatoria',
  anexo: 'Anexo',
  otro: 'Documento relacionado',
};

/** El nombre visible de cada papel, para agrupar en pantalla. */
export function nombreDePapel(papel: PapelDeParte): string {
  return NOMBRE[papel];
}

/**
 * Lee el número de resolución de un nombre de archivo de gob.pe.
 *
 * Los PDF llegan con nombres como `resolucion-n-065-2025-oece-pre` o
 * `resolucion-jefatural-n-000048-2025-jefatura`. Recuperar el número es
 * justo lo que pidió César: poder distinguir una modificatoria de otra
 * «con el número de resolución u otra forma de distinción».
 */
export function resolucionDeNombre(nombre: string): string | null {
  const limpio = nombre.replace(/_/g, '-').toLowerCase();
  // resolucion[-jefatural|-directoral][-n]-<numero>-<año>-<emisor...>
  const m = limpio.match(
    /resoluci[oó]n?-?(?:jefatural|directoral|ministerial)?-?[nd]?-?(\d{3,6})-(\d{4})-([a-z0-9-]*)/,
  );
  if (!m) return null;
  const [, numero, anio, cola] = m;
  const emisor = cola
    .split('-')
    .filter((t) => t && !/^(pre|directiva|jefatura|d|v)$/.test(t))
    .map((t) => t.toUpperCase())
    .slice(0, 2)
    .join('-');
  return `N.° ${numero}-${anio}${emisor ? `-${emisor}` : ''}`;
}

/** Convierte un nombre de archivo en algo legible. */
function legible(nombre: string): string {
  const texto = nombre
    .replace(/\.(pdf|docx?)$/i, '')
    .replace(/^\d{6,}-/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Clasifica una pieza a partir de su nombre. `titulo` es el del acto y
 * se usa solo para no repetirlo en la etiqueta.
 */
export function clasificarParte(numero: string | null, titulo?: string | null): ParteDeActo {
  const crudo = (numero ?? '').trim();
  const n = crudo.toLowerCase();
  const resolucion = resolucionDeNombre(crudo);

  const armar = (papel: PapelDeParte, etiqueta: string): ParteDeActo => ({
    papel,
    etiqueta,
    resolucion,
    orden: ORDEN[papel],
  });

  if (!crudo) return armar('norma', 'Texto de la norma');

  // El nombre que ya dice lo que es. Las piezas que se ingestan desde su
  // URL oficial se rotulan así de entrada, y no tiene sentido hacerlas
  // pasar por los rodeos que hacen falta con un nombre de archivo.
  if (/^texto\b/.test(n)) {
    if (/modificaci[oó]n|modificad/.test(n)) {
      const cual = n.match(/primera|segunda|tercera|cuarta/);
      return armar('modificatoria', cual ? `Texto con la ${cual[0]} modificación` : 'Texto modificado');
    }
    return armar('norma', crudo);
  }

  // ── Anexos ──
  if (/^anexo|(^|[\s_-])anexo[\s_-]?\d/.test(n)) {
    const num = n.match(/anexo[\s_-]?(\d+)/);
    return armar('anexo', num ? `Anexo ${num[1]}` : legible(crudo));
  }

  // ── Resoluciones ──
  if (/resoluci/.test(n)) {
    // La que corrige o modifica, antes que la que aprueba: «Resolución de
    // aprobación de la primera modificación» es una modificatoria, no la
    // resolución que creó la norma.
    if (/modific|rectific|corrig/.test(n)) {
      const cual = n.match(/por\s+(primera|segunda|tercera|cuarta)\s+vez/)?.[1]
        ?? n.match(/primera|segunda|tercera|cuarta/)?.[0]
        ?? null;
      // «Rectifica» y «corrige» no son lo mismo que «modifica», y en un
      // acto con varias suele ser lo único que las distingue.
      const verbo = /rectific/.test(n)
        ? 'Rectificatoria'
        : /corrig/.test(n)
          ? 'Fe de erratas'
          : 'Modificatoria';
      return armar(
        'modificatoria',
        [verbo, cual ? `(${cual})` : null, resolucion ? `· Resolución ${resolucion}` : null]
          .filter(Boolean)
          .join(' '),
      );
    }
    if (/aprueba|aprobaci/.test(n)) {
      return armar(
        'aprueba',
        resolucion ? `Resolución que la aprueba ${resolucion}` : 'Resolución que la aprueba',
      );
    }
    // Un PDF de gob.pe llamado «resolucion-…-pre-directiva-x» es la
    // resolución que aprueba la directiva de la carpeta.
    return armar(
      'aprueba',
      resolucion ? `Resolución que la aprueba ${resolucion}` : legible(crudo),
    );
  }

  // ── El texto de la norma, con o sin modificación ──
  if (/modific/.test(n)) {
    const cual = n.match(/primera|segunda|tercera|cuarta/);
    return armar(
      'modificatoria',
      cual ? `Texto con la ${cual[0]} modificación` : 'Texto modificado',
    );
  }
  if (/norma que aprueba/.test(n)) {
    return armar('aprueba', 'Resolución que la aprueba');
  }

  const limpio = legible(crudo);

  /** El nombre reducido a letras y dígitos, para comparar sin ruido. */
  const desnudo = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tituloDesnudo = titulo ? desnudo(titulo) : '';
  const nombreDesnudo = desnudo(crudo);

  // Si el nombre del archivo es —o empieza por— el título del acto, es el
  // texto de la norma: «Directiva N.° 007-2025-OECE-CD», «001-2025-OECE-CD»
  // o «directiva0001_2025ef5401» dicen todos lo mismo que la carpeta.
  if (
    tituloDesnudo &&
    nombreDesnudo.length > 5 &&
    (tituloDesnudo.startsWith(nombreDesnudo) ||
      nombreDesnudo.startsWith(tituloDesnudo) ||
      tituloDesnudo.includes(nombreDesnudo))
  ) {
    return armar('norma', 'Texto de la norma');
  }

  // Y si llevan exactamente los mismos números, también: «Directiva Nº
  // 0001-2025-EF54.01» y «directiva0001_2025ef5401» solo se diferencian
  // en la «Nº», que el nombre del PDF se come. Los números son lo que
  // identifica a una norma, así que comparar solo esos es fiable —una
  // resolución nunca coincide, porque lleva su propio correlativo.
  const digitos = (t: string) => t.replace(/\D/g, '');
  if (titulo && digitos(crudo).length >= 6 && digitos(crudo) === digitos(titulo)) {
    return armar('norma', 'Texto de la norma');
  }

  if (/^(directiva|lineamiento|c[oó]digo|reglamento)/.test(n)) {
    return armar('norma', limpio.length > 46 ? 'Texto de la norma' : limpio);
  }
  // Un PDF suelto del proyecto de la norma también es el texto.
  if (/lineamiento|directiva|proyecto/.test(n)) {
    return armar('norma', 'Texto de la norma');
  }
  return armar('otro', limpio);
}

/**
 * Los tipos que se presentan agrupados. El resto —opiniones,
 * resoluciones del Tribunal, pronunciamientos— son documentos únicos y
 * agruparlos por título los escondería unos dentro de otros.
 */
export const TIPOS_CON_PARTES = new Set([
  'directiva',
  'lineamiento',
  'codigo_etica',
  'bases_estandar',
  'directiva_entidad',
]);

export interface DocumentoAgrupable {
  id: string;
  type: string;
  number: string | null;
  title: string;
  date: string | null;
  metadata?: { package_folder?: string | null; entidad?: string | null } | null;
}

export interface ActoNormativo<D extends DocumentoAgrupable> {
  /** Estable dentro de una lista: sirve de `key`. */
  clave: string;
  titulo: string;
  tipo: string;
  fecha: string | null;
  /** El documento que se abre al pulsar el acto: el texto de la norma. */
  principal: D;
  /** Todas las piezas, la principal incluida, ya ordenadas. */
  partes: Array<{ doc: D; parte: ParteDeActo }>;
  /** Las piezas que son normativa —no anexos—: lo que César llama «fuentes». */
  fuentes: number;
}

/**
 * Agrupa una lista de documentos en actos normativos, conservando el
 * orden de llegada. Los tipos que no se agrupan salen como actos de una
 * sola pieza, así quien pinta la lista no tiene que distinguir casos.
 */
export function agruparEnActos<D extends DocumentoAgrupable>(docs: D[]): Array<ActoNormativo<D>> {
  const porClave = new Map<string, ActoNormativo<D>>();
  const orden: string[] = [];

  for (const d of docs) {
    const agrupa = TIPOS_CON_PARTES.has(d.type);
    const clave = agrupa
      ? `${d.type}::${(d.metadata?.package_folder || d.title).trim().toLowerCase()}`
      : `solo::${d.id}`;

    const parte = agrupa
      ? clasificarParte(d.number, d.title)
      : { papel: 'norma' as const, etiqueta: 'Texto de la norma', resolucion: null, orden: 0 };

    const ya = porClave.get(clave);
    if (!ya) {
      orden.push(clave);
      porClave.set(clave, {
        clave,
        titulo: d.title,
        tipo: d.type,
        fecha: d.date,
        principal: d,
        partes: [{ doc: d, parte }],
        fuentes: 0,
      });
      continue;
    }
    ya.partes.push({ doc: d, parte });
    // La fecha del acto es la más antigua de sus piezas: la de origen.
    if (d.date && (!ya.fecha || d.date < ya.fecha)) ya.fecha = d.date;
  }

  const salida: Array<ActoNormativo<D>> = [];
  for (const clave of orden) {
    const acto = porClave.get(clave)!;
    acto.partes.sort((a, b) => a.parte.orden - b.parte.orden || a.parte.etiqueta.localeCompare(b.parte.etiqueta));
    // Se abre por el texto de la norma; si no lo hay, por la primera pieza.
    acto.principal = (acto.partes.find((p) => p.parte.papel === 'norma') ?? acto.partes[0]).doc;
    acto.fuentes = acto.partes.filter((p) => p.parte.papel !== 'anexo').length;
    salida.push(acto);
  }
  return salida;
}
