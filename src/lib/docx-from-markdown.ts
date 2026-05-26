import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  BorderStyle,
} from 'docx';

/**
 * Convierte un subset de markdown (h1, h2, h3, párrafos, negrita, itálica, hr, listas)
 * a un Document de docx listo para empaquetar y enviar.
 */
export async function markdownToDocxBuffer(
  markdown: string,
  meta: { title: string; subtitle?: string },
): Promise<Buffer> {
  const lines = markdown.split('\n');
  const children: Paragraph[] = [];

  // Title page header
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Generado con LexIA · ' + new Date().toLocaleString('es-PE'),
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

    // Headings
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 200 },
          children: parseInlineRuns(h1[1], { bold: true, size: 32 }),
        }),
      );
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 140 },
          children: parseInlineRuns(h2[1], { bold: true, size: 26, color: '4338CA' }),
        }),
      );
      continue;
    }
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
          children: parseInlineRuns(h3[1], { bold: true, size: 22 }),
        }),
      );
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
    creator: 'LexIA',
    title: meta.title,
    description: meta.subtitle || 'Documento generado por LexIA Contrataciones',
    styles: {
      default: {
        document: {
          run: {
            font: 'Georgia',
            size: 22,
          },
        },
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
