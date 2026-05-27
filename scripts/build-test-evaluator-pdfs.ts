#!/usr/bin/env tsx
/**
 * Genera 3 PDFs realistas para testear el Evaluador IA:
 *   - data/test-evaluador/Bases_Integradas_LP_002-2025.pdf
 *   - data/test-evaluador/Oferta_Constructora_Andina_SAC.pdf       (subsanable)
 *   - data/test-evaluador/Oferta_Ingenieria_del_Norte_SRL.pdf      (no cumple)
 *
 * Diseñado para que el pipeline RAG del Evaluador detecte:
 * - Constructora Andina: cumple casi todo, omite declaración jurada formal → SUBSANABLE
 * - Ingeniería del Norte: jefe de obra con 3 años experiencia (exigen 5) → NO CUMPLE
 */
import PDFDocument from 'pdfkit';
import { mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'data', 'test-evaluador');
mkdirSync(OUT_DIR, { recursive: true });

interface Section {
  heading: string;
  body: string[];
}

function buildPdf(filename: string, title: string, subtitle: string, sections: Section[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: { Title: title, Author: 'LexIA Demo' },
    });
    const stream = createWriteStream(join(OUT_DIR, filename));
    doc.pipe(stream);

    // Title
    doc.font('Helvetica-Bold').fontSize(16).text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor('#555').text(subtitle, { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('black');

    // Sections
    for (const sec of sections) {
      doc.font('Helvetica-Bold').fontSize(12).text(sec.heading, { underline: false });
      doc.moveDown(0.4);
      for (const para of sec.body) {
        doc.font('Helvetica').fontSize(10.5).text(para, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.4);
      }
      doc.moveDown(0.6);
    }

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// ════════════════════════════════════════════════════════════════════
// 1. BASES INTEGRADAS
// ════════════════════════════════════════════════════════════════════
const BASES_SECTIONS: Section[] = [
  {
    heading: 'CAPÍTULO I — GENERALIDADES',
    body: [
      'ENTIDAD CONTRATANTE: Gobierno Regional de Lambayeque',
      'OBJETO DE LA CONTRATACIÓN: Ejecución de la obra "Mejoramiento de la carretera departamental Chiclayo – Lambayeque, tramo km 0+000 al km 18+500", bajo el régimen de la Ley N° 32069 — Ley General de Contrataciones Públicas, y su Reglamento aprobado por Decreto Supremo N° 009-2025-EF.',
      'VALOR REFERENCIAL: S/ 12,450,000.00 (Doce millones cuatrocientos cincuenta mil con 00/100 soles), incluidos todos los impuestos de ley.',
      'PLAZO DE EJECUCIÓN: Trescientos cincuenta (350) días calendario, contados a partir del día siguiente del perfeccionamiento del contrato.',
      'SISTEMA DE CONTRATACIÓN: A suma alzada.',
      'MODALIDAD DE EJECUCIÓN: Contractual por terceros.',
    ],
  },
  {
    heading: 'CAPÍTULO II — REQUISITOS DE CALIFICACIÓN DEL POSTOR',
    body: [
      'A.1 CAPACIDAD LEGAL: El postor deberá presentar Declaración Jurada de no encontrarse impedido conforme al artículo 11 de la Ley N° 32069. Asimismo, deberá presentar Declaración Jurada de no tener inhabilitación administrativa vigente para contratar con el Estado emitida por el Tribunal de Contrataciones del Estado.',
      'A.2 CAPACIDAD TÉCNICA Y PROFESIONAL (EXPERIENCIA DE LA EMPRESA): El postor deberá acreditar haber ejecutado en los últimos diez (10) años contratos de ejecución de obras viales por un monto acumulado mínimo de S/ 24,900,000.00 (DOS veces el valor referencial), debiendo acreditarse con copia de los contratos, comprobantes de pago o documentos análogos. Al menos UNO (1) de dichos contratos debe corresponder a una obra cuyo monto contractual sea igual o mayor a S/ 6,225,000.00.',
      'A.3 EXPERIENCIA DEL PERSONAL CLAVE: El personal clave propuesto deberá acreditar la siguiente experiencia mínima:',
      '   a) JEFE DE OBRA: Ingeniero Civil colegiado y habilitado, con experiencia profesional general mínima de DIEZ (10) años y experiencia específica mínima de CINCO (5) años en ejecución de obras viales como Jefe de Obra, Residente o Inspector. Esta experiencia debe acreditarse mediante constancias, certificados o contratos.',
      '   b) RESIDENTE DE OBRA: Ingeniero Civil colegiado y habilitado, con experiencia profesional mínima de SIETE (7) años y específica mínima de CUATRO (4) años en obras similares.',
      '   c) ESPECIALISTA EN PAVIMENTOS: Ingeniero Civil con experiencia profesional mínima de OCHO (8) años y específica mínima de TRES (3) años en obras de pavimentación.',
      'A.4 EQUIPAMIENTO MÍNIMO: El postor deberá acreditar la disponibilidad del siguiente equipamiento mínimo: dos (2) cargadores frontales sobre llantas de 2.5 m³ de capacidad mínima; tres (3) volquetes de 15 m³; una (1) motoniveladora de 140 HP mínimo; un (1) rodillo vibratorio liso de 10 toneladas; una (1) planta de asfalto de 60 ton/hora mínimo. La disponibilidad se acreditará con declaración jurada y, de ser propio, con la documentación de propiedad correspondiente.',
      'A.5 CAPACIDAD ECONÓMICA-FINANCIERA: El postor deberá acreditar un volumen anual de facturación promedio en los últimos tres (3) años igual o mayor a S/ 12,450,000.00, mediante copia de la Declaración Anual del Impuesto a la Renta o sus comprobantes correspondientes.',
    ],
  },
  {
    heading: 'CAPÍTULO III — DOCUMENTACIÓN ADMINISTRATIVA OBLIGATORIA',
    body: [
      'Constituyen documentos de presentación obligatoria en la oferta los siguientes:',
      '1. Carta de presentación de la oferta firmada por el representante legal.',
      '2. Vigencia de poder del representante legal con antigüedad no mayor a treinta (30) días calendario.',
      '3. Declaración Jurada de cumplimiento de los Términos de Referencia y Bases Integradas.',
      '4. Declaración Jurada de plazo de ejecución de la obra.',
      '5. Declaración Jurada de Garantía sobre vicios ocultos.',
      '6. Declaración Jurada de no estar inhabilitado para contratar con el Estado.',
      '7. Garantía de Seriedad de Oferta por el monto equivalente al 1% del valor referencial, emitida por una entidad bancaria autorizada por la Superintendencia de Banca y Seguros, con vigencia mínima de noventa (90) días calendario.',
      '8. Constancia vigente del Registro Nacional de Proveedores (RNP) en la especialidad correspondiente.',
    ],
  },
  {
    heading: 'CAPÍTULO IV — FACTORES DE EVALUACIÓN Y CALIFICACIÓN',
    body: [
      'El comité de selección procederá a la evaluación técnica conforme al artículo 64 del Reglamento. Aquellas ofertas que incumplan los requisitos de calificación mínimos serán declaradas NO ADMITIDAS, salvo aquellos defectos de carácter formal susceptibles de subsanación conforme al artículo 64.2 del Reglamento.',
      'No procede la subsanación de la falta de experiencia mínima exigida del personal clave o de la empresa, cuando dicho requisito constituya factor de calificación, conforme al artículo 49 de la Ley N° 32069 y a la jurisprudencia consolidada del Tribunal de Contrataciones del Estado.',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// 2. OFERTA — CONSTRUCTORA ANDINA S.A.C. (SUBSANABLE)
// ════════════════════════════════════════════════════════════════════
const OFERTA_ANDINA: Section[] = [
  {
    heading: 'CARTA DE PRESENTACIÓN DE OFERTA',
    body: [
      'Señores miembros del Comité de Selección. CONSTRUCTORA ANDINA S.A.C., con RUC N° 20512345678, debidamente representada por el señor JORGE ALBERTO RAMÍREZ TORRES, identificado con DNI N° 41234567, presenta la siguiente propuesta para el proceso de Licitación Pública N° 002-2025-GRL para la "Mejoramiento de la carretera departamental Chiclayo – Lambayeque".',
      'OFERTA ECONÓMICA: S/ 12,200,000.00 (Doce millones doscientos mil con 00/100 soles), incluyendo todos los impuestos de ley y prestaciones laborales.',
      'PLAZO DE EJECUCIÓN OFERTADO: Trescientos cincuenta (350) días calendario.',
    ],
  },
  {
    heading: 'EXPERIENCIA DE LA EMPRESA',
    body: [
      'CONSTRUCTORA ANDINA S.A.C. acredita en los últimos diez años la ejecución de los siguientes contratos de obras viales:',
      '1. Contrato N° 087-2019-MTC: "Rehabilitación de la carretera departamental Cajamarca-Bambamarca, tramo km 12+000 al km 28+500". Monto contractual: S/ 9,800,000.00. Estado: liquidado y entregado.',
      '2. Contrato N° 042-2021-GRC: "Mejoramiento de la avenida Industrial-Cajamarca, distrito de Baños del Inca". Monto contractual: S/ 8,500,000.00. Estado: liquidado y conforme.',
      '3. Contrato N° 015-2023-GRL: "Construcción de la carretera vecinal La Encañada – Hualgayoc, tramo II". Monto contractual: S/ 7,200,000.00. Estado: en liquidación, con conformidad técnica.',
      'MONTO ACUMULADO TOTAL ACREDITADO: S/ 25,500,000.00, superando el mínimo exigido de S/ 24,900,000.00 (dos veces el valor referencial). Se adjuntan copias de los contratos y constancias de prestación.',
    ],
  },
  {
    heading: 'PERSONAL CLAVE PROPUESTO',
    body: [
      'JEFE DE OBRA: Ing. CARLOS MENDOZA PALACIOS, CIP 78521, ingeniero civil colegiado y habilitado, con doce (12) años de experiencia profesional general y siete (7) años de experiencia específica en obras viales como Jefe de Obra. Se adjunta currículum vitae documentado con copia de los contratos N° 087-2019-MTC (jefe de obra) y N° 015-2023-GRL (jefe de obra). El CV no presenta la firma del profesional, conforme se evidencia.',
      'RESIDENTE DE OBRA: Ing. ANA LUCÍA TORRES MEDINA, CIP 96214, ingeniera civil con ocho (8) años de experiencia general y cinco (5) años de experiencia específica en obras viales. Se adjunta CV documentado y firmado.',
      'ESPECIALISTA EN PAVIMENTOS: Ing. ROBERTO QUISPE MAMANI, CIP 88712, con nueve (9) años de experiencia profesional y cuatro (4) años de experiencia específica en pavimentos asfálticos. Se adjunta CV documentado y firmado.',
    ],
  },
  {
    heading: 'EQUIPAMIENTO PROPUESTO',
    body: [
      'CONSTRUCTORA ANDINA S.A.C. acredita la disponibilidad del siguiente equipamiento mínimo, todo de propiedad de la empresa, conforme a las tarjetas de propiedad que se adjuntan:',
      '- Dos (2) cargadores frontales Caterpillar 950H de 3.0 m³ de capacidad.',
      '- Tres (3) volquetes Volvo FH 16 de 18 m³ de capacidad.',
      '- Una (1) motoniveladora Caterpillar 140K de 175 HP.',
      '- Un (1) rodillo vibratorio Bomag BW 211 de 12 toneladas.',
      '- Una (1) planta de asfalto modelo Astec Double Barrel 240 con capacidad de 90 ton/hora.',
      'Toda la documentación de propiedad y declaración jurada de disponibilidad se adjunta como anexo.',
    ],
  },
  {
    heading: 'CAPACIDAD ECONÓMICO-FINANCIERA',
    body: [
      'Se adjuntan copias de las declaraciones anuales del Impuesto a la Renta de los ejercicios fiscales 2022, 2023 y 2024, acreditando un volumen anual de facturación promedio de S/ 14,800,000.00, superior al mínimo exigido de S/ 12,450,000.00.',
    ],
  },
  {
    heading: 'GARANTÍA DE SERIEDAD DE OFERTA',
    body: [
      'Se adjunta Carta Fianza N° GF-2025-04578 emitida por Banco de Crédito del Perú con fecha 03 de marzo de 2025, por la suma de S/ 124,500.00 (1% del valor referencial), con vigencia de noventa (90) días calendario, conforme a lo exigido.',
      'NOTA: Se acompaña, además, addenda emitida por Banco de Crédito del Perú con fecha 05 de marzo de 2025, ampliando la vigencia hasta el 15 de junio de 2025.',
    ],
  },
  {
    heading: 'OBSERVACIONES DE LA PROPIA OFERTA',
    body: [
      'Por una omisión administrativa interna, CONSTRUCTORA ANDINA S.A.C. no incluyó en la presente oferta la Declaración Jurada de no tener inhabilitación administrativa vigente (requisito A.1 de las Bases). Se confirma que la empresa no se encuentra inhabilitada al momento de la presentación de la oferta, conforme se puede verificar en la consulta pública del Registro Nacional de Sancionados del Tribunal de Contrataciones del Estado. Asimismo, el CV del Jefe de Obra propuesto, Ing. Carlos Mendoza Palacios, fue adjuntado sin firma del profesional debido a la urgencia del cierre de la propuesta, aunque la experiencia documentada cumple holgadamente los requisitos mínimos.',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// 3. OFERTA — INGENIERÍA DEL NORTE S.R.L. (NO CUMPLE)
// ════════════════════════════════════════════════════════════════════
const OFERTA_NORTE: Section[] = [
  {
    heading: 'CARTA DE PRESENTACIÓN DE OFERTA',
    body: [
      'Señores miembros del Comité de Selección. INGENIERÍA DEL NORTE S.R.L., con RUC N° 20678912345, representada por la señora MARÍA ELENA VARGAS CASTRO, identificada con DNI N° 09876543, presenta la siguiente propuesta para el proceso de Licitación Pública N° 002-2025-GRL.',
      'OFERTA ECONÓMICA: S/ 11,950,000.00 (Once millones novecientos cincuenta mil con 00/100 soles), incluyendo todos los impuestos.',
      'PLAZO DE EJECUCIÓN: Trescientos cincuenta (350) días calendario.',
    ],
  },
  {
    heading: 'EXPERIENCIA DE LA EMPRESA',
    body: [
      'INGENIERÍA DEL NORTE S.R.L. acredita la ejecución de los siguientes contratos de obras viales y de infraestructura en los últimos diez años:',
      '1. Contrato N° 23-2020-MDLN: "Mantenimiento periódico de vías urbanas en el distrito de La Esperanza, Trujillo". Monto: S/ 6,800,000.00. Liquidado.',
      '2. Contrato N° 41-2022-GRLL: "Construcción de pavimento rígido en avenida América Sur, Trujillo". Monto: S/ 7,500,000.00. Liquidado.',
      '3. Contrato N° 008-2024-MDP: "Mejoramiento vial del jirón Bolognesi en Piura". Monto: S/ 12,100,000.00. En ejecución, con avance del 75%.',
      'MONTO ACUMULADO TOTAL ACREDITADO: S/ 26,400,000.00, conforme a los contratos y comprobantes adjuntos.',
    ],
  },
  {
    heading: 'PERSONAL CLAVE PROPUESTO',
    body: [
      'JEFE DE OBRA: Ing. LUIS FERNANDO HUAMÁN ROJAS, CIP 102345, ingeniero civil colegiado y habilitado. Cuenta con seis (6) años de experiencia profesional general y TRES (3) años de experiencia específica en obras viales como Jefe de Obra. La experiencia específica acreditada corresponde a los contratos N° 23-2020-MDLN (donde actuó como Residente de Obra durante dieciocho meses) y N° 41-2022-GRLL (donde actuó como Jefe de Obra durante dieciocho meses). Se adjunta CV documentado y firmado.',
      'RESIDENTE DE OBRA: Ing. PEDRO GUTIÉRREZ SALAS, CIP 87123, con nueve (9) años de experiencia general y cinco (5) años de experiencia específica en obras viales. CV firmado y documentado adjunto.',
      'ESPECIALISTA EN PAVIMENTOS: Ing. CARMEN VEGA HUARANGA, CIP 91456, con diez (10) años de experiencia general y cinco (5) años de experiencia específica en pavimentos asfálticos. CV firmado adjunto.',
    ],
  },
  {
    heading: 'EQUIPAMIENTO PROPUESTO',
    body: [
      'INGENIERÍA DEL NORTE S.R.L. acredita la disponibilidad del siguiente equipamiento, parte en propiedad y parte arrendado bajo contrato:',
      '- Dos (2) cargadores frontales Komatsu WA320 de 2.7 m³.',
      '- Cuatro (4) volquetes Mercedes Benz Actros de 16 m³.',
      '- Una (1) motoniveladora John Deere 770G de 165 HP.',
      '- Un (1) rodillo vibratorio Hamm HD 110 de 11 toneladas.',
      '- Una (1) planta de asfalto fija contratada en sociedad con ASFALTOS DEL NORTE S.A.C., con capacidad de 70 ton/hora.',
      'Se adjunta declaración jurada de disponibilidad, contratos de arrendamiento vigentes y certificado de operatividad de la planta de asfalto.',
    ],
  },
  {
    heading: 'CAPACIDAD ECONÓMICO-FINANCIERA',
    body: [
      'Se adjunta copia de las declaraciones del Impuesto a la Renta 2022, 2023 y 2024, acreditando un volumen promedio anual de facturación de S/ 13,200,000.00, superior al mínimo exigido.',
    ],
  },
  {
    heading: 'GARANTÍA DE SERIEDAD DE OFERTA',
    body: [
      'Se adjunta Carta Fianza N° 15-2025-0089 emitida por Scotiabank Perú con fecha 02 de marzo de 2025, por S/ 124,500.00, con vigencia de noventa (90) días, conforme a las Bases.',
    ],
  },
  {
    heading: 'DECLARACIONES JURADAS',
    body: [
      'Se adjuntan todas las declaraciones juradas exigidas por las Bases: cumplimiento de TDR, plazo de ejecución, vicios ocultos, no inhabilitación y vigencia de poder del representante legal.',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`Generando PDFs de prueba en: ${OUT_DIR}\n`);

  await buildPdf(
    'Bases_Integradas_LP_002-2025-GRL.pdf',
    'LICITACIÓN PÚBLICA N° 002-2025-GRL',
    'GOBIERNO REGIONAL DE LAMBAYEQUE — BASES INTEGRADAS\nMejoramiento de la carretera departamental Chiclayo – Lambayeque',
    BASES_SECTIONS,
  );
  console.log('  Bases_Integradas_LP_002-2025-GRL.pdf');

  await buildPdf(
    'Oferta_Constructora_Andina_SAC.pdf',
    'OFERTA TÉCNICA Y ECONÓMICA',
    'POSTOR: CONSTRUCTORA ANDINA S.A.C.\nLicitación Pública N° 002-2025-GRL',
    OFERTA_ANDINA,
  );
  console.log('  Oferta_Constructora_Andina_SAC.pdf');

  await buildPdf(
    'Oferta_Ingenieria_del_Norte_SRL.pdf',
    'OFERTA TÉCNICA Y ECONÓMICA',
    'POSTOR: INGENIERÍA DEL NORTE S.R.L.\nLicitación Pública N° 002-2025-GRL',
    OFERTA_NORTE,
  );
  console.log('  Oferta_Ingenieria_del_Norte_SRL.pdf');

  console.log(`\nPDFs listos. Súbelos al Evaluador en este orden:`);
  console.log(`  Bases: Bases_Integradas_LP_002-2025-GRL.pdf`);
  console.log(`  Oferta 1: Oferta_Constructora_Andina_SAC.pdf`);
  console.log(`  Oferta 2: Oferta_Ingenieria_del_Norte_SRL.pdf`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
