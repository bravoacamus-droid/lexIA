/**
 * Catálogo de cláusulas oficiales del Anexo (EETT/TDR) por tipo de objeto
 * contractual, basado en los modelos del SEACE y de la DGA (RM N° 001-2026-EF/54.01).
 *
 * Cada cláusula tiene:
 *   - id           identificador estable (slug) — usado en clauses[].id
 *   - label        nombre que se muestra al usuario en mayúsculas
 *   - placeholder  texto guía que aparece al activar la cláusula (HTML)
 *   - aiHint       guía técnica que se envía al prompt cuando el usuario
 *                  pide "mejorar con IA" — explica QUÉ debe contener
 *                  legalmente esa cláusula bajo la Ley 32069.
 *
 * En esta primera versión cubrimos BIEN. Servicio/Obra/Consultoría
 * tienen estructuras similares con ajustes específicos que agregaremos.
 */
export type ObjectoContractual =
  | 'bien'
  | 'servicio'
  | 'obra'
  | 'consultoria_obra';

export interface ClauseDefinition {
  id: string;
  label: string;
  placeholder: string;
  aiHint: string;
}

const COMMON_AI_PREAMBLE =
  'Bajo la Ley N° 32069 y su Reglamento DS N° 009-2025-EF, redacta esta cláusula en español jurídico formal, con citas normativas precisas. NO inventes números de opinión ni resolución que no estén en el contexto normativo provisto. Profesionaliza la información puntual del usuario sin cambiar su sentido.';

// ════════════════════════════════════════════════════════════════════
// CATÁLOGO PARA BIENES — replica el Anexo N° 01-B del SEACE
// ════════════════════════════════════════════════════════════════════
const CLAUSES_BIEN: ClauseDefinition[] = [
  {
    id: 'finalidad_publica',
    label: 'FINALIDAD PÚBLICA',
    placeholder:
      '<p><em>Detalla aquello que se busca satisfacer/mejorar/atender con la contratación, alineado al POI y al PEI de la Entidad. Ejemplo: contar con equipos de cómputo que permitan mejorar el procesamiento de información de las áreas administrativas, optimizando la atención a los administrados.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Explica qué se busca satisfacer, mejorar y/o atender con la contratación, vinculándolo al Plan Operativo Institucional (POI) y al Plan Estratégico Institucional (PEI) de la Entidad. 2-3 párrafos.`,
  },
  {
    id: 'objetivo_contratacion',
    label: 'OBJETIVO DE LA CONTRATACIÓN',
    placeholder:
      '<p><em>Detalla el propósito de la contratación: "qué quiero contratar" y "para qué quiero contratar". Ejemplo: Adquisición de computadoras personales para una atención eficiente del personal administrativo de la entidad.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Define en 1-2 párrafos el propósito de la contratación respondiendo "qué quiero contratar" y "para qué quiero contratar".`,
  },
  {
    id: 'caracteristicas_tecnicas',
    label: 'CARACTERÍSTICAS TÉCNICAS',
    placeholder:
      '<p><em>Indica las características o atributos técnicos del bien (dimensiones, material, composición, presentación, funcionalidades, rendimiento). NO uses marcas específicas salvo estandarización aprobada. Permite "o equivalente técnico".</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta las características técnicas en formato de lista con campos claros (Procesador, Memoria, etc. según corresponda). NUNCA exijas marca específica. Si el usuario menciona una marca, reformúlala en términos funcionales con "o equivalente técnico". Detecta y advierte direccionamiento al inicio si lo hay.`,
  },
  {
    id: 'reglamentos_tecnicos',
    label: 'REGLAMENTOS TÉCNICOS, NORMAS METROLÓGICAS Y/O SANITARIAS',
    placeholder:
      '<p><em>Lista las normas técnicas obligatorias (reglamentos, normas metrológicas y sanitarias vinculadas al bien). Normas técnicas voluntarias solo si: aseguran cumplimiento, hay certificadora en el mercado, se basan en normas internacionales y no contravienen las obligatorias.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Lista las normas técnicas obligatorias aplicables al bien con número y entidad emisora. Distingue las voluntarias y justifica su exigencia conforme a los criterios del Reglamento.`,
  },
  {
    id: 'acondicionamiento_montaje',
    label: 'ACONDICIONAMIENTO, MONTAJE O INSTALACIÓN',
    placeholder:
      '<p><em>Describe el lugar, procedimiento, equipos y personal para instalación o puesta en funcionamiento. Aplica para bienes tecnológicos, maquinaria, equipos. Incluye plazos y entregables relacionados.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Describe procedimiento de instalación/montaje detallando lugar, equipos requeridos, personal técnico, plazo de instalación y acta de puesta en funcionamiento.`,
  },
  {
    id: 'garantia_comercial',
    label: 'GARANTÍA COMERCIAL',
    placeholder:
      '<p><em>Alcance (defectos de diseño/fabricación, averías, pérdida total no por uso normal), condiciones (teléfono de atención, plazo de reposición), período (mínimo 1 año desde conformidad). El reemplazo debe ser de iguales características, gastos del contratista.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta los 3 bloques obligatorios de la garantía comercial: Alcance, Condiciones (horario, contacto, plazo de reposición ej. 5 días calendario), y Período (mínimo 1 año contado desde la conformidad). Incluye que el reemplazo debe ser de iguales o mejores características, con gastos del contratista.`,
  },
  {
    id: 'muestras',
    label: 'MUESTRAS',
    placeholder:
      '<p><em>De aplicar: número de muestras, oportunidad de presentación, aspecto a evaluar, forma y lugar de entrega, quién evalúa. Indicar si la aprobación de muestra inicia el cómputo del plazo contractual.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Define: cantidad de muestras a presentar, plazo de presentación (días calendario desde notificación), aspectos a evaluar (acabado, especificaciones), forma de entrega (mesa de partes), responsable de evaluación (área usuaria). Indica si la aprobación de muestra reinicia el cómputo del plazo contractual.`,
  },
  {
    id: 'prestaciones_accesorias',
    label: 'PRESTACIONES ACCESORIAS',
    placeholder:
      '<p><em>Mantenimiento preventivo/correctivo, soporte técnico, capacitación. Por cada una: características, programación, procedimiento, plazo y forma de pago separados de la prestación principal.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta cada prestación accesoria identificada (Mantenimiento preventivo/correctivo, Soporte técnico, Capacitación) con: tipo, características, periodicidad, alcance del servicio, plazo, modalidad presencial/virtual cuando aplique.`,
  },
  {
    id: 'requisitos_proveedor',
    label: 'REQUISITOS DEL PROVEEDOR',
    placeholder:
      '<p><em>RUC activo y habido, actividades en el objeto, RNP si supera 1 UIT, CCI vinculado al RUC, no impedimento (Art. 51 Ley 32069), correo electrónico para notificaciones.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Lista los requisitos formales obligatorios del proveedor: RUC activo y habido en SUNAT; realizar actividades del objeto contractual; RNP vigente si la contratación supera 1 UIT; CCI vinculado al RUC; sin impedimento del Art. 51 Ley 32069; correo electrónico para notificaciones durante la ejecución.`,
  },
  {
    id: 'lugar_plazo_ejecucion',
    label: 'LUGAR Y PLAZO DE EJECUCIÓN',
    placeholder:
      '<p><em>Lugar exacto de entrega (dirección, horarios, persona de contacto). Plazo en días calendario, hito de inicio (perfeccionamiento del contrato o notificación de orden de compra), cronograma de entregas si es suministro.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta el lugar (dirección completa con departamento/provincia/distrito + horario + responsable de almacén) y plazo (días calendario, hito de inicio claro: día siguiente a perfeccionamiento del contrato o notificación de orden de compra). Si es suministro, incluye tabla de cronograma de entregas.`,
  },
  {
    id: 'conformidad',
    label: 'CONFORMIDAD',
    placeholder:
      '<p><em>Órgano que brinda la conformidad (jefe de almacén / área usuaria). Plazo máximo: 7 días calendario desde recepción. Pruebas o ensayos para verificación si aplica.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Define quién emite la conformidad (área usuaria - cargo específico) y el plazo de 7 días calendario desde el día siguiente de recibido el bien. Si aplica pruebas/ensayos, describe procedimiento, parámetros de aceptación, responsable y costos.`,
  },
  {
    id: 'forma_pago',
    label: 'FORMA Y CONDICIONES DE PAGO',
    placeholder:
      '<p><em>Pago en soles, único o parcial, plazo máximo 10 días hábiles tras conformidad (prorrogable 5 días). Documentación requerida: conformidad, comprobante de pago sin enmendaduras, guía de remisión. Intereses legales por retraso (Art. 67.5 Ley 32069).</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta forma de pago (Pago único o parciales, según corresponda al sistema de entrega), moneda (SOLES), documentación requerida (conformidad + comprobante de pago sin enmendaduras + guía de remisión), plazo (10 días hábiles desde la conformidad, prorrogable 5 días). Incluye que ante retraso se aplican intereses legales conforme al numeral 67.5 Art. 67 Ley 32069.`,
  },
  {
    id: 'responsabilidad_proveedor',
    label: 'RESPONSABILIDAD DEL PROVEEDOR',
    placeholder:
      '<p><em>Responsabilidad por vicios ocultos (1 año desde conformidad, literal c numeral 69.2 Art. 69 Ley 32069 + numeral 144.9 Art. 144 Reglamento). Responde por calidad ofrecida y defectos no detectables en la recepción.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de responsabilidad citando literal c) numeral 69.2 Art. 69 Ley 32069 y numeral 144.9 Art. 144 Reglamento. El plazo de responsabilidad por vicios ocultos es 1 año desde la conformidad. El contratista responde por la calidad ofrecida y por defectos no detectables en la recepción.`,
  },
  {
    id: 'penalidades_mora',
    label: 'PENALIDADES POR MORA',
    placeholder:
      '<p><em>Aplicación automática por retraso injustificado. Fórmula: Penalidad diaria = (0.10 × Monto vigente) / (F × Plazo vigente), donde F = 0.40. Tope acumulado con otras penalidades: 10% del monto vigente.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de penalidad por mora con la fórmula oficial: Penalidad diaria = (0.10 × Monto vigente) / (F × Plazo vigente), F = 0.40. Aclara que se aplica automáticamente por cada día de retraso injustificado. La suma de penalidad por mora más otras penalidades no debe exceder 10% del monto vigente del contrato o ítem (Art. 164 Reglamento).`,
  },
  {
    id: 'otras_penalidades',
    label: 'OTRO TIPO DE PENALIDADES',
    placeholder:
      '<p><em>Tabla con: N°, Supuesto de aplicación, Forma de cálculo, Procedimiento/medios de verificación. Las penalidades deben ser objetivas, razonables, proporcionales y congruentes con el objeto (Art. 163 Reglamento).</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Genera una tabla markdown con columnas N° | Supuesto | Forma de cálculo | Procedimiento de verificación. Los supuestos deben ser objetivos, razonables y proporcionales al objeto. Incluye al menos 2-3 supuestos típicos como: incumplimiento de plazo de instalación, falta de presentación de mantenimiento preventivo en fecha programada.`,
  },
  {
    id: 'resolucion_contractual',
    label: 'RESOLUCIÓN CONTRACTUAL',
    placeholder:
      '<p><em>(La Entidad debe establecer las causales de resolución del contrato, así como el procedimiento del mismo)</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Lista las causales de resolución del Art. 165 Reglamento: caso fortuito o fuerza mayor; incumplimiento de obligaciones esenciales (numeral 165.3); hecho sobreviniente no imputable; incumplimiento cláusula anticorrupción; documentación falsa; terminación anticipada pactada; tope de penalidades alcanzado; incumplimiento no revertible. Describe el procedimiento: carta notarial de apercibimiento con plazo, luego carta notarial de resolución, ejecución de garantías cuando corresponda.`,
  },
  {
    id: 'sanciones',
    label: 'SANCIONES',
    placeholder:
      '<p><em>Procedimiento administrativo sancionador ante el Tribunal de Contrataciones Públicas conforme al Capítulo V Ley 32069 (Arts. 50-54): inhabilitación temporal (6 a 60 meses), inhabilitación definitiva, multa o apercibimiento.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de sanciones bajo el Capítulo V Ley 32069 (Arts. 50-54). Menciona las infracciones tipificadas aplicables al contratista (incumplimiento sustancial, presentación de documentación falsa, etc.) y las sanciones posibles: inhabilitación temporal 6-60 meses, inhabilitación definitiva, multa o apercibimiento. El Tribunal de Contrataciones Públicas es el competente.`,
  },
  {
    id: 'obligacion_anticorrupcion',
    label: 'OBLIGACIÓN ANTICORRUPCIÓN',
    placeholder:
      '<p><em>Declaración del contratista de no haber ofrecido beneficios ilegales, conducta proba durante y después de la vigencia, denuncia oportuna. Incumplimiento faculta a la Entidad a resolver. Aplica a accionistas, representantes legales, funcionarios.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula anticorrupción y antisoborno conforme al literal b) Art. 60 Ley 32069. Cubre: declaración de no haber ofrecido beneficios ilegales; obligación de conducta proba durante toda la ejecución y después en caso de controversias; abstención de regalos a funcionarios; obligación de denuncia; extensión a accionistas y representantes; consecuencia: derecho de la Entidad a resolver total o parcialmente el contrato.`,
  },
  {
    id: 'aplicacion_supletoria',
    label: 'APLICACIÓN SUPLETORIA',
    placeholder:
      '<p><em>En todo lo no previsto en el contrato, se aplica supletoriamente el TUO de la Ley N° 27444 (Procedimiento Administrativo General) y el Código Civil en lo pertinente, en concordancia con la Ley 32069 y su Reglamento.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de aplicación supletoria. La norma principal es la Ley 32069 y su Reglamento DS 009-2025-EF. Supletoriamente aplica el TUO de la Ley 27444 (Procedimiento Administrativo General, aprobado por DS 006-2026-JUS) y, en cuanto le sea aplicable, el Código Civil.`,
  },
  {
    id: 'medidas_seguridad',
    label: 'MEDIDAS DE SEGURIDAD EN LA PRESTACIÓN DEL SERVICIO',
    placeholder:
      '<p><em>SCTR (Ley 29783) si aplica al personal del contratista, protocolos de seguridad del personal de instalación/entrega, EPP, normas internas de la Entidad que debe cumplir.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta las medidas de seguridad obligatorias: Seguro Complementario de Trabajo de Riesgo (SCTR) conforme a Ley 29783 si aplica, equipos de protección personal del personal del contratista, cumplimiento de protocolos y normas internas de la Entidad durante las visitas de instalación o entrega.`,
  },
  {
    id: 'solucion_controversias',
    label: 'SOLUCIÓN DE CONTROVERSIAS',
    placeholder:
      '<p><em>Para contratos menores (≤ 8 UIT): conciliación obligatoria ante centro acreditado por MINJUS (numeral 81.3 Art. 81 Ley + numeral 330.1 Art. 330 Reglamento). Plazo de suspensión: 15 días hábiles. Para contratos mayores: conciliación o arbitraje.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de solución de controversias. Si la contratación es ≤ 8 UIT (S/ 42,800 con UIT 2025 = S/ 5,350) → conciliación obligatoria ante centro acreditado por MINJUS, numeral 81.3 Art. 81 Ley 32069 + numeral 330.1 Art. 330 Reglamento, plazo de suspensión 15 días hábiles. Si es mayor → mecanismos del Capítulo VI Ley 32069 (conciliación, arbitraje, Junta de Prevención y Resolución de Disputas según corresponda).`,
  },
  {
    id: 'otros',
    label: 'OTROS',
    placeholder:
      '<p><em>Cláusula libre para condiciones específicas del objeto contractual no contempladas en las cláusulas anteriores. Indica qué información va aquí.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Esta es una cláusula complementaria. Redacta lo que el usuario indique en sus notas, manteniendo coherencia con la Ley 32069 y el resto del documento.`,
  },
];

// ════════════════════════════════════════════════════════════════════
// CATÁLOGO PARA SERVICIOS — replica el Anexo N° 01-A del SEACE (TDR)
// 25 cláusulas oficiales basadas en el modelo del OECE.
// ════════════════════════════════════════════════════════════════════
const CLAUSES_SERVICIO: ClauseDefinition[] = [
  {
    id: 'finalidad_publica',
    label: 'FINALIDAD PÚBLICA',
    placeholder:
      '<p><em>Detalla qué se busca satisfacer/mejorar/atender con la contratación del servicio, vinculándolo al POI y al PEI de la Entidad.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Explica qué se busca satisfacer, mejorar y/o atender con la contratación del servicio, vinculándolo al Plan Operativo Institucional (POI) y al Plan Estratégico Institucional (PEI). 2-3 párrafos.`,
  },
  {
    id: 'objetivo_contratacion',
    label: 'OBJETIVO DE LA CONTRATACIÓN',
    placeholder:
      '<p><em>Detalla el propósito de la contratación: "qué quiero contratar" y "para qué quiero contratar". Ejemplo: Contratar el servicio de mantenimiento preventivo y correctivo del centro de cómputo para garantizar la continuidad operativa.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Define en 1-2 párrafos el propósito de la contratación del servicio respondiendo "qué quiero contratar" y "para qué quiero contratar".`,
  },
  {
    id: 'alcance_servicio',
    label: 'ALCANCE DEL SERVICIO',
    placeholder:
      '<p><em>Describe la descripción detallada del servicio, las actividades a desarrollar, la secuencia, los recursos humanos y materiales que utilizará el contratista. Si aplica plan de trabajo, indica contenido, plazo de entrega y plazo de aprobación de la Entidad.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta el alcance del servicio con sub-secciones: (a) Descripción del servicio, (b) Actividades a desarrollar numeradas con verbos precisos (elaborar, presentar, supervisar, etc.), (c) Plan de trabajo si aplica (contenido mínimo: metas, objetivos, recursos, cronograma, riesgos, plazo de entrega típicamente 10 días calendario y plazo de aprobación de la Entidad típicamente 3 días). Para servicios largos, incluye también sistema de entrega (Diseño de operación y mantenimiento / Gestión de instalaciones) cuando corresponda.`,
  },
  {
    id: 'requisitos_proveedor_consultor',
    label: 'REQUISITOS DEL PROVEEDOR / PERFIL DEL CONSULTOR',
    placeholder:
      '<p><em>Requisitos formales (RUC activo y habido, RNP si aplica, CCI, no impedimento Art. 51 Ley 32069). Perfil del personal clave: cargo, formación académica, experiencia mínima, capacitación específica. Personal NO clave si aplica.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta dos bloques: (1) Requisitos formales del proveedor: RUC activo y habido en SUNAT, realizar actividades del objeto, RNP vigente si supera 1 UIT, CCI vinculado al RUC, sin impedimento Art. 51 Ley 32069, correo electrónico para notificaciones. (2) Perfil del personal clave: por cada cargo describe formación académica (título profesional + colegiatura habilitada), experiencia mínima en años + en actividades específicas, capacitación específica (curso/diplomado, no más de 120 horas por materia). Si hay personal NO clave, descríbelo aparte.`,
  },
  {
    id: 'reglamentos_tecnicos',
    label: 'REGLAMENTOS TÉCNICOS, NORMAS METROLÓGICAS Y/O SANITARIAS',
    placeholder:
      '<p><em>Lista normas técnicas obligatorias vinculadas al servicio (reglamentos técnicos, normas metrológicas, sanitarias, ambientales). Normas técnicas voluntarias solo si: aseguran cumplimiento, hay certificadora en el mercado, se basan en normas internacionales y no contravienen las obligatorias.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Lista las normas técnicas obligatorias aplicables al servicio (reglamentos técnicos, metrológicas, sanitarias, ambientales) con número y entidad emisora. Distingue las voluntarias y justifica su exigencia conforme a los criterios del Reglamento.`,
  },
  {
    id: 'seguros',
    label: 'SEGUROS',
    placeholder:
      '<p><em>SCTR (Ley 29783) obligatorio cuando aplica al personal del contratista. Otros seguros según naturaleza del servicio: responsabilidad civil, accidentes personales, deshonestidad. Indicar tipo, cobertura, plazo, monto y fecha de presentación.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta cláusula de seguros. SCTR (Seguro Complementario de Trabajo de Riesgo) Salud + Pensión conforme a Ley 29783 cuando el personal realice actividades de riesgo. Otros seguros que pueden exigirse: responsabilidad civil, accidentes personales, deshonestidad. Por cada seguro detalla: tipo, cobertura, plazo, monto mínimo, oportunidad de presentación (suscripción del contrato o inicio de la prestación), consecuencia del incumplimiento.`,
  },
  {
    id: 'prestaciones_accesorias',
    label: 'PRESTACIONES ACCESORIAS',
    placeholder:
      '<p><em>Mantenimiento preventivo/correctivo, soporte técnico, capacitación. Por cada una: características, programación, procedimiento, plazo y forma de pago separados de la prestación principal.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta cada prestación accesoria identificada (Mantenimiento preventivo/correctivo, Soporte técnico, Capacitación virtual o presencial) con: tipo, características, periodicidad, alcance del servicio, plazo, forma de pago separada de la principal. Para capacitación incluye número de horas, modalidad, certificación a otorgar.`,
  },
  {
    id: 'lugar_plazo_ejecucion',
    label: 'LUGAR Y PLAZO DE EJECUCIÓN',
    placeholder:
      '<p><em>Lugar exacto de prestación (dirección, distrito, provincia, región). Plazo en días calendario, hito de inicio (perfeccionamiento del contrato o notificación de orden de servicio), prestaciones accesorias con plazo separado.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta: (1) Lugar de prestación: dirección completa con distrito/provincia/región, o "instalaciones del contratista" si aplica. (2) Plazo de ejecución contractual: días calendario, hito de inicio (día siguiente a perfeccionamiento del contrato o notificación de orden de servicio). Si hay periodo de implementación previo, descríbelo aparte. Si hay prestaciones accesorias con plazo distinto, sepáralo claramente.`,
  },
  {
    id: 'entregables',
    label: 'ENTREGABLES',
    placeholder:
      '<p><em>Tabla con: N° de entregable, plazo, contenido, medio de entrega. Para servicios continuos: informes mensuales dentro de los primeros 5 días hábiles del mes siguiente. Para servicios únicos: 1 entregable al cierre.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Genera tabla markdown con columnas: N° | Plazo | Contenido | Medio de entrega. Para servicios de plazo largo (mensuales/trimestrales) describe entregables periódicos. Para servicios únicos describe un entregable final con su contenido detallado. Medio de entrega típico: Mesa de Partes virtual de la Entidad + correo electrónico oficial.`,
  },
  {
    id: 'conformidad',
    label: 'CONFORMIDAD',
    placeholder:
      '<p><em>Órgano que emite la conformidad (jefe del área usuaria). Plazo máximo: 7 días calendario desde recepción del entregable. Si aplica a prestaciones accesorias, conformidad por separado.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Define quién emite la conformidad (área usuaria - cargo específico) y el plazo máximo de 7 días calendario desde el día siguiente de recibido el entregable o culminado el servicio. Si corresponde, indica conformidad de prestaciones accesorias por separado.`,
  },
  {
    id: 'forma_pago',
    label: 'FORMA Y CONDICIONES DE PAGO',
    placeholder:
      '<p><em>Pago en soles, único o parcial (mensual/por entregable), plazo máximo 10 días hábiles tras conformidad (prorrogable 5 días). Documentación: conformidad, comprobante de pago, otros según naturaleza. Intereses legales por retraso (Art. 67.5 Ley 32069).</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta: moneda (SOLES), forma de pago (pago único, parcial mensual, por entregable, por tarifa, en base a porcentaje, honorario fijo + comisión de éxito, pago por consumo, según corresponda al servicio), documentación requerida (conformidad del área usuaria + comprobante de pago sin enmendaduras + otra según naturaleza), plazo 10 días hábiles desde la conformidad prorrogable 5 días con justificación. Incluye intereses legales por retraso conforme al numeral 67.5 Art. 67 Ley 32069.`,
  },
  {
    id: 'confidencialidad',
    label: 'CONFIDENCIALIDAD',
    placeholder:
      '<p><em>Obligación de reserva sobre toda información de la Entidad. Uso exclusivo para ejecución del contrato. Prohibición de divulgar, transferir o reproducir. Extensión a personal, técnicos, subcontratistas. Devolución/eliminación al término. Subsistencia tras culminado el contrato.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de confidencialidad: el contratista guarda estricta reserva sobre información técnica, administrativa, operativa, legal, financiera y de cualquier otra índole de la Entidad. Lista qué se considera confidencial (información técnica, documentación administrativa, datos personales, información en cualquier soporte). Compromisos: uso exclusivo para el contrato, no divulgar/transferir/reproducir sin autorización, adoptar medidas de seguridad, extender obligación a personal y subcontratistas con responsabilidad solidaria, devolver/eliminar al final, subsistencia después de la relación contractual mientras la información conserve su carácter confidencial.`,
  },
  {
    id: 'responsabilidad_proveedor',
    label: 'RESPONSABILIDAD DEL PROVEEDOR',
    placeholder:
      '<p><em>Responsabilidad por la calidad del servicio prestado y por vicios ocultos (1 año desde conformidad, literal c numeral 69.2 Art. 69 Ley 32069 + numeral 144.9 Art. 144 Reglamento).</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la responsabilidad del proveedor citando literal c) numeral 69.2 Art. 69 Ley 32069 y numeral 144.9 Art. 144 Reglamento. El plazo de responsabilidad por vicios ocultos es 1 año desde la conformidad. El contratista responde por la calidad del servicio prestado y por defectos no detectables al momento de la conformidad.`,
  },
  {
    id: 'responsabilidad_asignacion_bienes',
    label: 'RESPONSABILIDAD POR LA ASIGNACIÓN DE BIENES',
    placeholder:
      '<p><em>Cuando la Entidad asigna bienes al contratista (equipos, ambientes, herramientas): el contratista los recibe en acta, los usa exclusivamente para el contrato, mantiene en buen estado, los devuelve al cierre. Responde por daños o pérdidas atribuibles.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la responsabilidad por bienes que la Entidad asigna al contratista (equipos, mobiliario, vehículos, ambientes, herramientas). Cubre: recepción en acta detallada con estado de los bienes; uso exclusivo para la prestación; obligación de conservación y mantenimiento; restitución al término del contrato con acta de devolución; responsabilidad por daños o pérdidas atribuibles al contratista o su personal; obligación de contratar seguro si el valor lo amerita.`,
  },
  {
    id: 'consideraciones_generales_productos',
    label: 'CONSIDERACIONES GENERALES A LOS PRODUCTOS',
    placeholder:
      '<p><em>Propiedad intelectual: todo producto generado (informes, manuales, configuraciones, software, esquemas) es de propiedad exclusiva de la Entidad. El contratista cede en forma definitiva, exclusiva e ilimitada los derechos patrimoniales. Cesión no limita derechos morales cuando aplique.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta cláusula de propiedad intelectual sobre los productos del servicio. Toda documentación, informes, registros técnicos, configuraciones, manuales, esquemas, reportes, archivos digitales, software u otros materiales generados como resultado del servicio son propiedad exclusiva de la Entidad. El contratista cede en forma definitiva, exclusiva, ilimitada y a título gratuito los derechos patrimoniales. La Entidad puede utilizarlos, reproducirlos, modificarlos o disponer de ellos sin restricción. La cesión no limita el reconocimiento de los derechos morales que correspondan conforme a ley.`,
  },
  {
    id: 'gastos_desplazamiento',
    label: 'GASTOS POR DESPLAZAMIENTO',
    placeholder:
      '<p><em>Cuando el servicio implica viajes: lugares de desplazamiento, frecuencia, quién asume los costos (incluidos en la oferta o reembolso por la Entidad con sustento). Si la Entidad asume, indica límites (UIT u otros) y procedimiento de liquidación.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta cláusula de gastos por desplazamiento cuando el servicio implica viajes del personal del contratista. Define: lugares de desplazamiento previsibles, frecuencia, modalidad (incluidos en la oferta sin reembolso adicional o reembolsables con sustento documental hasta cierto monto). Si son reembolsables: límite por viaje, conceptos cubiertos (pasajes, hospedaje, viáticos), procedimiento de liquidación, tope mensual/anual. Si no hay viajes, indicar "No aplica".`,
  },
  {
    id: 'penalidades_mora',
    label: 'PENALIDADES POR MORA',
    placeholder:
      '<p><em>Aplicación automática por retraso injustificado. Fórmula: Penalidad diaria = (0.10 × Monto vigente) / (F × Plazo vigente), donde F = 0.40. Tope acumulado con otras penalidades: 10% del monto vigente.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de penalidad por mora con la fórmula oficial: Penalidad diaria = (0.10 × Monto vigente) / (F × Plazo vigente), F = 0.40. Aclara que se aplica automáticamente por cada día de retraso injustificado. La suma de penalidad por mora más otras penalidades no debe exceder 10% del monto vigente del contrato o ítem (Art. 164 Reglamento).`,
  },
  {
    id: 'otras_penalidades',
    label: 'OTRO TIPO DE PENALIDADES',
    placeholder:
      '<p><em>Tabla con: N°, Supuesto de aplicación, Forma de cálculo, Procedimiento/medios de verificación. Las penalidades deben ser objetivas, razonables, proporcionales y congruentes con el objeto (Art. 163 Reglamento).</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Genera una tabla markdown con columnas N° | Supuesto | Forma de cálculo | Procedimiento de verificación. Los supuestos deben ser objetivos, razonables y proporcionales al objeto del servicio. Incluye al menos 3 supuestos típicos como: incumplimiento de entrega de informe periódico, ausencia injustificada del personal clave, incumplimiento de SCTR o protocolos de seguridad.`,
  },
  {
    id: 'resolucion_contractual',
    label: 'RESOLUCIÓN CONTRACTUAL',
    placeholder:
      '<p><em>(La Entidad debe establecer las causales de resolución del contrato, así como el procedimiento del mismo)</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Lista las causales de resolución del Art. 165 Reglamento: caso fortuito o fuerza mayor; incumplimiento de obligaciones esenciales (numeral 165.3); hecho sobreviniente no imputable; incumplimiento cláusula anticorrupción; documentación falsa; terminación anticipada pactada; tope de penalidades alcanzado; incumplimiento no revertible. Describe el procedimiento: carta notarial de apercibimiento con plazo, luego carta notarial de resolución, ejecución de garantías cuando corresponda.`,
  },
  {
    id: 'sanciones',
    label: 'SANCIONES',
    placeholder:
      '<p><em>Procedimiento administrativo sancionador ante el Tribunal de Contrataciones Públicas conforme al Capítulo V Ley 32069 (Arts. 50-54): inhabilitación temporal (6 a 60 meses), inhabilitación definitiva, multa o apercibimiento.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de sanciones bajo el Capítulo V Ley 32069 (Arts. 50-54). Menciona las infracciones tipificadas aplicables al contratista (incumplimiento sustancial, presentación de documentación falsa, etc.) y las sanciones posibles: inhabilitación temporal 6-60 meses, inhabilitación definitiva, multa o apercibimiento. El Tribunal de Contrataciones Públicas es el competente.`,
  },
  {
    id: 'obligacion_anticorrupcion',
    label: 'OBLIGACIÓN ANTICORRUPCIÓN',
    placeholder:
      '<p><em>Declaración del contratista de no haber ofrecido beneficios ilegales, conducta proba durante y después de la vigencia, denuncia oportuna. Incumplimiento faculta a la Entidad a resolver. Aplica a accionistas, representantes legales, funcionarios.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula anticorrupción y antisoborno conforme al literal b) Art. 60 Ley 32069. Cubre: declaración de no haber ofrecido beneficios ilegales; obligación de conducta proba durante toda la ejecución y después en caso de controversias; abstención de regalos a funcionarios; obligación de denuncia; extensión a accionistas y representantes; consecuencia: derecho de la Entidad a resolver total o parcialmente el contrato.`,
  },
  {
    id: 'aplicacion_supletoria',
    label: 'APLICACIÓN SUPLETORIA',
    placeholder:
      '<p><em>En todo lo no previsto en el contrato, se aplica supletoriamente el TUO de la Ley N° 27444 (Procedimiento Administrativo General) y el Código Civil en lo pertinente, en concordancia con la Ley 32069 y su Reglamento.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de aplicación supletoria. La norma principal es la Ley 32069 y su Reglamento DS 009-2025-EF. Supletoriamente aplica el TUO de la Ley 27444 (Procedimiento Administrativo General, aprobado por DS 006-2026-JUS) y, en cuanto le sea aplicable, el Código Civil.`,
  },
  {
    id: 'medidas_seguridad',
    label: 'MEDIDAS DE SEGURIDAD EN LA PRESTACIÓN DEL SERVICIO',
    placeholder:
      '<p><em>SCTR (Ley 29783) si aplica al personal del contratista, protocolos de seguridad y salud ocupacional, equipos de protección personal (EPP), normas internas de la Entidad que debe cumplir.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta las medidas de seguridad obligatorias durante la prestación del servicio: SCTR conforme a Ley 29783 si aplica al personal expuesto a riesgo, equipos de protección personal (EPP) según naturaleza del servicio, protocolos de seguridad y salud ocupacional, cumplimiento de normas internas de la Entidad (ingreso, identificación, áreas restringidas), capacitación previa del personal en protocolos de seguridad, comunicación inmediata de incidentes.`,
  },
  {
    id: 'solucion_controversias',
    label: 'SOLUCIÓN DE CONTROVERSIAS',
    placeholder:
      '<p><em>Para contratos menores (≤ 8 UIT): conciliación obligatoria ante centro acreditado por MINJUS (numeral 81.3 Art. 81 Ley + numeral 330.1 Art. 330 Reglamento). Plazo de suspensión: 15 días hábiles. Para contratos mayores: conciliación, arbitraje, JPRD según corresponda (Capítulo VI Ley 32069).</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Redacta la cláusula de solución de controversias. Si la contratación es ≤ 8 UIT (S/ 42,800 con UIT 2025 = S/ 5,350) → conciliación obligatoria ante centro acreditado por MINJUS, numeral 81.3 Art. 81 Ley 32069 + numeral 330.1 Art. 330 Reglamento, plazo de suspensión 15 días hábiles. Si es mayor → mecanismos del Capítulo VI Ley 32069 (conciliación previa, arbitraje, Junta de Prevención y Resolución de Disputas según corresponda).`,
  },
  {
    id: 'otros',
    label: 'OTROS',
    placeholder:
      '<p><em>Cláusula libre para condiciones específicas del servicio no contempladas en las cláusulas anteriores. Indica qué información va aquí.</em></p>',
    aiHint:
      `${COMMON_AI_PREAMBLE} Esta es una cláusula complementaria. Redacta lo que el usuario indique en sus notas, manteniendo coherencia con la Ley 32069 y el resto del documento.`,
  },
];

// ════════════════════════════════════════════════════════════════════
// OBRA — usa la MISMA estructura que SERVICIO pero la IA debe responder
// con el contexto de ejecución física de obra (Residente, metrados,
// valorizaciones, Cuaderno de Obra, recepción, etc.)
// ════════════════════════════════════════════════════════════════════
const OBRA_AI_HINTS: Record<string, string> = {
  finalidad_publica: `${COMMON_AI_PREAMBLE} Explica qué se busca satisfacer/mejorar/atender con la EJECUCIÓN DE LA OBRA, vinculándolo al POI y al PEI. Enfatiza el impacto social/territorial de la obra (mejorar transitabilidad, ampliar servicio educativo, garantizar seguridad estructural, etc.). 2-3 párrafos.`,
  objetivo_contratacion: `${COMMON_AI_PREAMBLE} Define en 1-2 párrafos el propósito de la EJECUCIÓN DE LA OBRA respondiendo "qué obra quiero ejecutar" y "para qué quiero ejecutarla". Menciona la denominación oficial de la obra del expediente técnico aprobado.`,
  alcance_servicio: `${COMMON_AI_PREAMBLE} Redacta el alcance de la EJECUCIÓN DE LA OBRA con sub-secciones: (a) Descripción general de la obra (componentes, partidas principales del expediente técnico aprobado), (b) Modalidad de ejecución (Suma alzada / Precios unitarios / Esquema mixto / Costo reembolsable según el Art. 32 Reglamento), (c) Sistema de entrega (Solo construcción / Diseño y construcción / Diseño-construcción-operación-mantenimiento / Gestión del diseño y construcción al riesgo o de agencia / Entrega integrada de proyecto), (d) Alcance del expediente técnico aprobado (referencia al Código Único de Inversión CUI, resolución de aprobación), (e) Componentes principales y partidas valorizadas más relevantes.`,
  requisitos_proveedor_consultor: `${COMMON_AI_PREAMBLE} Redacta dos bloques: (1) Requisitos formales del contratista de obra: RUC activo y habido, RNP vigente como Ejecutor de Obras con CMC suficiente, no impedimento Art. 51 Ley 32069. (2) Personal clave para ejecución de obra: **Residente de Obra** (Ingeniero Civil/Arquitecto colegiado y habilitado, experiencia mínima en obras similares, sustentada con contratos y conformidades), **Especialistas** según naturaleza (estructural, eléctrico, sanitario, mecánico), **Maestro General** o capataces con experiencia en obras similares. Define para cada uno: formación académica, experiencia mínima en años y montos ejecutados de obras similares, dedicación (parcial/completa), permanencia obligatoria.`,
  reglamentos_tecnicos: `${COMMON_AI_PREAMBLE} Lista las normas técnicas obligatorias aplicables a la EJECUCIÓN DE LA OBRA: Reglamento Nacional de Edificaciones (RNE) con las normas E aplicables (E.020 Cargas, E.030 Sismorresistente, E.050 Suelos y cimentaciones, E.060 Concreto armado, E.070 Albañilería, etc. según corresponda), Reglamento Nacional de Tránsito si aplica, normas de seguridad e higiene Ley 29783, normas ambientales del SENACE/ANA cuando aplique. Para obras viales: Manual de Carreteras MTC.`,
  seguros: `${COMMON_AI_PREAMBLE} Redacta cláusula de seguros para OBRA. Obligatorios: **SCTR** (Salud + Pensión, Ley 29783) para todo el personal de obra, vigente toda la ejecución; **CAR** (Construction All Risks) con cobertura sobre el total del valor de la obra, vigente desde la entrega del terreno hasta la recepción; **Seguro de Responsabilidad Civil** contra terceros (mínimo equivalente a un % del valor referencial). Por cada seguro detalla: tipo, cobertura, plazo, monto mínimo, oportunidad de presentación (antes de la entrega del terreno), consecuencia del incumplimiento. Para obras viales incluir SOAT en vehículos del contratista.`,
  prestaciones_accesorias: `${COMMON_AI_PREAMBLE} Para OBRA, prestaciones accesorias típicas son: **Mantenimiento por garantía de obra** durante el período de responsabilidad técnica, **Capacitación al personal de la Entidad** sobre operación y mantenimiento de equipos instalados, **Asistencia técnica post-recepción** para puesta en operación. Describe cada una con periodicidad, alcance, plazo y forma de pago separados.`,
  lugar_plazo_ejecucion: `${COMMON_AI_PREAMBLE} Redacta: (1) Lugar de ejecución: ubicación geográfica completa (distrito/provincia/región), coordenadas si aplican, acceso, referencias de campo. (2) Plazo de ejecución: días calendario desde el hito de inicio. El hito de inicio típico para obras es el cumplimiento de TODAS estas condiciones (Art. del Reglamento aplicable): designación del Inspector o Supervisor, entrega del terreno, entrega del expediente técnico al contratista, entrega del calendario de avance valorizado adelantado por el contratista, entrega del adelanto directo si fue solicitado. Indica también si se acepta fast track (solo cuando sistema de entrega es diseño y construcción).`,
  entregables: `${COMMON_AI_PREAMBLE} Para OBRA, los entregables típicos son **mensuales y al cierre**. Genera tabla markdown con: N° | Plazo | Contenido | Medio de entrega. Entregables periódicos: Valorización mensual de obra (formato aprobado), Informe mensual del Residente con avance físico-financiero, Cuaderno de Obra actualizado, Cuaderno de Incidencias. Entregables finales: Acta de Recepción de Obra, Planos as built, Manuales de operación y mantenimiento de equipos instalados, Expediente de Construcción completo, Pruebas de funcionamiento, Liquidación del contrato de obra. Plazo típico mensual: primeros 5 días hábiles del mes siguiente.`,
  conformidad: `${COMMON_AI_PREAMBLE} Para OBRA, la conformidad final tiene proceso especial: **Comité de Recepción de Obra** (designado por la Entidad: Inspector/Supervisor + 1 representante del área usuaria + 1 representante de la unidad de inversiones). Procedimiento: solicitud del contratista al concluir → comité inspecciona → suscribe **Acta de Recepción** (si no hay observaciones) o **Acta de Observaciones** (si las hay) con plazo de subsanación. Plazo máximo del comité para emitir conformidad: 7 días calendario desde recepción de la solicitud. Para valorizaciones mensuales, conformidad del Inspector/Supervisor con plazo de 7 días calendario.`,
  forma_pago: `${COMMON_AI_PREAMBLE} Para OBRA: pago por valorizaciones mensuales en base al avance físico real ejecutado, en moneda nacional (SOLES), según modalidad de pago (suma alzada o precios unitarios). Documentación para cada pago: valorización aprobada por el Inspector/Supervisor + planilla de metrados + comprobante de pago + reporte fotográfico + Cuaderno de Obra. Plazo de pago: 10 días hábiles desde la conformidad de la valorización por el Inspector/Supervisor (prorrogable 5 días). **Adelanto directo**: hasta 10% del monto del contrato original (Art. 67 Ley 32069), entregable contra carta fianza por el monto del adelanto. **Adelanto para materiales e insumos**: hasta 20% del contrato, contra carta fianza, según calendario de adquisiciones. Intereses legales por retraso (Art. 67.5 Ley 32069).`,
  confidencialidad: `${COMMON_AI_PREAMBLE} Redacta la cláusula de confidencialidad para OBRA. El contratista guarda reserva sobre: información técnica del expediente técnico, planos confidenciales (instalaciones críticas), datos del proyecto, información administrativa y financiera del contrato. Compromisos: uso exclusivo para la ejecución, no divulgar/transferir/reproducir sin autorización, extensión a personal, subcontratistas, proveedores y suministradores con responsabilidad solidaria. Subsistencia tras culminado el contrato mientras la información conserve su carácter confidencial.`,
  responsabilidad_proveedor: `${COMMON_AI_PREAMBLE} Para OBRA: responsabilidad del contratista por la calidad de la obra ejecutada y por vicios ocultos. Para obras hay régimen especial: **5 años desde la recepción de la obra** (responsabilidad estructural/civil conforme al Código Civil y al Art. 1784 cuando aplique) — esto es más largo que el régimen general de 1 año del literal c) numeral 69.2 Art. 69 Ley 32069. La responsabilidad incluye los servicios profesionales del Residente y especialistas. El contratista responde también por los subcontratistas y proveedores que utilice.`,
  responsabilidad_asignacion_bienes: `${COMMON_AI_PREAMBLE} Para OBRA, los bienes que la Entidad puede asignar al contratista incluyen: el TERRENO de la obra (entregado mediante acta), expediente técnico (planos, especificaciones, presupuesto), planos as-built de obras existentes en el área, instalaciones provisionales del proyecto si existen, materiales de obra que la Entidad haya adquirido previamente. El contratista recibe en acta detallada, los conserva, los usa exclusivamente para la obra contratada, los devuelve al cierre o los integra a la obra entregada. Responde por daños o pérdidas atribuibles a su gestión.`,
  consideraciones_generales_productos: `${COMMON_AI_PREAMBLE} Para OBRA, los "productos" finales que pertenecen a la Entidad incluyen: la propia obra construida, planos as built, expediente de construcción, manuales de operación y mantenimiento, certificados de calidad y pruebas (compactación, resistencia, hermeticidad), garantías comerciales de equipos instalados, claves de software de equipos automatizados si aplica. El contratista cede en forma definitiva, exclusiva, ilimitada y a título gratuito los derechos patrimoniales sobre TODOS estos productos. La Entidad puede utilizarlos sin restricción para mantenimiento, ampliaciones futuras, futuros procedimientos.`,
  gastos_desplazamiento: `${COMMON_AI_PREAMBLE} Para OBRA, los gastos por desplazamiento típicamente están INCLUIDOS en los gastos generales de la oferta y no son reembolsables. Sin embargo, en obras de gran extensión o en zonas alejadas, la Entidad puede establecer reembolso de viajes específicos del Residente/especialistas a la sede de la Entidad para reuniones de coordinación obligatorias, con tope mensual y procedimiento de liquidación con sustento documental. Si no aplica, indicar "Los gastos por desplazamiento están incluidos en los gastos generales de la oferta del contratista".`,
  penalidades_mora: `${COMMON_AI_PREAMBLE} Para OBRA, la fórmula es la misma (Penalidad diaria = 0.10 × Monto vigente / (F × Plazo vigente), F = 0.40) y aplica automáticamente por retraso injustificado en la culminación del plazo contractual. Tope acumulado con otras penalidades: 10% del monto vigente del contrato (Art. 164 Reglamento). Para obras también aplica penalidad por retraso en la presentación de valorización mensual o levantamiento de observaciones, según se establezca en "OTRO TIPO DE PENALIDADES".`,
  otras_penalidades: `${COMMON_AI_PREAMBLE} Para OBRA, genera tabla markdown con: N° | Supuesto | Forma de cálculo | Procedimiento. Incluye al menos 5-7 supuestos típicos de obra: (1) Ausencia del Residente de Obra (descuento por día), (2) Ausencia de especialista en visita programada, (3) Retraso en presentación de valorización mensual, (4) No subsanar observaciones en plazo, (5) Incumplimiento de medidas de seguridad o SCTR (multa por evento), (6) No mantener Cuaderno de Obra actualizado, (7) Retraso en presentación de planos as built. Las penalidades deben ser objetivas, razonables y proporcionales al objeto.`,
  resolucion_contractual: `${COMMON_AI_PREAMBLE} Para OBRA, lista las causales de resolución del Art. 165 Reglamento + las específicas de obras: paralización injustificada de la obra por X días, deficiencias técnicas graves no subsanables, incumplimiento de cronograma valorizado superior al X%, ausencia prolongada del Residente. Describe procedimiento: carta notarial de apercibimiento con plazo de subsanación (típicamente 5-15 días según gravedad), acta de constatación in situ si aplica, luego carta notarial de resolución, ejecución de la garantía de fiel cumplimiento, inicio de procedimiento sancionador ante Tribunal de Contrataciones Públicas.`,
  sanciones: `${COMMON_AI_PREAMBLE} Para OBRA, redacta cláusula de sanciones bajo el Capítulo V Ley 32069 (Arts. 50-54). Para obras hay infracciones tipificadas con mayor gravedad: incumplimiento sustancial de plazo, abandono de obra, deficiencias técnicas estructurales graves, presentación de documentación falsa sobre experiencia del personal o del postor. Sanciones: inhabilitación temporal 6-60 meses, inhabilitación definitiva en casos de reincidencia o gravedad, multa, apercibimiento. Tribunal de Contrataciones Públicas competente.`,
  obligacion_anticorrupcion: `${COMMON_AI_PREAMBLE} Redacta la cláusula anticorrupción y antisoborno conforme al literal b) Art. 60 Ley 32069. Para OBRA, énfasis adicional en: no haber ofrecido beneficios a funcionarios del área usuaria, área técnica, inspectores, supervisores o cualquier interviniente en la fase de ejecución y recepción. Extensión a subcontratistas y proveedores. Consecuencia: derecho de la Entidad a resolver total o parcialmente.`,
  aplicacion_supletoria: `${COMMON_AI_PREAMBLE} Redacta la cláusula de aplicación supletoria. La norma principal es la Ley 32069 y su Reglamento DS 009-2025-EF. Para OBRA aplican adicionalmente: Reglamento Nacional de Edificaciones (RNE), normas técnicas específicas según naturaleza de la obra (vial: Manual de Carreteras MTC; hidráulica: Reglamento Nacional de Hidráulica), TUO de la Ley 27444 (Procedimiento Administrativo General, DS 006-2026-JUS), Código Civil en lo pertinente.`,
  medidas_seguridad: `${COMMON_AI_PREAMBLE} Para OBRA, redacta medidas de seguridad obligatorias durante la ejecución: SCTR vigente Ley 29783, **Plan de Seguridad y Salud Ocupacional** específico de la obra aprobado por la Entidad, **charlas diarias de 5 minutos** antes del inicio de jornada, **equipos de protección personal (EPP)** completos para todo el personal (casco, lentes, guantes, calzado, arnés cuando aplique), señalización de obra y barreras de protección al público, mantenimiento de vías de evacuación, capacitación previa del personal, comunicación inmediata de incidentes a la Entidad. Para obras públicas con afectación al tránsito: plan de desvíos aprobado por autoridad de tránsito.`,
  solucion_controversias: `${COMMON_AI_PREAMBLE} Para OBRA, redacta solución de controversias. Si ≤ 8 UIT: conciliación obligatoria ante centro acreditado por MINJUS (numeral 81.3 Art. 81 + numeral 330.1 Art. 330 Reglamento, plazo de suspensión 15 días hábiles). Si > 8 UIT: mecanismos del Capítulo VI Ley 32069. Para obras grandes (típicamente sobre cierto monto) puede establecerse **Junta de Prevención y Resolución de Disputas (JPRD)** con conformación y reglamento conforme a la Directiva de la DGA. La JPRD interviene durante la ejecución para resolver controversias en línea sin paralizar la obra. Si las partes no se someten a JPRD, aplica arbitraje conforme al Capítulo VI.`,
  otros: `${COMMON_AI_PREAMBLE} Esta es una cláusula complementaria para OBRA. Redacta lo que el usuario indique en sus notas, manteniendo coherencia con la Ley 32069, el RNE y el resto del documento.`,
};

// ════════════════════════════════════════════════════════════════════
// CONSULTORÍA DE OBRA — usa la MISMA estructura que SERVICIO pero la IA
// debe responder con el contexto de estudios, expediente técnico,
// supervisión, Jefe de Proyecto, especialistas, informes técnicos.
// ════════════════════════════════════════════════════════════════════
const CONSULTORIA_OBRA_AI_HINTS: Record<string, string> = {
  finalidad_publica: `${COMMON_AI_PREAMBLE} Explica qué se busca lograr con la CONSULTORÍA DE OBRA contratada. Si es **elaboración de expediente técnico**: tener un instrumento técnico debidamente aprobado para ejecutar la obra X en el plazo y con la calidad esperada. Si es **supervisión de obra**: garantizar que la obra X se ejecute conforme al expediente, en los plazos pactados y con la calidad exigida. Vincúlalo al POI y PEI. 2-3 párrafos.`,
  objetivo_contratacion: `${COMMON_AI_PREAMBLE} Define en 1-2 párrafos el propósito de la CONSULTORÍA DE OBRA respondiendo "qué consultoría quiero contratar" (elaboración de estudio definitivo / expediente técnico / supervisión de obra) y "para qué". Menciona la denominación oficial del proyecto y el Código Único de Inversión (CUI) cuando aplique.`,
  alcance_servicio: `${COMMON_AI_PREAMBLE} Redacta el alcance de la CONSULTORÍA DE OBRA con sub-secciones: (a) Descripción de la consultoría (elaboración de expediente técnico / supervisión de obra / formulación y diseño / solo formulación / solo diseño según sistema de entrega del Art. del Reglamento), (b) Estudios básicos requeridos cuando aplique (topografía, mecánica de suelos, estudio sísmico, impacto ambiental, hidrología, tránsito según naturaleza del proyecto), (c) Productos a elaborar (memoria descriptiva, planos, especificaciones técnicas, presupuesto valorizado, programación, análisis de precios unitarios, fórmulas polinómicas), (d) Etapas y metodología propuesta, (e) Para supervisión: organización del equipo de supervisión, frecuencia de visitas, procedimiento de aprobación de valorizaciones del contratista.`,
  requisitos_proveedor_consultor: `${COMMON_AI_PREAMBLE} Redacta dos bloques: (1) Requisitos formales del consultor: RUC activo y habido, RNP vigente como Consultor de Obras con especialidades correspondientes al proyecto, no impedimento Art. 51 Ley 32069. (2) Personal clave: **Jefe de Proyecto** (Ingeniero/Arquitecto colegiado y habilitado, experiencia mínima en consultorías similares acreditada con contratos y conformidades), **Especialistas** según el tipo de obra (estructural, eléctrico, sanitario, vial, hidráulico, geotécnico, ambiental). Por cada uno define: formación académica (título profesional + colegiatura habilitada), experiencia mínima en años + en estudios o supervisiones similares, capacitación específica relevante, dedicación, permanencia obligatoria.`,
  reglamentos_tecnicos: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, lista las normas técnicas obligatorias aplicables al estudio o supervisión: Reglamento Nacional de Edificaciones (RNE) con las normas E aplicables, Términos de Referencia oficiales por tipo de proyecto (Invierte.pe, Manual de Carreteras MTC para viales, Reglamento Nacional de Hidráulica para hidráulicas), Reglamento del SNIP/Invierte.pe cuando aplique al ciclo de inversiones. Normas voluntarias certificables (ISO 14001, ISO 45001) cuando ameriten.`,
  seguros: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, los seguros típicos son: **SCTR** (Salud + Pensión, Ley 29783) para el personal que realice visitas de campo o trabajos en zonas de riesgo, **Seguro de Responsabilidad Civil Profesional** del consultor contra errores u omisiones en el estudio o supervisión, vigente durante la consultoría y por un período posterior (típicamente 12 meses), con cobertura mínima según el valor de la consultoría. Detalla cobertura, plazo, monto, oportunidad de presentación, consecuencia del incumplimiento.`,
  prestaciones_accesorias: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, prestaciones accesorias típicas son: **Visitas de campo adicionales** a las previstas inicialmente cuando lo requiera la entidad, **Complementación o levantamiento de observaciones** post-aprobación del estudio, **Asistencia técnica** durante la fase inicial de la ejecución de la obra (típicamente primeros 30-60 días), **Capacitación** al personal técnico de la Entidad sobre el contenido del estudio. Describe cada una con alcance, plazo y forma de pago separados.`,
  lugar_plazo_ejecucion: `${COMMON_AI_PREAMBLE} Redacta: (1) Lugar de prestación: oficina del consultor para el desarrollo del estudio + ubicación del proyecto para visitas de campo y trabajo geotécnico (especificar distrito/provincia/región del proyecto). (2) Plazo de ejecución: días calendario desde el hito de inicio (perfeccionamiento del contrato o notificación de orden de servicio + entrega de información base por parte de la Entidad). Si tiene prestaciones accesorias con plazos distintos (asistencia técnica post-aprobación) sepáralas claramente.`,
  entregables: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, los entregables se estructuran por **etapas** con tabla markdown N° | Etapa | Plazo desde inicio | Contenido | Medio. Para EXPEDIENTE TÉCNICO típico: (1) Plan de trabajo + cronograma detallado, (2) Informe preliminar con estudios básicos, (3) Anteproyecto, (4) Expediente técnico preliminar para revisión, (5) Expediente técnico final con observaciones levantadas. Para SUPERVISIÓN: informes mensuales + informe final + acta de recepción. Cada entregable se presenta con N copias físicas + soporte digital editable + medios de verificación.`,
  conformidad: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, la conformidad se emite por entregable: el equipo técnico de la Entidad (típicamente unidad formuladora + área técnica + área usuaria) revisa, formula observaciones, requiere subsanación, finalmente emite conformidad. Plazo máximo de revisión por entregable: 7 días calendario desde recepción. Plazo de subsanación por el consultor: típicamente 5-10 días calendario por observación. La conformidad del último entregable (expediente final aprobado o informe final de supervisión) habilita el pago final.`,
  forma_pago: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, pago por **entregable aprobado** según porcentaje del monto contractual asignado a cada etapa. Estructura típica para expediente técnico: 10-15% al plan de trabajo aprobado, 20-25% al informe preliminar, 25-30% al anteproyecto, balance al expediente técnico final aprobado. Para supervisión: pagos mensuales por informe de supervisión aprobado + saldo a la liquidación. Moneda: SOLES. Documentación: conformidad del entregable + comprobante de pago. Plazo: 10 días hábiles desde conformidad (prorrogable 5 días). Intereses legales por retraso (Art. 67.5 Ley 32069).`,
  confidencialidad: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, el consultor guarda reserva sobre: información del proyecto, base de datos territorial, planos previos de obras existentes, antecedentes técnicos, información de propiedades afectadas, estudios geotécnicos previos no publicados, información presupuestal. Compromisos: uso exclusivo para la consultoría, no divulgar/transferir/reproducir sin autorización, extensión al personal y subcontratistas con responsabilidad solidaria. Subsistencia tras culminado el contrato.`,
  responsabilidad_proveedor: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, responsabilidad **técnico-profesional** del Jefe de Proyecto y de cada especialista por el contenido de su parte del estudio o por las decisiones de supervisión. Vicios ocultos: 1 año desde la conformidad (literal c) numeral 69.2 Art. 69 Ley 32069 + numeral 144.9 Art. 144 Reglamento). Si el estudio resulta con deficiencias técnicas graves que generan necesidad de adicionales o causan demoras significativas en la ejecución posterior de la obra, el consultor responde conforme a la normativa de control y conforme al Código Civil en lo aplicable.`,
  responsabilidad_asignacion_bienes: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, los bienes que la Entidad puede asignar al consultor incluyen: información digital del proyecto, planos previos, base de datos catastral, estudios previos no publicados, oficina de trabajo dentro de la Entidad si aplica, equipos topográficos o de medición específicos, software especializado. El consultor recibe en acta detallada, los usa exclusivamente para la consultoría, los devuelve al cierre. Responde por daños o pérdidas atribuibles.`,
  consideraciones_generales_productos: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, los productos que pertenecen a la Entidad son: el **estudio o expediente técnico completo** (memoria descriptiva, planos, especificaciones, presupuesto, programación, análisis de precios unitarios, fórmulas polinómicas, anexos, soporte digital editable), informes de supervisión, certificados de calidad de estudios básicos. El consultor cede en forma definitiva, exclusiva, ilimitada y a título gratuito los derechos patrimoniales sobre estos productos. La Entidad puede utilizarlos sin restricción para la ejecución, ampliaciones futuras, futuros procedimientos. La cesión no limita derechos morales aplicables.`,
  gastos_desplazamiento: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, los gastos por desplazamiento a la zona del proyecto (visitas de campo, trabajo geotécnico, reuniones con la Entidad, charlas con la comunidad cuando aplique) están **incluidos en los gastos generales** de la oferta del consultor. Excepcionalmente, para proyectos en zonas muy alejadas o de difícil acceso, la Entidad puede establecer reembolso adicional con tope mensual y procedimiento de liquidación. Si no aplica, indicar "Los gastos por desplazamiento están incluidos en los gastos generales de la oferta del consultor".`,
  penalidades_mora: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, fórmula oficial: Penalidad diaria = (0.10 × Monto vigente) / (F × Plazo vigente), F = 0.40. Aplica automáticamente por retraso injustificado en la presentación de cualquier entregable o en el levantamiento de observaciones. Tope acumulado con otras penalidades: 10% del monto vigente del contrato (Art. 164 Reglamento).`,
  otras_penalidades: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, genera tabla markdown N° | Supuesto | Forma de cálculo | Procedimiento. Incluye al menos 4-6 supuestos típicos: (1) Ausencia del Jefe de Proyecto en visita programada con la Entidad, (2) Ausencia de especialista en visita programada, (3) Retraso en levantamiento de observaciones a un entregable, (4) Incumplimiento de cronograma de visitas de supervisión, (5) Sustitución de personal clave sin autorización, (6) Presentación de entregable sin firma de los especialistas correspondientes. Penalidades objetivas, razonables y proporcionales.`,
  resolucion_contractual: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, causales del Art. 165 Reglamento + específicas: deficiencias técnicas graves del estudio o supervisión no subsanables, retraso superior al X% del plazo, ausencia prolongada del Jefe de Proyecto, sustitución reiterada de personal clave sin justificación. Procedimiento: carta notarial de apercibimiento con plazo de subsanación, luego carta notarial de resolución, ejecución de garantía cuando aplique, eventual inicio de procedimiento sancionador ante Tribunal.`,
  sanciones: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, redacta cláusula de sanciones bajo el Capítulo V Ley 32069 (Arts. 50-54). Infracciones especiales aplicables al consultor: incumplimiento sustancial, presentación de documentación falsa sobre experiencia del Jefe de Proyecto o especialistas, deficiencias técnicas graves en el estudio que generen perjuicio a la Entidad. Sanciones: inhabilitación temporal 6-60 meses, inhabilitación definitiva, multa o apercibimiento. Tribunal de Contrataciones Públicas competente.`,
  obligacion_anticorrupcion: `${COMMON_AI_PREAMBLE} Redacta la cláusula anticorrupción y antisoborno conforme al literal b) Art. 60 Ley 32069. Para CONSULTORÍA DE OBRA, énfasis en: no haber ofrecido beneficios a funcionarios del área técnica, unidad formuladora, evaluadores del estudio o futuros contratistas de la obra. Extensión a subcontratistas. Consecuencia: derecho de la Entidad a resolver total o parcialmente.`,
  aplicacion_supletoria: `${COMMON_AI_PREAMBLE} Redacta cláusula de aplicación supletoria. La norma principal es la Ley 32069 y su Reglamento DS 009-2025-EF. Para CONSULTORÍA DE OBRA aplican adicionalmente: Reglamento Nacional de Edificaciones (RNE), normas técnicas específicas según naturaleza del proyecto, Reglamento del Sistema Nacional de Inversiones Invierte.pe del MEF cuando el proyecto se enmarque en ciclo de inversiones, TUO de la Ley 27444 (DS 006-2026-JUS), Código Civil en lo pertinente.`,
  medidas_seguridad: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, medidas de seguridad obligatorias durante visitas de campo y trabajos geotécnicos: SCTR vigente Ley 29783 para personal expuesto, EPP completos según actividad (casco, lentes, calzado, chaleco reflectante), charla previa de seguridad antes de visita de campo, identificación clara del personal, comunicación a la Entidad de visitas de campo programadas, comunicación inmediata de incidentes. Para visitas a zonas con riesgo de seguridad ciudadana: coordinación con la Entidad y autoridades locales.`,
  solucion_controversias: `${COMMON_AI_PREAMBLE} Para CONSULTORÍA DE OBRA, redacta solución de controversias. Si ≤ 8 UIT: conciliación obligatoria ante centro acreditado por MINJUS (numeral 81.3 Art. 81 + numeral 330.1 Art. 330 Reglamento). Si > 8 UIT: mecanismos del Capítulo VI Ley 32069 (conciliación previa, arbitraje). Para consultorías ligadas a obras grandes con JPRD podrá someterse al mismo mecanismo.`,
  otros: `${COMMON_AI_PREAMBLE} Esta es una cláusula complementaria para CONSULTORÍA DE OBRA. Redacta lo que el usuario indique en sus notas, manteniendo coherencia con la Ley 32069 y el resto del documento.`,
};

// ════════════════════════════════════════════════════════════════════
// Helper interno: aplica overrides de aiHint sobre el catálogo de Servicio
// ════════════════════════════════════════════════════════════════════
function applyAiHintOverrides(
  base: ClauseDefinition[],
  overrides: Record<string, string>,
): ClauseDefinition[] {
  return base.map((c) => ({
    ...c,
    aiHint: overrides[c.id] || c.aiHint,
  }));
}

// ════════════════════════════════════════════════════════════════════
// API pública del catálogo
// ════════════════════════════════════════════════════════════════════
export function getClauseCatalog(
  objeto: ObjectoContractual,
): ClauseDefinition[] {
  switch (objeto) {
    case 'bien':
      return CLAUSES_BIEN;
    case 'servicio':
      return CLAUSES_SERVICIO;
    case 'obra':
      // Misma estructura que Servicio (confirmado por SEACE), pero la IA
      // debe responder con contexto de ejecución física de obra.
      return applyAiHintOverrides(CLAUSES_SERVICIO, OBRA_AI_HINTS);
    case 'consultoria_obra':
      // Misma estructura que Servicio, pero la IA responde con contexto
      // de estudios, expediente técnico, supervisión y consultor.
      return applyAiHintOverrides(CLAUSES_SERVICIO, CONSULTORIA_OBRA_AI_HINTS);
  }
}

export function getInitialClauses(objeto: ObjectoContractual) {
  return getClauseCatalog(objeto).map((c, idx) => ({
    id: c.id,
    label: c.label,
    order: idx,
    included: false,
    mode: 'manual' as 'manual' | 'ai',
    content: '',
    ai_input: '',
    is_custom: false,
  }));
}

export const OBJETO_LABELS: Record<ObjectoContractual, string> = {
  bien: 'Bien',
  servicio: 'Servicio',
  obra: 'Obra',
  consultoria_obra: 'Consultoría de Obra',
};

export const OBJETO_ANEXO_TITULOS: Record<ObjectoContractual, string> = {
  bien: 'ESPECIFICACIONES TÉCNICAS',
  servicio: 'TÉRMINOS DE REFERENCIA',
  obra: 'ESPECIFICACIONES TÉCNICAS DE OBRA',
  consultoria_obra: 'TÉRMINOS DE REFERENCIA',
};
