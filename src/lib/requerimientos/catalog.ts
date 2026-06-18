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
// API pública del catálogo
// ════════════════════════════════════════════════════════════════════
export function getClauseCatalog(
  objeto: ObjectoContractual,
): ClauseDefinition[] {
  switch (objeto) {
    case 'bien':
      return CLAUSES_BIEN;
    // Servicio / Obra / Consultoría: por ahora reutilizamos catálogo de
    // bien con etiqueta TDR. En la siguiente iteración crearemos
    // estructuras propias para cada uno.
    case 'servicio':
    case 'obra':
    case 'consultoria_obra':
      return CLAUSES_BIEN;
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
