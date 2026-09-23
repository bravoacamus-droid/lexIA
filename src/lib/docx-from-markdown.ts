import { normalizarMarkdownModelo } from '@/lib/markdown/normalizar-modelo';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';

/**
 * Convierte un subset de markdown (h1, h2, h3, párrafos, negrita, itálica,
 * hr, listas, tablas) a un Document de docx listo para empaquetar y enviar.
 */
export async function markdownToDocxBuffer(
  markdown: string,
  meta: { title: string; subtitle?: string },
): Promise<Buffer> {
  const lines = normalizarMarkdownModelo(markdown).split('\n');
  const children: Array<Paragraph | Table> = [];

  // Title page header
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Generado con A-LexIA · ' + new Date().toLocaleString('es-PE'),
          italics: true,
          color: '94A3B8',
          size: 16,
        }),
      ],
      spacing: { after: 400 },
    }),
  );

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.trim() === '') {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: {
              color: 'CBD5E1',
              size: 6,
              style: BorderStyle.SINGLE,
              space: 1,
            },
          },
          children: [],
        }),
      );
      continue;
    }

    // Encabezados. El ensamblador de requerimientos llega hasta el
    // quinto nivel —6.7.1. Penalidad por mora— y aquí solo se traducían
    // tres: del cuarto en adelante las almohadillas salían impresas en
    // el Word ("#### 6.6. Adelanto directo"). Un solo patrón para los
    // seis niveles evita que vuelva a quedarse corto.
    const enc = /^(#{1,6})\s+(.*)$/.exec(line);
    if (enc) {
      const nivel = enc[1].length;
      const estilo = [
        { h: HeadingLevel.HEADING_1, size: 24, antes: 240, despues: 200, centrado: true },
        { h: HeadingLevel.HEADING_2, size: 22, antes: 280, despues: 140, centrado: false },
        { h: HeadingLevel.HEADING_3, size: 20, antes: 200, despues: 100, centrado: false },
        { h: HeadingLevel.HEADING_4, size: 19, antes: 180, despues: 90, centrado: false },
        { h: HeadingLevel.HEADING_5, size: 18, antes: 160, despues: 80, centrado: false },
        { h: HeadingLevel.HEADING_6, size: 18, antes: 140, despues: 70, centrado: false },
      ][nivel - 1];
      children.push(
        new Paragraph({
          heading: estilo.h,
          ...(estilo.centrado ? { alignment: AlignmentType.CENTER } : {}),
          spacing: { before: estilo.antes, after: estilo.despues },
          children: parseInlineRuns(enc[2], { bold: true, size: estilo.size, color: '000000' }),
        }),
      );
      continue;
    }

    // Citas. Las notas de los formatos —"Aplica únicamente cuando
    // corresponda otorgar adelantos..."— se emiten como cita y salían
    // con el ">" delante. Se pintan sangradas y en gris, que es lo que
    // son: una advertencia al que redacta.
    const cita = /^>\s?(.*)$/.exec(line);
    if (cita) {
      if (!cita[1].trim()) continue;
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          indent: { left: 360 },
          border: {
            left: { color: 'CBD5E1', size: 12, style: BorderStyle.SINGLE, space: 8 },
          },
          children: parseInlineRuns(cita[1], { color: '475569' }),
        }),
      );
      continue;
    }

    // Tabla markdown: bloque de líneas consecutivas que empiezan con |
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j].trimEnd())) {
        tableLines.push(lines[j].trim());
        j++;
      }
      i = j - 1;
      const parsed = tableLines
        .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)) // quitar separador |---|---|
        .map((l) =>
          l
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim()),
        );
      if (parsed.length > 0) {
        const cols = Math.max(...parsed.map((r) => r.length));
        const rows = parsed.map((cells, rowIdx) => {
          const isHeader = rowIdx === 0 && tableLines.length > 1;
          return new TableRow({
            tableHeader: isHeader,
            children: Array.from({ length: cols }, (_, c) => {
              const cellText = cells[c] ?? '';
              return new TableCell({
                shading: isHeader
                  ? { type: ShadingType.CLEAR, fill: 'EEF2FF' }
                  : undefined,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: parseInlineRuns(cellText, isHeader ? { bold: true } : {}),
                  }),
                ],
              });
            }),
          });
        });
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            },
            rows,
          }),
        );
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }
      continue;
    }

    // List item (only unordered for now)
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (li) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: parseInlineRuns(li[1]),
        }),
      );
      continue;
    }

    // Ordered list
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      children.push(
        new Paragraph({
          numbering: { reference: 'ordered', level: 0 },
          spacing: { after: 80 },
          children: parseInlineRuns(ol[1]),
        }),
      );
      continue;
    }

    // Default: paragraph
    children.push(
      new Paragraph({
        spacing: { after: 140, line: 300 },
        alignment: AlignmentType.JUSTIFIED,
        children: parseInlineRuns(line),
      }),
    );
  }

  const doc = new Document({
    creator: 'A-LexIA',
    title: meta.title,
    description: meta.subtitle || 'Documento generado por A-LexIA Contrataciones',
    numbering: {
      config: [
        {
          reference: 'ordered',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    /**
     * Arial 10, que es la del formato oficial.
     *
     * Observación de César (agosto de 2026): "el tipo de letra, tamaño,
     * la forma y estructura de cada uno de los requerimientos debe ser
     * como los modelos proporcionados". Medido sobre sus Word —los de
     * MENORES A 8 UIT y los de procedimientos de selección—: Arial en
     * todo el documento, cuerpo a 10 puntos y secundarios a 9.
     *
     * Estaba en Georgia 11. Un requerimiento no es un documento de
     * A-LexIA: lo firma el área usuaria y va al expediente, donde tiene
     * que parecerse a los demás.
     */
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 20,
          },
        },
        // Los encabezados heredan de la librería un azul y unos tamaños
        // que no son los del formato. Se redefinen aquí para que el
        // documento salga en negro aunque un párrafo no lleve color
        // propio, y para que el panel de navegación de Word no muestre
        // otra cosa.
        heading1: { run: { font: 'Arial', size: 24, bold: true, color: '000000' } },
        heading2: { run: { font: 'Arial', size: 22, bold: true, color: '000000' } },
        heading3: { run: { font: 'Arial', size: 20, bold: true, color: '000000' } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
}

/**
 * Parse inline markdown into TextRuns: **bold**, *italic*, `code`.
 */
function parseInlineRuns(text: string, base: RunStyle = {}): TextRun[] {
  const runs: TextRun[] = [];
  // Token regex: matches **bold**, *italic*, `code`, or plain text
  const tokenRe = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(text))) {
    if (m.index > lastIndex) {
      const plain = text.slice(lastIndex, m.index);
      if (plain) runs.push(new TextRun({ text: plain, ...base }));
    }
    if (m[1]) {
      runs.push(new TextRun({ text: m[1].slice(2, -2), bold: true, ...base }));
    } else if (m[2]) {
      runs.push(new TextRun({ text: m[2].slice(1, -1), italics: true, ...base }));
    } else if (m[3]) {
      runs.push(
        new TextRun({
          text: m[3].slice(1, -1),
          font: 'Consolas',
          color: '6366F1',
          ...base,
        }),
      );
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex), ...base }));
  }
  if (runs.length === 0) runs.push(new TextRun({ text: text || ' ', ...base }));
  return runs;
}
