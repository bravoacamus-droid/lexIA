/**
 * Generación de un .docx editable a partir del requerimiento.
 *
 * El editor TipTap produce HTML estándar (StarterKit + Placeholder).
 * Aquí convertimos ese HTML a primitivas de la librería `docx`
 * (Paragraph, TextRun, Table, etc.) para producir un Word que se
 * puede abrir en MS Word / LibreOffice / Google Docs y editar
 * libremente.
 *
 * Cobertura del parser HTML:
 *  - <p>, <h2>, <h3>: párrafos y encabezados.
 *  - <strong>/<b>, <em>/<i>, <u>: marcas inline.
 *  - <ul><li>, <ol><li>: listas con bullets/numeradas.
 *  - <table><thead><tbody><tr><th><td>: tablas con bordes simples.
 *  - <br>: salto de línea.
 *
 * Lo que no soporta cae a texto plano (no falla).
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
  PageNumber,
  Header,
  Footer,
  type ParagraphChild,
  type IRunOptions,
  LevelFormat,
  convertInchesToTwip,
} from 'docx';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

interface ClauseInput {
  label: string;
  content: string; // HTML del TipTap
  order: number;
  included: boolean;
}

interface EntregaInput {
  numero: number;
  descripcion: string;
  plazo_dias: number | null;
  monto_pen: number | null;
  forma_pago: string;
}

interface ItemInput {
  numero: number;
  codigo: string | null;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario_pen: number | null;
  marca_modelo: string | null;
}

interface ExportInput {
  anexoTitulo: string; // "ESPECIFICACIONES TÉCNICAS" / "TÉRMINOS DE REFERENCIA"
  objeto: string; // "Bien" / "Servicio" / "Obra" / "Consultoría de Obra"
  anio: number;
  organoUnidad: string;
  actividadPoi: string;
  denominacion: string;
  areaUsuaria: string | null;
  clauses: ClauseInput[];
  entregas: EntregaInput[];
  items: ItemInput[];
}

function fmtPen(n: number | null): string {
  if (n === null || isNaN(n)) return '—';
  return n.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ════════════════════════════════════════════════════════════════════
// Estilo común
// ════════════════════════════════════════════════════════════════════
const FONT = 'Calibri';
const BLACK = '000000';
const BRAND_DARK = '021D40'; // azul brand
const LIGHT_GRAY_SHADE = 'F2F2F2';
const BORDER_GRAY = 'B0B0B0';

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
};

// ════════════════════════════════════════════════════════════════════
// HTML → docx primitives
// ════════════════════════════════════════════════════════════════════
interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

function inlineRuns(
  $: cheerio.CheerioAPI,
  el: cheerio.Cheerio<Element>,
  style: InlineStyle = {},
): TextRun[] {
  const runs: TextRun[] = [];
  el.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = $(node).text();
      if (!text.trim() && text.replace(/\s/g, '').length === 0) {
        // Skip whitespace-only text nodes
        if (runs.length > 0 && text.length > 0) {
          // Mantener espacios entre runs
          runs.push(
            new TextRun({
              text: ' ',
              font: FONT,
              size: 22,
              bold: style.bold,
              italics: style.italic,
              underline: style.underline ? {} : undefined,
            } as IRunOptions),
          );
        }
        return;
      }
      runs.push(
        new TextRun({
          text: text.replace(/\s+/g, ' '),
          font: FONT,
          size: 22,
          bold: style.bold,
          italics: style.italic,
          underline: style.underline ? {} : undefined,
        } as IRunOptions),
      );
    } else if (node.type === 'tag') {
      const tag = node.tagName.toLowerCase();
      const $node = $(node as Element);
      if (tag === 'strong' || tag === 'b') {
        runs.push(...inlineRuns($, $node, { ...style, bold: true }));
      } else if (tag === 'em' || tag === 'i') {
        runs.push(...inlineRuns($, $node, { ...style, italic: true }));
      } else if (tag === 'u') {
        runs.push(...inlineRuns($, $node, { ...style, underline: true }));
      } else if (tag === 'br') {
        runs.push(
          new TextRun({
            text: '',
            break: 1,
            font: FONT,
            size: 22,
          }),
        );
      } else if (tag === 'span' || tag === 'a') {
        runs.push(...inlineRuns($, $node, style));
      } else {
        // Cualquier otro tag inline: recursar manteniendo estilo
        runs.push(...inlineRuns($, $node, style));
      }
    }
  });
  return runs;
}

function paragraphFromTag(
  $: cheerio.CheerioAPI,
  el: cheerio.Cheerio<Element>,
  options: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; bullet?: number; numbering?: string; level?: number } = {},
): Paragraph {
  const children = inlineRuns($, el);
  return new Paragraph({
    children: children.length > 0 ? (children as ParagraphChild[]) : [new TextRun({ text: '', font: FONT, size: 22 })],
    heading: options.heading,
    bullet: options.bullet !== undefined ? { level: options.bullet } : undefined,
    numbering: options.numbering
      ? { reference: options.numbering, level: options.level ?? 0 }
      : undefined,
    spacing: { after: 120 },
  });
}

function tableFromHtml(
  $: cheerio.CheerioAPI,
  el: cheerio.Cheerio<Element>,
): Table {
  const rows: TableRow[] = [];
  el.find('tr').each((_, trEl) => {
    const $tr = $(trEl);
    const cells: TableCell[] = [];
    $tr.children('th,td').each((__, cellEl) => {
      const $cell = $(cellEl);
      const isHeader = (cellEl as Element).tagName.toLowerCase() === 'th';
      const cellRuns = inlineRuns($, $cell);
      cells.push(
        new TableCell({
          shading: isHeader
            ? {
                type: ShadingType.CLEAR,
                color: 'auto',
                fill: LIGHT_GRAY_SHADE,
              }
            : undefined,
          children: [
            new Paragraph({
              children:
                cellRuns.length > 0
                  ? (cellRuns.map((r) => {
                      // En celdas de encabezado, forzar negrita
                      if (!isHeader) return r;
                      const ro = (r as unknown as { options: IRunOptions }).options;
                      return new TextRun({ ...ro, bold: true });
                    }) as ParagraphChild[])
                  : [new TextRun({ text: '', font: FONT, size: 22 })],
            }),
          ],
        }),
      );
    });
    if (cells.length > 0) rows.push(new TableRow({ children: cells }));
  });
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
  });
}

function htmlToBlocks(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<Element>,
): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [];
  root.children().each((_, el) => {
    const node = el as Element;
    const tag = node.tagName.toLowerCase();
    const $node = $(node);

    if (tag === 'p') {
      // Si el párrafo está vacío después de sanitizar, omitir
      const text = $node.text().trim();
      if (!text && $node.find('br').length === 0) return;
      blocks.push(paragraphFromTag($, $node));
    } else if (tag === 'h2') {
      blocks.push(paragraphFromTag($, $node, { heading: HeadingLevel.HEADING_2 }));
    } else if (tag === 'h3') {
      blocks.push(paragraphFromTag($, $node, { heading: HeadingLevel.HEADING_3 }));
    } else if (tag === 'ul') {
      $node.children('li').each((__, li) => {
        const $li = $(li as Element);
        blocks.push(paragraphFromTag($, $li, { bullet: 0 }));
      });
    } else if (tag === 'ol') {
      $node.children('li').each((__, li) => {
        const $li = $(li as Element);
        blocks.push(
          paragraphFromTag($, $li, {
            numbering: 'doc-num',
            level: 0,
          }),
        );
      });
    } else if (tag === 'table') {
      blocks.push(tableFromHtml($, $node));
      blocks.push(new Paragraph({ children: [new TextRun({ text: '', size: 4 })] }));
    } else if (tag === 'blockquote') {
      blocks.push(
        paragraphFromTag($, $node, {}),
      );
    } else {
      // Cualquier otro tag se trata como párrafo
      const text = $node.text().trim();
      if (text) {
        blocks.push(
          new Paragraph({
            children: [
              new TextRun({ text, font: FONT, size: 22 }),
            ],
            spacing: { after: 120 },
          }),
        );
      }
    }
  });
  return blocks;
}

function safeHtmlToBlocks(html: string): Array<Paragraph | Table> {
  if (!html || !html.trim()) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: '(Sin contenido)',
            italics: true,
            color: '888888',
            font: FONT,
            size: 22,
          }),
        ],
      }),
    ];
  }
  try {
    const $ = cheerio.load(`<div id="root">${html}</div>`);
    const root = $('#root') as cheerio.Cheerio<Element>;
    const blocks = htmlToBlocks($, root);
    if (blocks.length === 0) {
      return [
        new Paragraph({
          children: [
            new TextRun({ text: html.replace(/<[^>]+>/g, ''), font: FONT, size: 22 }),
          ],
        }),
      ];
    }
    return blocks;
  } catch (e) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: `(Error al convertir HTML: ${(e as Error).message})`,
            color: 'C00000',
            font: FONT,
            size: 22,
          }),
        ],
      }),
    ];
  }
}

// ════════════════════════════════════════════════════════════════════
// Componentes del documento
// ════════════════════════════════════════════════════════════════════
function makeTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT,
        size: 32,
        color: BRAND_DARK,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
  });
}

function makeSectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT,
        size: 26,
        color: BRAND_DARK,
      }),
    ],
    spacing: { before: 320, after: 160 },
    heading: HeadingLevel.HEADING_1,
  });
}

function makeClauseHeading(n: number, label: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${n}. ${label}`,
        bold: true,
        font: FONT,
        size: 24,
        color: BRAND_DARK,
      }),
    ],
    spacing: { before: 240, after: 120 },
    heading: HeadingLevel.HEADING_2,
  });
}

function makeKeyValueTable(
  rows: Array<{ label: string; value: string }>,
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: rows.map(
      (r) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: {
                type: ShadingType.CLEAR,
                color: 'auto',
                fill: LIGHT_GRAY_SHADE,
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: r.label,
                      bold: true,
                      font: FONT,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: r.value || '—',
                      font: FONT,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

function cellText(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [
          new TextRun({ text: text || '—', font: FONT, size: 20, bold: opts.bold }),
        ],
      }),
    ],
  });
}

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: LIGHT_GRAY_SHADE },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, font: FONT, size: 20 }),
        ],
      }),
    ],
  });
}

function makeEntregasTable(entregas: EntregaInput[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('N°'),
      headerCell('Descripción del entregable'),
      headerCell('Plazo (días)'),
      headerCell('Monto (S/)'),
      headerCell('Forma de pago'),
    ],
  });

  const dataRows = entregas
    .sort((a, b) => a.numero - b.numero)
    .map(
      (e) =>
        new TableRow({
          children: [
            cellText(String(e.numero), { align: AlignmentType.CENTER }),
            cellText(e.descripcion),
            cellText(
              e.plazo_dias !== null ? String(e.plazo_dias) : '—',
              { align: AlignmentType.CENTER },
            ),
            cellText(fmtPen(e.monto_pen), { align: AlignmentType.RIGHT }),
            cellText(e.forma_pago),
          ],
        }),
    );

  const total = entregas.reduce((acc, e) => acc + (e.monto_pen ?? 0), 0);
  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 3,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: LIGHT_GRAY_SHADE },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'TOTAL', bold: true, font: FONT, size: 20 }),
            ],
          }),
        ],
      }),
      new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: LIGHT_GRAY_SHADE },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: fmtPen(total), bold: true, font: FONT, size: 20, color: BRAND_DARK }),
            ],
          }),
        ],
      }),
      new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: LIGHT_GRAY_SHADE },
        children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
      }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [headerRow, ...dataRows, totalRow],
  });
}

function makeItemsTable(items: ItemInput[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('N°'),
      headerCell('Código'),
      headerCell('Descripción'),
      headerCell('U.M.'),
      headerCell('Cant.'),
      headerCell('P. Unit. (S/)'),
      headerCell('Subtotal (S/)'),
    ],
  });

  const dataRows = items
    .sort((a, b) => a.numero - b.numero)
    .map((i) => {
      const subtotal = (i.precio_unitario_pen ?? 0) * (i.cantidad ?? 0);
      const descParts = [i.descripcion];
      if (i.marca_modelo) descParts.push(`(Marca/Modelo referencial: ${i.marca_modelo} o equivalente técnico)`);
      return new TableRow({
        children: [
          cellText(String(i.numero), { align: AlignmentType.CENTER }),
          cellText(i.codigo || '—'),
          cellText(descParts.join(' ')),
          cellText(i.unidad_medida, { align: AlignmentType.CENTER }),
          cellText(i.cantidad.toLocaleString('es-PE'), { align: AlignmentType.CENTER }),
          cellText(fmtPen(i.precio_unitario_pen), { align: AlignmentType.RIGHT }),
          cellText(fmtPen(subtotal), { align: AlignmentType.RIGHT }),
        ],
      });
    });

  const total = items.reduce(
    (acc, i) => acc + (i.precio_unitario_pen ?? 0) * (i.cantidad ?? 0),
    0,
  );
  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: LIGHT_GRAY_SHADE },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'VALOR REFERENCIAL', bold: true, font: FONT, size: 20 }),
            ],
          }),
        ],
      }),
      new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: LIGHT_GRAY_SHADE },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: fmtPen(total), bold: true, font: FONT, size: 20, color: BRAND_DARK }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [headerRow, ...dataRows, totalRow],
  });
}

// ════════════════════════════════════════════════════════════════════
// API pública
// ════════════════════════════════════════════════════════════════════
export async function generateRequirementDocx(input: ExportInput): Promise<Buffer> {
  const headerRow = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `LexIA · Requerimiento ${input.objeto} ${input.anio}`,
            font: FONT,
            size: 18,
            color: '888888',
          }),
        ],
      }),
    ],
  });

  const footerRow = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Página ',
            font: FONT,
            size: 18,
            color: '888888',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT,
            size: 18,
            color: '888888',
          }),
          new TextRun({
            text: ' de ',
            font: FONT,
            size: 18,
            color: '888888',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: FONT,
            size: 18,
            color: '888888',
          }),
        ],
      }),
    ],
  });

  const blocks: Array<Paragraph | Table> = [];

  // Título principal
  blocks.push(makeTitle(input.anexoTitulo));

  // 1. Datos generales
  blocks.push(makeSectionHeading('1. DATOS GENERALES'));
  blocks.push(
    makeKeyValueTable([
      { label: 'Órgano y/o Unidad orgánica', value: input.organoUnidad },
      { label: 'Actividad del POI / Acción Estratégica PEI', value: input.actividadPoi },
      { label: 'Denominación de la contratación', value: input.denominacion },
      ...(input.areaUsuaria ? [{ label: 'Área usuaria', value: input.areaUsuaria }] : []),
    ]),
  );
  blocks.push(new Paragraph({ children: [new TextRun({ text: '', size: 4 })] }));

  // 2. Cláusulas del anexo
  const orderedIncluded = [...input.clauses]
    .filter((c) => c.included)
    .sort((a, b) => a.order - b.order);

  if (orderedIncluded.length > 0) {
    blocks.push(makeSectionHeading('2. CLÁUSULAS DEL ANEXO'));
    orderedIncluded.forEach((c, idx) => {
      blocks.push(makeClauseHeading(idx + 1, c.label));
      blocks.push(...safeHtmlToBlocks(c.content));
    });
  } else {
    blocks.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              'Aún no se ha marcado ninguna cláusula. Vuelve al editor y activa al menos una cláusula del anexo.',
            italics: true,
            font: FONT,
            size: 22,
            color: '888888',
          }),
        ],
      }),
    );
  }

  // 3. Registro de entregas y RTM
  if (input.entregas && input.entregas.length > 0) {
    blocks.push(makeSectionHeading('3. REGISTRO DE ENTREGAS Y RTM'));
    blocks.push(makeEntregasTable(input.entregas));
    blocks.push(new Paragraph({ children: [new TextRun({ text: '', size: 4 })] }));
  }

  // 4. Registro de ítems
  if (input.items && input.items.length > 0) {
    blocks.push(makeSectionHeading('4. REGISTRO DE ÍTEMS'));
    blocks.push(makeItemsTable(input.items));
    blocks.push(new Paragraph({ children: [new TextRun({ text: '', size: 4 })] }));
  }

  const doc = new Document({
    creator: 'LexIA',
    title: input.denominacion,
    description: `Requerimiento ${input.objeto} ${input.anio}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
          paragraph: { spacing: { line: 300 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'doc-num',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
            size: { orientation: PageOrientation.PORTRAIT },
          },
        },
        headers: { default: headerRow },
        footers: { default: footerRow },
        children: blocks,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
