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
 * El procedimiento de descargos, redactado y listo.
 *
 * Debajo del cuadro de otras penalidades el formato deja un hueco para
 * que el área usuaria explique cómo se notifica el incumplimiento y en
 * qué plazo se descarga. Lo que había era un EJEMPLO, y un ejemplo no
 * se escribe solo: el apartado salía vacío salvo que alguien lo
 * redactara. Observación 14 de César (setiembre de 2026): "se debe
 * establecer el siguiente texto de manera predeterminada".
 *
 * Viene puesto y se puede cambiar: es el reparto institucional de
 * plazos —cinco días hábiles para descargar y cinco para resolver—, no
 * una cifra que dependa de la contratación.
 *
 * @param objeto Lo que se ejecuta. El texto de César dice
 *   "servicio/bien"; aquí se dice uno u otro según el formato, que para
 *   eso se sabe cuál es.
 */
export function procedimientoPenalidades(objeto: 'servicio' | 'bien' | 'obra'): string {
  const ejecucion = {
    servicio: 'la ejecución del servicio',
    bien: 'la entrega del bien',
    obra: 'la ejecución de la obra',
  }[objeto];
  return [
    `Cuando se verifique un supuesto de incumplimiento durante ${ejecucion}, la Unidad de Administración y/o la DEC, según corresponda, notificará al contratista, adjuntando la documentación sustentatoria.`,
    'El contratista contará con cinco (05) días hábiles, contados desde el día siguiente de recibida la notificación, para presentar sus descargos debidamente sustentados, acompañando la evidencia objetiva que considere pertinente, a través de lo establecido en el documento notificado por la Entidad.',
    'Recibidos los descargos, la Entidad los evaluará en un plazo máximo de cinco (05) días hábiles y emitirá la decisión correspondiente sobre la procedencia o improcedencia de la penalidad, observación u otra consecuencia contractual aplicable, comunicándola por escrito al contratista.',
  ].join('\n');
}

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

/**
 * Consultoría de obras lo dice distinto: "del componente o ítem".
 *
 * No es un descuido de su .docx —esos contratos se ejecutan por
 * componentes— y por eso no se unifica con el de los demás formatos.
 * El auditor lo destapó al cotejar los párrafos enteros: el nuestro
 * empezaba igual y se comía "componente o".
 */
export const TOPE_PENALIDADES_CONSULTORIA_OBRAS = TOPE_PENALIDADES.replace(
  'del ítem correspondiente',
  'del componente o ítem correspondiente',
);

export const VALIDACION_PENALIDADES = {
  id: 'penalidades_max',
  descripcion:
    'La suma de penalidades por mora y otras penalidades no debe exceder el 10% del monto vigente del contrato o del ítem.',
  fundamento: 'Plantilla — Penalidades',
};

export function seccionPenalidades(
  variante: 'corta' | 'larga' = 'larga',
  conTope: boolean | 'componentes' = false,
  objeto: 'servicio' | 'bien' | 'obra' = 'servicio',
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
            predeterminado: procedimientoPenalidades(objeto),
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
      texto: conTope === 'componentes' ? TOPE_PENALIDADES_CONSULTORIA_OBRAS : TOPE_PENALIDADES,
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

export const PAGO_CONSORCIO =
  'En el caso que se haya suscrito contrato con un consorcio, el pago se efectuará, a quien corresponda, conforme lo estipulado en el respectivo en el contrato de consorcio.';

export const PAGO_DOCUMENTACION =
  'Para efectos del pago de las contraprestaciones ejecutadas por el contratista, la entidad contratante debe contar con la siguiente documentación:';

/**
 * Bloques del apartado "Forma y requisitos de pago".
 *
 * Traía el plazo, dónde se presenta la documentación y los intereses,
 * pero se saltaba la mitad de lo que pide el formato: el consorcio, la
 * modalidad de pago, la relación de documentos exigibles y el pago
 * anticipado excepcional. César lo resumió así: "esta condición no se
 * alinea de acuerdo a lo planteado en el formato Word. Falta considerar
 * los requisitos de pago". Se completa contra sus .docx, que traen los
 * cuatro párrafos en trece de los quince.
 */
/**
 * Pago anticipado, total o parcial, al inicio del contrato.
 *
 * El formato lo trae entre corchetes y empieza por "De manera
 * excepcional": no es la regla, es una posibilidad que la entidad tiene
 * que sustentar. Va bajo su propio interruptor y solo entonces entra en
 * el documento. Lo traen siete de los quince formatos.
 */
export function bloquesPagoAnticipado(): Bloque[] {
  const soloSiAplica = { condicion: 'permite_pago_anticipado' } as const;
  return [
    {
      clase: 'fijo',
      etiqueta: 'Pago anticipado',
      texto:
        'De manera excepcional, se permitirá que el pago se realice de forma total o parcial al inicio de la vigencia contractual, siempre que se sustente que dicha modalidad es una condición de mercado indispensable para la ejecución de las obligaciones.',
      fundamento: 'Plantilla — pago anticipado',
      visibleSi: soloSiAplica,
    },
    {
      clase: 'fijo',
      texto: 'Para la procedencia del pago anticipado, se aplicarán las siguientes reglas:',
      fundamento: 'Plantilla — pago anticipado',
      visibleSi: soloSiAplica,
    },
    {
      clase: 'fijo',
      texto:
        'El contratista deberá entregar previamente una garantía conforme lo señalado en el numeral de “garantía de fiel cumplimiento”.',
      fundamento: 'Plantilla — pago anticipado',
      visibleSi: soloSiAplica,
    },
    {
      clase: 'fijo',
      texto:
        'En este supuesto, el área usuaria emitirá una primera conformidad para efectos estrictamente administrativos de pago y, posteriormente, la conformidad final al verificarse el cumplimiento total de la prestación.',
      fundamento: 'Plantilla — pago anticipado',
      visibleSi: soloSiAplica,
    },
  ];
}

export function bloquesPago(
  /**
   * "responsable de" o "responsable del", según el .docx.
   *
   * Sus formatos escriben esa frase de las dos maneras —seis con "de" y
   * siete con "del"— y el cotejo verbatim distingue la letra. No es una
   * errata que convenga unificar por nuestra cuenta: el documento tiene
   * que salir como su formato.
   */
  articuloConformidad: 'de' | 'del' = 'del',
): Bloque[] {
  return [
    { clase: 'fijo', texto: PAGO_PLAZO, fundamento: 'Plantilla — forma de pago' },
    { clase: 'fijo', texto: PAGO_CONSORCIO, fundamento: 'Plantilla — pago a consorcios' },
    bloqueModalidadPago(),

    { clase: 'fijo', texto: PAGO_DOCUMENTACION, fundamento: 'Plantilla — requisitos de pago' },
    {
      clase: 'parrafo',
      texto:
        `Documento en el que conste la conformidad de la prestación efectuada suscrita por el servidor responsable ${articuloConformidad} {{area_responsable_conformidad}}.`,
      campos: [
        {
          clase: 'campo',
          id: 'area_responsable_conformidad',
          etiqueta: 'Área responsable de otorgar la conformidad',
          ayuda: 'Registrar la denominación del área responsable de otorgar la conformidad',
          tipo: 'texto',
          obligatorio: true,
        },
      ],
    },
    { clase: 'fijo', texto: 'Comprobante de pago.', fundamento: 'Plantilla — requisitos de pago' },
    {
      clase: 'campo',
      id: 'otra_documentacion_pago',
      etiqueta: 'Otra documentación exigible para el pago',
      ayuda:
        'Consignar otra documentación necesaria a ser presentada para el pago único o los pagos a cuenta, según corresponda',
      tipo: 'texto_largo',
      // El formato dice "según corresponda": puede no haber ninguna.
      obligatorio: false,
    },
    bloqueCanalPago(),

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
/**
 * La metodología con la que César pide que se construyan los cuatro
 * apartados de cabecera (observación 2 del documento de setiembre).
 *
 * Va aquí, en los constructores comunes, y no en cada plantilla, porque
 * su indicación es expresa: «esta misma lógica es para todos los
 * requerimientos sin excepción alguno». La instrucción del formato
 * oficial se conserva —es la que manda sobre el contenido— y esto se le
 * añade como método para construirlo.
 */
const METODO_FINALIDAD =
  ' Construye la finalidad respondiendo: ¿para qué necesita la Entidad ese resultado y qué beneficio institucional o público genera?';

const METODO_OBJETIVO_GENERAL =
  ' Construye el objetivo respondiendo: ¿qué resultado principal quiero obtener con la contratación y para qué me sirve? Redáctalo como RESULTADO, con verbo de resultado, no como una lista de actividades del contratista.';

const METODO_OBJETIVOS_ESPECIFICOS =
  ' Construye cada uno respondiendo: ¿qué resultados parciales y verificables necesito obtener para alcanzar el resultado principal? Son RESULTADOS, con verbo de resultado, no actividades del contratista: si lo que escribes describe lo que hará el proveedor en vez de lo que la Entidad obtendrá, está mal planteado.';

const METODO_ANTECEDENTES =
  ' Construye el apartado respondiendo tres preguntas, en este orden: ¿cuál es el contexto y de dónde nace la necesidad? (antecedentes); ¿qué hace falta solucionar o atender? (necesidad o problema); ¿por qué debe atenderse y por qué la contratación es necesaria? (justificación).';

/**
 * La fórmula con la que se nombra una contratación. La denominación se
 * escribe a mano —es un campo, no un apartado redactado—, así que lo
 * único que guía al área usuaria es este texto de ayuda.
 */
const FORMULA_DENOMINACION =
  ' Constrúyela con esta fórmula: [tipo de prestación] + [qué se contrata] + [característica principal, cuando sea necesaria] + [ámbito o destino, cuando corresponda].';

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
        ayuda: etiquetaDenominacion + FORMULA_DENOMINACION,
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
          'Detallar aquello que se busca satisfacer, mejorar y/o atender con la contratación requerida según las actividades previstas en el Plan Operativo Institucional (POI), así como las acciones y objetivos estratégicos del Plan Estratégico Institucional (PEI) de la Entidad' +
          METODO_FINALIDAD,
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
              'Detallar el propósito de la contratación, o aquello que se espera lograr a través de la contratación requerida' +
              METODO_OBJETIVO_GENERAL,
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
            instruccion:
              'Enumerar los objetivos específicos que se desprenden del objetivo general' +
              METODO_OBJETIVOS_ESPECIFICOS,
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
        instruccion: instruccion + METODO_ANTECEDENTES,
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

/**
 * Los tres párrafos del adelanto directo, con sus cuatro huecos.
 *
 * El formato no pide un porcentaje suelto: trae la cláusula redactada y
 * solo deja que la Entidad diga cuántos adelantos, qué porcentaje y los
 * dos plazos. Ocho formatos ya lo traían así y dos —Contrato menor TDR
 * y Consultoría de obras— se habían quedado con un campo aislado.
 * Observación 13 de César (setiembre de 2026): "para todos los casos se
 * debe replicar como se estableció (...) en otros se encuentra con esta
 * estructura que debe ser alineada de acuerdo a la estructura
 * precedente". Se unifica aquí para que no vuelvan a separarse.
 *
 * No aplica a ejecución de obras: allí el adelanto se rige por su
 * propio régimen —directo, de materiales y por avance—, con otros topes
 * y otros plazos.
 *
 * @param nota Advertencia previa. Cada formato trae la suya, con su
 *   propio fundamento, y por eso no se fija aquí.
 */
export function seccionAdelantoDirecto(nota?: string): Seccion {
  return {
    id: 'adelanto_directo',
    titulo: 'Adelanto directo',
    condicion: 'otorga_adelanto',
    bloques: [
      ...(nota ? [{ clase: 'nota' as const, texto: nota }] : []),
      {
        clase: 'parrafo',
        texto:
          'La entidad contratante otorgará {{adelanto_cantidad}} adelantos directos por el {{adelanto_porcentaje}} del monto del contrato original.',
        campos: [
          {
            clase: 'campo',
            id: 'adelanto_cantidad',
            etiqueta: 'Número de adelantos',
            ayuda: 'Consignar número de adelantos a otorgarse',
            tipo: 'numero',
            obligatorio: true,
          },
          {
            clase: 'campo',
            id: 'adelanto_porcentaje',
            etiqueta: 'Porcentaje de adelanto directo',
            ayuda:
              'Consignar porcentaje, considerando que los adelantos directos no pueden exceder en conjunto del 30% del monto del contrato original',
            tipo: 'numero',
            obligatorio: true,
            validacion: 'adelanto_directo_max',
          },
        ],
      },
      {
        clase: 'parrafo',
        texto:
          'El contratista debe solicitar los adelantos dentro de los {{adelanto_plazo_solicitud}} días siguientes de perfeccionamiento del contrato, adjuntando a su solicitud la garantía por adelantos acompañada del comprobante de pago correspondiente. Vencido dicho plazo no procede la solicitud del adelanto.',
        campos: [
          {
            clase: 'campo',
            id: 'adelanto_plazo_solicitud',
            etiqueta: 'Plazo para solicitar el adelanto',
            ayuda: 'Consignar plazo en días',
            tipo: 'dias',
            obligatorio: true,
          },
        ],
      },
      {
        clase: 'parrafo',
        texto:
          'La Entidad otorgará el adelanto dentro de los {{adelanto_plazo_entrega}} días calendario siguientes a la presentación de la solicitud, siempre que esta cumpla con los requisitos establecidos en el contrato y en la normativa vigente.',
        campos: [
          {
            clase: 'campo',
            id: 'adelanto_plazo_entrega',
            etiqueta: 'Plazo para entregar el adelanto',
            ayuda: 'Consignar plazo en días calendario',
            tipo: 'dias',
            obligatorio: true,
          },
        ],
      },
    ],
  };
}

/**
 * Confidencialidad, seguridad de la información y propiedad intelectual.
 *
 * César reemplazó el artículo entero. Observación 17 (setiembre de
 * 2026): "este artículo debe ser reemplazado por el siguiente texto",
 * con cuatro apartados en vez de tres y otro orden en el título.
 *
 * Lo sustancial no es la redacción sino que cada apartado lleve su
 * propio interruptor: "dado que, en algunas contrataciones, solo le
 * aplicará uno de ellos, a otros 2 de ello y otros ninguno". Un
 * servicio de limpieza no accede a los sistemas de la Entidad; una
 * consultoría que entrega un estudio sí genera propiedad intelectual.
 *
 * @param porDefecto Si los cuatro apartados nacen encendidos. En los
 *   tres formatos de contrato menor sí: el artículo ya estaba en su
 *   .docx. Los doce restantes no lo traen, así que nacen apagados y su
 *   documento no cambia mientras nadie los active.
 */
export function seccionConfidencialidad(porDefecto = true): Seccion {
  const apartado = (
    id: string,
    titulo: string,
    condicion: string,
    bloques: Bloque[],
  ): Seccion => ({ id, titulo, condicion, condicionPorDefecto: porDefecto, bloques });

  return {
    id: 'confidencialidad',
    titulo: 'Confidencialidad, seguridad de la información y propiedad intelectual',
    bloques: [],
    subsecciones: [
      apartado('confidencialidad_reserva', 'Confidencialidad', 'aplica_confidencialidad', [
        {
          clase: 'fijo',
          texto:
            'El contratista deberá guardar reserva y confidencialidad respecto de la información no pública a la que tenga acceso con ocasión de la ejecución contractual, cualquiera sea su naturaleza o medio de almacenamiento.',
          fundamento: 'Plantilla — confidencialidad',
        },
        {
          clase: 'fijo',
          texto:
            'En tal sentido, se obliga a:\nUtilizar la información exclusivamente para el cumplimiento del objeto contractual.\nNo divulgar, transferir, reproducir ni poner la información a disposición de terceros, salvo autorización de la Entidad u obligación legal.\nAdoptar las medidas razonables para evitar su pérdida, alteración, acceso no autorizado, divulgación o uso indebido.\nExtender estas obligaciones a su personal, colaboradores y terceros vinculados a la ejecución contractual.',
          lista: true,
        },
        {
          clase: 'fijo',
          texto:
            'Al culminar la prestación, deberá devolver, entregar, eliminar o destruir, según corresponda y conforme a las instrucciones de la Entidad, la información proporcionada por esta, salvo aquella cuya conservación sea exigida legalmente.',
        },
        {
          clase: 'fijo',
          texto:
            'La obligación de confidencialidad subsistirá después de culminada la relación contractual mientras la información conserve su carácter reservado, confidencial o restringido.',
        },
      ]),
      apartado('seguridad_informacion', 'Seguridad de la información', 'aplica_seguridad_informacion', [
        {
          clase: 'fijo',
          texto:
            'Cuando la ejecución contractual implique acceso a sistemas, plataformas, equipos, redes, cuentas, instalaciones o recursos tecnológicos de la Entidad, el contratista deberá adoptar las medidas necesarias para proteger la información y los recursos a los que tenga acceso.',
          fundamento: 'Plantilla — seguridad de la información',
        },
        {
          clase: 'fijo',
          texto:
            'En particular, deberá:\nUtilizar los accesos y recursos otorgados exclusivamente para el cumplimiento del objeto contractual.\nMantener la confidencialidad de las credenciales, mecanismos de autenticación y demás elementos de acceso que le sean proporcionados.\nEvitar accesos, modificaciones, copias, transferencias o usos no autorizados de la información o recursos de la Entidad.\nComunicar oportunamente cualquier incidente, pérdida, vulneración o acceso no autorizado que pudiera afectar la información o recursos de la Entidad.',
          lista: true,
        },
        {
          clase: 'fijo',
          texto:
            'Los accesos otorgados tendrán carácter temporal y limitado a lo estrictamente necesario para la ejecución contractual y serán revocados cuando corresponda.',
        },
        {
          clase: 'fijo',
          texto:
            'Al término de la prestación, el contratista deberá cesar todo acceso a los sistemas, equipos, cuentas o recursos de la Entidad y devolver los elementos proporcionados, cuando corresponda.',
        },
      ]),
      apartado('propiedad_intelectual', 'Propiedad intelectual', 'aplica_propiedad_intelectual', [
        {
          clase: 'fijo',
          texto:
            'Cuando como resultado de la ejecución contractual se generen documentos, informes, estudios, diseños, contenidos, desarrollos u otros productos susceptibles de protección por propiedad intelectual, se aplicará lo establecido en los documentos contractuales y en la normativa vigente.',
          fundamento: 'Plantilla — propiedad intelectual',
        },
        {
          clase: 'fijo',
          texto:
            'Cuando corresponda, los derechos patrimoniales sobre los productos específicamente desarrollados para la Entidad serán transferidos o cedidos en los términos establecidos contractualmente, sin afectar los derechos morales reconocidos por ley ni los derechos preexistentes del contratista o de terceros.',
        },
        {
          clase: 'fijo',
          texto:
            'El contratista será responsable por las infracciones de derechos de propiedad intelectual que le sean atribuibles respecto de los productos o materiales entregados a la Entidad.',
        },
        {
          clase: 'fijo',
          texto:
            'Los materiales, herramientas, metodologías, conocimientos, software, diseños u otros elementos preexistentes del contratista o de terceros no se entenderán transferidos a la Entidad por el solo hecho de ser utilizados durante la ejecución contractual, salvo disposición contractual expresa.',
        },
      ]),
      apartado('incumplimiento_confidencialidad', 'Incumplimiento', 'aplica_incumplimiento_confidencialidad', [
        {
          clase: 'fijo',
          texto:
            'El incumplimiento de las obligaciones seleccionadas en materia de confidencialidad, seguridad de la información o propiedad intelectual constituirá incumplimiento contractual, sin perjuicio de las consecuencias previstas en la normativa vigente y en los documentos que integran el contrato.',
          fundamento: 'Plantilla — consecuencias del incumplimiento',
        },
        {
          clase: 'fijo',
          texto:
            'De corresponder, la Entidad podrá aplicar las penalidades previstas, adoptar las medidas contractuales pertinentes, exigir la reparación de los daños y perjuicios y comunicar los hechos a las autoridades competentes.',
        },
      ]),
    ],
  };
}

/**
 * Cómo se construye el apartado de recursos a cargo de la Entidad.
 *
 * Observación 18 de César (setiembre de 2026). El formato dice QUÉ va
 * en el apartado; esto dice cómo decidir su contenido, que es lo que
 * fallaba: se proponían recursos por defecto, "por si acaso", en
 * contrataciones que no necesitan nada de la Entidad.
 */
export const METODO_RECURSOS_ENTIDAD =
  ' Antes de redactar, determina si por la naturaleza y forma de ejecución de la contratación resulta necesario que la Entidad proporcione algo: si la prestación puede ejecutarse sin intervención suya, dilo y no propongas nada. Si corresponde, propón ÚNICAMENTE lo necesario, pertinente y directamente vinculado a la ejecución, entre: información, documentos o datos; ambientes, instalaciones o espacios; acceso a sistemas, plataformas o infraestructura; equipos, herramientas o recursos de propiedad de la Entidad; coordinaciones, autorizaciones o facilidades; designación de responsables o puntos de coordinación; y otras obligaciones indispensables de la Entidad. De cada uno comprueba su necesidad, oportunidad, disponibilidad y relación directa con la prestación. No inventes recursos, bienes, información, accesos, responsables, plazos ni obligaciones que no estén sustentados en lo que se te ha dado, ni traslades al contratista obligaciones que corresponden a la Entidad, ni a la inversa. Cierra siempre con una de estas dos cosas: la relación de lo que la Entidad debe proporcionar, o una línea diciendo que no corresponde y por qué. No devuelvas este apartado entre corchetes: decidir si corresponde es parte de tu trabajo, no un dato que falte.';

/**
 * Cómo se decide si hacen falta verificaciones técnicas.
 *
 * Observación 19 de César (setiembre de 2026). El riesgo aquí es el
 * contrario del de otros apartados: pedir ensayos "por si acaso"
 * encarece la oferta y deja fuera a quien no puede costearlos, y el
 * cumplimiento de muchas prestaciones se acredita sin más que revisar
 * el entregable.
 */
export const METODO_VERIFICACIONES =
  ' Antes de redactar, evalúa si por la naturaleza y complejidad de esta contratación hace falta comprobar algo. Hace falta cuando una característica exigida NO se puede comprobar mirando el entregable —resistencia, composición, rendimiento, calibración, seguridad, interoperabilidad, condiciones sanitarias— y solo se acredita con una prueba, un ensayo, una inspección o una revisión documental específica. No hace falta cuando el propio entregable evidencia el cumplimiento, y en ese caso dilo en una línea y no propongas ninguna. Si corresponde, precisa de cada una, según aplique: qué aspecto o característica se verifica; con qué método o procedimiento; qué prueba, ensayo, inspección, simulación o revisión documental; con qué criterios objetivos se determina el cumplimiento; en qué momento se verifica; y qué evidencia sustenta la conformidad. Cada verificación debe ser objetiva, pertinente, necesaria, proporcional y estar directamente vinculada a las características, condiciones, actividades, entregables y resultados exigidos: no pidas ensayos de más, que encarecen la oferta y dejan fuera a quien no puede costearlos. No inventes métodos, normas técnicas, parámetros, tolerancias, equipos, laboratorios, frecuencias ni criterios de aceptación que no estén sustentados en lo que se te ha dado; si el ensayo corresponde pero su parámetro es un dato del área usuaria —edad de rotura, número de probetas, tolerancia admisible—, nómbralo con [Pendiente: qué falta] en vez de callarlo.';

/** El párrafo con la modalidad de pago, que ahora se elige. */
export function bloqueModalidadPago(): Bloque {
  return {
    clase: 'parrafo',
    texto:
      'La entidad contratante realiza el pago de la contraprestación pactada a favor del contratista mediante {{modalidad_pago_principal}}{{modalidad_pago_detalle}}.',
    campos: [
      {
        // Se elige, no se escribe. Observación 20 de César (setiembre
        // de 2026): "debe haber dos opciones a elección del área
        // usuaria: pago único, pago a cuenta".
        clase: 'campo',
        id: 'modalidad_pago_principal',
        etiqueta: 'Modalidad de pago',
        ayuda: 'Elegir si la contraprestación se paga de una sola vez o en pagos a cuenta',
        tipo: 'opciones',
        opciones: [
          { valor: 'unico', texto: 'un único pago' },
          { valor: 'a_cuenta', texto: 'pagos a cuenta' },
        ],
        permiteOtro: true,
        obligatorio: true,
      },
      {
        // El detalle del pago a cuenta. Va vacío por defecto: con
        // pago único no hay nada que detallar y la frase se cierra
        // sola. Con "otro" el área usuaria escribe el suyo, que es
        // donde cabe el número de pagos —"en tres (03) pagos por
        // entregable"—.
        clase: 'campo',
        id: 'modalidad_pago_detalle',
        etiqueta: 'Detalle del pago a cuenta',
        ayuda:
          'Solo si se eligieron pagos a cuenta: con qué periodicidad o contra qué se pagan, y cuántos son',
        tipo: 'opciones',
        opciones: [
          { valor: '', texto: '— sin detalle —' },
          { valor: 'mensual', texto: ', de periodicidad mensual' },
          { valor: 'entregable', texto: ', por cada entregable' },
          { valor: 'avance', texto: ', por avance' },
          { valor: 'parcial', texto: ', por entrega parcial' },
        ],
        permiteOtro: true,
        obligatorio: false,
      },
    ],
  };
}

/** Por dónde se presenta la documentación para el pago. */
export function bloqueCanalPago(): Bloque {
  return {
    clase: 'parrafo',
    texto:
      'Salvo los documentos de conformidad, el contratista debe presentar la documentación restante a través de {{pago_canal_medio}} ({{pago_canal}}).',
    campos: [
      {
        // Antes se pedía la dependencia y su dirección a mano.
        // Observación 20 de César (setiembre de 2026): "ese recuadro
        // debe suprimirse, en su reemplazo activar pestañas de
        // elección", con un campo para el correo o el enlace.
        clase: 'campo',
        id: 'pago_canal_medio',
        etiqueta: 'Medio de presentación de la documentación de pago',
        ayuda: 'Elegir por dónde se presenta la documentación para el pago',
        tipo: 'opciones',
        opciones: [
          { valor: 'mesa_partes', texto: 'la mesa de partes virtual de la Entidad' },
          { valor: 'correo', texto: 'el correo electrónico institucional' },
          {
            valor: 'ambos',
            texto: 'la mesa de partes virtual de la Entidad y el correo electrónico institucional',
          },
        ],
        permiteOtro: true,
        obligatorio: true,
      },
      {
        clase: 'campo',
        id: 'pago_canal',
        etiqueta: 'Correo y/o enlace de la mesa de partes',
        ayuda: 'Consignar el correo electrónico institucional y/o el enlace de la mesa de partes virtual',
        tipo: 'texto',
        obligatorio: true,
      },
    ],
  };
}

/**
 * Cómo se decide qué le toca poner al contratista.
 *
 * Observación 21 de César (setiembre de 2026). El aviso que la cierra
 * es el importante: lo que se exige aquí son condiciones de ejecución,
 * no requisitos de calificación. Colar un perfil o una acreditación en
 * este apartado cambia quién puede presentarse a la convocatoria.
 */
export const METODO_RECURSOS_CONTRATISTA =
  ' Antes de redactar, determina si la ejecución exige del contratista algo que no esté ya definido en las características técnicas, las actividades o los entregables: si no lo exige, dilo en una línea y no añadas condiciones. Si lo exige, propón ÚNICAMENTE lo necesario, pertinente, proporcional y directamente vinculado a la ejecución, entre: personal, equipos, herramientas, materiales, insumos o infraestructura; medios técnicos, logísticos, tecnológicos o de comunicación; traslados, coordinación y facilidades; medidas de seguridad, protección o prevención cuando correspondan; las obligaciones necesarias para alcanzar los resultados y entregables; y otras directamente relacionadas con la correcta ejecución. Comprueba que cada exigencia sea necesaria, razonable, proporcional, verificable y coherente con el objeto, las actividades, las condiciones y los resultados. No inventes personal, equipos, materiales, herramientas, recursos, procedimientos, estándares ni obligaciones que no estén sustentados en lo que se te ha dado. Y no conviertas esto en requisitos de calificación: aquí van condiciones de ejecución del contrato, no perfiles ni acreditaciones que decidan quién puede presentarse. Y no fijes por tu cuenta niveles de servicio, horarios de atención, frecuencias, tiempos de respuesta ni porcentajes de disponibilidad —nada de "las veinticuatro horas, los siete días"— si no te los han dado: si el dato hace falta, escríbelo como [Pendiente: qué falta].';

export const VALIDACION_EXPERIENCIA = {
  id: 'experiencia_max',
  descripcion:
    'El monto de facturación exigido como experiencia no puede ser mayor a tres veces la cuantía de la contratación o del ítem.',
  fundamento: 'Plantilla — Requisitos de calificación, experiencia del postor',
  factor: 3,
};

/** Consultoría en general se limita a UNA vez la cuantía, no a tres. */
export const VALIDACION_EXPERIENCIA_CONSULTORIA = {
  id: 'experiencia_max',
  descripcion:
    'El monto de facturación exigido como experiencia no puede ser mayor a una vez el valor de la cuantía de la contratación o del ítem.',
  fundamento: 'Plantilla — Requisitos de calificación, experiencia del postor',
  factor: 1,
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
