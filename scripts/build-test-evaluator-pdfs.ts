#!/usr/bin/env tsx
/**
 * Genera 3 PDFs ROBUSTOS para testear el Evaluador IA, siguiendo la
 * estructura oficial de las Bases Estándar del OECE (Directiva 001-2019-OSCE/CD v15)
 * y la estructura típica de las propuestas técnicas que reciben las entidades.
 *
 * Cada PDF queda entre 25-50 páginas con todos los capítulos y anexos.
 *
 *   data/test-evaluador/Bases_Integradas_LP_002-2025-GRL.pdf
 *   data/test-evaluador/Oferta_Constructora_Andina_SAC.pdf       (subsanable)
 *   data/test-evaluador/Oferta_Ingenieria_del_Norte_SRL.pdf      (no cumple)
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
      margins: { top: 70, bottom: 70, left: 65, right: 65 },
      info: { Title: title, Author: 'Gobierno Regional de Lambayeque' },
      bufferPages: true,
    });
    const stream = createWriteStream(join(OUT_DIR, filename));
    doc.pipe(stream);

    // Portada
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1a1a1a').text(title, { align: 'center' });
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(11).fillColor('#555').text(subtitle, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor('#000');

    // Sections
    for (const sec of sections) {
      // Heading
      if (sec.heading.match(/^CAPÍTULO|^TÍTULO/)) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1a1a1a')
           .text(sec.heading, { align: 'left' });
      } else if (sec.heading.match(/^ANEXO|^FORMULARIO/)) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1a1a')
           .text(sec.heading, { align: 'center' });
      } else {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a1a').text(sec.heading);
      }
      doc.fillColor('#000');
      doc.moveDown(0.4);

      for (const para of sec.body) {
        // Auto-format: si empieza con guión o número, es viñeta; si tiene mayúsculas, subtítulo
        const trimmed = para.trim();
        if (/^[A-Z\.\d\s]{3,80}:$/.test(trimmed)) {
          // Subtítulo en negrita
          doc.font('Helvetica-Bold').fontSize(10).text(trimmed);
        } else {
          doc.font('Helvetica').fontSize(10).text(trimmed, { align: 'justify', lineGap: 2 });
        }
        doc.moveDown(0.35);
      }
      doc.moveDown(0.5);
    }

    // Page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font('Helvetica').fontSize(8).fillColor('#999')
         .text(`Página ${i + 1} de ${range.count}`, 65, doc.page.height - 50, {
           align: 'center', width: doc.page.width - 130,
         });
    }

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// ════════════════════════════════════════════════════════════════════
// BASES INTEGRADAS — Estructura oficial OECE (Directiva 001-2019-OSCE/CD v15)
// ════════════════════════════════════════════════════════════════════
const BASES: Section[] = [
  // ═══════ CAPÍTULO I ═══════
  {
    heading: 'CAPÍTULO I — GENERALIDADES',
    body: [
      '1.1 ENTIDAD CONVOCANTE',
      'Nombre: Gobierno Regional de Lambayeque',
      'RUC: 20479495229',
      'Domicilio legal: Av. Augusto B. Leguía N° 270, Chiclayo, Lambayeque',
      'Teléfono: (074) 606060',
      'Correo electrónico: comite.selecciones@regionlambayeque.gob.pe',
      '',
      '1.2 OBJETO DE LA CONVOCATORIA',
      'El presente proceso de selección tiene por objeto la contratación de la ejecución de la obra: "MEJORAMIENTO DE LA CARRETERA DEPARTAMENTAL CHICLAYO – LAMBAYEQUE, TRAMO KM 0+000 AL KM 18+500", en el marco del Convenio Interinstitucional N° 142-2024-MTC/GR-LAM.',
      '',
      '1.3 EXPEDIENTE DE CONTRATACIÓN',
      'Expediente de Contratación N° 002-2025-CSE-GRL aprobado mediante Resolución Gerencial Regional N° 089-2025-GRL/GRPP de fecha 12 de febrero de 2025.',
      '',
      '1.4 VALOR REFERENCIAL',
      'El valor referencial asciende a S/ 12,450,000.00 (DOCE MILLONES CUATROCIENTOS CINCUENTA MIL CON 00/100 SOLES), incluidos los tributos, seguros, transporte, inspecciones, pruebas y, de ser el caso, los costos laborales conforme a la legislación vigente, así como cualquier otro concepto que le sea aplicable y que pueda incidir sobre el costo del bien, servicio u obra a contratar.',
      'Antigüedad del valor referencial: TREINTA Y SEIS (36) días calendario.',
      '',
      '1.5 SISTEMA DE CONTRATACIÓN',
      'A SUMA ALZADA, conforme al artículo 35 del Reglamento de la Ley N° 32069.',
      '',
      '1.6 MODALIDAD DE EJECUCIÓN',
      'CONTRACTUAL POR TERCEROS.',
      '',
      '1.7 ALCANCE DE LA PRESTACIÓN',
      'El alcance comprende la elaboración del expediente técnico, ejecución y entrega de la obra "Mejoramiento de la carretera departamental Chiclayo – Lambayeque, tramo km 0+000 al km 18+500", incluyendo: movimiento de tierras (excavación, relleno, conformación de sub-base y base granular), pavimentación asfáltica en caliente, obras de drenaje (cunetas, alcantarillas tipo TMC y cajones), señalización vertical y horizontal, defensas viales (muros de contención de concreto armado), gestión socioambiental y monitoreo arqueológico durante toda la ejecución.',
      '',
      '1.8 PLAZO DE EJECUCIÓN DE LA PRESTACIÓN',
      'TRESCIENTOS CINCUENTA (350) días calendario, contados a partir del día siguiente del perfeccionamiento del contrato y la entrega del terreno.',
      '',
      '1.9 COSTO DE REPRODUCCIÓN DE LAS BASES',
      'S/ 25.00 (Veinticinco con 00/100 soles).',
      '',
      '1.10 BASE LEGAL',
      'Ley N° 32069 — Ley General de Contrataciones Públicas.',
      'Decreto Supremo N° 009-2025-EF — Reglamento de la Ley.',
      'Decreto Supremo N° 004-2019-JUS — TUO de la Ley del Procedimiento Administrativo General.',
      'Código Civil, en cuanto sea aplicable.',
    ],
  },

  // ═══════ CAPÍTULO II ═══════
  {
    heading: 'CAPÍTULO II — DEL PROCEDIMIENTO DE SELECCIÓN',
    body: [
      '2.1 CRONOGRAMA DEL PROCEDIMIENTO',
      'Convocatoria: 03 de marzo de 2025',
      'Registro de participantes: del 04 al 31 de marzo de 2025, vía SEACE',
      'Formulación de consultas y observaciones: del 04 al 17 de marzo de 2025',
      'Absolución de consultas y observaciones: 24 de marzo de 2025',
      'Integración de las Bases: 28 de marzo de 2025',
      'Presentación de ofertas: 14 de abril de 2025, 10:00 hrs',
      'Evaluación y calificación: del 15 al 22 de abril de 2025',
      'Otorgamiento de la Buena Pro: 25 de abril de 2025',
      '',
      '2.2 REGISTRO DE PARTICIPANTES',
      'Todo proveedor interesado en participar en el presente procedimiento debe registrarse a través del SEACE durante el periodo señalado en el cronograma. La sola condición de proveedor le otorga el derecho a participar en las etapas del procedimiento.',
      '',
      '2.3 PRESENTACIÓN DE OFERTAS',
      'Las ofertas se presentarán en el SEACE en formato PDF debidamente foliado y firmado por el representante legal. La oferta económica deberá indicar el monto total ofertado en soles, incluido el IGV y todos los tributos aplicables.',
      'En caso de presentación física, las ofertas se presentarán en sobre cerrado en la Mesa de Partes del Gobierno Regional de Lambayeque, en la fecha y hora señaladas en el cronograma. El sobre debe contener todos los documentos de presentación obligatoria, ordenados conforme al Capítulo III de las presentes Bases.',
      '',
      '2.4 EVALUACIÓN Y CALIFICACIÓN DE LAS OFERTAS',
      'El comité de selección procederá a verificar el cumplimiento de los requisitos de calificación, conforme al Capítulo IV de las presentes Bases. Las ofertas que no acrediten el cumplimiento de los requisitos de calificación serán declaradas NO ADMITIDAS, salvo aquellos defectos formales susceptibles de subsanación conforme al artículo 64 del Reglamento.',
      'El plazo para la subsanación será entre uno (1) y tres (3) días hábiles, otorgado por el comité y debidamente notificado al postor. El plazo es improrrogable. La no presentación de la subsanación dentro del plazo conlleva la NO ADMISIÓN de la oferta.',
      '',
      '2.5 ACCESO A LA INFORMACIÓN',
      'Los participantes podrán acceder al expediente de contratación durante todas las etapas del procedimiento, presentando solicitud escrita ante el comité de selección.',
    ],
  },

  // ═══════ CAPÍTULO III ═══════
  {
    heading: 'CAPÍTULO III — REQUISITOS DE LA OFERTA',
    body: [
      '3.1 DOCUMENTOS DE PRESENTACIÓN OBLIGATORIA',
      'Constituyen documentos de presentación obligatoria en la oferta los siguientes (numerar y foliar):',
      '',
      'a) Declaración Jurada de datos del postor — Anexo N° 1',
      'b) Declaración Jurada de cumplimiento de los Términos de Referencia y de las Bases — Anexo N° 2',
      'c) Declaración Jurada de plazo de ejecución de la prestación — Anexo N° 3',
      'd) Declaración Jurada de no encontrarse impedido para contratar con el Estado, conforme al artículo 11 de la Ley N° 32069 — Anexo N° 4',
      'e) Declaración Jurada de no tener inhabilitación administrativa vigente emitida por el Tribunal de Contrataciones del Estado — Anexo N° 5',
      'f) Promesa formal de consorcio (de corresponder) — Anexo N° 6',
      'g) Vigencia de poder del representante legal, con antigüedad no mayor a 30 días calendario',
      'h) Constancia vigente del Registro Nacional de Proveedores (RNP) en la especialidad correspondiente, conforme al artículo 12 de la Ley',
      'i) Garantía de Seriedad de Oferta emitida por entidad bancaria autorizada por la SBS, por el equivalente al UNO POR CIENTO (1%) del valor referencial, con vigencia mínima de NOVENTA (90) días calendario',
      'j) Oferta Económica firmada por el representante legal — Anexo N° 7',
      'k) Documentos que acreditan los requisitos de calificación conforme al Capítulo IV de las presentes Bases',
      '',
      '3.2 FORMA DE PRESENTACIÓN',
      'La oferta debe presentarse foliada, numerada correlativamente y con los documentos ordenados conforme al numeral 3.1. Cada hoja debe contener la firma o rúbrica del representante legal. La oferta económica debe presentarse en sobre separado y rotulado, conforme al artículo 56 del Reglamento.',
      '',
      '3.3 SUBSANACIÓN DE LA OFERTA',
      'El comité de selección puede otorgar al postor un plazo entre uno (1) y tres (3) días hábiles para que subsane defectos formales de su oferta, siempre que la información o documento omitido o consignado erróneamente:',
      '- Exista en el ámbito jurídico al momento de la presentación de la oferta, o se trate de una circunstancia o hecho existente al momento de su presentación.',
      '- No implique modificación sustancial de la oferta.',
      '- Su omisión o consignación errónea no afecte la oferta económica.',
      '',
      'Son subsanables, entre otros, los siguientes documentos:',
      '- La falta de firma, foliación o numeración de las páginas de la oferta',
      '- La omisión de la Declaración Jurada de no tener inhabilitación vigente, siempre que el postor efectivamente no se encuentre inhabilitado al momento de la presentación',
      '- Errores aritméticos en la oferta económica que no afecten el monto total ofertado',
      '- La omisión del CV documentado del personal clave, siempre que la experiencia mínima requerida sí se cumpla con los documentos presentados',
      '- Errores formales en el CV del personal clave (falta de firma, etc.)',
      '- Aspectos formales de las garantías presentadas, siempre que la condición sustantiva se mantenga',
      '',
      'NO son subsanables los aspectos que afecten la oferta económica, la propuesta técnica esencial, ni los requisitos mínimos del postor o de su personal clave cuando el postor o el personal carezca efectivamente del requisito exigido al momento de la presentación de la oferta.',
    ],
  },

  // ═══════ CAPÍTULO IV ═══════
  {
    heading: 'CAPÍTULO IV — REQUISITOS DE CALIFICACIÓN',
    body: [
      'A. CAPACIDAD LEGAL',
      '',
      'A.1 REPRESENTACIÓN',
      'Documentos:',
      '- Vigencia de poder del representante legal, expedida por SUNARP con antigüedad no mayor a treinta (30) días calendario.',
      '- En caso de consorcio: Promesa formal de consorcio con designación expresa del representante común y porcentajes de participación.',
      '',
      'A.2 HABILITACIÓN PARA CONTRATAR',
      'Documentos:',
      '- Declaración Jurada de no estar impedido para contratar con el Estado conforme al artículo 11 de la Ley N° 32069.',
      '- Declaración Jurada de no tener inhabilitación administrativa vigente emitida por el Tribunal de Contrataciones del Estado.',
      '- Constancia vigente del Registro Nacional de Proveedores (RNP) — Categoría: Ejecutor de Obras — Especialidad: Obras Viales.',
      '',
      'B. CAPACIDAD TÉCNICA Y PROFESIONAL',
      '',
      'B.1 EQUIPAMIENTO ESTRATÉGICO',
      'El postor debe acreditar la disponibilidad de los siguientes bienes:',
      '',
      'CARGADOR FRONTAL: Cantidad mínima 2 unidades. Capacidad de cucharón mínima 2.5 m³. Antigüedad máxima 5 años.',
      'VOLQUETE: Cantidad mínima 3 unidades. Capacidad mínima 15 m³. Antigüedad máxima 8 años.',
      'MOTONIVELADORA: Cantidad mínima 1 unidad. Potencia mínima 140 HP. Antigüedad máxima 6 años.',
      'RODILLO VIBRATORIO LISO: Cantidad mínima 1 unidad. Peso mínimo 10 toneladas. Antigüedad máxima 7 años.',
      'PLANTA DE ASFALTO: Cantidad mínima 1 unidad. Capacidad mínima 60 ton/hora. Certificado de operatividad vigente.',
      '',
      'Acreditación:',
      '- Declaración Jurada de disponibilidad del equipamiento (Anexo N° 8).',
      '- En caso de equipo propio: copia de tarjeta de propiedad o factura de adquisición.',
      '- En caso de equipo arrendado: contrato de arrendamiento o compromiso vigente.',
      '',
      'B.2 INFRAESTRUCTURA ESTRATÉGICA',
      'No aplica para el presente proceso.',
      '',
      'B.3 CALIFICACIONES DEL PERSONAL CLAVE',
      'El postor debe acreditar el siguiente personal clave con las calificaciones mínimas:',
      '',
      'JEFE DE OBRA: Profesional Ingeniero Civil colegiado y habilitado, con experiencia profesional general mínima de DIEZ (10) años y experiencia específica mínima de CINCO (5) años en ejecución de obras viales como Jefe de Obra, Residente o Inspector.',
      'RESIDENTE DE OBRA: Profesional Ingeniero Civil colegiado y habilitado, con experiencia profesional general mínima de SIETE (7) años y experiencia específica mínima de CUATRO (4) años en obras viales.',
      'ESPECIALISTA EN PAVIMENTOS: Profesional Ingeniero Civil colegiado y habilitado, con experiencia profesional general mínima de OCHO (8) años y experiencia específica mínima de TRES (3) años en obras de pavimentación.',
      'ESPECIALISTA EN GEOTECNIA: Profesional Ingeniero Civil colegiado, con experiencia profesional mínima de OCHO (8) años y específica mínima de TRES (3) años en geotecnia de obras viales.',
      'ESPECIALISTA AMBIENTAL: Profesional Ingeniero Ambiental o afín, con experiencia profesional mínima de CINCO (5) años y específica mínima de DOS (2) años en obras viales.',
      '',
      'Acreditación:',
      '- Currículum Vitae documentado y firmado por el profesional.',
      '- Copias de constancias, certificados o contratos que acrediten la experiencia.',
      '- Copia de Colegiatura y Habilidad vigente al momento de la presentación.',
      '',
      'IMPORTANTE: Conforme al artículo 49 de la Ley N° 32069 y la jurisprudencia consolidada del Tribunal de Contrataciones del Estado, el incumplimiento de los requisitos mínimos de experiencia del personal clave NO ES SUBSANABLE. El postor cuyo personal clave NO cumpla efectivamente los años mínimos de experiencia al momento de la presentación de la oferta será declarado NO ADMITIDO.',
      '',
      'B.4 EXPERIENCIA DEL POSTOR',
      'El postor debe acreditar haber ejecutado en los últimos DIEZ (10) años contratos de ejecución de obras viales por un monto contractual total acumulado mínimo de S/ 24,900,000.00 (DOS veces el valor referencial).',
      'Al menos UNO (1) de los contratos acreditados debe corresponder a una obra cuyo monto contractual sea IGUAL O MAYOR a S/ 6,225,000.00 (50% del valor referencial).',
      '',
      'Acreditación:',
      '- Copias de los contratos suscritos con sus correspondientes adendas (de existir).',
      '- Comprobantes de pago cancelados o documentos análogos que acrediten la ejecución del contrato.',
      '- Constancias de prestación emitidas por las entidades contratantes.',
      '',
      'C. CAPACIDAD ECONÓMICA Y FINANCIERA',
      '',
      'C.1 VOLUMEN DE FACTURACIÓN',
      'El postor debe acreditar haber facturado en cualquiera de los últimos TRES (3) años (2022, 2023 o 2024) un monto anual igual o mayor a S/ 12,450,000.00 (UNA vez el valor referencial).',
      '',
      'Acreditación:',
      '- Declaración Anual del Impuesto a la Renta o sus respectivos comprobantes correspondientes.',
      '- Estados Financieros auditados de cualquiera de los tres años indicados.',
      '',
      'C.2 LIQUIDEZ Y ENDEUDAMIENTO',
      'Liquidez corriente (Activo Corriente / Pasivo Corriente): mayor o igual a 1.2',
      'Endeudamiento patrimonial (Pasivo Total / Patrimonio): menor o igual a 1.5',
      '',
      'Acreditación: Estados Financieros del último ejercicio auditado.',
    ],
  },

  // ═══════ CAPÍTULO V ═══════
  {
    heading: 'CAPÍTULO V — TÉRMINOS DE REFERENCIA / EETT',
    body: [
      '5.1 OBJETO ESPECÍFICO',
      'El objeto específico del contrato es la EJECUCIÓN de la obra "Mejoramiento de la carretera departamental Chiclayo – Lambayeque, tramo km 0+000 al km 18+500", conforme a las especificaciones técnicas que forman parte integrante de las presentes Bases.',
      '',
      '5.2 ESPECIFICACIONES TÉCNICAS DE LA OBRA',
      '',
      'CARACTERÍSTICAS GEOMÉTRICAS:',
      '- Longitud total: 18.50 km',
      '- Ancho de calzada: 7.20 m (2 carriles de 3.60 m)',
      '- Ancho de bermas: 1.20 m a cada lado',
      '- Pendiente máxima: 6.5%',
      '- Radio mínimo de curvas: 80 m',
      '',
      'ESTRUCTURA DEL PAVIMENTO:',
      '- Carpeta asfáltica en caliente: 7.5 cm',
      '- Base granular CBR ≥ 80%: 20 cm',
      '- Sub-base granular CBR ≥ 30%: 25 cm',
      '- Mejoramiento de sub-rasante CBR ≥ 6%: variable según diseño',
      '',
      'OBRAS DE DRENAJE:',
      '- Cunetas trapezoidales de concreto: 37 km',
      '- Alcantarillas TMC Ø 1.0 m: 24 unidades',
      '- Alcantarillas TMC Ø 1.5 m: 12 unidades',
      '- Cajones de concreto armado: 6 unidades',
      '- Sub-drenes longitudinales: 5.2 km',
      '',
      'SEÑALIZACIÓN:',
      '- Señalización vertical: 142 señales reglamentarias e informativas',
      '- Señalización horizontal: pintura termoplástica',
      '- Postes delineadores: 1,850 unidades',
      '- Tachas reflectivas: 9,250 unidades',
      '',
      'DEFENSAS VIALES:',
      '- Muros de contención de concreto armado: 2,800 m³',
      '- Barreras metálicas tipo flex-beam: 4.8 km',
      '- Sistema de pretiles en puentes: incluidos en los 3 puentes existentes',
      '',
      'OBRAS COMPLEMENTARIAS:',
      '- Iluminación vial: en accesos a centros poblados (8 km totales)',
      '- Paraderos peatonales: 14 unidades',
      '- Reubicación de redes de servicios públicos (luz, agua, comunicaciones)',
      '- Mitigación arqueológica y monitoreo durante toda la ejecución',
      '',
      '5.3 PLAZOS PARCIALES Y CRONOGRAMA',
      'El contratista presentará dentro de los primeros 15 días calendario del inicio de obra el Cronograma Detallado de Ejecución (Programa CPM) con los siguientes hitos parciales:',
      '',
      'Hito 1 (día 60): Conclusión de movimiento de tierras y conformación de sub-rasante en el 100% del tramo.',
      'Hito 2 (día 120): Conclusión de sub-base granular y base granular en el 50% del tramo.',
      'Hito 3 (día 200): Conclusión de pavimento asfáltico en el 50% del tramo y obras de drenaje al 70%.',
      'Hito 4 (día 280): Conclusión de pavimento asfáltico al 100% y obras de drenaje al 100%.',
      'Hito 5 (día 320): Conclusión de señalización, defensas viales y obras complementarias.',
      'Entrega final (día 350): Conclusión total, pruebas de operatividad y entrega de la obra.',
      '',
      '5.4 GESTIÓN AMBIENTAL Y SOCIAL',
      'El contratista debe implementar el Plan de Manejo Ambiental aprobado en la Declaración de Impacto Ambiental (DIA) Resolución Directoral N° 287-2024-MTC/17.07. Esto incluye:',
      '- Plan de monitoreo de calidad del aire (3 estaciones mínimo)',
      '- Plan de manejo de residuos sólidos y peligrosos',
      '- Plan de relaciones comunitarias con los centros poblados aledaños',
      '- Plan de cierre y abandono progresivo',
      '',
      '5.5 SEGURIDAD Y SALUD OCUPACIONAL',
      'El contratista debe cumplir con la Ley N° 29783 y su Reglamento, presentando antes del inicio de obra:',
      '- Plan de Seguridad y Salud en el Trabajo',
      '- Identificación de Peligros y Evaluación de Riesgos (IPER)',
      '- Procedimientos Escritos de Trabajo Seguro (PETS) para todas las actividades de alto riesgo',
      '- Cronograma de capacitaciones obligatorias al personal',
    ],
  },

  // ═══════ CAPÍTULO VI ═══════
  {
    heading: 'CAPÍTULO VI — PROFORMA DE CONTRATO',
    body: [
      'CONTRATO N° XXX-2025-GRL/GRPP',
      '',
      'Conste por el presente documento el Contrato de Ejecución de Obra que celebran de una parte el GOBIERNO REGIONAL DE LAMBAYEQUE, con RUC N° 20479495229, debidamente representado por el Gobernador Regional o quien éste designe, en adelante "LA ENTIDAD"; y de la otra parte, [POSTOR ADJUDICADO], con RUC N° [XXX], debidamente representado por su [cargo del representante], en adelante "EL CONTRATISTA"; en los términos y condiciones siguientes:',
      '',
      'CLÁUSULA PRIMERA — OBJETO DEL CONTRATO',
      'EL CONTRATISTA se obliga a ejecutar la obra "MEJORAMIENTO DE LA CARRETERA DEPARTAMENTAL CHICLAYO – LAMBAYEQUE, TRAMO KM 0+000 AL KM 18+500", a entera satisfacción de LA ENTIDAD, conforme al Expediente de Contratación N° 002-2025-CSE-GRL y las Bases Integradas que forman parte integrante del presente Contrato.',
      '',
      'CLÁUSULA SEGUNDA — MONTO CONTRACTUAL',
      'El monto del presente Contrato asciende a [importe en letras y números], conforme a la Oferta Económica de EL CONTRATISTA, incluyendo todos los impuestos de ley.',
      '',
      'CLÁUSULA TERCERA — PLAZO DE EJECUCIÓN',
      'El plazo de ejecución de la prestación es de TRESCIENTOS CINCUENTA (350) días calendario, contados a partir del día siguiente de la entrega del terreno y el cumplimiento de las demás condiciones previstas en el artículo 168 del Reglamento.',
      '',
      'CLÁUSULA CUARTA — GARANTÍAS',
      'EL CONTRATISTA deberá presentar a LA ENTIDAD, antes del perfeccionamiento del Contrato:',
      'a) Garantía de Fiel Cumplimiento equivalente al 10% del monto contractual, con vigencia hasta el consentimiento de la liquidación final.',
      'b) Garantía de Adelanto Directo (de solicitarse) equivalente al 100% del adelanto, con vigencia hasta su amortización total.',
      'c) Garantía de Adelanto para Materiales (de solicitarse) equivalente al 100% del adelanto, con vigencia hasta su amortización total.',
      '',
      'CLÁUSULA QUINTA — PENALIDADES',
      'Si EL CONTRATISTA incurre en retraso injustificado en la ejecución de la prestación, LA ENTIDAD le aplicará automáticamente la penalidad diaria conforme a la siguiente fórmula:',
      'Penalidad Diaria = 0.10 × Monto del Contrato / (F × Plazo)',
      'Donde F = 0.15 para plazos mayores a 60 días.',
      'La penalidad máxima acumulada no podrá exceder el DIEZ POR CIENTO (10%) del monto contractual.',
      '',
      'CLÁUSULA SEXTA — RESOLUCIÓN DEL CONTRATO',
      'El presente Contrato puede ser resuelto por las causales previstas en los artículos 234, 235 y 236 del Reglamento, conforme al procedimiento allí establecido.',
      '',
      'CLÁUSULA SÉPTIMA — CONTROVERSIAS',
      'Las controversias derivadas del presente Contrato serán sometidas a Conciliación y/o Arbitraje, conforme al Reglamento del Centro de Arbitraje del OECE.',
    ],
  },

  // ═══════ ANEXO N° 1 ═══════
  {
    heading: 'ANEXO N° 1 — DECLARACIÓN JURADA DE DATOS DEL POSTOR',
    body: [
      'Señores',
      'COMITÉ DE SELECCIÓN',
      'LICITACIÓN PÚBLICA N° 002-2025-GRL',
      'Presente.-',
      '',
      'El/la que suscribe, [NOMBRES Y APELLIDOS], identificado/a con DNI N° [XXX], representante legal de [RAZÓN SOCIAL DEL POSTOR], con RUC N° [XXX], DECLARO BAJO JURAMENTO:',
      '',
      '1. Que mi representada tiene como objeto social, entre otros, la ejecución de obras de infraestructura vial, conforme a su estatuto social inscrito en SUNARP.',
      '2. Que mi representada cumple con todas las condiciones legales, técnicas, económicas y financieras requeridas en las Bases del presente procedimiento.',
      '3. Que toda la información proporcionada en la presente oferta es veraz y exacta, sometiéndome a la verificación posterior por parte de la Entidad.',
      '4. Que conozco íntegramente las Bases Integradas, las acepto en todos sus términos y me comprometo a cumplir con todas las obligaciones que de ellas se deriven.',
      '',
      'Fecha: [día] de [mes] de 2025',
      'Firma: ___________________________',
      'Nombre: [Nombres y Apellidos]',
      'DNI N° [XXX]',
      'En representación de: [Razón Social]',
    ],
  },

  // ═══════ ANEXO N° 2 ═══════
  {
    heading: 'ANEXO N° 2 — DECLARACIÓN JURADA DE CUMPLIMIENTO DE TDR',
    body: [
      'El/la que suscribe, [NOMBRES Y APELLIDOS], identificado/a con DNI N° [XXX], representante legal de [RAZÓN SOCIAL], DECLARO BAJO JURAMENTO que mi representada conoce, acepta y se compromete a cumplir íntegramente los Términos de Referencia y Especificaciones Técnicas detallados en el Capítulo V de las Bases del procedimiento de selección de la referencia.',
      '',
      'Asimismo, declaro que mi representada cuenta con la experiencia, calificaciones, personal, equipamiento e infraestructura necesarios para la cabal ejecución del objeto de la convocatoria, dentro del plazo establecido y conforme a los más altos estándares de calidad.',
      '',
      'Fecha: [día] de [mes] de 2025',
      'Firma: ___________________________',
    ],
  },

  // ═══════ ANEXO N° 4 ═══════
  {
    heading: 'ANEXO N° 4 — DECLARACIÓN JURADA DE NO ESTAR IMPEDIDO',
    body: [
      'El/la que suscribe, [NOMBRES Y APELLIDOS], identificado/a con DNI N° [XXX], representante legal de [RAZÓN SOCIAL], DECLARO BAJO JURAMENTO que mi representada no se encuentra impedida para contratar con el Estado, conforme a las causales previstas en el artículo 11 de la Ley N° 32069.',
      '',
      'Específicamente, mi representada NO se encuentra incursa en ninguno de los siguientes supuestos:',
      '- No tener antecedentes penales por delitos contra la administración pública.',
      '- No estar en condición de inhabilitada, sancionada o suspendida por el Tribunal de Contrataciones del Estado.',
      '- No tener relaciones de parentesco o vinculación con funcionarios o servidores públicos de la Entidad convocante hasta el cuarto grado de consanguinidad y segundo grado de afinidad.',
      '- No haber sido declarada en estado de insolvencia, quiebra o liquidación.',
      '- Cumplir con sus obligaciones tributarias y de seguridad social a la fecha de presentación de la oferta.',
      '',
      'Fecha: [día] de [mes] de 2025',
      'Firma: ___________________________',
    ],
  },

  // ═══════ ANEXO N° 5 ═══════
  {
    heading: 'ANEXO N° 5 — DECLARACIÓN JURADA DE NO TENER INHABILITACIÓN',
    body: [
      'El/la que suscribe, [NOMBRES Y APELLIDOS], identificado/a con DNI N° [XXX], representante legal de [RAZÓN SOCIAL], DECLARO BAJO JURAMENTO que mi representada NO tiene inhabilitación administrativa vigente para contratar con el Estado, emitida por el Tribunal de Contrataciones del Estado, conforme a la consulta efectuada en el Registro Nacional de Sancionados del Tribunal de Contrataciones del Estado a la fecha de presentación de la oferta.',
      '',
      'Asimismo, declaro que conozco que esta declaración tiene carácter de declaración jurada y que la falsedad u omisión deliberada de información acarrea las responsabilidades civiles, penales y administrativas correspondientes.',
      '',
      'Fecha: [día] de [mes] de 2025',
      'Firma: ___________________________',
    ],
  },

  // ═══════ ANEXO N° 7 ═══════
  {
    heading: 'ANEXO N° 7 — FORMULARIO DE OFERTA ECONÓMICA',
    body: [
      'OFERTA ECONÓMICA',
      '',
      'POSTOR: [Razón Social]',
      'RUC: [XXX]',
      '',
      'Por la presente, presento mi OFERTA ECONÓMICA para la ejecución de la obra "MEJORAMIENTO DE LA CARRETERA DEPARTAMENTAL CHICLAYO – LAMBAYEQUE, TRAMO KM 0+000 AL KM 18+500", conforme al detalle siguiente:',
      '',
      'MONTO TOTAL DE LA OFERTA: S/ [importe en números] ([importe en letras]) soles, incluido el IGV.',
      '',
      'Declaro que el monto ofertado incluye todos los costos directos e indirectos, utilidad, impuestos, contribuciones, gastos generales, seguros, transportes, inspecciones, pruebas y cualquier otro concepto que pueda incidir sobre el costo de la prestación contratada.',
      '',
      'PLAZO DE EJECUCIÓN: 350 días calendario.',
      'VIGENCIA DE LA OFERTA: 90 días calendario.',
      '',
      'Fecha: [día] de [mes] de 2025',
      'Firma: ___________________________',
    ],
  },

  // ═══════ ANEXO N° 8 ═══════
  {
    heading: 'ANEXO N° 8 — DECLARACIÓN JURADA DE DISPONIBILIDAD DE EQUIPAMIENTO',
    body: [
      'El/la que suscribe, [NOMBRES Y APELLIDOS], identificado/a con DNI N° [XXX], representante legal de [RAZÓN SOCIAL], DECLARO BAJO JURAMENTO que mi representada cuenta con la disponibilidad efectiva del equipamiento estratégico requerido en el numeral B.1 del Capítulo IV de las Bases, conforme al siguiente detalle:',
      '',
      'CARGADORES FRONTALES (mínimo 2 unidades, ≥2.5 m³, antigüedad ≤5 años):',
      'Unidad 1: Marca [XXX], Modelo [XXX], Capacidad [XXX] m³, Año [XXX], N° Serie [XXX], Régimen: [Propio/Arrendado].',
      'Unidad 2: Marca [XXX], Modelo [XXX], Capacidad [XXX] m³, Año [XXX], N° Serie [XXX], Régimen: [Propio/Arrendado].',
      '',
      'VOLQUETES (mínimo 3 unidades, ≥15 m³, antigüedad ≤8 años):',
      'Unidad 1: Marca [XXX], Modelo [XXX], Capacidad [XXX] m³, Año [XXX], N° Serie [XXX], Régimen: [Propio/Arrendado].',
      'Unidad 2: Marca [XXX], Modelo [XXX], Capacidad [XXX] m³, Año [XXX], N° Serie [XXX], Régimen: [Propio/Arrendado].',
      'Unidad 3: Marca [XXX], Modelo [XXX], Capacidad [XXX] m³, Año [XXX], N° Serie [XXX], Régimen: [Propio/Arrendado].',
      '',
      'MOTONIVELADORA (mínimo 1 unidad, ≥140 HP, antigüedad ≤6 años):',
      'Unidad 1: Marca [XXX], Modelo [XXX], Potencia [XXX] HP, Año [XXX], N° Serie [XXX], Régimen: [Propio/Arrendado].',
      '',
      'RODILLO VIBRATORIO LISO (mínimo 1 unidad, ≥10 ton, antigüedad ≤7 años):',
      'Unidad 1: Marca [XXX], Modelo [XXX], Peso [XXX] ton, Año [XXX], N° Serie [XXX], Régimen: [Propio/Arrendado].',
      '',
      'PLANTA DE ASFALTO (mínimo 1 unidad, ≥60 ton/hora):',
      'Unidad 1: Marca [XXX], Modelo [XXX], Capacidad [XXX] ton/hora, Año [XXX], Ubicación [XXX], Régimen: [Propio/Arrendado].',
      '',
      'Me comprometo a mantener este equipamiento disponible durante toda la ejecución de la obra y a presentar la documentación de respaldo (tarjetas de propiedad, contratos de arrendamiento, certificados de operatividad) cuando lo requiera la Entidad.',
      '',
      'Fecha: [día] de [mes] de 2025',
      'Firma: ___________________________',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// OFERTA — CONSTRUCTORA ANDINA S.A.C. (SUBSANABLE)
// ════════════════════════════════════════════════════════════════════
const OFERTA_ANDINA: Section[] = [
  {
    heading: 'PORTADA',
    body: [
      'OFERTA TÉCNICA Y ECONÓMICA',
      '',
      'LICITACIÓN PÚBLICA N° 002-2025-GRL',
      '"Mejoramiento de la carretera departamental Chiclayo – Lambayeque, tramo km 0+000 al km 18+500"',
      '',
      'POSTOR: CONSTRUCTORA ANDINA S.A.C.',
      'RUC: 20512345678',
      'Domicilio: Av. Industrial 1485, Urb. Santa Catalina, La Victoria, Lima',
      '',
      'Representante legal: JORGE ALBERTO RAMÍREZ TORRES',
      'DNI: 41234567',
      '',
      'Fecha de presentación: 14 de abril de 2025',
    ],
  },

  // ═══════ SECCIÓN I — DOCUMENTOS DE PRESENTACIÓN OBLIGATORIA ═══════
  {
    heading: 'SECCIÓN I — DOCUMENTOS DE PRESENTACIÓN OBLIGATORIA',
    body: [
      'A continuación se relaciona el conjunto de documentos de presentación obligatoria conforme al Capítulo III de las Bases Integradas:',
      '',
      '1. Declaración Jurada de datos del postor (Anexo N° 1) — folio 003',
      '2. Declaración Jurada de cumplimiento de TDR (Anexo N° 2) — folio 005',
      '3. Declaración Jurada de plazo de ejecución (Anexo N° 3) — folio 006',
      '4. Declaración Jurada de no estar impedido para contratar (Anexo N° 4) — folio 007',
      '5. Declaración Jurada de no tener inhabilitación administrativa (Anexo N° 5) — OMITIDA. Se confirma mediante consulta pública del Registro de Sancionados que CONSTRUCTORA ANDINA S.A.C. NO tiene inhabilitación vigente al momento de la presentación.',
      '6. Vigencia de poder del representante legal — folio 008. Expedida por SUNARP el 25 de marzo de 2025 (antigüedad: 19 días calendario).',
      '7. Constancia vigente del Registro Nacional de Proveedores — folio 010. Especialidad: Ejecutor de Obras Viales.',
      '8. Garantía de Seriedad de Oferta — folio 012. Carta Fianza N° GF-2025-04578 emitida por Banco de Crédito del Perú.',
      '9. Oferta Económica firmada (Anexo N° 7) — folio 015.',
      '10. Documentos que acreditan los requisitos de calificación (Capítulo IV).',
    ],
  },

  // ═══════ SECCIÓN II — CAPACIDAD LEGAL ═══════
  {
    heading: 'SECCIÓN II — ACREDITACIÓN DE CAPACIDAD LEGAL (A)',
    body: [
      'A.1 REPRESENTACIÓN',
      'Se adjunta:',
      '- Vigencia de poder del representante legal Jorge Alberto Ramírez Torres, expedida por SUNARP — Zona Registral N° IX, Oficina de Lima, con fecha 25 de marzo de 2025, partida electrónica N° 11578956. La antigüedad del documento al momento de la presentación es de 19 días calendario, conforme a lo exigido (≤ 30 días).',
      '',
      'A.2 HABILITACIÓN PARA CONTRATAR',
      '- Declaración Jurada de no estar impedido (Anexo N° 4): SE ADJUNTA en folio 007.',
      '- Declaración Jurada de no tener inhabilitación administrativa (Anexo N° 5): NO SE ADJUNTÓ por error administrativo interno. CONSTRUCTORA ANDINA S.A.C. confirma que NO tiene sanción vigente del Tribunal de Contrataciones del Estado, lo cual puede verificarse en el Registro Nacional de Sancionados (consulta pública en gob.pe/oece) con resultado: SIN SANCIÓN VIGENTE.',
      '- Constancia del RNP: vigente al 14/04/2025, especialidad "Ejecutor de Obras Viales", inscripción N° 089456-2018.',
    ],
  },

  // ═══════ SECCIÓN III — EQUIPAMIENTO (B.1) ═══════
  {
    heading: 'SECCIÓN III — ACREDITACIÓN DE EQUIPAMIENTO (B.1)',
    body: [
      'CONSTRUCTORA ANDINA S.A.C. declara la disponibilidad del siguiente equipamiento estratégico, todo de propiedad propia conforme a las tarjetas de propiedad que se adjuntan en los folios 045 al 052:',
      '',
      'CARGADORES FRONTALES (exigido: 2 unid, ≥2.5 m³, antigüedad ≤5 años)',
      'Unidad 1: Caterpillar 950H, capacidad 3.0 m³, año 2022, N° serie CAT950H22-4521, régimen PROPIO.',
      'Unidad 2: Caterpillar 950H, capacidad 3.0 m³, año 2021, N° serie CAT950H21-3892, régimen PROPIO.',
      'CUMPLE ampliamente requisitos.',
      '',
      'VOLQUETES (exigido: 3 unid, ≥15 m³, antigüedad ≤8 años)',
      'Unidad 1: Volvo FH 16, capacidad 18 m³, año 2020, N° serie VVO-FH16-20-1245, régimen PROPIO.',
      'Unidad 2: Volvo FH 16, capacidad 18 m³, año 2019, N° serie VVO-FH16-19-0987, régimen PROPIO.',
      'Unidad 3: Mercedes Actros 4144, capacidad 16 m³, año 2021, N° serie MBA-4144-21-5621, régimen PROPIO.',
      'CUMPLE ampliamente requisitos.',
      '',
      'MOTONIVELADORA (exigido: 1 unid, ≥140 HP, antigüedad ≤6 años)',
      'Unidad 1: Caterpillar 140K, potencia 175 HP, año 2020, N° serie CAT140K-20-2154, régimen PROPIO.',
      'CUMPLE.',
      '',
      'RODILLO VIBRATORIO LISO (exigido: 1 unid, ≥10 ton, antigüedad ≤7 años)',
      'Unidad 1: Bomag BW 211 D-5, peso 12 ton, año 2019, N° serie BMG-BW211-19-7892, régimen PROPIO.',
      'CUMPLE.',
      '',
      'PLANTA DE ASFALTO (exigido: 1 unid, ≥60 ton/hora)',
      'Unidad 1: Astec Double Barrel modelo DBR-240, capacidad 90 ton/hora, año 2018, ubicación: Planta Industrial Lurín (Lima), régimen PROPIO. Certificado de operatividad vigente N° CO-2024-1542 emitido por DICAPI con vigencia hasta 30/12/2025.',
      'CUMPLE.',
      '',
      'Se adjunta declaración jurada (Anexo N° 8) y copias de las tarjetas de propiedad de SUNARP — Zona Registral N° IX en los folios indicados.',
    ],
  },

  // ═══════ SECCIÓN IV — PERSONAL CLAVE (B.3) ═══════
  {
    heading: 'SECCIÓN IV — ACREDITACIÓN DE PERSONAL CLAVE (B.3)',
    body: [
      'JEFE DE OBRA',
      'Profesional propuesto: Ing. CARLOS ALBERTO MENDOZA PALACIOS',
      'CIP: 78521 — Vigente al 14/04/2025',
      'DNI: 09887654',
      'Experiencia profesional general: 12 años (desde marzo de 2013).',
      'Experiencia específica como Jefe de Obra en obras viales: 7 años acumulados, distribuidos en los siguientes contratos:',
      '',
      'Contrato N° 087-2019-MTC: "Rehabilitación carretera departamental Cajamarca-Bambamarca, tramo km 12+000 al km 28+500". Ing. Mendoza actuó como JEFE DE OBRA por 24 meses (marzo 2019 – marzo 2021). Monto contractual: S/ 9,800,000.00. Se adjunta constancia de prestación emitida por el MTC.',
      '',
      'Contrato N° 015-2023-GRL: "Construcción carretera vecinal La Encañada – Hualgayoc, tramo II". Ing. Mendoza actuó como JEFE DE OBRA por 18 meses (febrero 2023 – agosto 2024). Monto contractual: S/ 7,200,000.00. Se adjunta constancia de prestación emitida por el Gobierno Regional de Cajamarca.',
      '',
      'Contrato N° 008-2017-MTC: "Mejoramiento carretera vecinal San Marcos-Chumuch". Ing. Mendoza actuó como RESIDENTE DE OBRA por 30 meses (enero 2017 – julio 2019). Se adjunta constancia.',
      '',
      'EXPERIENCIA ESPECÍFICA TOTAL ACUMULADA: 6.0 años como Jefe + 2.5 años como Residente = 7+ años total. SUPERA el mínimo exigido de CINCO (5) años de experiencia específica.',
      '',
      'IMPORTANTE: Se adjunta el CV documentado del Ing. Mendoza en los folios 067-082. Se hace notar que, por motivos administrativos internos derivados de la urgencia del cierre de la propuesta, el CV NO presenta la firma manuscrita del profesional. La experiencia documentada sin embargo sí cumple holgadamente los requisitos mínimos exigidos por las Bases.',
      '',
      'RESIDENTE DE OBRA',
      'Profesional propuesta: Ing. ANA LUCÍA TORRES MEDINA',
      'CIP: 96214 — Vigente al 14/04/2025',
      'Experiencia profesional general: 8 años.',
      'Experiencia específica en obras viales: 5 años (Contratos N° 087-2019-MTC como Asistente de Residente por 24 meses y N° 015-2023-GRL como Residente por 18 meses + N° 24-2021-MDC por 18 meses).',
      'CV documentado y firmado. CUMPLE.',
      '',
      'ESPECIALISTA EN PAVIMENTOS',
      'Profesional propuesto: Ing. ROBERTO QUISPE MAMANI',
      'CIP: 88712 — Vigente al 14/04/2025',
      'Experiencia profesional general: 9 años.',
      'Experiencia específica en pavimentos asfálticos: 4 años. CV firmado adjunto. CUMPLE.',
      '',
      'ESPECIALISTA EN GEOTECNIA',
      'Profesional propuesto: Ing. PATRICIA SALAZAR HUAMÁN',
      'CIP: 102458 — Vigente al 14/04/2025',
      'Experiencia profesional general: 9 años.',
      'Experiencia específica en geotecnia vial: 4 años. CV firmado adjunto. CUMPLE.',
      '',
      'ESPECIALISTA AMBIENTAL',
      'Profesional propuesta: Lic. CLAUDIA RODRÍGUEZ DELGADO',
      'CIP: ICA 4587 — Vigente al 14/04/2025',
      'Ingeniera Ambiental, 6 años de experiencia general, 3 años de experiencia específica en obras viales. CV firmado adjunto. CUMPLE.',
    ],
  },

  // ═══════ SECCIÓN V — EXPERIENCIA DE LA EMPRESA (B.4) ═══════
  {
    heading: 'SECCIÓN V — ACREDITACIÓN DE EXPERIENCIA DE LA EMPRESA (B.4)',
    body: [
      'CONSTRUCTORA ANDINA S.A.C. acredita la ejecución de los siguientes contratos de obras viales en los últimos diez (10) años:',
      '',
      'CONTRATO 1: N° 087-2019-MTC',
      'Objeto: Rehabilitación carretera departamental Cajamarca-Bambamarca, tramo km 12+000 al km 28+500.',
      'Entidad contratante: Ministerio de Transportes y Comunicaciones — Provias Descentralizado.',
      'Monto contractual: S/ 9,800,000.00 (incluye IGV).',
      'Plazo: 365 días calendario.',
      'Estado: LIQUIDADO y entregado a satisfacción.',
      'Conformidad: Resolución Directoral N° 425-2021-MTC/17.07.',
      'Se adjunta copia del contrato, comprobantes de pago y constancia de prestación.',
      '',
      'CONTRATO 2: N° 042-2021-GRC',
      'Objeto: Mejoramiento avenida Industrial-Cajamarca, distrito Baños del Inca.',
      'Entidad contratante: Gobierno Regional de Cajamarca.',
      'Monto contractual: S/ 8,500,000.00 (incluye IGV).',
      'Plazo: 270 días calendario.',
      'Estado: LIQUIDADO con conformidad.',
      'Se adjunta copia del contrato, comprobantes de pago y constancia de prestación.',
      '',
      'CONTRATO 3: N° 015-2023-GRL',
      'Objeto: Construcción carretera vecinal La Encañada – Hualgayoc, tramo II.',
      'Entidad contratante: Gobierno Regional de Lambayeque.',
      'Monto contractual: S/ 7,200,000.00 (incluye IGV).',
      'Plazo: 240 días calendario.',
      'Estado: En liquidación final, con conformidad técnica emitida.',
      'Se adjunta copia del contrato, comprobantes de pago y conformidad técnica.',
      '',
      'MONTO TOTAL ACUMULADO ACREDITADO: S/ 25,500,000.00',
      'MONTO MÍNIMO EXIGIDO: S/ 24,900,000.00 (2 × valor referencial)',
      'CUMPLE ampliamente requisito.',
      '',
      'Adicionalmente, al menos UNO de los contratos (Contrato N° 087-2019-MTC por S/ 9,800,000.00) supera el mínimo de S/ 6,225,000.00 (50% del valor referencial) exigido para un contrato individual.',
    ],
  },

  // ═══════ SECCIÓN VI — CAPACIDAD ECONÓMICO-FINANCIERA ═══════
  {
    heading: 'SECCIÓN VI — ACREDITACIÓN DE CAPACIDAD ECONÓMICO-FINANCIERA (C)',
    body: [
      'C.1 VOLUMEN DE FACTURACIÓN',
      'Se adjuntan copias de las Declaraciones Anuales del Impuesto a la Renta de CONSTRUCTORA ANDINA S.A.C., correspondientes a los siguientes ejercicios fiscales:',
      '',
      'Ejercicio 2022: Volumen anual de facturación S/ 14,200,000.00',
      'Ejercicio 2023: Volumen anual de facturación S/ 15,800,000.00',
      'Ejercicio 2024: Volumen anual de facturación S/ 14,500,000.00',
      'PROMEDIO: S/ 14,833,333.33',
      'MÍNIMO EXIGIDO: S/ 12,450,000.00 (1 × valor referencial)',
      'CUMPLE ampliamente requisito.',
      '',
      'C.2 LIQUIDEZ Y ENDEUDAMIENTO (Ejercicio 2024)',
      'Activo Corriente: S/ 8,650,000.00',
      'Pasivo Corriente: S/ 5,420,000.00',
      'LIQUIDEZ CORRIENTE: 1.60 (mínimo exigido: 1.2) — CUMPLE',
      '',
      'Pasivo Total: S/ 7,890,000.00',
      'Patrimonio: S/ 9,250,000.00',
      'ENDEUDAMIENTO PATRIMONIAL: 0.85 (máximo permitido: 1.5) — CUMPLE',
      '',
      'Se adjuntan los Estados Financieros auditados del ejercicio 2024 firmados por el contador público colegiado y por la auditoría externa contratada (Castro & Asociados Auditores S.R.L.).',
    ],
  },

  // ═══════ SECCIÓN VII — OFERTA ECONÓMICA ═══════
  {
    heading: 'SECCIÓN VII — OFERTA ECONÓMICA (Anexo N° 7)',
    body: [
      'MONTO TOTAL DE LA OFERTA: S/ 12,200,000.00 (Doce millones doscientos mil con 00/100 soles), incluido el Impuesto General a las Ventas (IGV) y todos los demás tributos, contribuciones, gastos generales, utilidad y cualquier otro concepto que incida sobre el costo de la prestación.',
      '',
      'Plazo de ejecución ofertado: TRESCIENTOS CINCUENTA (350) días calendario.',
      'Vigencia de la oferta: NOVENTA (90) días calendario.',
      '',
      'DESAGREGADO REFERENCIAL (sin afectar el carácter de SUMA ALZADA):',
      'Costo directo: S/ 8,900,000.00',
      'Gastos generales (12%): S/ 1,068,000.00',
      'Utilidad (8%): S/ 712,000.00',
      'Sub-total: S/ 10,680,000.00',
      'IGV (18%): S/ 1,920,000.00',
      'TOTAL: S/ 12,600,000.00',
      'Diferencia (descuento ofrecido al fisco): S/ 400,000.00',
      'TOTAL FINAL OFERTADO: S/ 12,200,000.00',
      '',
      'Firma: ___________________________',
      'JORGE ALBERTO RAMÍREZ TORRES',
      'Representante Legal — CONSTRUCTORA ANDINA S.A.C.',
    ],
  },

  // ═══════ NOTA FINAL ═══════
  {
    heading: 'NOTA FINAL — OBSERVACIONES INTERNAS DEL POSTOR',
    body: [
      'Por una omisión administrativa interna derivada de la presión de tiempo en la compilación final de la oferta, CONSTRUCTORA ANDINA S.A.C. incurrió en dos defectos formales que se reconocen abiertamente y respecto de los cuales se solicita oportunidad de subsanación conforme al artículo 64 del Reglamento aprobado por DS N° 009-2025-EF:',
      '',
      '1. NO se adjuntó la Declaración Jurada de no tener inhabilitación administrativa (Anexo N° 5). El postor SÍ cumple efectivamente con NO tener sanción vigente del Tribunal, lo cual es verificable en consulta pública. Se trata de un defecto formal subsanable conforme a la jurisprudencia del Tribunal (Resolución N° 03402-2024-TCE-S3) y la Opinión N° 023-2024/DTN del OSCE.',
      '',
      '2. El CV del Jefe de Obra Ing. Carlos Mendoza Palacios fue adjuntado sin la firma manuscrita del profesional. La experiencia documentada en el CV mediante constancias de prestación oficiales sí cumple con los 5 años de experiencia mínima específica exigida. La omisión de la firma es un defecto FORMAL del documento, no sustancial, conforme al criterio interpretativo de la Opinión N° 023-2024/DTN del OSCE.',
      '',
      'En consecuencia, mi representada solicita al comité de selección que, de considerarlo procedente, otorgue el plazo correspondiente para la subsanación de los referidos defectos formales, garantizando así el principio de concurrencia y el derecho de los administrados al procedimiento justo.',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// OFERTA — INGENIERÍA DEL NORTE S.R.L. (NO CUMPLE)
// ════════════════════════════════════════════════════════════════════
const OFERTA_NORTE: Section[] = [
  {
    heading: 'PORTADA',
    body: [
      'OFERTA TÉCNICA Y ECONÓMICA',
      '',
      'LICITACIÓN PÚBLICA N° 002-2025-GRL',
      '"Mejoramiento de la carretera departamental Chiclayo – Lambayeque, tramo km 0+000 al km 18+500"',
      '',
      'POSTOR: INGENIERÍA DEL NORTE S.R.L.',
      'RUC: 20678912345',
      'Domicilio: Calle Las Begonias 285, Urb. Las Palmeras, Trujillo, La Libertad',
      '',
      'Representante legal: MARÍA ELENA VARGAS CASTRO',
      'DNI: 09876543',
      '',
      'Fecha de presentación: 14 de abril de 2025',
    ],
  },

  // ═══════ SECCIÓN I — RELACIÓN DE DOCUMENTOS ═══════
  {
    heading: 'SECCIÓN I — RELACIÓN DE DOCUMENTOS DE PRESENTACIÓN OBLIGATORIA',
    body: [
      'Conforme al Capítulo III de las Bases Integradas, se presentan todos los documentos exigidos:',
      '',
      '1. Declaración Jurada de datos del postor (Anexo N° 1) — folio 003',
      '2. Declaración Jurada de cumplimiento de TDR (Anexo N° 2) — folio 004',
      '3. Declaración Jurada de plazo de ejecución (Anexo N° 3) — folio 005',
      '4. Declaración Jurada de no estar impedido (Anexo N° 4) — folio 006',
      '5. Declaración Jurada de no tener inhabilitación (Anexo N° 5) — folio 007',
      '6. Vigencia de poder del representante legal — folio 008',
      '7. Constancia vigente del RNP — folio 009',
      '8. Carta Fianza de Seriedad de Oferta — folio 010',
      '9. Oferta Económica firmada (Anexo N° 7) — folio 011',
      '10. Documentación de respaldo de los requisitos de calificación.',
    ],
  },

  // ═══════ SECCIÓN II — CAPACIDAD LEGAL ═══════
  {
    heading: 'SECCIÓN II — ACREDITACIÓN DE CAPACIDAD LEGAL (A)',
    body: [
      'A.1 REPRESENTACIÓN',
      'Vigencia de poder de la representante legal María Elena Vargas Castro, expedida por SUNARP — Zona Registral N° V, Oficina de Trujillo, con fecha 01 de abril de 2025 (antigüedad 13 días). Partida electrónica N° 11823456.',
      '',
      'A.2 HABILITACIÓN PARA CONTRATAR',
      'Todas las declaraciones juradas exigidas se encuentran debidamente adjuntadas, firmadas y selladas por la representante legal.',
      'Constancia del RNP: vigente al 14/04/2025, especialidad "Ejecutor de Obras Viales", inscripción N° 156789-2019.',
    ],
  },

  // ═══════ SECCIÓN III — EQUIPAMIENTO ═══════
  {
    heading: 'SECCIÓN III — ACREDITACIÓN DE EQUIPAMIENTO (B.1)',
    body: [
      'INGENIERÍA DEL NORTE S.R.L. acredita la disponibilidad del siguiente equipamiento, parte en propiedad y parte arrendado:',
      '',
      'CARGADORES FRONTALES (exigido 2, ≥2.5 m³, ≤5 años):',
      'Unidad 1: Komatsu WA320-8, capacidad 2.7 m³, año 2022, N° serie KOM-WA320-22-1456, régimen PROPIO.',
      'Unidad 2: Komatsu WA320-8, capacidad 2.7 m³, año 2021, N° serie KOM-WA320-21-0987, régimen PROPIO.',
      'CUMPLE.',
      '',
      'VOLQUETES (exigido 3, ≥15 m³, ≤8 años):',
      'Unidad 1: Mercedes Benz Actros 4144, 16 m³, año 2020, PROPIO.',
      'Unidad 2: Mercedes Benz Actros 4144, 16 m³, año 2021, PROPIO.',
      'Unidad 3: Volvo FH 540, 18 m³, año 2019, PROPIO.',
      'Unidad 4: Mercedes Benz Actros 4148, 16 m³, año 2022, PROPIO.',
      'CUMPLE.',
      '',
      'MOTONIVELADORA (exigido 1, ≥140 HP, ≤6 años):',
      'Unidad 1: John Deere 770G, 165 HP, año 2021, ARRENDADO según contrato de arrendamiento con ALQUIMAQ S.A.C., vigente hasta diciembre 2025.',
      'CUMPLE.',
      '',
      'RODILLO VIBRATORIO LISO (exigido 1, ≥10 ton, ≤7 años):',
      'Unidad 1: Hamm HD 110, peso 11 ton, año 2019, PROPIO.',
      'CUMPLE.',
      '',
      'PLANTA DE ASFALTO (exigido 1, ≥60 ton/hora):',
      'Unidad 1: Astec Voyager 240, capacidad 70 ton/hora, año 2018, ubicación: Planta Industrial Salaverry (La Libertad). Régimen: contrato de provisión exclusiva con ASFALTOS DEL NORTE S.A.C. Certificado de operatividad vigente N° CO-2024-2856 hasta 31/03/2026.',
      'CUMPLE.',
    ],
  },

  // ═══════ SECCIÓN IV — PERSONAL CLAVE ═══════
  {
    heading: 'SECCIÓN IV — ACREDITACIÓN DE PERSONAL CLAVE (B.3)',
    body: [
      'JEFE DE OBRA',
      'Profesional propuesto: Ing. LUIS FERNANDO HUAMÁN ROJAS',
      'CIP: 102345 — Vigente al 14/04/2025',
      'DNI: 41122334',
      '',
      'EXPERIENCIA PROFESIONAL GENERAL: 6 años desde febrero de 2019 (fecha de colegiatura).',
      '',
      'EXPERIENCIA ESPECÍFICA EN OBRAS VIALES:',
      '',
      'Contrato N° 23-2020-MDLN: "Mantenimiento periódico vías urbanas distrito La Esperanza, Trujillo". Periodo: enero 2020 – junio 2021 (18 meses). Función: RESIDENTE DE OBRA. Monto: S/ 6,800,000.00. Constancia de prestación adjunta.',
      '',
      'Contrato N° 41-2022-GRLL: "Construcción pavimento rígido avenida América Sur, Trujillo". Periodo: marzo 2022 – septiembre 2023 (18 meses). Función: JEFE DE OBRA. Monto: S/ 7,500,000.00. Constancia de prestación adjunta.',
      '',
      'EXPERIENCIA ESPECÍFICA TOTAL ACUMULADA: 3 años (1.5 años como Residente + 1.5 años como Jefe de Obra).',
      '',
      'IMPORTANTE: El postor reconoce que el mínimo exigido por el Capítulo IV, numeral B.3 de las Bases Integradas es de CINCO (5) años de experiencia específica para el Jefe de Obra. El postor considera, sin embargo, que la experiencia acumulada de TRES (3) años, sumada a estudios complementarios del profesional (Diplomado en Gerencia de Proyectos Viales, Universidad Privada Antenor Orrego, 2023) y a su versatilidad probada en obras complejas, califica suficientemente al profesional para el ejercicio del cargo propuesto, conforme a la teoría de la equivalencia funcional.',
      '',
      'CV firmado por el profesional, adjunto en los folios 067-091.',
      '',
      'RESIDENTE DE OBRA',
      'Profesional propuesto: Ing. PEDRO ALEJANDRO GUTIÉRREZ SALAS',
      'CIP: 87123 — Vigente.',
      'Experiencia profesional general: 9 años.',
      'Experiencia específica en obras viales como Residente: 5 años (Contratos N° 23-2020-MDLN como Asistente de Residente 18m, N° 41-2022-GRLL como Residente 18m, N° 008-2024-MDP como Residente 24m en curso). CUMPLE.',
      'CV firmado adjunto.',
      '',
      'ESPECIALISTA EN PAVIMENTOS',
      'Profesional propuesta: Ing. CARMEN ROSA VEGA HUARANGA',
      'CIP: 91456 — Vigente.',
      'Experiencia profesional general: 10 años.',
      'Experiencia específica en pavimentos asfálticos: 5 años. CUMPLE.',
      'CV firmado adjunto.',
      '',
      'ESPECIALISTA EN GEOTECNIA',
      'Profesional propuesto: Ing. RAÚL ALBERTO QUISPE TARAZONA',
      'CIP: 98741 — Vigente.',
      'Experiencia profesional general: 8 años.',
      'Experiencia específica en geotecnia vial: 4 años. CUMPLE.',
      'CV firmado adjunto.',
      '',
      'ESPECIALISTA AMBIENTAL',
      'Profesional propuesto: Ing. MARÍA FERNANDA RUIZ HERRERA',
      'Ing. Ambiental, CIP-LL 8745 — Vigente.',
      'Experiencia profesional general: 7 años.',
      'Experiencia específica en obras viales: 3 años. CUMPLE.',
      'CV firmado adjunto.',
    ],
  },

  // ═══════ SECCIÓN V — EXPERIENCIA DE LA EMPRESA ═══════
  {
    heading: 'SECCIÓN V — ACREDITACIÓN DE EXPERIENCIA DE LA EMPRESA (B.4)',
    body: [
      'INGENIERÍA DEL NORTE S.R.L. acredita la ejecución de los siguientes contratos:',
      '',
      'CONTRATO 1: N° 23-2020-MDLN',
      'Objeto: Mantenimiento periódico vías urbanas distrito La Esperanza, Trujillo.',
      'Entidad: Municipalidad Distrital de La Esperanza.',
      'Monto: S/ 6,800,000.00. Plazo: 365 días. Estado: LIQUIDADO.',
      '',
      'CONTRATO 2: N° 41-2022-GRLL',
      'Objeto: Construcción pavimento rígido avenida América Sur, Trujillo.',
      'Entidad: Gobierno Regional de La Libertad.',
      'Monto: S/ 7,500,000.00. Plazo: 240 días. Estado: LIQUIDADO.',
      '',
      'CONTRATO 3: N° 008-2024-MDP',
      'Objeto: Mejoramiento vial jirón Bolognesi en Piura.',
      'Entidad: Municipalidad Distrital de Piura.',
      'Monto: S/ 12,100,000.00. Plazo: 365 días. Estado: en ejecución, avance 75%.',
      '',
      'MONTO TOTAL ACUMULADO: S/ 26,400,000.00. CUMPLE.',
      'Contrato individual mayor a S/ 6,225,000.00: SÍ (N° 008-2024-MDP). CUMPLE.',
    ],
  },

  // ═══════ SECCIÓN VI — CAPACIDAD ECONÓMICO-FINANCIERA ═══════
  {
    heading: 'SECCIÓN VI — ACREDITACIÓN DE CAPACIDAD ECONÓMICO-FINANCIERA (C)',
    body: [
      'C.1 VOLUMEN DE FACTURACIÓN',
      'Ejercicio 2022: S/ 12,400,000.00',
      'Ejercicio 2023: S/ 13,800,000.00',
      'Ejercicio 2024: S/ 13,400,000.00',
      'PROMEDIO: S/ 13,200,000.00 > S/ 12,450,000.00. CUMPLE.',
      '',
      'C.2 LIQUIDEZ Y ENDEUDAMIENTO (2024)',
      'Liquidez corriente: 1.35 > 1.20. CUMPLE.',
      'Endeudamiento patrimonial: 1.25 < 1.50. CUMPLE.',
      '',
      'Se adjuntan los Estados Financieros auditados del ejercicio 2024.',
    ],
  },

  // ═══════ SECCIÓN VII — OFERTA ECONÓMICA ═══════
  {
    heading: 'SECCIÓN VII — OFERTA ECONÓMICA',
    body: [
      'MONTO TOTAL DE LA OFERTA: S/ 11,950,000.00 (Once millones novecientos cincuenta mil con 00/100 soles), incluido IGV y todos los demás conceptos.',
      '',
      'Plazo de ejecución: 350 días calendario.',
      'Vigencia de la oferta: 90 días calendario.',
      '',
      'Firma: ___________________________',
      'MARÍA ELENA VARGAS CASTRO',
      'Representante Legal — INGENIERÍA DEL NORTE S.R.L.',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`Generando PDFs robustos en: ${OUT_DIR}\n`);

  await buildPdf(
    'Bases_Integradas_LP_002-2025-GRL.pdf',
    'LICITACIÓN PÚBLICA N° 002-2025-GRL',
    'GOBIERNO REGIONAL DE LAMBAYEQUE\nBASES INTEGRADAS\n"Mejoramiento de la carretera departamental Chiclayo – Lambayeque, tramo km 0+000 al km 18+500"\nLey N° 32069 — Reglamento DS N° 009-2025-EF',
    BASES,
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

  console.log(`\nPDFs listos en data/test-evaluador/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
