#!/usr/bin/env tsx
/**
 * Genera el documento Word "Propuesta — Llamadas con el Abogado Virtual"
 * para presentación al cliente César Huamán Oré.
 *
 * Resumen ejecutivo + costos + plan de suscripción + compliance legal
 * + cronograma + decisiones pendientes. Brandeado con paleta LexIA.
 * Español de Perú.
 *
 * Uso: pnpm exec tsx scripts/build-propuesta-voz-cesar.ts
 * Output: ./Propuesta_Voz_LexIA_Cesar.docx
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
  ImageRun,
  convertInchesToTwip,
  LevelFormat,
  type ParagraphChild,
} from 'docx';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FONT = 'Calibri';
const BRAND_DARK = '021D40';
const BRAND_BLUE = '0583F2';
const BRAND_LIGHT = 'EBF5FF';
const GRAY_BG = 'F2F4F7';
const GRAY_BORDER = 'D0D5DD';
const TEXT_DARK = '101828';
const TEXT_MUTED = '475467';
const SUCCESS = '12B76A';
const WARN = 'F79009';
const DANGER = 'D92D20';

// ════════════════════════════════════════════════════════════════════
// Helpers de estilo
// ════════════════════════════════════════════════════════════════════
function p(opts: {
  text?: string;
  runs?: ParagraphChild[];
  bold?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  spacingAfter?: number;
  spacingBefore?: number;
  font?: string;
  indent?: number;
}): Paragraph {
  const children: ParagraphChild[] = opts.runs ?? [
    new TextRun({
      text: opts.text ?? '',
      bold: opts.bold,
      italics: opts.italic,
      size: opts.size ?? 22,
      color: opts.color ?? TEXT_DARK,
      font: opts.font ?? FONT,
    }),
  ];
  return new Paragraph({
    children,
    alignment: opts.alignment,
    spacing: {
      after: opts.spacingAfter ?? 120,
      before: opts.spacingBefore,
      line: 320,
    },
    indent: opts.indent ? { left: opts.indent } : undefined,
  });
}

function h1(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36,
        color: BRAND_DARK,
        font: FONT,
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 12,
        color: BRAND_BLUE,
        space: 6,
      },
    },
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: BRAND_DARK,
        font: FONT,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: BRAND_BLUE,
        font: FONT,
      }),
    ],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
  });
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22,
        color: TEXT_DARK,
        font: FONT,
      }),
    ],
    bullet: { level },
    spacing: { after: 80, line: 300 },
  });
}

function bulletBold(boldPart: string, rest: string, level = 0): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: boldPart,
        bold: true,
        size: 22,
        color: TEXT_DARK,
        font: FONT,
      }),
      new TextRun({
        text: ' ' + rest,
        size: 22,
        color: TEXT_DARK,
        font: FONT,
      }),
    ],
    bullet: { level },
    spacing: { after: 80, line: 300 },
  });
}

function calloutBox(title: string, body: string, color: 'blue' | 'green' | 'amber' | 'red' = 'blue'): Table {
  const accentColor = {
    blue: BRAND_BLUE,
    green: SUCCESS,
    amber: WARN,
    red: DANGER,
  }[color];
  const bgColor = {
    blue: BRAND_LIGHT,
    green: 'ECFDF3',
    amber: 'FFFAEB',
    red: 'FEF3F2',
  }[color];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: accentColor },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: accentColor },
      left: { style: BorderStyle.SINGLE, size: 24, color: accentColor },
      right: { style: BorderStyle.SINGLE, size: 6, color: accentColor },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: bgColor },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 22,
                    color: accentColor,
                    font: FONT,
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: body,
                    size: 21,
                    color: TEXT_DARK,
                    font: FONT,
                  }),
                ],
                spacing: { after: 0 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function tableHeader(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: BRAND_DARK },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            size: 20,
            color: 'FFFFFF',
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

function tableCell(
  text: string,
  opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bg?: string; color?: string } = {},
): TableCell {
  return new TableCell({
    shading: opts.bg
      ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.bg }
      : undefined,
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: 20,
            color: opts.color ?? TEXT_DARK,
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

function fancyTable(
  headers: string[],
  rows: Array<Array<{ text: string; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string }>>,
  columnWidths?: number[],
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: columnWidths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: BRAND_DARK },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND_DARK },
      left: { style: BorderStyle.SINGLE, size: 4, color: GRAY_BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: GRAY_BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: GRAY_BORDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: GRAY_BORDER },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) => tableHeader(h)),
      }),
      ...rows.map(
        (row, i) =>
          new TableRow({
            children: row.map((c) =>
              tableCell(c.text, {
                bold: c.bold,
                align: c.align,
                color: c.color,
                bg: i % 2 === 0 ? GRAY_BG : undefined,
              }),
            ),
          }),
      ),
    ],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: GRAY_BORDER, space: 1 },
    },
    spacing: { before: 200, after: 200 },
  });
}

function spacer(size = 200): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', size: 4 })],
    spacing: { after: size },
  });
}

// ════════════════════════════════════════════════════════════════════
// Construcción del documento
// ════════════════════════════════════════════════════════════════════
function buildDocument(): Document {
  const today = '24 de junio de 2026';

  // Intentar cargar el logo (si existe)
  let logoBuffer: Buffer | null = null;
  const logoPath = join(process.cwd(), 'public', 'brand', 'logo-full.png');
  if (existsSync(logoPath)) {
    try {
      logoBuffer = readFileSync(logoPath);
    } catch {
      /* sin logo, seguir */
    }
  }

  // ───── HEADER ─────
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: 'LexIA Contrataciones · Propuesta interna',
            size: 18,
            color: TEXT_MUTED,
            font: FONT,
          }),
        ],
      }),
    ],
  });

  // ───── FOOTER ─────
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Documento confidencial — LexIA · ',
            size: 18,
            color: TEXT_MUTED,
            font: FONT,
          }),
          new TextRun({
            text: 'Página ',
            size: 18,
            color: TEXT_MUTED,
            font: FONT,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 18,
            color: TEXT_MUTED,
            font: FONT,
          }),
          new TextRun({
            text: ' de ',
            size: 18,
            color: TEXT_MUTED,
            font: FONT,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 18,
            color: TEXT_MUTED,
            font: FONT,
          }),
        ],
      }),
    ],
  });

  // ═══════════════════════════════════════════════
  // PORTADA
  // ═══════════════════════════════════════════════
  const portada: Array<Paragraph | Table> = [];

  if (logoBuffer) {
    portada.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 800, after: 400 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 180, height: 60 },
          } as never),
        ],
      }),
    );
  } else {
    portada.push(spacer(800));
  }

  portada.push(
    p({
      text: 'PROPUESTA TÉCNICA Y COMERCIAL',
      size: 22,
      color: BRAND_BLUE,
      bold: true,
      spacingAfter: 100,
    }),
  );
  portada.push(
    p({
      text: 'Llamadas con el Abogado Virtual',
      size: 56,
      color: BRAND_DARK,
      bold: true,
      spacingAfter: 100,
    }),
  );
  portada.push(
    p({
      text: 'Nueva funcionalidad de voz por inteligencia artificial para LexIA',
      size: 26,
      color: TEXT_MUTED,
      italic: true,
      spacingAfter: 400,
    }),
  );

  portada.push(divider());

  portada.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                p({ text: 'PREPARADO PARA', size: 18, bold: true, color: TEXT_MUTED, spacingAfter: 60 }),
                p({ text: 'César Huamán Oré', size: 26, bold: true, color: BRAND_DARK, spacingAfter: 40 }),
                p({ text: 'Promotor de LexIA Contrataciones', size: 20, color: TEXT_MUTED }),
              ],
            }),
            new TableCell({
              children: [
                p({ text: 'FECHA', size: 18, bold: true, color: TEXT_MUTED, spacingAfter: 60 }),
                p({ text: today, size: 26, bold: true, color: BRAND_DARK, spacingAfter: 40 }),
                p({ text: 'Versión 1.0', size: 20, color: TEXT_MUTED }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  portada.push(spacer(1200));

  portada.push(divider());
  portada.push(
    p({
      text: 'Documento confidencial preparado por el equipo técnico de LexIA. Toda la información económica, técnica y de cronograma aquí contenida es referencial y está sujeta a confirmación contractual.',
      size: 18,
      color: TEXT_MUTED,
      italic: true,
      spacingAfter: 0,
    }),
  );

  // ═══════════════════════════════════════════════
  // PÁGINA 1 — RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════
  const resumen: Array<Paragraph | Table> = [];

  resumen.push(
    new Paragraph({
      children: [new TextRun({ text: '', break: 1 })],
      pageBreakBefore: true,
    }),
  );

  resumen.push(h1('Resumen ejecutivo'));

  resumen.push(
    p({
      text: 'LexIA puede incorporar una nueva funcionalidad estrella: Llamadas con el Abogado Virtual, una experiencia de conversación por voz con inteligencia artificial especializada en contratación pública peruana bajo la Ley N° 32069. El usuario habla en español natural y el sistema responde con voz fluida, citando el artículo exacto de la norma vigente.',
      spacingAfter: 200,
    }),
  );

  resumen.push(
    p({
      text: 'Tras una investigación técnica y legal exhaustiva, esta propuesta presenta:',
      spacingAfter: 120,
    }),
  );

  resumen.push(
    bulletBold('Tecnología recomendada:', 'Gemini Live API de Google, ya en producción (General Availability) desde mayo de 2026.'),
  );
  resumen.push(
    bulletBold('Costo por llamada:', 'aproximadamente S/ 0.90 por cada diez minutos de conversación con consulta a la base normativa en vivo.'),
  );
  resumen.push(
    bulletBold('Margen comercial proyectado:', '95 % a 97 % del precio del plan de suscripción.'),
  );
  resumen.push(
    bulletBold('Esfuerzo de implementación:', 'aproximadamente 50 horas de desarrollo distribuidas en una semana.'),
  );
  resumen.push(
    bulletBold('Cumplimiento legal:', 'compatible con la Ley N° 29733 de Protección de Datos Personales del Perú, siempre que se incorporen las salvaguardas detalladas en la sección 6.'),
  );

  resumen.push(spacer(200));

  resumen.push(
    calloutBox(
      '💡 Posicionamiento estratégico',
      'Esta funcionalidad sería el primer servicio de asesoría legal por voz en tiempo real con citación normativa especializada en contratación pública peruana. Constituye un diferenciador clave frente a herramientas legales genéricas como ChatGPT, que no están entrenadas con la Ley N° 32069 ni con los pronunciamientos del Tribunal de Contrataciones del Estado.',
      'blue',
    ),
  );

  // ═══════════════════════════════════════════════
  // 1. DESCRIPCIÓN DE LA FUNCIÓN
  // ═══════════════════════════════════════════════
  const seccion1: Array<Paragraph | Table> = [];

  seccion1.push(h1('1. Descripción de la función'));

  seccion1.push(h2('¿Qué es Llamadas con el Abogado Virtual?'));

  seccion1.push(
    p({
      text: 'Es una funcionalidad de conversación por voz donde el usuario puede hablar en tiempo real con la inteligencia artificial de LexIA como si estuviera consultando a un abogado especializado en contratación pública. La voz del asistente es fluida y natural, en español peruano, con respuestas fundamentadas en la base normativa vigente (Ley N° 32069, Reglamento DS 009-2025-EF, opiniones de la DTN, pronunciamientos del TCE).',
      spacingAfter: 200,
    }),
  );

  seccion1.push(h2('Casos de uso típicos'));

  seccion1.push(
    bullet('Un funcionario del área usuaria de una entidad consulta verbalmente cuál es el plazo máximo para emitir la conformidad de un servicio.'),
  );
  seccion1.push(
    bullet('Un proveedor pregunta cómo presentar una observación a las bases mientras prepara su oferta.'),
  );
  seccion1.push(
    bullet('Un consultor recibe asesoría inmediata sobre el sustento normativo de una resolución contractual mientras está reunido con su cliente.'),
  );
  seccion1.push(
    bullet('Un capacitador prepara su próxima ponencia consultando casuística específica del Tribunal de Contrataciones.'),
  );

  seccion1.push(spacer(200));

  seccion1.push(h2('Diferenciador frente a la competencia'));

  seccion1.push(
    p({
      text: 'Existen herramientas de IA legal en el mercado peruano (DOXS.AI, DereJ, Juztina, entre otras), pero ninguna ofrece actualmente:',
      spacingAfter: 120,
    }),
  );

  seccion1.push(
    bullet('Conversación por voz fluida en tiempo real (no sólo chat de texto).'),
  );
  seccion1.push(
    bullet('Especialización exclusiva en contratación pública bajo la nueva Ley N° 32069.'),
  );
  seccion1.push(
    bullet('Citación verificable al artículo específico durante la respuesta verbal.'),
  );
  seccion1.push(
    bullet('Capacidad de interrupción natural durante la conversación (barge-in).'),
  );

  // ═══════════════════════════════════════════════
  // 2. TECNOLOGÍA PROPUESTA
  // ═══════════════════════════════════════════════
  const seccion2: Array<Paragraph | Table> = [];

  seccion2.push(h1('2. Tecnología propuesta'));

  seccion2.push(h2('Gemini Live API'));

  seccion2.push(
    p({
      text: 'Se propone utilizar la Gemini Live API de Google Cloud, anunciada en su disponibilidad general (General Availability) durante Google I/O 2026. El modelo de referencia es gemini-2.5-flash-native-audio, especializado en conversación bidireccional de audio.',
      spacingAfter: 200,
    }),
  );

  seccion2.push(h3('¿Por qué esta tecnología?'));

  seccion2.push(
    bulletBold('Costo competitivo:',
      'aproximadamente cincuenta veces menor que la alternativa OpenAI Realtime API. Una sesión de cien mil minutos al mes cuesta USD 165 con Google frente a USD 8 400 con OpenAI.'),
  );
  seccion2.push(
    bulletBold('Producción estable:',
      'ya no está en estado preview. Cuenta con SLA empresarial, soporte multi-región y cumplimiento corporativo.'),
  );
  seccion2.push(
    bulletBold('Soporte nativo de español:',
      'admite más de setenta idiomas, con cambio automático entre idiomas sin configuración. La latencia es equivalente al inglés.'),
  );
  seccion2.push(
    bulletBold('Llamadas a funciones (tool calling):',
      'permite que el agente consulte la base normativa de LexIA durante la conversación, devolviendo la cita exacta del artículo o pronunciamiento.'),
  );
  seccion2.push(
    bulletBold('Misma cuenta de facturación:',
      'LexIA ya consume servicios de Google Cloud para Gemini. No se requiere proveedor adicional.'),
  );
  seccion2.push(
    bulletBold('Detección automática de voz e interrupciones:',
      'el sistema reconoce cuándo el usuario empieza y termina de hablar, y permite interrumpir al agente con baja latencia.'),
  );

  seccion2.push(spacer(200));

  seccion2.push(h3('Arquitectura técnica resumida'));

  seccion2.push(
    p({
      text: 'La comunicación entre el navegador del usuario y Gemini Live nunca es directa. Pasa por un servidor intermedio (proxy) en LexIA que protege la clave de acceso y orquesta la consulta a la base normativa.',
      spacingAfter: 200,
    }),
  );

  seccion2.push(
    fancyTable(
      ['Componente', 'Tecnología', 'Función'],
      [
        [
          { text: 'Captura de audio', bold: true },
          { text: 'getUserMedia (navegador)' },
          { text: 'Toma la voz del usuario desde el micrófono.' },
        ],
        [
          { text: 'Transporte', bold: true },
          { text: 'WebSocket bidireccional' },
          { text: 'Envía y recibe audio en tiempo real con baja latencia.' },
        ],
        [
          { text: 'Servidor intermedio', bold: true },
          { text: 'Next.js + Edge Function' },
          { text: 'Protege las credenciales y orquesta llamadas a funciones.' },
        ],
        [
          { text: 'Modelo de voz', bold: true },
          { text: 'Gemini 2.5 Flash Native Audio' },
          { text: 'Procesa el audio y genera la respuesta hablada.' },
        ],
        [
          { text: 'Base normativa', bold: true },
          { text: 'Supabase pgvector + RAG' },
          { text: 'Devuelve la cita exacta al artículo consultado.' },
        ],
        [
          { text: 'Almacenamiento', bold: true },
          { text: 'Supabase Storage' },
          { text: 'Guarda el audio y la transcripción para consulta posterior.' },
        ],
      ],
    ),
  );

  seccion2.push(spacer(200));

  seccion2.push(h3('Alternativas consideradas (descartadas)'));

  seccion2.push(
    fancyTable(
      ['Opción', 'Estado', 'Motivo del descarte'],
      [
        [
          { text: 'OpenAI Realtime API', bold: true },
          { text: 'Disponible' },
          { text: 'Cincuenta veces más cara que Gemini Live.' },
        ],
        [
          { text: 'Whisper + GPT + ElevenLabs', bold: true },
          { text: 'Disponible' },
          { text: 'Latencia entre cuatro y siete segundos por turno, percepción robótica.' },
        ],
        [
          { text: 'Plataformas Vapi / Retell / Bland', bold: true },
          { text: 'Disponible' },
          { text: 'Costo elevado y dependencia de terceros sin valor agregado para LexIA.' },
        ],
        [
          { text: 'Solución abierta autoalojada', bold: true },
          { text: 'Posible' },
          { text: 'Requiere mantenimiento de infraestructura y modelo, fuera del alcance actual.' },
        ],
      ],
    ),
  );

  // ═══════════════════════════════════════════════
  // 3. FUNCIONALIDADES PRINCIPALES
  // ═══════════════════════════════════════════════
  const seccion3: Array<Paragraph | Table> = [];

  seccion3.push(h1('3. Funcionalidades principales'));

  seccion3.push(
    p({
      text: 'La función entregada al usuario incluirá las siguientes capacidades, cuidadosamente diseñadas para que la experiencia sea profesional, segura y útil para abogados, funcionarios y consultores.',
      spacingAfter: 200,
    }),
  );

  seccion3.push(h3('3.1 Conversación natural por voz'));
  seccion3.push(
    bullet('El usuario habla normalmente sin presionar ningún botón mientras conversa.'),
  );
  seccion3.push(
    bullet('El sistema detecta automáticamente cuándo terminó de hablar y comienza a responder.'),
  );
  seccion3.push(
    bullet('Se puede interrumpir al agente en cualquier momento (igual que en una llamada real).'),
  );
  seccion3.push(
    bullet('Latencia inferior a un segundo en consultas conversacionales simples.'),
  );

  seccion3.push(h3('3.2 Citación normativa en vivo'));
  seccion3.push(
    bullet('Durante la respuesta hablada, el sistema busca en los 8 612 fragmentos normativos de la base de datos de LexIA.'),
  );
  seccion3.push(
    bullet('Cita el artículo, numeral, opinión, pronunciamiento o resolución del Tribunal de Contrataciones aplicable.'),
  );
  seccion3.push(
    bullet('Muestra en pantalla un enlace a la fuente consultada, para que el usuario pueda abrirla en la biblioteca y leerla completa.'),
  );

  seccion3.push(h3('3.3 Selección de voz'));
  seccion3.push(
    bullet('Voz masculina o femenina, configurable antes de cada llamada.'),
  );
  seccion3.push(
    bullet('Acento neutro latinoamericano, optimizado para términos jurídicos peruanos.'),
  );

  seccion3.push(h3('3.4 Historial de llamadas'));
  seccion3.push(
    bullet('Listado cronológico de todas las llamadas del usuario.'),
  );
  seccion3.push(
    bullet('Cada llamada conserva la transcripción, el audio descargable y un resumen ejecutivo de la consulta.'),
  );
  seccion3.push(
    bullet('Buscador interno por palabra clave dentro de las transcripciones.'),
  );

  seccion3.push(h3('3.5 Cuota mensual e indicador visual'));
  seccion3.push(
    bullet('El usuario ve siempre el contador de minutos disponibles este mes (por ejemplo: «18 min de 30 min restantes»).'),
  );
  seccion3.push(
    bullet('Si la cuota se agota, se ofrece comprar minutos adicionales sin necesidad de cambiar de plan.'),
  );

  seccion3.push(h3('3.6 Descargas y exportación'));
  seccion3.push(
    bullet('Audio en formato MP3 descargable.'),
  );
  seccion3.push(
    bullet('Transcripción en formato Word o PDF.'),
  );
  seccion3.push(
    bullet('Resumen ejecutivo automático con las citas normativas consultadas.'),
  );

  seccion3.push(h3('3.7 Calificación de la calidad'));
  seccion3.push(
    bullet('Al finalizar la llamada, el usuario puede calificar la respuesta de uno a cinco estrellas.'),
  );
  seccion3.push(
    bullet('Las llamadas con calificación baja se revisan para mejorar el modelo o ampliar la base normativa.'),
  );

  // ═══════════════════════════════════════════════
  // 4. ANÁLISIS DE COSTOS
  // ═══════════════════════════════════════════════
  const seccion4: Array<Paragraph | Table> = [];

  seccion4.push(h1('4. Análisis de costos'));

  seccion4.push(
    p({
      text: 'Los costos están denominados en soles peruanos (PEN) usando un tipo de cambio referencial de USD 1 = S/ 3.75. Todos los importes son del lado de LexIA (costo operativo) y no del lado del usuario final.',
      spacingAfter: 200,
    }),
  );

  seccion4.push(h2('4.1 Costo unitario por minuto'));

  seccion4.push(
    fancyTable(
      ['Concepto', 'Costo USD', 'Costo PEN'],
      [
        [
          { text: 'Audio de entrada (voz del usuario)', bold: true },
          { text: '$ 0.005', align: AlignmentType.RIGHT },
          { text: 'S/ 0.019', align: AlignmentType.RIGHT },
        ],
        [
          { text: 'Audio de salida (voz del agente)', bold: true },
          { text: '$ 0.018', align: AlignmentType.RIGHT },
          { text: 'S/ 0.068', align: AlignmentType.RIGHT },
        ],
        [
          { text: 'Total por minuto de conversación', bold: true, color: BRAND_BLUE },
          { text: '$ 0.023', align: AlignmentType.RIGHT, bold: true, color: BRAND_BLUE },
          { text: 'S/ 0.087', align: AlignmentType.RIGHT, bold: true, color: BRAND_BLUE },
        ],
        [
          { text: 'Búsqueda en base normativa (cinco consultas promedio)', bold: true },
          { text: '$ 0.010', align: AlignmentType.RIGHT },
          { text: 'S/ 0.038', align: AlignmentType.RIGHT },
        ],
      ],
    ),
  );

  seccion4.push(spacer(160));

  seccion4.push(
    calloutBox(
      '🧮 Costo real de una llamada típica',
      'Una llamada promedio de diez minutos con consulta a la base normativa representa un costo operativo aproximado de USD 0.24, equivalente a S/ 0.90.',
      'green',
    ),
  );

  seccion4.push(spacer(200));

  seccion4.push(h2('4.2 Proyección por escenarios de uso'));

  seccion4.push(
    p({
      text: 'Para entender el impacto económico real, se proyecta el costo mensual en tres escenarios de crecimiento de LexIA.',
      spacingAfter: 200,
    }),
  );

  seccion4.push(h3('Escenario inicial (mes 1 a 3)'));
  seccion4.push(
    p({
      text: 'Demostraciones, primeros usuarios validando la plataforma.',
      spacingAfter: 120,
    }),
  );

  seccion4.push(
    fancyTable(
      ['Métrica', 'Valor'],
      [
        [{ text: 'Usuarios activos', bold: true }, { text: '20' }],
        [{ text: 'Llamadas por usuario al mes', bold: true }, { text: '4' }],
        [{ text: 'Duración promedio', bold: true }, { text: '8 minutos' }],
        [{ text: 'Total minutos al mes', bold: true }, { text: '640 minutos' }],
        [
          { text: 'Costo mensual estimado', bold: true, color: BRAND_BLUE },
          { text: 'S/ 57', bold: true, color: BRAND_BLUE, align: AlignmentType.RIGHT },
        ],
      ],
    ),
  );

  seccion4.push(spacer(200));

  seccion4.push(h3('Escenario crecimiento (mes 4 a 9)'));
  seccion4.push(
    p({
      text: 'Producto validado, base creciente de suscriptores pagos.',
      spacingAfter: 120,
    }),
  );

  seccion4.push(
    fancyTable(
      ['Métrica', 'Valor'],
      [
        [{ text: 'Usuarios activos', bold: true }, { text: '100' }],
        [{ text: 'Llamadas por usuario al mes', bold: true }, { text: '5' }],
        [{ text: 'Duración promedio', bold: true }, { text: '12 minutos' }],
        [{ text: 'Total minutos al mes', bold: true }, { text: '6 000 minutos' }],
        [{ text: 'Costo en modalidad estándar', bold: true }, { text: 'S/ 533' }],
        [
          { text: 'Costo con Vertex AI optimizado', bold: true, color: BRAND_BLUE },
          { text: 'S/ 401', bold: true, color: BRAND_BLUE, align: AlignmentType.RIGHT },
        ],
      ],
    ),
  );

  seccion4.push(spacer(200));

  seccion4.push(h3('Escenario consolidación (mes 12+)'));
  seccion4.push(
    p({
      text: 'Plataforma posicionada en el mercado, contratos empresariales firmados.',
      spacingAfter: 120,
    }),
  );

  seccion4.push(
    fancyTable(
      ['Métrica', 'Valor'],
      [
        [{ text: 'Usuarios activos', bold: true }, { text: '500' }],
        [{ text: 'Llamadas por usuario al mes', bold: true }, { text: '6' }],
        [{ text: 'Duración promedio', bold: true }, { text: '15 minutos' }],
        [{ text: 'Total minutos al mes', bold: true }, { text: '45 000 minutos' }],
        [{ text: 'Costo en modalidad estándar', bold: true }, { text: 'S/ 3 983' }],
        [
          { text: 'Costo con Vertex AI optimizado', bold: true, color: BRAND_BLUE },
          { text: 'S/ 2 419', bold: true, color: BRAND_BLUE, align: AlignmentType.RIGHT },
        ],
      ],
    ),
  );

  seccion4.push(spacer(200));

  seccion4.push(h2('4.3 Margen comercial proyectado'));

  seccion4.push(
    fancyTable(
      ['Volumen', 'Ingresos plan Pro', 'Costo voz', 'Margen sobre voz'],
      [
        [
          { text: '100 usuarios', bold: true },
          { text: 'S/ 9 900', align: AlignmentType.RIGHT },
          { text: 'S/ 401', align: AlignmentType.RIGHT },
          { text: '96 %', align: AlignmentType.RIGHT, color: SUCCESS, bold: true },
        ],
        [
          { text: '500 usuarios', bold: true },
          { text: 'S/ 49 500', align: AlignmentType.RIGHT },
          { text: 'S/ 2 419', align: AlignmentType.RIGHT },
          { text: '95 %', align: AlignmentType.RIGHT, color: SUCCESS, bold: true },
        ],
      ],
    ),
  );

  seccion4.push(spacer(200));

  seccion4.push(
    calloutBox(
      '💰 Lectura comercial',
      'El costo operativo de la voz es marginal frente al precio del plan de suscripción. Por cada sol que LexIA recibe del usuario, sólo cuatro o cinco céntimos se destinan a cubrir el costo de la IA conversacional. Esto convierte la voz en una palanca de venta de alto valor percibido y bajo costo real.',
      'green',
    ),
  );

  // ═══════════════════════════════════════════════
  // 5. PLAN DE SUSCRIPCIÓN RECOMENDADO
  // ═══════════════════════════════════════════════
  const seccion5: Array<Paragraph | Table> = [];

  seccion5.push(h1('5. Plan de suscripción recomendado'));

  seccion5.push(
    p({
      text: 'Se propone incorporar las Llamadas con el Abogado Virtual al esquema de suscripciones de LexIA con una distribución de cuotas que premia los planes superiores y atrae a la conversión desde el plan de prueba.',
      spacingAfter: 200,
    }),
  );

  seccion5.push(
    fancyTable(
      ['Plan', 'Precio mensual', 'Minutos de voz', 'Posicionamiento'],
      [
        [
          { text: 'Prueba gratuita (Trial)', bold: true },
          { text: 'S/ 0', align: AlignmentType.CENTER },
          { text: '5 minutos (1 sola llamada)', align: AlignmentType.CENTER },
          { text: 'Permite probar la calidad' },
        ],
        [
          { text: 'Starter', bold: true },
          { text: 'S/ 49', align: AlignmentType.CENTER },
          { text: 'No incluye voz', align: AlignmentType.CENTER, color: TEXT_MUTED },
          { text: 'Chat + biblioteca' },
        ],
        [
          { text: 'Pro', bold: true, color: BRAND_BLUE },
          { text: 'S/ 99', align: AlignmentType.CENTER, color: BRAND_BLUE, bold: true },
          { text: '30 minutos al mes', align: AlignmentType.CENTER, color: BRAND_BLUE, bold: true },
          { text: 'Plan recomendado', color: BRAND_BLUE },
        ],
        [
          { text: 'Enterprise', bold: true },
          { text: 'S/ 249', align: AlignmentType.CENTER },
          { text: '120 minutos al mes', align: AlignmentType.CENTER, bold: true },
          { text: 'Voces premium y prioridad' },
        ],
      ],
    ),
  );

  seccion5.push(spacer(200));

  seccion5.push(h2('5.1 Minutos adicionales (paquetes complementarios)'));

  seccion5.push(
    p({
      text: 'Para usuarios que consumen su cuota antes de fin de mes, se ofrecen paquetes de minutos adicionales sin necesidad de cambiar de plan:',
      spacingAfter: 120,
    }),
  );

  seccion5.push(
    fancyTable(
      ['Paquete', 'Minutos', 'Precio'],
      [
        [
          { text: 'Recarga pequeña', bold: true },
          { text: '15 min', align: AlignmentType.CENTER },
          { text: 'S/ 25', align: AlignmentType.CENTER, color: BRAND_BLUE, bold: true },
        ],
        [
          { text: 'Recarga media', bold: true },
          { text: '60 min', align: AlignmentType.CENTER },
          { text: 'S/ 79', align: AlignmentType.CENTER, color: BRAND_BLUE, bold: true },
        ],
        [
          { text: 'Recarga grande', bold: true },
          { text: '180 min', align: AlignmentType.CENTER },
          { text: 'S/ 199', align: AlignmentType.CENTER, color: BRAND_BLUE, bold: true },
        ],
      ],
    ),
  );

  seccion5.push(spacer(200));

  seccion5.push(h2('5.2 Beneficios exclusivos por plan'));

  seccion5.push(h3('Plan Pro (recomendado)'));
  seccion5.push(bullet('30 minutos de voz al mes incluidos.'));
  seccion5.push(bullet('Voz femenina o masculina seleccionable.'));
  seccion5.push(bullet('Acumulación de hasta 10 minutos no consumidos para el mes siguiente.'));
  seccion5.push(bullet('Resumen ejecutivo automático con citas normativas.'));

  seccion5.push(h3('Plan Enterprise'));
  seccion5.push(bullet('120 minutos de voz al mes incluidos.'));
  seccion5.push(bullet('Voces premium (cuatro variantes adicionales).'));
  seccion5.push(bullet('Cola prioritaria en horas pico.'));
  seccion5.push(bullet('Auditoría profesional opcional: un abogado humano del staff revisa las consultas marcadas como complejas.'));
  seccion5.push(bullet('Política de retención extendida (hasta 12 meses configurable).'));

  // ═══════════════════════════════════════════════
  // 6. CUMPLIMIENTO LEGAL
  // ═══════════════════════════════════════════════
  const seccion6: Array<Paragraph | Table> = [];

  seccion6.push(h1('6. Cumplimiento legal (Ley N° 29733)'));

  seccion6.push(
    p({
      text: 'Antes de lanzar la funcionalidad es obligatorio implementar las salvaguardas exigidas por la Ley N° 29733, Ley de Protección de Datos Personales del Perú, y su reglamento modificado en 2024.',
      spacingAfter: 200,
    }),
  );

  seccion6.push(h2('6.1 Consentimiento expreso (obligatorio)'));

  seccion6.push(
    p({
      text: 'La voz puede calificar como dato personal sensible. Por ello, el consentimiento debe ser libre, previo, expreso, informado, inequívoco y demostrable. Esto se implementará como una pantalla obligatoria antes de la primera llamada, con cuatro casillas de aceptación:',
      spacingAfter: 200,
    }),
  );

  seccion6.push(
    calloutBox(
      'Texto de las casillas de consentimiento',
      '1. Acepto que esta es una conversación con inteligencia artificial, no con un abogado licenciado. La información es orientativa y no constituye asesoría legal profesional.\n\n2. Acepto que la llamada sea grabada y la transcripción almacenada en mi cuenta para que pueda consultarla después.\n\n3. Entiendo que mis datos se procesan en servidores de Google Cloud en Estados Unidos o Brasil bajo los términos de privacidad de LexIA y Google.\n\n4. Acepto no compartir información confidencial de terceros, datos personales sensibles ni secretos profesionales en esta llamada.',
      'blue',
    ),
  );

  seccion6.push(spacer(200));

  seccion6.push(h2('6.2 Aviso permanente durante la llamada'));

  seccion6.push(
    bullet('Indicador visual permanente en la esquina superior: «🤖 Estás hablando con IA · Información orientativa».'),
  );
  seccion6.push(
    bullet('La primera frase del agente por voz debe recordar que es IA y que la información es orientativa.'),
  );

  seccion6.push(h2('6.3 Derecho de eliminación (Art. 18 Ley 29733)'));

  seccion6.push(
    bullet('Botón «Eliminar grabación» en cada llamada del historial.'),
  );
  seccion6.push(
    bullet('Opción «Eliminar todas mis llamadas» en la sección Cuenta → Privacidad.'),
  );
  seccion6.push(
    bullet('Registro de auditoría minimal (quién pidió qué eliminación y cuándo), sin conservar el contenido borrado.'),
  );

  seccion6.push(h2('6.4 Política de privacidad específica'));

  seccion6.push(
    bullet('Página dedicada en /legal/privacidad-voz detallando: datos recogidos, almacenamiento, plazo de retención, eliminación y derechos del usuario.'),
  );
  seccion6.push(
    bullet('Plazo de retención propuesto por defecto: 90 días calendario. Configurable por el cliente Enterprise hasta 12 meses.'),
  );

  seccion6.push(h2('6.5 Validez probatoria'));

  seccion6.push(
    p({
      text: 'La Corte Suprema del Perú, en el caso Apelación 7-2023 (Los Mamanivideos), ratificó la denominada teoría del riesgo: el interlocutor que graba la conversación puede usarla como prueba lícita en juicio. Por tanto, el usuario de LexIA puede usar la grabación de su llamada como sustento probatorio si lo necesitase, siempre que un peritaje informático valide su autenticidad.',
      spacingAfter: 200,
    }),
  );

  seccion6.push(
    calloutBox(
      '⚠️ Importante para César',
      'El Colegio de Abogados de Lima no ha emitido regulación específica sobre el uso de inteligencia artificial en la práctica legal a la fecha (junio de 2026). Sin embargo, la tendencia internacional (American Bar Association 2024, Consejo General del Abogacía Española 2025) es emitir guías de buenas prácticas. LexIA debe anticiparse: el disclaimer obligatorio antes de cada llamada es la protección legal clave.',
      'amber',
    ),
  );

  // ═══════════════════════════════════════════════
  // 7. CRONOGRAMA DE IMPLEMENTACIÓN
  // ═══════════════════════════════════════════════
  const seccion7: Array<Paragraph | Table> = [];

  seccion7.push(h1('7. Cronograma de implementación'));

  seccion7.push(
    p({
      text: 'Aproximadamente 50 horas de desarrollo distribuidas en una semana laboral, incluyendo todas las salvaguardas legales mencionadas en la sección 6.',
      spacingAfter: 200,
    }),
  );

  seccion7.push(
    fancyTable(
      ['Día', 'Actividad', 'Horas'],
      [
        [
          { text: 'Día 1', bold: true },
          { text: 'Servidor intermedio WebSocket + autenticación + llamadas a funciones (tool calling).' },
          { text: '8', align: AlignmentType.CENTER },
        ],
        [
          { text: 'Día 2', bold: true },
          { text: 'Integración con la base normativa (RAG) y prompts del abogado virtual.' },
          { text: '8', align: AlignmentType.CENTER },
        ],
        [
          { text: 'Día 3', bold: true },
          { text: 'Interfaz del usuario: captura de audio, reproducción, indicadores visuales, selector de voz.' },
          { text: '8', align: AlignmentType.CENTER },
        ],
        [
          { text: 'Día 4', bold: true },
          { text: 'Persistencia: almacenamiento de audio y transcripciones, historial de llamadas.' },
          { text: '8', align: AlignmentType.CENTER },
        ],
        [
          { text: 'Día 5', bold: true },
          { text: 'Compliance: pantallas de consentimiento, política de privacidad, endpoint de eliminación, audit logs.' },
          { text: '10', align: AlignmentType.CENTER },
        ],
        [
          { text: 'Día 6', bold: true },
          { text: 'Control de cuota mensual, paquetes adicionales, integración con suscripciones.' },
          { text: '4', align: AlignmentType.CENTER },
        ],
        [
          { text: 'Día 7', bold: true },
          { text: 'Pruebas con usuarios reales, ajuste de voz y prompts, despliegue a producción.' },
          { text: '4', align: AlignmentType.CENTER },
        ],
        [
          { text: 'Total', bold: true, color: BRAND_BLUE },
          { text: '', },
          { text: '50 horas', align: AlignmentType.CENTER, bold: true, color: BRAND_BLUE },
        ],
      ],
    ),
  );

  // ═══════════════════════════════════════════════
  // 8. DECISIONES PENDIENTES DEL CLIENTE
  // ═══════════════════════════════════════════════
  const seccion8: Array<Paragraph | Table> = [];

  seccion8.push(h1('8. Decisiones pendientes de César'));

  seccion8.push(
    p({
      text: 'Antes de iniciar el desarrollo se requieren las siguientes definiciones del cliente, que son decisiones de producto y no técnicas. El equipo técnico de LexIA no las puede tomar por su cuenta porque tienen implicancias contractuales y de marca.',
      spacingAfter: 200,
    }),
  );

  seccion8.push(
    fancyTable(
      ['Decisión', 'Opciones', 'Recomendación'],
      [
        [
          { text: 'Política de retención de grabaciones', bold: true },
          { text: '30, 90, 180 o 365 días' },
          { text: '90 días para Pro · 365 días para Enterprise', color: BRAND_BLUE },
        ],
        [
          { text: 'Acceso del personal de LexIA a las grabaciones', bold: true },
          { text: 'Nunca · Sólo con consentimiento expreso · Para soporte técnico' },
          { text: 'Sólo con consentimiento expreso del usuario', color: BRAND_BLUE },
        ],
        [
          { text: 'Texto exacto del disclaimer legal', bold: true },
          { text: 'Estándar propuesto o personalizado' },
          { text: 'Estándar de esta propuesta, revisado por abogado externo', color: BRAND_BLUE },
        ],
        [
          { text: 'Términos y Condiciones', bold: true },
          { text: 'Anexo de voz o actualización integral' },
          { text: 'Anexo específico de voz firmado por el usuario', color: BRAND_BLUE },
        ],
        [
          { text: 'Plan en el que se incluye', bold: true },
          { text: 'Sólo Enterprise · Pro y Enterprise · Todos los planes' },
          { text: 'Pro y Enterprise (con minutos diferenciados)', color: BRAND_BLUE },
        ],
        [
          { text: 'Precio del plan Pro', bold: true },
          { text: 'S/ 79 · S/ 99 · S/ 119' },
          { text: 'S/ 99 con 30 min incluidos', color: BRAND_BLUE },
        ],
      ],
    ),
  );

  // ═══════════════════════════════════════════════
  // 9. CONCLUSIÓN
  // ═══════════════════════════════════════════════
  const seccion9: Array<Paragraph | Table> = [];

  seccion9.push(h1('9. Conclusión y siguientes pasos'));

  seccion9.push(
    p({
      text: 'La funcionalidad Llamadas con el Abogado Virtual es técnicamente viable, comercialmente atractiva y legalmente compatible con la normativa peruana, siempre que se incorporen las salvaguardas detalladas en la sección 6.',
      spacingAfter: 160,
    }),
  );

  seccion9.push(
    p({
      text: 'En resumen:',
      bold: true,
      spacingAfter: 120,
    }),
  );

  seccion9.push(bullet('Costo operativo bajo (S/ 0.90 por llamada de diez minutos).'));
  seccion9.push(bullet('Margen del 95 % al 97 % sobre el precio del plan de suscripción.'));
  seccion9.push(bullet('Desarrollo en una semana laboral con todas las salvaguardas legales.'));
  seccion9.push(bullet('Diferenciador competitivo claro frente a ChatGPT y otras herramientas legales genéricas.'));
  seccion9.push(bullet('Sin proveedores adicionales: misma cuenta de Google Cloud que ya usa LexIA.'));

  seccion9.push(spacer(200));

  seccion9.push(h2('Próximos pasos sugeridos'));

  seccion9.push(
    p({
      text: '1. César revisa este documento y confirma las seis decisiones de la sección 8.',
      spacingAfter: 100,
    }),
  );
  seccion9.push(
    p({
      text: '2. Se valida con un abogado externo el texto exacto del disclaimer y la política de privacidad.',
      spacingAfter: 100,
    }),
  );
  seccion9.push(
    p({
      text: '3. Se actualizan los Términos y Condiciones de LexIA con el anexo de voz.',
      spacingAfter: 100,
    }),
  );
  seccion9.push(
    p({
      text: '4. El equipo técnico inicia el desarrollo según el cronograma de la sección 7.',
      spacingAfter: 100,
    }),
  );
  seccion9.push(
    p({
      text: '5. Pruebas internas con César y dos usuarios beta antes del lanzamiento público.',
      spacingAfter: 300,
    }),
  );

  seccion9.push(divider());

  seccion9.push(
    p({
      text: 'Cualquier consulta sobre esta propuesta puede dirigirse al equipo técnico de LexIA.',
      italic: true,
      color: TEXT_MUTED,
      alignment: AlignmentType.CENTER,
    }),
  );

  // ═══════════════════════════════════════════════
  // Construcción final del documento
  // ═══════════════════════════════════════════════
  return new Document({
    creator: 'LexIA Contrataciones',
    title: 'Propuesta — Llamadas con el Abogado Virtual',
    description: 'Propuesta técnica y comercial para César Huamán Oré sobre la nueva funcionalidad de voz IA legal.',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: TEXT_DARK },
          paragraph: { spacing: { line: 320, after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
              bottom: convertInchesToTwip(0.9),
              left: convertInchesToTwip(0.9),
            },
            size: { orientation: PageOrientation.PORTRAIT },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: [
          ...portada,
          ...resumen,
          ...seccion1,
          ...seccion2,
          ...seccion3,
          ...seccion4,
          ...seccion5,
          ...seccion6,
          ...seccion7,
          ...seccion8,
          ...seccion9,
        ],
      },
    ],
  });
}

async function main() {
  console.log('Generando documento Word…');
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);
  const outputPath = join(process.cwd(), 'Propuesta_Voz_LexIA_Cesar.docx');
  writeFileSync(outputPath, buffer);
  console.log('✅ Documento generado:', outputPath);
  console.log('   Tamaño:', (buffer.length / 1024).toFixed(1), 'KB');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
