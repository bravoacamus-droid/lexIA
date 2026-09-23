/**
 * El Word del requerimiento, compuesto desde sus piezas.
 *
 * POR QUÉ NO SALE DEL MARKDOWN
 *
 * Hasta setiembre de 2026 el ensamblador producía un Markdown y
 * `docx-from-markdown.ts` lo convertía en Word. En ese viaje se perdía lo
 * que hace que el documento sea el formato de César: todas las tablas
 * salían iguales, sin la columna de etiquetas sombreada; los títulos sin
 * sangría francesa; el cuerpo sin alinear bajo su título; y el documento
 * arrancaba con un «Generado con A-LexIA» que no está en ningún formato
 * oficial. Es lo que César señaló: «los formatos que están en el
 * Software aún no están de acuerdo a la estructura alcanzada».
 *
 * CÓMO SE MIDIÓ
 *
 * Abriendo por dentro sus quince .docx. Lo que tienen todos en común, y
 * que aquí se reproduce:
 *
 *   · A4 vertical, márgenes de 3 cm, Arial 10, interlineado sencillo.
 *   · Encabezado y subtítulo centrados, en negrita.
 *   · El cuadro de datos —órgano, POI, CMN, denominación— en dos
 *     columnas, la de las etiquetas en negrita sobre gris azulado
 *     (D5DCE4), y sin número.
 *   · Los cuadros, con la fila de cabecera en ese mismo gris y negrita.
 *   · Las viñetas con guion, los literales «a)».
 *
 * Y en lo que se distinguen las dos familias:
 *
 *   · Procedimientos de selección: títulos «1.» en mayúsculas y «1.1» en
 *     tipo oración, con sangría francesa; el cuerpo justificado y
 *     alineado bajo el texto del título.
 *   · Menores a 8 UIT: el cuerpo entero va en una ficha de una columna.
 *     Cada apartado es una fila gris con «I. FINALIDAD PÚBLICA» y debajo
 *     otra fila con su contenido.
 *
 * Los numerales ya vienen escritos en las piezas (`rotuloDeNumeral`):
 * aquí no se numera nada, solo se compone.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HighlightColor,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { PlantillaRequerimiento } from './plantilla-tipos';
import type { MarcaDePieza, Pieza, PiezaTabla } from './piezas';

// ── Medidas del formato ──────────────────────────────────────────────

/** A4, en veinteavos de punto. */
const ANCHO_PAGINA = 11906;
const ALTO_PAGINA = 16838;
/** 3 cm por lado: 1701. */
const MARGEN = 1701;
/** Lo que queda para escribir: 8504. */
const ANCHO_TEXTO = ANCHO_PAGINA - 2 * MARGEN;

const FUENTE = 'Arial';
/** Arial 10, en medios puntos. */
const TAMANO = 20;
/** El gris azulado de las cabeceras y de las etiquetas. */
const GRIS = 'D5DCE4';
/** El rojo con el que el formato escribe sus advertencias. */
const ROJO = 'FF0000';

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: '000000' } as const;
const BORDES_TABLA = {
  top: BORDE,
  bottom: BORDE,
  left: BORDE,
  right: BORDE,
  insideHorizontal: BORDE,
  insideVertical: BORDE,
};

/** Margen interior de las celdas: el de Word por defecto. */
const MARGEN_CELDA = { top: 40, bottom: 40, left: 108, right: 108 };

/**
 * La sangría de cada nivel. En los procedimientos, el título «1.» deja su
 * texto a 1 cm y el «1.1» a 2 cm; el cuerpo se alinea con el texto de su
 * título. Dentro de la ficha de 8 UIT el sitio es menor y se escalona
 * menos.
 */
interface Escalones {
  paso: number;
  /**
   * Si los subtítulos se pegan al párrafo que les sigue.
   *
   * En el cuerpo normal, sí: un «4.1» solo al pie de una página es un
   * error de maquetación. Dentro de la ficha de 8 UIT, NO: en una celda,
   * Word no pega el párrafo sino la FILA ENTERA a la siguiente, y una
   * fila de cuatro páginas que tiene que ir pegada a otra no cabe en
   * ninguna. Salía la página 2 en blanco con el título del apartado IV
   * arriba y el contenido empezando en la 3.
   */
  pegarTitulos: boolean;
}
const PROCEDIMIENTO: Escalones = { paso: 567, pegarTitulos: true };
const FICHA: Escalones = { paso: 440, pegarTitulos: false };

const sangriaDe = (e: Escalones, nivel: number) => e.paso * Math.max(0, nivel);

// ── El texto de un párrafo ───────────────────────────────────────────

interface Estilo {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  highlight?: (typeof HighlightColor)[keyof typeof HighlightColor];
}

/**
 * Los runs de un texto con **negritas**, *cursivas* y huecos pendientes.
 *
 * `[PENDIENTE: …]` sale resaltado en amarillo y en negrita, venga dentro
 * de un párrafo o suelto: un hueco del documento tiene que verse de un
 * vistazo antes de firmar.
 */
function runs(texto: string, base: Estilo = {}): TextRun[] {
  const salida: TextRun[] = [];
  const nuevo = (t: string, e: Estilo) =>
    new TextRun({ text: t, font: FUENTE, size: TAMANO, ...base, ...e });

  // Primero los pendientes, que pueden venir envueltos en negrita.
  const trozos = texto.split(/(\*{0,2}\[PENDIENTE:[^\]]*\]\*{0,2})/);
  for (const trozo of trozos) {
    if (!trozo) continue;
    const pendiente = trozo.match(/^\*{0,2}(\[PENDIENTE:[^\]]*\])\*{0,2}$/);
    if (pendiente) {
      salida.push(nuevo(pendiente[1], { bold: true, highlight: HighlightColor.YELLOW }));
      continue;
    }
    const marcas = /(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
    let desde = 0;
    let m: RegExpExecArray | null;
    while ((m = marcas.exec(trozo))) {
      if (m.index > desde) salida.push(nuevo(trozo.slice(desde, m.index), {}));
      if (m[1]) salida.push(nuevo(m[1].slice(2, -2), { bold: true }));
      else salida.push(nuevo(m[2].slice(1, -1), { italics: true }));
      desde = m.index + m[0].length;
    }
    if (desde < trozo.length) salida.push(nuevo(trozo.slice(desde), {}));
  }
  if (salida.length === 0) salida.push(nuevo(' ', {}));
  return salida;
}

/** Un párrafo del cuerpo: justificado, bajo su título. */
function parrafo(texto: string, sangria: number, estilo: Estilo = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: sangria },
    spacing: { after: 120, line: 240 },
    children: runs(texto, estilo),
  });
}

// ── Las piezas, una a una ────────────────────────────────────────────

function marcaDe(marca: MarcaDePieza, i: number): string {
  if (marca === 'numero') return `${i + 1}.`;
  if (marca === 'literal') {
    let n = i;
    let letras = '';
    do {
      letras = String.fromCharCode(97 + (n % 26)) + letras;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return `${letras})`;
  }
  if (marca === 'ninguno') return '';
  // El formato usa guiones, no puntos, en sus viñetas.
  return '-';
}

/** Una lista con su marca colgando a la izquierda, como en el formato. */
function lista(
  elementos: string[],
  marca: MarcaDePieza,
  sangria: number,
): Paragraph[] {
  const colgante = marca === 'vineta' ? 284 : 425;
  return elementos.map((el, i) => {
    const m = marcaDe(marca, i);
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { left: sangria + colgante, hanging: m ? colgante : 0 },
      tabStops: [{ type: TabStopType.LEFT, position: sangria + colgante }],
      spacing: { after: 60, line: 240 },
      children: m ? [new TextRun({ text: `${m}\t`, font: FUENTE, size: TAMANO }), ...runs(el)] : runs(el),
    });
  });
}

/**
 * Cuánto ancho le toca a cada columna.
 *
 * El «N.°» va estrecho, como en todos los cuadros del formato; el resto
 * se reparte según lo que traiga cada columna, con un mínimo para que
 * una cabecera corta no quede en una tira.
 */
function anchosDe(t: PiezaTabla, total: number): number[] {
  const estrecha = (c: string) => /^(n\.?\s*[°º]|nº|ítem|item)\.?$/i.test(c.trim());
  const pesos = t.columnas.map((c, j) => {
    if (estrecha(c)) return 0;
    const largos = t.filas.map((f) => (f[j] ?? '').length);
    const medio = largos.length ? largos.reduce((a, b) => a + b, 0) / largos.length : 0;
    // Un mínimo de 16 para que una cabecera de dos palabras no se parta
    // en tres renglones: «Forma de cálculo» salía una palabra por línea.
    return Math.max(c.length, Math.min(medio, 80), 16);
  });
  const fijo: number[] = t.columnas.map((c) => (estrecha(c) ? 600 : 0));
  const libre = total - fijo.reduce((a, b) => a + b, 0);
  const suma = pesos.reduce((a, b) => a + b, 0) || 1;
  return pesos.map((p, j) => (fijo[j] ? fijo[j] : Math.round((libre * p) / suma)));
}

function celda(
  hijos: Array<Paragraph | Table>,
  ancho: number,
  opciones: { gris?: boolean } = {},
): TableCell {
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    margins: MARGEN_CELDA,
    verticalAlign: VerticalAlign.CENTER,
    shading: opciones.gris ? { type: ShadingType.CLEAR, color: 'auto', fill: GRIS } : undefined,
    children: hijos,
  });
}

function textoDeCelda(texto: string, opciones: { negrita?: boolean; centrado?: boolean } = {}) {
  // Un salto de línea dentro de una celda es un párrafo más, no un
  // espacio: una especificación en varias líneas se lee en varias.
  const lineas = texto.split('\n');
  return lineas.map(
    (l) =>
      new Paragraph({
        alignment: opciones.centrado ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
        children: runs(l, opciones.negrita ? { bold: true } : {}),
      }),
  );
}

/** Un cuadro del formato: cabecera gris y en negrita, «N.°» estrecho. */
function tabla(t: PiezaTabla, sangria: number, disponible: number): Array<Paragraph | Table> {
  const salida: Array<Paragraph | Table> = [];
  if (t.titulo) salida.push(parrafo(`**${t.titulo}**`, sangria));

  const ancho = disponible - sangria;
  const anchos = anchosDe(t, ancho);
  const cabecera = new TableRow({
    tableHeader: true,
    children: t.columnas.map((c, j) =>
      celda(textoDeCelda(c, { negrita: true, centrado: true }), anchos[j], { gris: true }),
    ),
  });
  // Un cuadro exigido sale aunque esté vacío —el formato lo trae—, con
  // una fila en blanco para escribir a mano.
  const filas = t.filas.length > 0 ? t.filas : [t.columnas.map(() => '')];
  const cuerpo = filas.map(
    (f) =>
      new TableRow({
        children: t.columnas.map((_c, j) => {
          const v = f[j] ?? '';
          // La primera columna numera las filas: «01» va en negrita y
          // centrado, como en el formato.
          const esNumero = j === 0 && /^\d{1,3}$/.test(v.trim());
          return celda(
            textoDeCelda(esNumero ? v.trim().padStart(2, '0') : v, {
              negrita: esNumero,
              centrado: esNumero,
            }),
            anchos[j],
          );
        }),
      }),
  );

  salida.push(
    new Table({
      width: { size: ancho, type: WidthType.DXA },
      columnWidths: anchos,
      layout: TableLayoutType.FIXED,
      indent: { size: sangria, type: WidthType.DXA },
      borders: BORDES_TABLA,
      rows: [cabecera, ...cuerpo],
    }),
    // Word pega el párrafo siguiente a la tabla si no hay nada entre medio.
    new Paragraph({ spacing: { after: 60 }, children: [] }),
  );
  return salida;
}

/** El cuadro de datos que abre el documento. */
function datos(
  filas: Array<{ etiqueta: string; valor: string; pendiente?: boolean }>,
): Array<Paragraph | Table> {
  // Las proporciones del formato: 3882 y 4606 de 8488.
  const izquierda = Math.round((ANCHO_TEXTO * 3882) / 8488);
  const derecha = ANCHO_TEXTO - izquierda;
  return [
    new Table({
      width: { size: ANCHO_TEXTO, type: WidthType.DXA },
      columnWidths: [izquierda, derecha],
      layout: TableLayoutType.FIXED,
      borders: BORDES_TABLA,
      rows: filas.map(
        (f) =>
          new TableRow({
            children: [
              celda(textoDeCelda(`${f.etiqueta.replace(/:$/, '')}:`, { negrita: true }), izquierda, {
                gris: true,
              }),
              celda(
                textoDeCelda(f.pendiente ? `[PENDIENTE: ${f.etiqueta}]` : f.valor),
                derecha,
              ),
            ],
          }),
      ),
    }),
    new Paragraph({ spacing: { after: 240 }, children: [] }),
  ];
}

/** Un título numerado, con su sangría francesa. */
function titulo(numero: string | undefined, texto: string, nivel: number, e: Escalones): Paragraph {
  const izquierda = sangriaDe(e, nivel);
  return new Paragraph({
    keepNext: e.pegarTitulos,
    alignment: AlignmentType.LEFT,
    indent: numero ? { left: izquierda, hanging: e.paso } : { left: izquierda },
    tabStops: [{ type: TabStopType.LEFT, position: izquierda }],
    spacing: { before: nivel === 1 ? 240 : 160, after: 120, line: 240 },
    children: [
      new TextRun({
        text: numero ? `${numero}\t${texto}` : texto,
        font: FUENTE,
        size: TAMANO,
        bold: true,
      }),
    ],
  });
}

/**
 * Compone una secuencia de piezas del cuerpo.
 *
 * El cuerpo se sangra con el último título visto: lo que va bajo el
 * «4.1» se alinea con el texto del «4.1», no con el margen.
 */
function componer(
  piezas: Pieza[],
  e: Escalones,
  disponible: number,
  nivelInicial: number,
): Array<Paragraph | Table> {
  const salida: Array<Paragraph | Table> = [];
  let nivel = nivelInicial;
  const sangria = () => sangriaDe(e, nivel);

  for (const p of piezas) {
    switch (p.clase) {
      case 'titulo':
        if (p.rol) break;
        if (p.numero) nivel = p.nivel;
        salida.push(titulo(p.numero, p.texto, p.numero ? p.nivel : nivel, e));
        break;
      case 'parrafo':
        salida.push(parrafo(p.texto, sangria()));
        break;
      case 'campo':
        salida.push(
          parrafo(
            `**${p.etiqueta.replace(/:$/, '')}:** ${
              p.pendiente ? `[PENDIENTE: ${p.etiqueta}]` : p.valor
            }`,
            sangria(),
          ),
        );
        break;
      case 'pendiente':
        salida.push(parrafo(`[PENDIENTE: ${p.etiqueta}]`, sangria()));
        break;
      case 'nota': {
        // Como las advertencias del formato: en rojo, entre corchetes.
        // Son para quien redacta y se retiran antes de remitir el
        // expediente, así que tienen que saltar a la vista.
        const t = p.texto.trim();
        const entre = t.startsWith('[') ? t : `[${t}]`;
        salida.push(parrafo(entre, sangria(), { color: ROJO }));
        break;
      }
      case 'lista':
        if (p.encabezado) salida.push(parrafo(p.encabezado, sangria()));
        salida.push(...lista(p.elementos, p.marca, sangria()));
        salida.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case 'tabla':
        salida.push(...tabla(p, sangria(), disponible));
        break;
      case 'datos':
        salida.push(...datos(p.filas));
        break;
    }
  }
  return salida;
}

// ── Las dos maquetas ─────────────────────────────────────────────────

function cabecera(piezas: Pieza[]): Paragraph[] {
  return piezas
    .filter((p) => p.clase === 'titulo' && p.rol)
    .map(
      (p, i, todas) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: i === todas.length - 1 ? 240 : 0, line: 240 },
          children: [
            new TextRun({
              text: p.clase === 'titulo' ? p.texto : '',
              font: FUENTE,
              size: TAMANO,
              bold: true,
            }),
          ],
        }),
    );
}

/** Procedimientos de selección: títulos numerados y cuerpo sangrado. */
function maquetaProcedimiento(piezas: Pieza[]): Array<Paragraph | Table> {
  return [...cabecera(piezas), ...componer(piezas, PROCEDIMIENTO, ANCHO_TEXTO, 1)];
}

/**
 * Menores a 8 UIT: la ficha.
 *
 * Una tabla de una sola columna. Cada apartado de primer nivel es una
 * fila gris con su numeral y su título, y la fila de debajo lleva todo
 * lo que cuelga de él —subtítulos, párrafos, listas y cuadros—.
 */
function maquetaFicha(piezas: Pieza[]): Array<Paragraph | Table> {
  const salida: Array<Paragraph | Table> = [...cabecera(piezas)];

  // Lo que va antes del primer apartado —el cuadro de datos— queda fuera
  // de la ficha, como en el formato.
  const primero = piezas.findIndex((p) => p.clase === 'titulo' && !p.rol && p.nivel === 1);
  const antes = primero === -1 ? piezas : piezas.slice(0, primero);
  salida.push(...componer(antes, FICHA, ANCHO_TEXTO, 1));
  if (primero === -1) return salida;

  const grupos: Array<{ titulo: Pieza & { clase: 'titulo' }; cuerpo: Pieza[] }> = [];
  for (const p of piezas.slice(primero)) {
    if (p.clase === 'titulo' && !p.rol && p.nivel === 1) grupos.push({ titulo: p, cuerpo: [] });
    else grupos[grupos.length - 1]?.cuerpo.push(p);
  }

  const dentro = ANCHO_TEXTO - MARGEN_CELDA.left - MARGEN_CELDA.right;
  const filas: TableRow[] = [];
  for (const g of grupos) {
    filas.push(
      new TableRow({
        cantSplit: true,
        children: [
          celda(
            [
              new Paragraph({
                keepNext: true,
                indent: { left: FICHA.paso, hanging: FICHA.paso },
                tabStops: [{ type: TabStopType.LEFT, position: FICHA.paso }],
                spacing: { after: 0, line: 240 },
                children: [
                  new TextRun({
                    text: g.titulo.numero ? `${g.titulo.numero}\t${g.titulo.texto}` : g.titulo.texto,
                    font: FUENTE,
                    size: TAMANO,
                    bold: true,
                  }),
                ],
              }),
            ],
            ANCHO_TEXTO,
            { gris: true },
          ),
        ],
      }),
    );
    const cuerpo = componer(g.cuerpo, FICHA, dentro, 1);
    filas.push(
      new TableRow({
        children: [
          celda(
            // Una celda de Word no puede quedar sin párrafo.
            cuerpo.length > 0 ? cuerpo : [new Paragraph({ children: [] })],
            ANCHO_TEXTO,
          ),
        ],
      }),
    );
  }

  salida.push(
    new Table({
      width: { size: ANCHO_TEXTO, type: WidthType.DXA },
      columnWidths: [ANCHO_TEXTO],
      layout: TableLayoutType.FIXED,
      borders: BORDES_TABLA,
      rows: filas,
    }),
  );
  return salida;
}

/**
 * El Word del requerimiento.
 *
 * No lleva sello de A-LexIA, ni cabecera ni pie: ninguno de los quince
 * formatos los trae, y es un documento que firma el área usuaria.
 */
export async function requerimientoADocx(
  piezas: Pieza[],
  plantilla: Pick<PlantillaRequerimiento, 'familia'>,
): Promise<Buffer> {
  const cuerpo =
    plantilla.familia === 'menor_8_uit' ? maquetaFicha(piezas) : maquetaProcedimiento(piezas);

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FUENTE, size: TAMANO } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: ANCHO_PAGINA, height: ALTO_PAGINA },
            margin: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
          },
        },
        children: cuerpo,
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
