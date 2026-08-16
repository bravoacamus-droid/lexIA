/**
 * Bloques que las plantillas de César comparten palabra por palabra.
 *
 * POR QUÉ EXISTE ESTE MÓDULO
 *
 * De los 15 formatos, 401 párrafos aparecen idénticos en dos o más. Si
 * cada plantilla se transcribiera por separado, a la tercera se colaría
 * una variante —una coma, un "el" de más— y el texto dejaría de ser el
 * obligatorio. Reutilizando lo idéntico se evita transcribir 301.192
 * caracteres y, sobre todo, se evita que diverjan.
 *
 * REGLA: aquí solo entra lo que es EXACTAMENTE igual. Cuando dos
 * plantillas difieren aunque sea en una cláusula —y ocurre: la nota de
 * "otras penalidades" añade "y dicha condición haya sido validada
 * durante la estrategia de contratación" en 11 formatos pero no en
 * Bienes en General— se dejan como variantes separadas. Esa diferencia
 * suele ser deliberada.
 *
 * Los párrafos de la cláusula antisoborno van sueltos, no en un bloque
 * único, porque dos formatos omiten el último. Cada plantilla incluye
 * los suyos y el auditor lo comprueba contra su propio .docx.
 */
import type { Bloque, Seccion } from '../plantilla-tipos';

// ════════════════════════════════════════════════════════════════════
// Normas de anticorrupción y antisoborno — 13 de 15 formatos
// ════════════════════════════════════════════════════════════════════

export const ANTISOBORNO_PARRAFOS = [
  'A la suscripción de este contrato, El Contratista declara y garantiza no haber ofrecido, negociado, prometido o efectuado ningún pago o entrega de cualquier beneficio o incentivo ilegal, de manera directa o indirecta, a los evaluadores del proceso de contratación o cualquier servidor de la entidad contratante.',
  'Asimismo, El Contratista se obliga a mantener una conducta proba e íntegra durante la vigencia del contrato, y después de culminado el mismo en caso existan controversias pendientes de resolver, lo que supone actuar con probidad, sin cometer actos ilícitos, directa o indirectamente.',
  'Aunado a ello, El Contratista se obliga a abstenerse de ofrecer, negociar, prometer o dar regalos, cortesías, invitaciones, donativos o cualquier beneficio o incentivo ilegal, directa o indirectamente, a funcionarios públicos, servidores públicos, locadores de servicios o proveedores de servicios del área usuaria, de la dependencia encargada de la contratación, actores del proceso de contratación y/o cualquier servidor de la entidad contratante, con la finalidad de obtener alguna ventaja indebida o beneficio ilícito. En esa línea, se obliga a adoptar las medidas técnicas, organizativas y/o de personal necesarias para asegurar que no se practiquen los actos previamente señalados.',
  'Adicionalmente, El Contratista se compromete a denunciar oportunamente ante las autoridades competentes los actos de corrupción o de inconducta funcional de los cuales tuviera conocimiento durante la ejecución del contrato con la entidad contratante.',
  'Tratándose de una persona jurídica, lo anterior se extiende a sus accionistas, participacionistas, integrantes de los órganos de administración, apoderados, representantes legales, funcionarios, asesores o cualquier persona vinculada a la persona jurídica que representa; comprometiéndose a informarles sobre los alcances de las obligaciones asumidas en virtud del presente contrato.',
] as const;

/** Cierre de la cláusula. Presente en 11 de los 13 formatos que la traen. */
export const ANTISOBORNO_CIERRE =
  'Finalmente, el incumplimiento de las obligaciones establecidas en esta cláusula, durante la ejecución contractual, otorga a la entidad contratante el derecho de resolver total o parcialmente el contrato. Cuando lo anterior se produzca por parte de un proveedor adjudicatario de los catálogos electrónicos de acuerdo marco, el incumplimiento de la presente cláusula conllevará que sea excluido de los Catálogos Electrónicos de Acuerdo Marco. En ningún caso, dichas medias impiden el inicio de las acciones civiles, penales y administrativas a que hubiera lugar.';

export function seccionAnticorrupcion(conCierre = true): Seccion {
  const bloques: Bloque[] = ANTISOBORNO_PARRAFOS.map((texto) => ({
    clase: 'fijo' as const,
    texto,
    fundamento: 'Plantilla — cláusula obligatoria',
  }));
  if (conCierre) {
    bloques.push({
      clase: 'fijo',
      texto: ANTISOBORNO_CIERRE,
      fundamento: 'Plantilla — cláusula obligatoria',
    });
  }
  return { id: 'anticorrupcion', titulo: 'Normas de anticorrupción y antisoborno', bloques };
}

// ════════════════════════════════════════════════════════════════════
// Responsabilidad por vicios ocultos — 12 de 15 formatos
// ════════════════════════════════════════════════════════════════════

export const VICIOS_OCULTOS_BASE =
  'La conformidad de la prestación otorgada por la Entidad no enerva su derecho a reclamar posteriormente por defectos o vicios ocultos, de conformidad con lo establecido en el literal c) del numeral 69.2 del artículo 69 de la Ley N° 32069 y el numeral 144.9 del artículo 144 de su Reglamento.';

export function seccionViciosOcultos(): Seccion {
  return {
    id: 'vicios_ocultos',
    titulo: 'Responsabilidad por vicios ocultos',
    bloques: [
      {
        clase: 'fijo',
        texto: VICIOS_OCULTOS_BASE,
        fundamento: 'Ley N° 32069, art. 69.2.c; Reglamento, art. 144.9',
      },
      {
        clase: 'parrafo',
        texto:
          'El plazo de responsabilidad del contratista por vicios ocultos es de {{vicios_ocultos_plazo}}, contado a partir de la conformidad otorgada por la Entidad. Durante este periodo, el contratista es responsable por la calidad ofrecida y por los defectos que no eran detectables al momento de la recepción conforme.',
        campos: [
          {
            clase: 'campo',
            id: 'vicios_ocultos_plazo',
            etiqueta: 'Plazo de responsabilidad por vicios ocultos',
            ayuda: 'Consignar el tiempo en años',
            tipo: 'texto',
            obligatorio: true,
          },
        ],
      },
    ],
  };
}

// ════════════════════════════════════════════════════════════════════
// Penalidades — 12 de 15 formatos
// ════════════════════════════════════════════════════════════════════

export const PENALIDAD_MORA =
  'En caso de retraso injustificado del contratista en la ejecución de las prestaciones objeto del contrato, la entidad contratante le aplica automáticamente una penalidad por mora por cada día de atraso que le sea imputable, de conformidad con el artículo 120 del Reglamento.';

/**
 * La nota de "otras penalidades" tiene dos redacciones. La larga añade la
 * validación durante la estrategia de contratación; Bienes en General no
 * la trae. La diferencia es del original, no un descuido de la
 * transcripción.
 */
export const NOTA_OTRAS_PENALIDADES_CORTA =
  'Este numeral será aplicable únicamente cuando, por la naturaleza o condiciones de ejecución de la prestación, el área usuaria sustente la necesidad de establecer otras penalidades distintas a la penalidad por mora.';

export const NOTA_OTRAS_PENALIDADES_LARGA =
  'Este numeral será aplicable únicamente cuando, por la naturaleza o condiciones de ejecución de la prestación, el área usuaria sustente la necesidad de establecer otras penalidades distintas a la penalidad por mora, y dicha condición haya sido validada durante la estrategia de contratación.';

export const NOTA_PENALIDADES_CRITERIOS =
  'Las penalidades deberán estar vinculadas al incumplimiento de obligaciones contractuales específicas, ser objetivas, razonables, congruentes y proporcionales con el objeto de la contratación, de manera que no afecten el equilibrio económico-financiero del contrato ni constituyan restricciones injustificadas a la competencia, conforme al principio de valor por dinero. Para cada penalidad deberá precisarse, como mínimo: (i) el supuesto de incumplimiento; (ii) la forma de verificación; (iii) el procedimiento para su aplicación; y (iv) el monto o la forma de cálculo de la penalidad.';

export const EJEMPLO_PROCEDIMIENTO_PENALIDADES =
  'Cuando se verifique alguno de estos supuestos, el área usuaria y/o la DEC notificará al contratista dentro del plazo máximo de un (01) día hábil, adjuntando el informe técnico y el sustento correspondiente.\nEl contratista contará con un plazo de dos (02) días hábiles para presentar sus descargos, los cuales deberán estar debidamente sustentados con evidencia objetiva.\nLa Entidad evaluará los descargos presentados en un plazo máximo de tres (03) días hábiles, emitiendo la decisión correspondiente sobre la procedencia o no de la penalidad, la cual será comunicada al contratista por escrito.';

/**
 * Tope del 10% a la suma de penalidades.
 *
 * NO está en todas las plantillas: Bienes en General no lo enuncia y
 * "Expertos y gerentes de proyectos" sí. Por eso es un parámetro y no
 * una constante que se cuele en todas — dar por hecho que estaba en
 * todas fue justamente el error que la auditoría destapó al codificar la
 * primera plantilla.
 */
export const TOPE_PENALIDADES =
  'La suma de la aplicación de las penalidades por mora y otras penalidades no debe exceder el 10% del monto vigente del contrato o, de ser el caso, del ítem correspondiente.';

export const VALIDACION_PENALIDADES = {
  id: 'penalidades_max',
  descripcion:
    'La suma de penalidades por mora y otras penalidades no debe exceder el 10% del monto vigente del contrato o del ítem.',
  fundamento: 'Plantilla — Penalidades',
};

export function seccionPenalidades(
  variante: 'corta' | 'larga' = 'larga',
  conTope = false,
): Seccion {
  const seccion: Seccion = {
    id: 'penalidades',
    titulo: 'Penalidades',
    bloques: [],
    subsecciones: [
      {
        id: 'penalidad_mora',
        titulo: 'Penalidad por mora',
        bloques: [{ clase: 'fijo', texto: PENALIDAD_MORA, fundamento: 'Reglamento, art. 120' }],
      },
      {
        id: 'otras_penalidades',
        titulo: 'Otras penalidades',
        condicion: 'tiene_otras_penalidades',
        bloques: [
          {
            clase: 'nota',
            texto:
              variante === 'larga'
                ? NOTA_OTRAS_PENALIDADES_LARGA
                : NOTA_OTRAS_PENALIDADES_CORTA,
          },
          { clase: 'nota', texto: NOTA_PENALIDADES_CRITERIOS },
          {
            clase: 'fijo',
            texto: 'Adicionalmente a la penalidad por mora, se aplicarán las siguientes penalidades:',
          },
          {
            clase: 'tabla',
            id: 'otras_penalidades',
            etiqueta: 'Otras penalidades',
            columnas: [
              'N°',
              'Supuestos de aplicación de penalidad',
              'Forma de cálculo',
              'Procedimiento y medios de verificación',
            ],
            minimo: 1,
          },
          {
            clase: 'redactado',
            id: 'procedimiento_penalidades',
            etiqueta: 'Procedimiento de notificación y descargos',
            instruccion:
              'Señalar el plazo y forma en que se notifica al contratista el supuesto incurrido para que remita sus descargos, y el plazo en que la entidad contratante evalúa dicho descargo y emite una decisión',
            ejemplo: EJEMPLO_PROCEDIMIENTO_PENALIDADES,
            extension: 'varios_parrafos',
          },
        ],
      },
    ],
  };

  if (conTope) {
    // El tope va justo tras la tabla de otras penalidades, antes del
    // procedimiento de descargos, como en el original.
    const otras = seccion.subsecciones![1];
    otras.bloques.splice(3, 0, {
      clase: 'fijo',
      texto: TOPE_PENALIDADES,
      fundamento: 'Plantilla — tope de penalidades',
    });
  }

  return seccion;
}

// ════════════════════════════════════════════════════════════════════
// Forma y oportunidad de pago — 13 de 15 formatos
// ════════════════════════════════════════════════════════════════════

export const PAGO_PLAZO =
  'La entidad contratante paga las contraprestaciones pactadas a favor del contratista dentro de los diez (10) días hábiles siguientes de otorgada la conformidad por parte del área usuaria, plazo que podrá ser prorrogable, previa justificación de la demora, hasta por cinco (05) días hábiles adicionales.';

export const PAGO_INTERESES =
  'De conformidad con el artículo 67.5 de la Ley, en caso de retraso injustificado en el pago por parte de la Entidad, esta reconocerá al contratista los intereses legales correspondientes.';

export function bloquesPago(): Bloque[] {
  return [
    { clase: 'fijo', texto: PAGO_PLAZO, fundamento: 'Plantilla — forma de pago' },
    {
      clase: 'parrafo',
      texto:
        'Salvo los documentos de conformidad, el contratista debe presentar la documentación restante {{lugar_presentacion}}, sito en {{direccion_presentacion}}',
      campos: [
        {
          clase: 'campo',
          id: 'lugar_presentacion',
          etiqueta: 'Dependencia donde se presenta la documentación',
          ayuda:
            'Consignar mesa de partes o la dependencia específica de la entidad contratante donde se debe presentar la documentación',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'direccion_presentacion',
          etiqueta: 'Dirección',
          ayuda: 'Consignar la dirección exacta',
          tipo: 'texto',
          obligatorio: true,
        },
      ],
    },
    { clase: 'fijo', texto: PAGO_INTERESES, fundamento: 'Ley N° 32069, art. 67.5' },
  ];
}

// ════════════════════════════════════════════════════════════════════
// Solución de controversias — presente en los 15 formatos
// ════════════════════════════════════════════════════════════════════

export const CONTROVERSIAS_ENCABEZADO =
  'Las controversias que surjan entre las partes durante la ejecución del contrato se resuelven mediante conciliación, cuando se haya pactado, y arbitraje.';

/**
 * `variante` recoge una diferencia real entre familias: las plantillas
 * de bienes dicen "Para el caso del arbitraje" y las de servicios "Para
 * el caso de arbitraje". Una palabra, pero el auditor la detecta y
 * forzarla en ambas sería alterar el original.
 */
export function seccionControversias(
  conArbitrales = true,
  variante: 'bienes' | 'servicios' = 'bienes',
): Seccion {
  const bloques: Bloque[] = [
    { clase: 'fijo', texto: CONTROVERSIAS_ENCABEZADO, fundamento: 'Plantilla — controversias' },
  ];
  if (conArbitrales) {
    bloques.push(
      {
        clase: 'fijo',
        texto:
          variante === 'servicios'
            ? 'Para el caso de arbitraje, el postor ganador de la buena pro selecciona una de las siguientes Instituciones Arbitrales para administrarlo:'
            : 'Para el caso del arbitraje, el postor ganador de la buena pro selecciona una de las siguientes Instituciones Arbitrales para administrarlo:',
      },
      {
        clase: 'tabla',
        id: 'instituciones_arbitrales',
        etiqueta: 'Instituciones arbitrales',
        instruccion:
          'Señalar en orden alfabético el listado de TRES Instituciones Arbitrales propuestas por la entidad contratante',
        columnas: ['N.º', 'Instituciones Arbitrales', 'RUC'],
        minimo: 3,
      },
    );
  }
  return { id: 'controversias', titulo: 'Solución de controversias contractuales', bloques };
}

// ════════════════════════════════════════════════════════════════════
// Experiencia del postor — común a bienes y servicios
// ════════════════════════════════════════════════════════════════════

export const EXPERIENCIA_TITULAR =
  'Si el titular de la experiencia no es el postor, consignar si dicha experiencia corresponde a la matriz en caso de que el postor sea sucursal, o fue transmitida por reorganización societaria, debiendo acompañar la documentación sustentatoria correspondiente.';

export const EXPERIENCIA_REORGANIZACION =
  'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 14.';

// ════════════════════════════════════════════════════════════════════
// Secciones iniciales, idénticas en los 12 formatos de selección
// ════════════════════════════════════════════════════════════════════

/** Cabecera de datos del expediente. */
export function seccionEncabezado(etiquetaDenominacion: string): Seccion {
  return {
    id: 'encabezado',
    titulo: 'Datos de la contratación',
    bloques: [
      {
        clase: 'campo',
        id: 'organo',
        etiqueta: 'Órgano y/o Dirección (Área Usuaria)',
        ayuda: 'Indicar la denominación del órgano o unidad orgánica que requiere la contratación',
        tipo: 'texto',
        obligatorio: true,
      },
      {
        clase: 'campo',
        id: 'actividad_poi',
        etiqueta: 'Actividad del POI',
        ayuda: 'Indicar la actividad del POI con cargo a la cual se realiza la contratación',
        tipo: 'texto',
        obligatorio: true,
      },
      {
        clase: 'campo',
        id: 'numero_cmn',
        etiqueta: 'Número de CMN',
        ayuda: 'Indicar código del CMN del SIGA',
        tipo: 'texto',
        obligatorio: true,
      },
      {
        clase: 'campo',
        id: 'denominacion',
        etiqueta: 'Denominación de la contratación',
        ayuda: etiquetaDenominacion,
        tipo: 'texto',
        obligatorio: true,
      },
    ],
  };
}

export function seccionFinalidadPublica(ejemplo?: string): Seccion {
  return {
    id: 'finalidad_publica',
    titulo: 'FINALIDAD PÚBLICA DE LA CONTRATACIÓN',
    bloques: [
      {
        clase: 'redactado',
        id: 'finalidad',
        etiqueta: 'Finalidad pública',
        instruccion:
          'Detallar aquello que se busca satisfacer, mejorar y/o atender con la contratación requerida según las actividades previstas en el Plan Operativo Institucional (POI), así como las acciones y objetivos estratégicos del Plan Estratégico Institucional (PEI) de la Entidad',
        ejemplo,
        extension: 'parrafo',
      },
    ],
  };
}

export function seccionObjetivo(ejemploGeneral?: string, ejemploEspecifico?: string): Seccion {
  return {
    id: 'objetivo',
    titulo: 'OBJETIVO DE LA CONTRATACIÓN',
    bloques: [
      {
        clase: 'nota',
        texto:
          'El objetivo debe responder a la pregunta "qué quiero contratar" y "para qué quiero contratar".',
      },
    ],
    subsecciones: [
      {
        id: 'objetivo_general',
        titulo: 'Objetivo general',
        bloques: [
          {
            clase: 'redactado',
            id: 'objetivo_general',
            etiqueta: 'Objetivo general',
            instruccion:
              'Detallar el propósito de la contratación, o aquello que se espera lograr a través de la contratación requerida',
            ejemplo: ejemploGeneral,
            extension: 'parrafo',
          },
        ],
      },
      {
        id: 'objetivo_especifico',
        titulo: 'Objetivo específico',
        bloques: [
          {
            clase: 'redactado',
            id: 'objetivos_especificos',
            etiqueta: 'Objetivos específicos',
            instruccion: 'Enumerar los objetivos específicos que se desprenden del objetivo general',
            ejemplo: ejemploEspecifico,
            extension: 'lista',
          },
        ],
      },
    ],
  };
}

export function seccionAntecedentes(instruccion: string, ejemplo?: string): Seccion {
  return {
    id: 'antecedentes',
    titulo: 'ANTECEDENTES Y/O JUSTIFICACIÓN DE LA NECESIDAD DE LA CONTRATACIÓN',
    bloques: [
      {
        clase: 'redactado',
        id: 'antecedentes',
        etiqueta: 'Antecedentes y justificación',
        instruccion,
        ejemplo,
        extension: 'parrafo',
      },
    ],
  };
}

export function seccionSolicitante(): Seccion {
  return {
    id: 'solicitante',
    titulo: 'FUNCIONARIO Y/O SERVIDOR CIVIL SOLICITANTE',
    bloques: [
      {
        clase: 'campo',
        id: 'solicitante_nombre',
        etiqueta: 'Nombres y apellidos',
        ayuda: 'Consignar el funcionario o servidor civil que formula el requerimiento',
        tipo: 'texto',
        obligatorio: true,
      },
      {
        clase: 'campo',
        id: 'solicitante_cargo',
        etiqueta: 'Cargo',
        ayuda: 'Consignar el cargo del solicitante',
        tipo: 'texto',
        obligatorio: true,
      },
      {
        clase: 'campo',
        id: 'solicitante_fecha',
        etiqueta: 'Fecha',
        ayuda: 'Fecha de formulación del requerimiento',
        tipo: 'fecha',
        obligatorio: true,
      },
    ],
  };
}

// ════════════════════════════════════════════════════════════════════
// Topes normativos recurrentes
// ════════════════════════════════════════════════════════════════════

export const VALIDACION_ADELANTO = {
  id: 'adelanto_directo_max',
  descripcion:
    'Los adelantos directos no pueden exceder en conjunto el 30% del monto del contrato original.',
  fundamento: 'Plantilla — Condiciones de contratación, adelanto directo',
};

export const VALIDACION_EXPERIENCIA = {
  id: 'experiencia_max',
  descripcion:
    'El monto de facturación exigido como experiencia no puede ser mayor a tres veces la cuantía de la contratación o del ítem.',
  fundamento: 'Plantilla — Requisitos de calificación, experiencia del postor',
};

export const VALIDACION_MYPE = {
  id: 'experiencia_mype',
  descripcion:
    'Para micro y pequeña empresa, la experiencia exigida no debe superar el 25% de la cuantía de la contratación del ítem.',
  fundamento: 'Plantilla — Requisitos de calificación, régimen MYPE',
};

export const VALIDACION_JPRD = {
  id: 'jprd_umbral',
  descripcion:
    'La JPRD solo procede si el objeto es suministro de bienes y el monto contractual supera S/ 10 000 000,00.',
  fundamento: 'Plantilla — Solución de controversias contractuales',
};
