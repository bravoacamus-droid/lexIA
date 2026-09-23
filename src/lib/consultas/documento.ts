/**
 * De la estructura al documento.
 *
 * Aquí se arma el Word de los dos formatos que entregó César, con su
 * tabla de ocho columnas y, dentro de la celda del cuerpo, los tramos
 * como párrafos separados con su rótulo en negrita.
 *
 * No se pasa por markdown a propósito. Una tabla de markdown no admite
 * celdas de varios párrafos, y estas celdas tienen cinco o seis: si se
 * aplanaran, el documento saldría como un muro de texto y volvería la
 * queja de siempre —«los formatos del software no están de acuerdo a la
 * estructura alcanzada»—. Se construye contra `docx` directamente.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
  PageOrientation,
} from 'docx';
import {
  COLUMNAS_ABSOLUCION,
  COLUMNAS_FORMULACION,
  TEXTO_DECISION,
  tramoTieneTexto,
  type Absolucion,
  type Formulacion,
  type Pliego,
  type Tramo,
} from '@/lib/consultas/tipos';

const AZUL = '1E3A5F';
const GRIS_CABECERA = 'DCE6F1';
const BORDE = { style: BorderStyle.SINGLE, size: 4, color: '9AA9BC' } as const;
const BORDES = {
  top: BORDE,
  bottom: BORDE,
  left: BORDE,
  right: BORDE,
  insideHorizontal: BORDE,
  insideVertical: BORDE,
};

/** Cuánto ocupa cada columna, en porcentaje. Suman 100. */
const ANCHOS = [4, 8, 8, 7, 6, 5, 44, 18];

/**
 * Parte un texto en negritas y normal a partir de los `**` del modelo.
 * Se admite porque los escritos citan artículos y principios en negrita.
 */
function trozos(texto: string, base: { bold?: boolean; size?: number } = {}): TextRun[] {
  const size = base.size ?? 18; // 9 pt — la tabla lleva mucho texto
  const partes = texto.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  if (partes.length === 0) return [new TextRun({ text: '', size })];
  return partes.map((p) => {
    const negrita = /^\*\*[^*]+\*\*$/.test(p);
    return new TextRun({
      text: negrita ? p.slice(2, -2) : p,
      bold: negrita || base.bold,
      size,
    });
  });
}

/** Los párrafos de un tramo, con su rótulo delante. */
function parrafosDeTramo(t: Tramo): Paragraph[] {
  const salida: Paragraph[] = [];
  const [primero, ...resto] = t.parrafos.filter((p) => p.trim());

  if (t.rotulo) {
    salida.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: `${t.rotulo}: `, bold: true, size: 18 }),
          ...(primero ? trozos(primero) : []),
        ],
      }),
    );
  } else if (primero) {
    salida.push(new Paragraph({ spacing: { after: 40 }, children: trozos(primero) }));
  }

  for (const p of resto) {
    salida.push(new Paragraph({ spacing: { after: 40 }, children: trozos(p) }));
  }

  for (const v of t.vinetas ?? []) {
    if (!v.texto.trim()) continue;
    salida.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40 },
        children: [
          ...(v.titulo ? [new TextRun({ text: `${v.titulo}: `, bold: true, size: 18 })] : []),
          ...trozos(v.texto),
        ],
      }),
    );
  }
  return salida;
}

function celda(hijos: Paragraph[], ancho: number, centrada = false): TableCell {
  return new TableCell({
    width: { size: ancho, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children:
      hijos.length > 0
        ? hijos
        : [new Paragraph({ alignment: centrada ? AlignmentType.CENTER : AlignmentType.LEFT, children: [] })],
  });
}

function celdaTexto(texto: string, ancho: number, centrada = false): TableCell {
  return celda(
    [
      new Paragraph({
        alignment: centrada ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: trozos(texto),
      }),
    ],
    ancho,
    centrada,
  );
}

/** El cuerpo de una formulación: los tramos, uno tras otro. */
function celdaDeCuerpo(f: Formulacion, ancho: number): TableCell {
  const hijos: Paragraph[] = [];
  for (const t of f.cuerpo.filter(tramoTieneTexto)) hijos.push(...parrafosDeTramo(t));
  return celda(hijos, ancho);
}

/** El cuerpo de una absolución: veredicto, fundamentos y cierre. */
function celdaDeAbsolucion(a: Absolucion, ancho: number): TableCell {
  const hijos: Paragraph[] = [
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: TEXTO_DECISION[a.decision], bold: true, size: 18 }),
        new TextRun({
          text: ' la observación técnica formulada, bajo los siguientes fundamentos:',
          size: 18,
        }),
      ],
    }),
  ];
  for (const t of a.fundamentos.filter(tramoTieneTexto)) hijos.push(...parrafosDeTramo(t));
  if (a.conclusion.trim()) {
    hijos.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [new TextRun({ text: a.conclusion, size: 18, italics: true })],
      }),
    );
  }
  return celda(hijos, ancho);
}

/** La banda de título que encabeza los dos modelos. */
function bandaDeTitulo(texto: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDES,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: GRIS_CABECERA },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: texto, bold: true, size: 24, color: AZUL })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function cabeceraDeTabla(columnas: readonly string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: columnas.map(
      (c, i) =>
        new TableCell({
          width: { size: ANCHOS[i] ?? 10, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: GRIS_CABECERA },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: c, bold: true, size: 16 })],
            }),
          ],
        }),
    ),
  });
}

/** El encabezado: procedimiento y objeto, como en el modelo. */
function parrafosDeEncabezado(p: Pliego): Paragraph[] {
  const { encabezado: e } = p;
  const salida: Paragraph[] = [
    new Paragraph({ spacing: { before: 160, after: 40 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: e.procedimiento.toUpperCase(), bold: true, size: 22 }),
        ...(e.numeroProcedimiento
          ? [new TextRun({ text: ` N° ${e.numeroProcedimiento}`, bold: true, size: 22 })]
          : []),
      ],
    }),
  ];
  if (e.objeto.trim()) {
    salida.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
        children: [new TextRun({ text: e.objeto, size: 20 })],
      }),
    );
  }
  if (e.participante?.trim()) {
    salida.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: 'Participante: ', bold: true, size: 20 }),
          new TextRun({ text: e.participante, size: 20 }),
        ],
      }),
    );
  }
  return salida;
}

export type CaraDelPliego = 'formulacion' | 'absolucion';

/**
 * Arma el Word de un pliego, en la cara que se pida.
 *
 * Va apaisado: son ocho columnas y la del cuerpo lleva un escrito
 * entero; en vertical la tabla queda impracticable, y así es como está
 * el modelo que entregó César.
 */
export async function pliegoADocx(
  pliego: Pliego,
  cara: CaraDelPliego,
): Promise<Buffer> {
  const esAbsolucion = cara === 'absolucion';
  const columnas = esAbsolucion ? COLUMNAS_ABSOLUCION : COLUMNAS_FORMULACION;
  const porNumero = new Map(pliego.absoluciones.map((a) => [a.numero, a]));

  const filas: TableRow[] = [cabeceraDeTabla(columnas)];
  for (const f of pliego.formulaciones) {
    const a = porNumero.get(f.numero);
    filas.push(
      new TableRow({
        children: [
          celdaTexto(String(f.numero), ANCHOS[0], true),
          celdaTexto(f.tipo === 'consulta' ? 'Consulta' : 'Observación', ANCHOS[1], true),
          celdaTexto(f.ubicacion.seccion, ANCHOS[2], true),
          celdaTexto(f.ubicacion.numeral, ANCHOS[3], true),
          celdaTexto(f.ubicacion.literal, ANCHOS[4], true),
          celdaTexto(f.ubicacion.pagina, ANCHOS[5], true),
          esAbsolucion && a ? celdaDeAbsolucion(a, ANCHOS[6]) : celdaDeCuerpo(f, ANCHOS[6]),
          esAbsolucion
            ? celdaTexto(a?.precisionEnBases ?? '', ANCHOS[7])
            : celdaTexto(f.tipo === 'observacion' ? f.normaVulnerada : '', ANCHOS[7]),
        ],
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          bandaDeTitulo(
            esAbsolucion
              ? 'ABSOLUCIÓN DE CONSULTAS Y/U OBSERVACIONES'
              : 'FORMULACIÓN DE CONSULTAS Y/U OBSERVACIONES',
          ),
          ...parrafosDeEncabezado(pliego),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDES,
            rows: filas,
          }),
          new Paragraph({ spacing: { before: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Elaborado con A-LexIA · ${new Date().toLocaleDateString('es-PE')}`,
                italics: true,
                size: 14,
                color: '94A3B8',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * La misma tabla en texto, para verla en pantalla y para comprobarla en
 * las pruebas sin abrir un Word.
 */
export function pliegoATexto(pliego: Pliego, cara: CaraDelPliego): string {
  const esAbsolucion = cara === 'absolucion';
  const lineas: string[] = [
    esAbsolucion
      ? 'ABSOLUCIÓN DE CONSULTAS Y/U OBSERVACIONES'
      : 'FORMULACIÓN DE CONSULTAS Y/U OBSERVACIONES',
    '',
    `${pliego.encabezado.procedimiento} N° ${pliego.encabezado.numeroProcedimiento}`,
    pliego.encabezado.objeto,
    '',
  ];
  const porNumero = new Map(pliego.absoluciones.map((a) => [a.numero, a]));

  for (const f of pliego.formulaciones) {
    lineas.push(
      `─── ${f.numero} · ${f.tipo === 'consulta' ? 'Consulta' : 'Observación'} · ` +
        `Sección ${f.ubicacion.seccion} · numeral ${f.ubicacion.numeral}` +
        `${f.ubicacion.literal ? ` ${f.ubicacion.literal}` : ''} · folio ${f.ubicacion.pagina}`,
    );
    const tramos = esAbsolucion ? (porNumero.get(f.numero)?.fundamentos ?? []) : f.cuerpo;
    if (esAbsolucion) {
      const a = porNumero.get(f.numero);
      if (a) lineas.push(`   ${TEXTO_DECISION[a.decision]}`);
    }
    for (const t of tramos.filter(tramoTieneTexto)) {
      if (t.rotulo) lineas.push(`   ${t.rotulo}:`);
      for (const p of t.parrafos.filter((x) => x.trim())) lineas.push(`      ${p}`);
      for (const v of t.vinetas ?? []) {
        lineas.push(`      · ${v.titulo ? `${v.titulo}: ` : ''}${v.texto}`);
      }
    }
    if (esAbsolucion) {
      const a = porNumero.get(f.numero);
      if (a?.conclusion) lineas.push(`   ${a.conclusion}`);
      if (a?.precisionEnBases) lineas.push(`   En las bases integradas: ${a.precisionEnBases}`);
    } else if (f.tipo === 'observacion' && f.normaVulnerada) {
      lineas.push(`   Norma vulnerada: ${f.normaVulnerada}`);
    }
    lineas.push('');
  }
  return lineas.join('\n');
}
