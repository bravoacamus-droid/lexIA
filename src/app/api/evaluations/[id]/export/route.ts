import { NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const STATUS_LABEL: Record<string, string> = {
  cumple: 'Cumple',
  subsanable: 'Subsanable',
  no_cumple: 'No cumple',
};

const STATUS_COLOR: Record<string, string> = {
  cumple: '059669',
  subsanable: 'D97706',
  no_cumple: 'DC2626',
};

interface MatrixItem {
  requisito: string;
  categoria: string;
  descripcion: string;
  postores: Array<{
    nombre: string;
    status: 'cumple' | 'subsanable' | 'no_cumple';
    detalle: string;
    sustento_normativo?: Array<{ norma: string; articulo?: string }>;
  }>;
}

interface ResultShape {
  resumen_ejecutivo: string;
  postores: string[];
  items: MatrixItem[];
  conclusiones?: string;
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('evaluations')
    .select('id, title, result, user_id, completed_at')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const row = data as {
    id: string;
    title: string;
    result: ResultShape | null;
    user_id: string;
    completed_at: string | null;
  };
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!row.result) {
    return NextResponse.json({ error: 'not_ready' }, { status: 400 });
  }

  const doc = buildDocx(row.title, row.result, row.completed_at);
  const buffer = await Packer.toBuffer(doc);

  const safeTitle = (row.title || 'evaluacion').replace(/[^a-z0-9_-]+/gi, '_');
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="LexIA_Evaluacion_${safeTitle}.docx"`,
    },
  });
}

function buildDocx(title: string, result: ResultShape, completedAt: string | null) {
  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      text: 'LexIA — Evaluación de Ofertas',
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 28 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generado por LexIA · ${
            completedAt ? new Date(completedAt).toLocaleString('es-PE') : new Date().toLocaleString('es-PE')
          }`,
          italics: true,
          color: '64748B',
          size: 18,
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: 'Resumen ejecutivo',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: result.resumen_ejecutivo,
      spacing: { after: 300 },
    }),
    new Paragraph({
      text: 'Matriz comparativa',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    }),
  );

  // Table
  const headerCells = [
    new TableCell({
      width: { size: 30, type: WidthType.PERCENTAGE },
      shading: { fill: '4338CA' },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: 'Requisito', bold: true, color: 'FFFFFF', size: 20 }),
          ],
        }),
      ],
    }),
    ...result.postores.map(
      (p) =>
        new TableCell({
          width: {
            size: 70 / result.postores.length,
            type: WidthType.PERCENTAGE,
          },
          shading: { fill: '4338CA' },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({ text: p, bold: true, color: 'FFFFFF', size: 20 }),
              ],
            }),
          ],
        }),
    ),
  ];

  const rows: TableRow[] = [
    new TableRow({ children: headerCells, tableHeader: true }),
  ];

  for (const item of result.items) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.requisito, bold: true, size: 20 })],
              }),
            ],
          }),
          ...item.postores.map(
            (p) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: STATUS_LABEL[p.status] || p.status,
                        bold: true,
                        color: STATUS_COLOR[p.status] || '475569',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
          ),
        ],
      }),
    );
  }

  const table = new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // Detail per item
  const details: Paragraph[] = [];
  details.push(
    new Paragraph({
      text: 'Detalle por requisito',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  );
  for (const item of result.items) {
    details.push(
      new Paragraph({
        text: item.requisito,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: item.descripcion, italics: true, color: '475569', size: 20 }),
        ],
        spacing: { after: 200 },
      }),
    );
    for (const p of item.postores) {
      details.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${p.nombre} — `, bold: true, size: 22 }),
            new TextRun({
              text: STATUS_LABEL[p.status] || p.status,
              bold: true,
              color: STATUS_COLOR[p.status] || '475569',
              size: 22,
            }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          text: p.detalle,
          spacing: { after: 100 },
        }),
      );
      if (p.sustento_normativo && p.sustento_normativo.length > 0) {
        const sustento = p.sustento_normativo
          .map((s) => (s.articulo ? `${s.norma} (${s.articulo})` : s.norma))
          .join(' · ');
        details.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Sustento: ', bold: true, color: '4338CA', size: 18 }),
              new TextRun({ text: sustento, size: 18 }),
            ],
            spacing: { after: 200 },
          }),
        );
      }
    }
  }

  return new Document({
    creator: 'LexIA',
    title,
    description: 'Evaluación generada por LexIA Contrataciones',
    sections: [
      {
        properties: {},
        children: [...sections, table, ...details],
      },
    ],
  });
}
