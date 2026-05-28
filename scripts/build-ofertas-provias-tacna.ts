#!/usr/bin/env tsx
/**
 * Genera 2 ofertas REALISTAS específicamente para el proceso real:
 *   LP N° 0003-2024-MTC/20 — PROVIAS NACIONAL
 *   Mejoramiento Carretera Boca del Río - Tacna
 *   Valor referencial: S/ 676,198,694.06
 *
 * Los datos están calibrados con los requisitos REALES extraídos de las Bases:
 *   - Residente Obra: 8 años exp / Especialistas: 6 años exp
 *   - Postor: S/ 726M facturado en carreteras con carpeta asfáltica en caliente
 *   - NO admite experiencia vial urbana
 *
 * Casos:
 *   Postor A: CONSORCIO VIAL DEL SUR (subsanable: omite DJ + CV sin firma)
 *   Postor B: ICCGSA-CASA SAC (no cumple: Residente con 6 años vs 8 exigidos)
 */
import PDFDocument from 'pdfkit';
import { mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'data', 'test-evaluador', 'real');
mkdirSync(OUT_DIR, { recursive: true });

interface Section { heading: string; body: string[] }

function buildPdf(filename: string, title: string, subtitle: string, sections: Section[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 70, bottom: 70, left: 65, right: 65 },
      info: { Title: title, Author: 'Postor' },
      bufferPages: true,
    });
    const stream = createWriteStream(join(OUT_DIR, filename));
    doc.pipe(stream);

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#1a1a1a').text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).fillColor('#555').text(subtitle, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor('#000');

    for (const sec of sections) {
      if (sec.heading.match(/^SECCI[OÓ]N|^ANEXO/)) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1a1a').text(sec.heading);
      } else {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a1a').text(sec.heading);
      }
      doc.fillColor('#000');
      doc.moveDown(0.4);
      for (const para of sec.body) {
        const t = para.trim();
        if (/^[A-Z\.\d\s]{3,80}:$/.test(t)) {
          doc.font('Helvetica-Bold').fontSize(10).text(t);
        } else {
          doc.font('Helvetica').fontSize(10).text(t, { align: 'justify', lineGap: 2 });
        }
        doc.moveDown(0.3);
      }
      doc.moveDown(0.5);
    }

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
// OFERTA POSTOR A — CONSORCIO VIAL DEL SUR (SUBSANABLE)
// ════════════════════════════════════════════════════════════════════
const OFERTA_A: Section[] = [
  {
    heading: 'PORTADA',
    body: [
      'OFERTA TÉCNICA Y ECONÓMICA',
      '',
      'LICITACIÓN PÚBLICA N° 0003-2024-MTC/20 — PROVIAS NACIONAL',
      'MEJORAMIENTO DE LA CARRETERA BOCA DEL RÍO - TACNA EN LOS DISTRITOS DE TACNA, SAMA Y LA YARADA LOS PALOS',
      '',
      'POSTOR: CONSORCIO VIAL DEL SUR',
      'Integrado por: GRAÑA Y MONTERO INGENIERÍA S.A.C. (60%) y CONSTRUCTORA SACYR-LIMA S.A.C. (40%)',
      'RUC representante: 20304857412 (G&M Ingeniería S.A.C.)',
      'Domicilio común: Av. Paseo de la República 4675, Surquillo, Lima',
      '',
      'Representante común del Consorcio: Ing. ROBERTO ALEJANDRO BAZÁN GUTIÉRREZ',
      'DNI: 09875623 — CIP 67234',
      '',
      'Fecha: 30 de abril de 2025',
    ],
  },

  {
    heading: 'SECCIÓN I — DOCUMENTOS DE PRESENTACIÓN OBLIGATORIA',
    body: [
      'Se relacionan los documentos exigidos conforme al Capítulo II de las Bases Integradas LP N° 0003-2024-MTC/20:',
      '',
      'Anexo 1: Declaración Jurada de datos del postor — folio 003',
      'Anexo 2: Declaración Jurada de cumplimiento de Bases — folio 005',
      'Anexo 3: Declaración Jurada de plazo de ejecución (720 días) — folio 006',
      'Anexo 4: Declaración Jurada de no estar impedido (art. 11 Ley 32069) — folio 007',
      'Anexo 5: Declaración Jurada de no tener inhabilitación administrativa — NO ADJUNTADA por error administrativo (ver Nota Final)',
      'Anexo 6: Oferta Económica firmada — folio 008',
      'Anexo 7: Promesa formal de consorcio — folio 010',
      'Anexo 8: Declaración Jurada de disponibilidad de equipamiento — folio 015',
      'Vigencia de poderes de ambos representantes legales — folios 016 y 017',
      'Constancia vigente del RNP (ambos integrantes) — folios 019 y 020',
      'Carta Fianza de Seriedad de Oferta (1% × VR = S/ 6,761,986.94) emitida por BBVA Perú — folio 023',
    ],
  },

  {
    heading: 'SECCIÓN II — CAPACIDAD LEGAL',
    body: [
      'A.1 REPRESENTACIÓN',
      'Promesa formal de consorcio celebrada el 28 de marzo de 2025, con designación del Ing. Roberto Bazán Gutiérrez como representante común. Porcentajes: G&M Ingeniería 60%, Constructora SACYR-LIMA 40%. Adjunto en folio 010.',
      'Vigencia de poderes expedidos por SUNARP el 15 de abril de 2025 (antigüedad 15 días calendario, ≤30 exigidos).',
      '',
      'A.2 HABILITACIÓN PARA CONTRATAR',
      'Declaración Jurada de no impedimento (Anexo 4) adjuntada en folio 007.',
      'Declaración Jurada de no tener inhabilitación administrativa (Anexo 5): NO SE ADJUNTÓ por omisión administrativa interna. CONSORCIO VIAL DEL SUR confirma que NINGUNO de sus integrantes tiene sanción vigente del Tribunal de Contrataciones, verificable en consulta pública del Registro Nacional de Sancionados.',
      'Constancia RNP G&M Ingeniería N° 067834-2015 — vigente, especialidad Ejecutor de Obras de Carreteras.',
      'Constancia RNP Constructora SACYR-LIMA N° 089456-2017 — vigente, especialidad Ejecutor de Obras de Carreteras.',
    ],
  },

  {
    heading: 'SECCIÓN III — EXPERIENCIA DEL POSTOR EN LA ESPECIALIDAD',
    body: [
      'El CONSORCIO VIAL DEL SUR acredita haber ejecutado en los últimos diez años obras viales en carreteras con superficie de rodadura en carpeta asfáltica en caliente por un monto facturado acumulado de S/ 850 millones, superando el mínimo exigido de S/ 726,631,186.69 (1.075 × valor referencial).',
      '',
      'CONTRATOS ACREDITADOS:',
      '',
      'Contrato 1: G&M Ingeniería S.A.C. — Provias Nacional, año 2018-2021.',
      'Obra: Rehabilitación y Mejoramiento Carretera Cusco-Quillabamba, Tramo Km 0+000 al Km 78+200.',
      'Superficie: 100% carpeta asfáltica en caliente.',
      'Monto contractual: S/ 312,800,000.00. Estado: liquidado y entregado a satisfacción.',
      'Se adjunta acta de recepción y constancia de prestación emitida por Provias Nacional.',
      '',
      'Contrato 2: G&M Ingeniería S.A.C. — Gobierno Regional Cusco, año 2020-2023.',
      'Obra: Mejoramiento Carretera Departamental Quincemil-Marcapata-Ocongate, Tramo I.',
      'Superficie: carpeta asfáltica en caliente en 100% del tramo.',
      'Monto: S/ 198,500,000.00. Estado: liquidado.',
      '',
      'Contrato 3: SACYR-LIMA S.A.C. — Provias Nacional, año 2019-2022.',
      'Obra: Rehabilitación y Mantenimiento Carretera Lima-Canta-Huayllay-Cerro de Pasco, Tramo III.',
      'Superficie: carpeta asfáltica en caliente.',
      'Monto: S/ 245,300,000.00. Estado: liquidado.',
      '',
      'Contrato 4: SACYR-LIMA S.A.C. — Gobierno Regional Arequipa, año 2021-2024.',
      'Obra: Construcción Vía de Evitamiento Caylloma, Tramo Norte.',
      'Superficie: autopista de primera clase con carpeta asfáltica en caliente.',
      'Monto: S/ 95,000,000.00. Estado: liquidado, con conformidad.',
      '',
      'TOTAL ACUMULADO ACREDITADO: S/ 851,600,000.00',
      'MÍNIMO EXIGIDO: S/ 726,631,186.69',
      'CUMPLE ampliamente requisito de experiencia del postor en la especialidad.',
      '',
      'NOTA: Ninguno de los contratos acreditados corresponde a obras viales urbanas (las Bases excluyen esa experiencia).',
    ],
  },

  {
    heading: 'SECCIÓN IV — PERSONAL CLAVE PROPUESTO',
    body: [
      'RESIDENTE DE OBRA (exigido 8 años exp.)',
      'Ing. CARLOS ANTONIO QUISPE MENDOZA, CIP 45123 — colegiado y habilitado.',
      'Ingeniero Civil con 14 años de experiencia profesional general (desde junio 2011, fecha de colegiatura).',
      'Experiencia específica como Residente de Obra en carreteras con carpeta asfáltica en caliente: 10 años acumulados.',
      'Contratos: Carretera Cusco-Quillabamba (G&M, 2018-2021, 36m como Residente), Carretera Lima-Canta (SACYR, 2015-2018, 34m), Carretera Interoceánica Sur Tramo IV (Odebrecht, 2011-2014, 38m como Asistente de Residente).',
      'CUMPLE con margen.',
      '',
      'JEFE DE TRAMO',
      'Ing. MARTÍN ENRIQUE PALOMINO TORRES, CIP 38214.',
      'Experiencia profesional general: 18 años. Experiencia específica en obras viales con asfalto: 12 años.',
      'CUMPLE.',
      '',
      'ING. DE METRADOS Y VALORIZACIONES (PLANEAMIENTO Y COSTOS, 6 años mín)',
      'Ing. PATRICIA SOLEDAD VARGAS CASTRO, CIP 67891.',
      'Experiencia profesional general: 9 años. Específica en planeamiento y costos de obras viales: 7 años.',
      'CUMPLE.',
      '',
      'INGENIERO DE PRODUCCIÓN',
      'Ing. JOSÉ MARÍA LÓPEZ HERRERA, CIP 78234.',
      'Experiencia profesional general: 11 años. Específica como Ingeniero de Producción en obras viales: 8 años.',
      'CUMPLE.',
      '',
      'ING. SUELOS Y PAVIMENTOS (6 años mín)',
      'Ing. RAÚL ENRIQUE QUISPE TARAZONA, CIP 92456.',
      'Experiencia profesional general: 8 años. Específica en pavimentos asfálticos: 6 años exacto.',
      'CUMPLE.',
      '',
      'NOTA: El CV del Ing. Raúl Quispe (Suelos y Pavimentos) fue adjuntado sin la firma manuscrita del profesional por error administrativo en la compilación final. La experiencia documentada sí cumple con los 6 años mínimos exigidos.',
      '',
      'ESPECIALISTA AMBIENTAL (JEFE SSOMA, 6 años mín)',
      'Lic. CLAUDIA MERCEDES RODRÍGUEZ DELGADO, CIP-AM 4587.',
      'Ingeniera Ambiental con 9 años de experiencia general. Específica como Jefe SSOMA en obras viales: 7 años.',
      'CUMPLE.',
      '',
      'ESPECIALISTA EN SEGURIDAD Y SALUD EN EL TRABAJO (6 años mín)',
      'Ing. PEDRO ANDRÉS GUTIÉRREZ SALAS, CIP 81245.',
      'Experiencia profesional general: 10 años. Específica en SST de obras viales: 8 años.',
      'CUMPLE.',
    ],
  },

  {
    heading: 'SECCIÓN V — EQUIPAMIENTO MÍNIMO',
    body: [
      'El CONSORCIO acredita la disponibilidad del siguiente equipamiento estratégico (parte propio del Consorciado G&M, parte propio de SACYR):',
      '',
      'PLANTA DE ASFALTO: Marca Astec, modelo Voyager 240, capacidad 200 ton/hora, año 2020. Régimen: propio del consorciado G&M. Ubicación de instalación: Pampa Sitana, Tacna. Certificado operatividad vigente.',
      '',
      'PLANTA CHANCADORA: Marca Metso, modelo LT-1213S, capacidad 250 ton/hora, año 2019. Régimen: propio SACYR.',
      '',
      'PAVIMENTADORA ASFÁLTICA: Marca Vögele, modelo SUPER 1800-3i, ancho de pavimentación 5.0 m, año 2021. Régimen: propio G&M.',
      '',
      'RODILLOS COMPACTADORES: 4 unidades (2 vibratorios lisos Bomag BW 211, 2 neumáticos Hamm HD 110), años 2019-2021.',
      '',
      'EXCAVADORAS: 6 unidades Caterpillar 330D, años 2018-2022.',
      'CARGADORES FRONTALES: 8 unidades Caterpillar 950H, años 2019-2022.',
      'VOLQUETES: 24 unidades de 18 m³ (mezcla Volvo FH y Mercedes Actros), años 2018-2023.',
      'MOTONIVELADORAS: 3 unidades Caterpillar 140K, 175 HP, años 2020-2022.',
      'CISTERNAS DE AGUA: 6 unidades de 8,000 galones cada una.',
      '',
      'Se adjuntan tarjetas de propiedad, contratos de arrendamiento (de existir) y declaración jurada de disponibilidad.',
    ],
  },

  {
    heading: 'SECCIÓN VI — OFERTA ECONÓMICA',
    body: [
      'MONTO TOTAL DE LA OFERTA: S/ 612,580,000.00 (SEISCIENTOS DOCE MILLONES QUINIENTOS OCHENTA MIL CON 00/100 SOLES), incluido IGV y todos los tributos, gastos generales, utilidad y demás conceptos aplicables.',
      '',
      'Equivalente al 90.6% del valor referencial (S/ 676,198,694.06).',
      '',
      'Plazo de ejecución: 720 días calendario.',
      'Vigencia de la oferta: 90 días calendario.',
      '',
      'Firma: ___________________________',
      'Ing. ROBERTO BAZÁN GUTIÉRREZ',
      'Representante Común — CONSORCIO VIAL DEL SUR',
    ],
  },

  {
    heading: 'SECCIÓN VII — NOTA FINAL / OBSERVACIONES DEL POSTOR',
    body: [
      'El CONSORCIO VIAL DEL SUR reconoce que en la presente oferta se han producido dos defectos formales derivados de la urgencia administrativa en la compilación final de la propuesta. Se solicita la oportunidad de subsanación conforme al artículo 64 del Reglamento de la Ley N° 32069 (DS N° 009-2025-EF):',
      '',
      '1. OMISIÓN DE LA DECLARACIÓN JURADA DE NO TENER INHABILITACIÓN (Anexo 5). El postor SÍ cumple efectivamente con NO tener sanción vigente del Tribunal de Contrataciones, lo cual es verificable en la consulta pública del Registro Nacional de Sancionados del OECE. Se trata de un defecto formal subsanable conforme a la jurisprudencia consolidada del Tribunal (Resolución N° 03402-2024-TCE-S3) y a la Opinión N° 023-2024/DTN del OSCE.',
      '',
      '2. CV DEL ING. SUELOS Y PAVIMENTOS SIN FIRMA. El CV del Ing. Raúl Quispe Tarazona fue adjuntado sin firma manuscrita. La experiencia documentada mediante certificados de obra sí cumple con los 6 años mínimos exigidos. La omisión es un defecto FORMAL del documento, no sustancial, conforme al criterio interpretativo de la Opinión N° 023-2024/DTN del OSCE que distingue entre subsanación de aspectos formales del CV vs incumplimiento sustancial del requisito de experiencia.',
      '',
      'Mi representada solicita al comité de selección el plazo correspondiente para subsanar los referidos defectos formales.',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// OFERTA POSTOR B — CONSORCIO PERUANO SUR (NO CUMPLE)
// ════════════════════════════════════════════════════════════════════
const OFERTA_B: Section[] = [
  {
    heading: 'PORTADA',
    body: [
      'OFERTA TÉCNICA Y ECONÓMICA',
      '',
      'LICITACIÓN PÚBLICA N° 0003-2024-MTC/20 — PROVIAS NACIONAL',
      'MEJORAMIENTO DE LA CARRETERA BOCA DEL RÍO - TACNA',
      '',
      'POSTOR: CONSORCIO PERUANO SUR',
      'Integrado por: COSAPI S.A. (55%) y INGENIERÍA Y CONSTRUCCIÓN MAQUI S.A.C. (45%)',
      'RUC representante: 20100128218 (COSAPI S.A.)',
      'Domicilio común: Av. Aramburú 1057, San Isidro, Lima',
      '',
      'Representante común: Ing. JORGE LUIS HUAMÁN ROJAS',
      'DNI: 09674521 — CIP 41189',
      '',
      'Fecha: 30 de abril de 2025',
    ],
  },

  {
    heading: 'SECCIÓN I — DOCUMENTOS DE PRESENTACIÓN OBLIGATORIA',
    body: [
      'Se adjuntan todos los documentos exigidos por las Bases Integradas LP N° 0003-2024-MTC/20:',
      '',
      'Anexo 1: DJ datos del postor — folio 003',
      'Anexo 2: DJ cumplimiento de Bases — folio 004',
      'Anexo 3: DJ plazo de ejecución — folio 005',
      'Anexo 4: DJ no estar impedido — folio 006',
      'Anexo 5: DJ no tener inhabilitación administrativa — folio 007',
      'Anexo 6: Oferta económica — folio 008',
      'Anexo 7: Promesa formal de consorcio — folio 009',
      'Anexo 8: DJ disponibilidad de equipamiento — folio 014',
      'Vigencia de poderes (ambos consorciados) — folios 015-016',
      'Constancia RNP (ambos consorciados) — folios 017-018',
      'Carta Fianza de Seriedad de Oferta (S/ 6,761,986.94) emitida por Interbank — folio 020',
    ],
  },

  {
    heading: 'SECCIÓN II — CAPACIDAD LEGAL',
    body: [
      'Promesa formal de consorcio celebrada el 02 de abril de 2025. Porcentajes: COSAPI 55%, MAQUI 45%. Representante común: Ing. Jorge Huamán Rojas, CIP 41189.',
      'Vigencia de poderes vigente, expedida por SUNARP, antigüedad 12 días.',
      'Declaraciones juradas Anexo 4 y Anexo 5 adjuntas y firmadas.',
      'Constancias RNP vigentes para ambos integrantes, ambas con especialidad Ejecutor de Obras de Carreteras.',
    ],
  },

  {
    heading: 'SECCIÓN III — EXPERIENCIA DEL POSTOR EN LA ESPECIALIDAD',
    body: [
      'El CONSORCIO PERUANO SUR acredita la ejecución de los siguientes contratos en obras viales con superficie de rodadura en carpeta asfáltica en caliente, en los últimos diez años:',
      '',
      'Contrato 1: COSAPI S.A. — Provias Nacional, 2017-2020.',
      'Obra: Mejoramiento Carretera Imperial-Pampas, Tramo Km 32+000 al Km 65+500.',
      'Superficie: carpeta asfáltica en caliente.',
      'Monto: S/ 285,400,000.00. Liquidado.',
      '',
      'Contrato 2: COSAPI S.A. — Gobierno Regional La Libertad, 2019-2022.',
      'Obra: Construcción Carretera Departamental Otuzco-Quiruvilca, Tramo II.',
      'Superficie: carpeta asfáltica en caliente.',
      'Monto: S/ 215,800,000.00. Liquidado.',
      '',
      'Contrato 3: COSAPI S.A. — Ministerio de Vivienda, 2020-2023.',
      'Obra: Reconstrucción Carretera Costanera Norte, Tramo Pacasmayo-Chepén.',
      'Superficie: carpeta asfáltica en caliente.',
      'Monto: S/ 178,500,000.00. Liquidado.',
      '',
      'Contrato 4: INGENIERÍA Y CONSTRUCCIÓN MAQUI S.A.C. — Provias Nacional, 2018-2021.',
      'Obra: Rehabilitación Carretera Lambayeque-Olmos, Tramo IV.',
      'Superficie: carpeta asfáltica en caliente.',
      'Monto: S/ 92,300,000.00. Liquidado.',
      '',
      'TOTAL ACUMULADO: S/ 772,000,000.00',
      'MÍNIMO EXIGIDO: S/ 726,631,186.69',
      'CUMPLE requisito.',
    ],
  },

  {
    heading: 'SECCIÓN IV — PERSONAL CLAVE PROPUESTO',
    body: [
      'RESIDENTE DE OBRA (exigido 8 años de experiencia mínima)',
      'Ing. MIGUEL ÁNGEL RAMÍREZ SOSA, CIP 102378 — colegiado y habilitado.',
      'Ingeniero Civil colegiado en febrero de 2019.',
      'Experiencia profesional general acumulada: 6 años (desde febrero 2019).',
      '',
      'EXPERIENCIA ESPECÍFICA COMO RESIDENTE DE OBRA EN OBRAS VIALES CON CARPETA ASFÁLTICA EN CALIENTE:',
      '- Contrato N° 087-2020-COSAPI (obra "Mejoramiento Carretera Imperial-Pampas"): actuó como RESIDENTE DE OBRA del 12/03/2020 al 30/11/2021, periodo de 20 meses.',
      '- Contrato N° 042-2022-MAQUI (obra "Mantenimiento periódico Carretera Lima Norte"): actuó como RESIDENTE DE OBRA del 15/01/2022 al 30/09/2023, periodo de 20 meses.',
      '- Contrato N° 012-2024-COSAPI (obra "Construcción Carretera Departamental Otuzco"): actuó como RESIDENTE DE OBRA del 01/02/2024 al 28/02/2025, periodo de 13 meses (en ejecución).',
      '',
      'EXPERIENCIA ESPECÍFICA TOTAL ACUMULADA: 4 años y 5 meses (53 meses como Residente).',
      '',
      'IMPORTANTE: El postor reconoce que el mínimo exigido por las Bases (Capítulo III, B.3) es de OCHO (8) años de experiencia específica como Residente de Obra. El profesional propuesto acumula efectivamente 4 años y 5 meses de experiencia específica al momento de la presentación de la oferta. Sin embargo, el postor sostiene que la formación complementaria del profesional (Maestría en Gerencia de Proyectos Viales, Universidad Nacional de Ingeniería 2022; Diplomado Internacional en Pavimentos AASHTO, Asociación Argentina de Carreteras 2023) y su demostrada capacidad gerencial compensan funcionalmente los años faltantes, aplicando el principio de equivalencia.',
      '',
      'CV firmado y documentado adjunto en folios 045-062.',
      '',
      'JEFE DE TRAMO',
      'Ing. PATRICIA SOLEDAD VARGAS HUARANGA, CIP 78213.',
      'Experiencia profesional general: 16 años. Específica en carreteras con carpeta asfáltica: 11 años.',
      'CUMPLE.',
      '',
      'ING. DE METRADOS Y VALORIZACIONES (6 años mín)',
      'Ing. CARLOS EDUARDO TORRES MEDINA, CIP 89234.',
      'Experiencia profesional general: 10 años. Específica en planeamiento y costos viales: 8 años.',
      'CUMPLE.',
      '',
      'INGENIERO DE PRODUCCIÓN',
      'Ing. ANA LUCÍA PÉREZ RODRÍGUEZ, CIP 67234.',
      'Experiencia profesional general: 9 años. Específica como Ingeniero de Producción: 7 años.',
      'CUMPLE.',
      '',
      'ING. SUELOS Y PAVIMENTOS (6 años mín)',
      'Ing. ROBERTO ALEJANDRO QUISPE VALDIVIA, CIP 92176.',
      'Experiencia profesional general: 11 años. Específica en pavimentos asfálticos: 8 años.',
      'CUMPLE.',
      '',
      'JEFE ÁREA SSOMA (6 años mín)',
      'Ing. CLAUDIA MERCEDES HUAMÁN CASTRO, CIP 73456.',
      'Experiencia profesional general: 8 años. Específica como Jefe SSOMA en carreteras: 6 años.',
      'CUMPLE.',
      '',
      'ESPECIALISTA EN SST (6 años mín)',
      'Ing. JOSÉ MARÍA RUIZ DELGADO, CIP 81234.',
      'Experiencia profesional general: 9 años. Específica en SST de obras viales: 7 años.',
      'CUMPLE.',
    ],
  },

  {
    heading: 'SECCIÓN V — EQUIPAMIENTO MÍNIMO',
    body: [
      'El CONSORCIO acredita la disponibilidad del siguiente equipamiento, propio de los consorciados o contratado en arrendamiento:',
      '',
      'PLANTA DE ASFALTO: Marca Astec, Voyager 250, capacidad 220 ton/hora, año 2019. Régimen: arrendamiento exclusivo con ASFALTOS DEL SUR S.A.C. por toda la duración de la obra.',
      'PLANTA CHANCADORA: Marca Sandvik, 280 ton/hora, año 2020. Régimen: propio COSAPI.',
      'PAVIMENTADORA: Vögele SUPER 1900-3i, ancho 6 m, año 2022. Régimen: propio COSAPI.',
      'RODILLOS COMPACTADORES: 5 unidades (3 vibratorios Caterpillar CS66B + 2 neumáticos Bomag BW27R).',
      'EXCAVADORAS: 8 unidades Caterpillar 336D2L y Volvo EC380.',
      'CARGADORES FRONTALES: 10 unidades Caterpillar 962M y 966H.',
      'VOLQUETES: 32 unidades de 20-22 m³ (Mercedes Actros 4148 y Volvo FH 16).',
      'MOTONIVELADORAS: 4 unidades Caterpillar 140M3.',
      'CISTERNAS DE AGUA: 8 unidades de 10,000 galones.',
      '',
      'Tarjetas de propiedad y contratos de arrendamiento adjuntos.',
    ],
  },

  {
    heading: 'SECCIÓN VI — OFERTA ECONÓMICA',
    body: [
      'MONTO TOTAL DE LA OFERTA: S/ 598,750,000.00 (QUINIENTOS NOVENTA Y OCHO MILLONES SETECIENTOS CINCUENTA MIL CON 00/100 SOLES), incluido IGV y todos los tributos aplicables.',
      '',
      'Equivalente al 88.5% del valor referencial (S/ 676,198,694.06).',
      '',
      'Plazo de ejecución: 720 días calendario.',
      'Vigencia de la oferta: 90 días calendario.',
      '',
      'Firma: ___________________________',
      'Ing. JORGE LUIS HUAMÁN ROJAS',
      'Representante Común — CONSORCIO PERUANO SUR',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`Generando ofertas reales para el proceso LP 0003-2024-MTC/20 PROVIAS...\n`);

  await buildPdf(
    'Oferta_A_Consorcio_Vial_del_Sur.pdf',
    'OFERTA TÉCNICA Y ECONÓMICA',
    'POSTOR: CONSORCIO VIAL DEL SUR (G&M Ingeniería + SACYR-LIMA)\nLicitación Pública N° 0003-2024-MTC/20 — PROVIAS NACIONAL\nMejoramiento Carretera Boca del Río - Tacna',
    OFERTA_A,
  );
  console.log('  Oferta_A_Consorcio_Vial_del_Sur.pdf  (SUBSANABLE)');

  await buildPdf(
    'Oferta_B_Consorcio_Peruano_Sur.pdf',
    'OFERTA TÉCNICA Y ECONÓMICA',
    'POSTOR: CONSORCIO PERUANO SUR (COSAPI + MAQUI)\nLicitación Pública N° 0003-2024-MTC/20 — PROVIAS NACIONAL\nMejoramiento Carretera Boca del Río - Tacna',
    OFERTA_B,
  );
  console.log('  Oferta_B_Consorcio_Peruano_Sur.pdf   (NO CUMPLE: Residente 4.5 años < 8 exigidos)');

  console.log('\nTodos los PDFs en data/test-evaluador/real/');
}

main().catch((err) => { console.error(err); process.exit(1); });
