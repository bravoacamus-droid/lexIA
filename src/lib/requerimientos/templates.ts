/**
 * Plantillas pre-armadas por tipo de contratación común.
 *
 * Cada plantilla aplica al crear un nuevo requerimiento:
 *  - Marca las cláusulas relevantes para ese tipo
 *  - Pre-rellena el contenido HTML de las cláusulas técnicas
 *
 * El usuario puede luego editar todo libremente — las plantillas son
 * un punto de partida que acelera 10x el armado de casos comunes.
 */
import { getInitialClauses, type ObjectoContractual } from './catalog';
import type { Clause } from '@/components/app/requerimiento/clause-list';

export interface RequirementTemplate {
  id: string;
  label: string;
  objeto: ObjectoContractual;
  description: string;
  denominacion: string;
  area_usuaria_sugerida: string | null;
  /**
   * Cláusulas con contenido pre-armado. El resto del catálogo se incluye
   * sin contenido. Cada entrada activa la cláusula automáticamente.
   */
  clause_overrides: Array<{
    id: string;
    content: string;
    mode?: 'manual' | 'ai';
  }>;
  /** Cláusulas que NO se marcan como incluidas (por defecto todas se marcan). */
  clauses_excluded?: string[];
}

// ════════════════════════════════════════════════════════════════════
// PLANTILLA 1 — BIEN: Computadoras personales de escritorio
// ════════════════════════════════════════════════════════════════════
const TPL_COMPUTADORAS: RequirementTemplate = {
  id: 'bien-computadoras-escritorio',
  label: 'Computadoras personales de escritorio',
  objeto: 'bien',
  description:
    'Adquisición de equipos de cómputo de escritorio para personal administrativo. Incluye características técnicas estándar y garantía comercial de 3 años.',
  denominacion:
    'Adquisición de computadoras personales de escritorio para el personal administrativo',
  area_usuaria_sugerida: 'Sub Dirección de Tecnologías de Información',
  clause_overrides: [
    {
      id: 'finalidad_publica',
      content:
        '<p>La presente contratación tiene por finalidad pública dotar al personal administrativo de la Entidad de equipos de cómputo modernos que permitan mejorar el procesamiento de información, optimizando la atención a los administrados y elevando la eficiencia operativa de las áreas de gestión.</p><p>Esta adquisición se enmarca en la Actividad Operativa del POI institucional vinculada al fortalecimiento de la infraestructura tecnológica, y contribuye al Objetivo Estratégico del PEI relativo a la modernización de la gestión pública.</p>',
    },
    {
      id: 'objetivo_contratacion',
      content:
        '<p>Adquirir computadoras personales de escritorio con sus respectivos periféricos para una atención eficiente del personal administrativo de la Entidad.</p>',
    },
    {
      id: 'caracteristicas_tecnicas',
      content:
        '<h3>Especificaciones técnicas mínimas (o equivalente técnico)</h3><table><thead><tr><th>Componente</th><th>Característica mínima</th></tr></thead><tbody><tr><td>Procesador</td><td>Intel Core i5 12va generación o AMD Ryzen 5 5000 series o superior</td></tr><tr><td>Memoria RAM</td><td>16 GB DDR4 mínimo, expandible</td></tr><tr><td>Almacenamiento</td><td>SSD NVMe 512 GB mínimo</td></tr><tr><td>Monitor</td><td>LED 23.8" mínimo, resolución Full HD 1920×1080</td></tr><tr><td>Tarjeta gráfica</td><td>Integrada con soporte para 2 monitores</td></tr><tr><td>Conectividad</td><td>Wi-Fi 6, Bluetooth 5.0, Ethernet Gigabit, 4 puertos USB</td></tr><tr><td>Sistema operativo</td><td>Windows 11 Pro 64 bits, licencia OEM o Volume Licensing</td></tr><tr><td>Software de productividad</td><td>Suite ofimática licenciada con procesador de textos, hoja de cálculo y presentaciones</td></tr><tr><td>Periféricos</td><td>Teclado y mouse USB, ambos en color negro</td></tr></tbody></table><p><em>Las características indicadas son las mínimas requeridas. Se acepta marca propuesta por el postor siempre que cumpla con las características técnicas mínimas señaladas.</em></p>',
    },
    {
      id: 'garantia_comercial',
      content:
        '<p>El contratista otorga una garantía comercial de tres (3) años contados desde la conformidad del bien, cobertura sobre defectos de fabricación, fallas funcionales y reposición de partes defectuosas. La atención se brinda en modalidad on-site (en las instalaciones de la Entidad) en horario de lunes a viernes de 9:00 a 18:00 horas, con tiempo de respuesta no mayor a 24 horas hábiles y reposición o reparación del equipo en un plazo máximo de 5 días hábiles. En caso de no poder repararse en sitio, el contratista entrega un equipo de reemplazo de prestaciones equivalentes durante el período de reparación.</p>',
    },
    {
      id: 'lugar_plazo_ejecucion',
      content:
        '<p><strong>Lugar de entrega:</strong> Sede institucional de la Entidad, sito en la dirección que se indique en el contrato.</p><p><strong>Plazo de ejecución contractual:</strong> Treinta (30) días calendario contados a partir del día siguiente del perfeccionamiento del contrato.</p>',
    },
    {
      id: 'conformidad',
      content:
        '<p>La conformidad del bien es emitida por el responsable del área usuaria (Sub Dirección de Tecnologías de Información) en un plazo máximo de siete (7) días calendario contados desde la recepción de los equipos. La conformidad se otorga previa verificación del cumplimiento de las características técnicas, ejecución de pruebas de funcionamiento y revisión de la documentación de garantía.</p>',
    },
  ],
};

// ════════════════════════════════════════════════════════════════════
// PLANTILLA 2 — SERVICIO: Mantenimiento preventivo y correctivo de aires
// ════════════════════════════════════════════════════════════════════
const TPL_MTTO_AIRES: RequirementTemplate = {
  id: 'servicio-mantenimiento-aires',
  label: 'Mantenimiento de aires acondicionados',
  objeto: 'servicio',
  description:
    'Servicio anual de mantenimiento preventivo y correctivo de equipos de aire acondicionado tipo split. Incluye 12 visitas (1/mes) y atención 24/7 a emergencias.',
  denominacion:
    'Servicio de mantenimiento preventivo y correctivo de equipos de aire acondicionado tipo split de la sede institucional',
  area_usuaria_sugerida: 'Sub Dirección de Servicios Generales',
  clause_overrides: [
    {
      id: 'finalidad_publica',
      content:
        '<p>La presente contratación tiene por finalidad pública garantizar el adecuado funcionamiento del sistema de climatización de la sede institucional, asegurando condiciones óptimas de temperatura y calidad del aire interior para el personal y los administrados que acuden a las instalaciones.</p><p>Esta contratación se vincula a la Actividad Operativa del POI de "Gestión administrativa y operativa institucional" y contribuye al fortalecimiento de las condiciones de trabajo y atención al ciudadano.</p>',
    },
    {
      id: 'objetivo_contratacion',
      content:
        '<p>Contratar el servicio de mantenimiento preventivo programado y correctivo a demanda de los equipos de aire acondicionado tipo split instalados en la sede de la Entidad, durante un periodo de doce (12) meses, para garantizar su operación continua y prolongar su vida útil.</p>',
    },
    {
      id: 'alcance_servicio',
      content:
        '<h3>Descripción del servicio</h3><p>El servicio comprende la atención integral de los equipos de aire acondicionado tipo split instalados en la sede institucional, durante doce (12) meses.</p><h3>Mantenimiento preventivo (mensual)</h3><ul><li>Limpieza profunda de filtros, evaporador y condensador</li><li>Revisión y limpieza de bandejas y desagües</li><li>Control de niveles de refrigerante y recarga cuando corresponda</li><li>Verificación de presiones de trabajo y conexiones eléctricas</li><li>Pruebas de funcionamiento en modo frío y modo seco</li><li>Lubricación de motores y verificación de aspas</li><li>Limpieza de drenajes</li><li>Entrega de reporte técnico mensual por cada equipo con observaciones y recomendaciones</li></ul><h3>Mantenimiento correctivo (a demanda)</h3><ul><li>Atención de emergencias durante 24 horas los 7 días de la semana, con tiempo de respuesta no mayor a 4 horas para ingresar a las instalaciones</li><li>Diagnóstico técnico documentado de la falla</li><li>Cotización de repuestos necesarios sometida a la aprobación previa de la Entidad</li><li>Ejecución de la reparación con repuestos originales o equivalente técnico</li><li>Garantía de reparación de tres (3) meses</li></ul>',
    },
    {
      id: 'lugar_plazo_ejecucion',
      content:
        '<p><strong>Lugar de prestación:</strong> Sede institucional de la Entidad, en todas sus áreas con equipos de aire acondicionado.</p><p><strong>Plazo de ejecución contractual:</strong> Doce (12) meses calendario contados a partir del día siguiente del perfeccionamiento del contrato o de la notificación de la orden de servicio, lo que ocurra primero.</p>',
    },
    {
      id: 'conformidad',
      content:
        '<p>La conformidad mensual del servicio es emitida por el responsable del área usuaria, en un plazo máximo de siete (7) días calendario contados desde la recepción del reporte mensual de mantenimiento. La conformidad se otorga previa verificación de la ejecución efectiva de las visitas programadas y de las atenciones correctivas que correspondan.</p>',
    },
    {
      id: 'forma_pago',
      content:
        '<p>El pago se efectúa de forma mensual en soles, contra presentación del reporte de mantenimiento aprobado por el área usuaria, comprobante de pago sin enmendaduras, y conformidad del responsable. El plazo de pago es de diez (10) días hábiles desde la conformidad. En caso de mantenimientos correctivos con repuestos, el pago de los mismos se realiza por separado contra presentación de cotización previamente aprobada por la Entidad. Conforme al numeral 67.5 del Art. 67 de la Ley 32069, ante retraso en el pago se reconocen los intereses legales.</p>',
    },
  ],
  clauses_excluded: ['gastos_desplazamiento', 'consideraciones_generales_productos'],
};

// ════════════════════════════════════════════════════════════════════
// PLANTILLA 3 — OBRA: Pavimentación de vía local
// ════════════════════════════════════════════════════════════════════
const TPL_PAVIMENTACION: RequirementTemplate = {
  id: 'obra-pavimentacion-via',
  label: 'Pavimentación de vía local',
  objeto: 'obra',
  description:
    'Ejecución de obra de pavimentación de vía urbana o vecinal con expediente técnico previamente aprobado. Modalidad precios unitarios.',
  denominacion:
    'Ejecución de la obra: Pavimentación de la vía (indicar nombre de la vía) en el distrito (indicar distrito)',
  area_usuaria_sugerida: 'Gerencia de Obras / Sub Gerencia de Obras Públicas',
  clause_overrides: [
    {
      id: 'finalidad_publica',
      content:
        '<p>La presente contratación tiene por finalidad pública mejorar las condiciones de transitabilidad vial en el sector donde se ejecutará la obra, reduciendo los tiempos de desplazamiento de los vecinos, mejorando la conectividad con las vías principales y elevando la calidad de vida de la población beneficiaria.</p><p>La obra se enmarca en el ciclo de inversión pública del Sistema Invierte.pe, contando con el Código Único de Inversión correspondiente y el expediente técnico aprobado por la Entidad. Se vincula al POI institucional en la actividad de "Ejecución de proyectos de inversión pública en infraestructura vial" y al PEI en el objetivo estratégico de cierre de brechas en infraestructura urbana.</p>',
    },
    {
      id: 'objetivo_contratacion',
      content:
        '<p>Ejecutar la obra de pavimentación de la vía conforme al expediente técnico aprobado, en el plazo y bajo las condiciones técnicas establecidas, con el fin de mejorar la transitabilidad vehicular y peatonal del sector.</p>',
    },
    {
      id: 'alcance_servicio',
      content:
        '<h3>Descripción general de la obra</h3><p>La obra comprende la ejecución de las partidas establecidas en el expediente técnico aprobado, incluyendo: trabajos preliminares, demolición y limpieza, movimiento de tierras, conformación de subrasante, base granular, carpeta asfáltica o pavimento rígido según corresponda, veredas, sardineles, señalización vial y obras complementarias.</p><h3>Modalidad de ejecución</h3><p>Precios unitarios, conforme al Art. 32 del Reglamento de la Ley 32069.</p><h3>Sistema de entrega</h3><p>Solo construcción (la Entidad entrega el expediente técnico aprobado y el contratista ejecuta la obra).</p><h3>Componentes principales</h3><ul><li>Pavimento de la vía conforme a los metrados aprobados</li><li>Veredas y sardineles según diseño</li><li>Señalización vial horizontal y vertical</li><li>Obras complementarias (drenajes pluviales, jardineras, etc., según expediente)</li></ul>',
    },
    {
      id: 'reglamentos_tecnicos',
      content:
        '<p>El contratista debe ejecutar la obra cumpliendo estrictamente con las siguientes normas técnicas obligatorias:</p><ul><li>Reglamento Nacional de Edificaciones (RNE), Norma E.020 (Cargas), E.030 (Sismorresistente), E.050 (Suelos y cimentaciones), E.060 (Concreto armado)</li><li>Manual de Carreteras del Ministerio de Transportes y Comunicaciones - Especificaciones Técnicas Generales para la Construcción</li><li>Manual de Carreteras del MTC - Diseño Geométrico</li><li>Manual de Dispositivos de Control del Tránsito Automotor para Calles y Carreteras del MTC</li><li>Ley N° 29783, Ley de Seguridad y Salud en el Trabajo y su Reglamento</li><li>Normativa ambiental aplicable de la autoridad ambiental competente</li></ul>',
    },
    {
      id: 'seguros',
      content:
        '<p>El contratista deberá contar con los siguientes seguros vigentes durante toda la ejecución de la obra:</p><ul><li><strong>SCTR (Seguro Complementario de Trabajo de Riesgo) Salud y Pensión</strong> conforme a la Ley N° 29783, para todo el personal de obra, presentable antes de la entrega del terreno.</li><li><strong>CAR (Construction All Risks)</strong> con cobertura mínima equivalente al 100% del valor de la obra, vigente desde la entrega del terreno hasta la recepción de la obra.</li><li><strong>Seguro de Responsabilidad Civil</strong> contra terceros con cobertura mínima equivalente al 10% del valor referencial.</li><li><strong>SOAT</strong> para todos los vehículos de la obra.</li></ul><p>El incumplimiento en la contratación o mantenimiento vigente de cualquiera de estos seguros faculta a la Entidad a paralizar la obra y a aplicar la penalidad correspondiente.</p>',
    },
    {
      id: 'lugar_plazo_ejecucion',
      content:
        '<p><strong>Ubicación de la obra:</strong> (indicar dirección completa: calle/avenida, distrito, provincia, región).</p><p><strong>Plazo de ejecución contractual:</strong> (indicar plazo en días calendario, p.ej. 180 días calendario) contados a partir del cumplimiento de las siguientes condiciones: (i) designación del Inspector o Supervisor de obra, (ii) entrega del terreno mediante acta, (iii) entrega del expediente técnico aprobado, (iv) entrega del calendario de avance valorizado adelantado por el contratista, y (v) entrega del adelanto directo cuando este haya sido solicitado.</p>',
    },
  ],
};

// ════════════════════════════════════════════════════════════════════
// PLANTILLA 4 — CONSULTORÍA DE OBRA: Expediente técnico vial
// ════════════════════════════════════════════════════════════════════
const TPL_EXPEDIENTE_TECNICO: RequirementTemplate = {
  id: 'consultoria-expediente-tecnico-vial',
  label: 'Elaboración de expediente técnico vial',
  objeto: 'consultoria_obra',
  description:
    'Servicio de consultoría para la elaboración del expediente técnico de una obra vial, incluyendo estudios básicos, planos, presupuesto y cronograma.',
  denominacion:
    'Servicio de consultoría para la elaboración del expediente técnico de la obra: (indicar nombre del proyecto vial)',
  area_usuaria_sugerida: 'Unidad Formuladora / Sub Gerencia de Estudios',
  clause_overrides: [
    {
      id: 'finalidad_publica',
      content:
        '<p>La presente contratación tiene por finalidad pública contar con un expediente técnico debidamente elaborado y aprobado que permita ejecutar la obra vial proyectada en condiciones de calidad técnica, dentro de los plazos previstos y con un presupuesto sustentado, asegurando el cierre de la brecha de infraestructura vial identificada en el ámbito de intervención.</p><p>El estudio se enmarca en el ciclo de inversión pública del Sistema Invierte.pe y se vincula al POI institucional en la actividad de "Formulación y aprobación de expedientes técnicos de proyectos de inversión".</p>',
    },
    {
      id: 'objetivo_contratacion',
      content:
        '<p>Contratar al consultor que elaborará el expediente técnico completo del proyecto, incluyendo estudios básicos, memoria descriptiva, planos, especificaciones técnicas, presupuesto valorizado, programación, análisis de precios unitarios y fórmulas polinómicas, de manera que la Entidad pueda convocar y ejecutar la obra correspondiente.</p>',
    },
    {
      id: 'alcance_servicio',
      content:
        '<h3>Descripción de la consultoría</h3><p>Elaboración del expediente técnico completo conforme a los Términos de Referencia oficiales del MTC y a la normativa del Sistema Invierte.pe.</p><h3>Estudios básicos requeridos</h3><ul><li>Levantamiento topográfico georreferenciado</li><li>Estudio de mecánica de suelos con perforaciones</li><li>Estudio de tránsito y proyección de demanda</li><li>Estudio hidrológico e hidráulico (para drenaje pluvial)</li><li>Estudio de impacto ambiental conforme a normativa SENACE</li><li>Estudio de riesgos y vulnerabilidad</li></ul><h3>Productos a elaborar</h3><ul><li>Memoria descriptiva con sustento técnico de cada decisión de diseño</li><li>Planos: ubicación, planta general, perfil longitudinal, secciones transversales, detalles constructivos, señalización</li><li>Especificaciones técnicas de cada partida</li><li>Presupuesto valorizado con metrados, precios unitarios y fórmulas polinómicas</li><li>Programación de obra (cronograma valorizado y calendario de adquisición de materiales)</li><li>Análisis de precios unitarios sustentados</li><li>Manual de operación y mantenimiento de la futura infraestructura</li><li>Soporte digital editable de todos los entregables (planos en DWG, presupuesto en S10, documentos en Word/Excel)</li></ul>',
    },
    {
      id: 'requisitos_proveedor_consultor',
      content:
        '<h3>Requisitos del consultor</h3><ul><li>RUC activo y habido en SUNAT</li><li>RNP vigente como Consultor de Obras, especialidad Obras Viales</li><li>No estar impedido conforme al Art. 51 de la Ley 32069</li><li>Correo electrónico oficial para notificaciones</li></ul><h3>Perfil del Jefe de Proyecto</h3><p>Ingeniero Civil colegiado y habilitado, con experiencia mínima de diez (10) años en el ejercicio de la profesión y experiencia específica de cinco (5) años en elaboración o supervisión de expedientes técnicos de obras viales, acreditada con contratos y conformidades.</p><h3>Equipo de especialistas requeridos</h3><ul><li>Especialista en Estructuras (Ing. Civil colegiado, 5 años de experiencia)</li><li>Especialista en Tránsito y Transporte (Ing. de Transportes o afín, 5 años)</li><li>Especialista en Hidráulica e Hidrología (Ing. Civil o Sanitario, 5 años)</li><li>Especialista en Mecánica de Suelos (Ing. Civil o Geólogo, 5 años)</li><li>Especialista en Impacto Ambiental (Ing. Ambiental o afín, 5 años)</li><li>Topógrafo (Ing. Geógrafo o Geomático, 3 años)</li></ul>',
    },
    {
      id: 'lugar_plazo_ejecucion',
      content:
        '<p><strong>Lugar de prestación:</strong> Oficina del consultor para el desarrollo del estudio + zona del proyecto (indicar distrito/provincia/región) para visitas de campo y trabajos de geotecnia.</p><p><strong>Plazo de ejecución contractual:</strong> Ciento veinte (120) días calendario contados a partir del día siguiente del perfeccionamiento del contrato o de la notificación de la orden de servicio, lo que ocurra primero.</p>',
    },
  ],
};

// ════════════════════════════════════════════════════════════════════
// Registro de plantillas
// ════════════════════════════════════════════════════════════════════
const ALL_TEMPLATES: RequirementTemplate[] = [
  TPL_COMPUTADORAS,
  TPL_MTTO_AIRES,
  TPL_PAVIMENTACION,
  TPL_EXPEDIENTE_TECNICO,
];

export function getTemplatesForObjeto(
  objeto: ObjectoContractual,
): RequirementTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.objeto === objeto);
}

export function getTemplateById(id: string): RequirementTemplate | null {
  return ALL_TEMPLATES.find((t) => t.id === id) || null;
}

// ════════════════════════════════════════════════════════════════════
// Aplicación de plantilla — genera estado inicial de un requerimiento
// ════════════════════════════════════════════════════════════════════
export function applyTemplate(template: RequirementTemplate): {
  area_usuaria: string | null;
  denominacion: string;
  clauses: Clause[];
} {
  // Partimos del catálogo base del objeto correspondiente.
  const baseClauses = getInitialClauses(template.objeto) as Clause[];
  const overrideMap = new Map(
    template.clause_overrides.map((o) => [o.id, o]),
  );
  const excludedSet = new Set(template.clauses_excluded || []);

  const clauses = baseClauses.map((c) => {
    const ov = overrideMap.get(c.id);
    const excluded = excludedSet.has(c.id);
    return {
      ...c,
      // Por defecto, una plantilla incluye TODAS las cláusulas excepto las
      // explícitamente excluidas. El contenido pre-armado solo cubre algunas.
      included: !excluded,
      mode: (ov?.mode || (ov?.content ? 'manual' : 'manual')) as 'manual' | 'ai',
      content: ov?.content ?? c.content,
    };
  });

  return {
    area_usuaria: template.area_usuaria_sugerida,
    denominacion: template.denominacion,
    clauses,
  };
}
