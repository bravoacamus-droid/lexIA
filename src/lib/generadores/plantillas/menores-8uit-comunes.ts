/**
 * Bloques propios de la familia MENORES A 8 UIT.
 *
 * Los tres formatos —EETT, TDR y TDR para locadores— comparten un
 * conjunto de cláusulas que NO existen en los procedimientos de
 * selección, porque un contrato menor se rige por reglas distintas:
 *
 *  · Las controversias se resuelven OBLIGATORIAMENTE por conciliación,
 *    no por arbitraje. No hay instituciones arbitrales que elegir.
 *  · La garantía de fiel cumplimiento NO es exigible por regla general,
 *    salvo que se otorgue adelanto.
 *  · La cláusula de gestión de riesgos NO es exigible.
 *  · La penalidad por mora se calcula con una fórmula explícita, con F
 *    fijado en 0.40, en vez de remitir al artículo 120 del Reglamento.
 *  · Aparecen seguridad de la información, confidencialidad y propiedad
 *    intelectual, que en los formatos grandes no están.
 *
 * Estas cláusulas son afirmaciones sobre el régimen aplicable, no
 * opciones: el área usuaria no elige si la garantía es exigible. Por eso
 * van como texto fijo.
 */
import type { Bloque, Seccion } from '../plantilla-tipos';

export const PENALIDAD_MORA_8UIT_ENCABEZADO =
  'El contrato establece la penalidad por mora y otras penalidades aplicables al contratista ante el incumplimiento injustificado de sus obligaciones contractuales.';

export const PENALIDAD_TOPE_8UIT =
  'La suma de la aplicación de las penalidades por mora y de otras penalidades no debe exceder el 10% del monto vigente del contrato o, de ser el caso, del ítem correspondiente.';

export const PENALIDAD_DEDUCCION_8UIT =
  'Estas penalidades se deducen de los pagos a cuenta, pagos parciales o del pago o liquidación final, según corresponda; o si fuera necesario, se descuenta del monto resultante de la ejecución de la garantía de fiel cumplimiento.';

export const PENALIDAD_MORA_8UIT_FORMULA =
  'En caso de retraso injustificado del contratista en la ejecución de las prestaciones objeto del contrato, la entidad contratante le aplica automáticamente una penalidad por mora por cada día de atraso que le sea imputable. La penalidad se aplica automáticamente y se calcula de acuerdo con la siguiente fórmula:';

/**
 * Las penalidades de los contratos menores.
 *
 * `encabezaOtrasPenalidades` existe porque el ANEXO 1 —bienes— abre el
 * cuadro de otras penalidades con una frase que el ANEXO 2 —servicios—
 * y el ANEXO 3 —locadores— no traen. César pidió esa frase en agosto
 * de 2026, y se pone donde el formato la tiene: añadirla donde no está
 * sería inventar texto en un documento que se firma, y la auditoría
 * contra sus Word lo cazaría.
 */
export function seccionPenalidades8Uit(
  opciones: { encabezaOtrasPenalidades?: boolean } = {},
): Seccion {
  return {
    id: 'penalidades',
    titulo: 'Penalidades',
    bloques: [
      { clase: 'fijo', texto: PENALIDAD_MORA_8UIT_ENCABEZADO, fundamento: 'Plantilla — contratos menores' },
      { clase: 'fijo', texto: PENALIDAD_TOPE_8UIT, fundamento: 'Plantilla — tope de penalidades' },
      { clase: 'fijo', texto: PENALIDAD_DEDUCCION_8UIT },
    ],
    subsecciones: [
      {
        id: 'penalidad_mora',
        titulo: 'Penalidad por mora',
        bloques: [
          { clase: 'fijo', texto: PENALIDAD_MORA_8UIT_FORMULA },
          {
            // La fórmula va como nota y no como tabla porque en el
            // original es una expresión matemática maquetada, no un
            // cuadro de datos.
            clase: 'nota',
            texto:
              'Penalidad diaria = (0.10 × Monto vigente) / (F × Plazo vigente en días), donde F = 0.40.',
          },
          {
            // El párrafo con que el formato cierra la fórmula, y que no
            // estaba. Observación de César (agosto de 2026): "a la
            // penalidad por mora, faltó agregar el siguiente texto".
            //
            // No es un detalle: dice sobre qué monto y qué plazo se
            // calcula la penalidad —el del contrato, el del componente,
            // el del ítem o el del entregable retrasado—, que es
            // justamente lo que se discute cuando se aplica.
            clase: 'fijo',
            texto:
              'Tanto el monto como el plazo se refieren, según corresponda, al monto vigente del contrato, componente o ítem que debió ejecutarse o, en caso de que estos involucren entregables cuantificables en monto y plazo, al monto y plazo del entregable que fuera materia de retraso.',
          },
        ],
      },
      {
        id: 'otras_penalidades',
        titulo: 'Otras penalidades aplicables',
        condicion: 'tiene_otras_penalidades',
        bloques: [
          ...(opciones.encabezaOtrasPenalidades
            ? [
                {
                  // El encabezado con que el formato de bienes abre el
                  // cuadro, y que faltaba. Observación de César (agosto
                  // de 2026): "a las otras penalidades le faltó
                  // considerar el siguiente texto".
                  clase: 'fijo' as const,
                  texto:
                    'Adicionalmente a la penalidad por mora, se aplicarán las siguientes penalidades:',
                },
              ]
            : []),
          {
            clase: 'tabla',
            id: 'otras_penalidades',
            etiqueta: 'Otras penalidades',
            instruccion:
              'Detallar el supuesto de aplicación, la forma de cálculo y el procedimiento de verificación de cada penalidad distinta a la mora',
            columnas: ['N°', 'Supuestos de aplicación de penalidad', 'Forma de cálculo', 'Procedimiento y medios de verificación'],
            minimo: 1,
          },
        ],
      },
    ],
  };
}

/** Régimen del contrato menor: controversias, garantías y riesgos. */
export function seccionesRegimenContratoMenor(): Seccion[] {
  return [
    {
      id: 'controversias',
      titulo: 'Solución de controversias en contratos menores',
      bloques: [
        {
          clase: 'fijo',
          texto:
            'Todas las controversias que surjan entre las partes sobre la validez, nulidad, interpretación, ejecución, terminación o eficacia de la presente contratación calificada como contrato menor, se resuelven obligatoriamente mediante un procedimiento de conciliación, de conformidad con el numeral 81.3 del artículo 81 de la Ley N° 32069.',
          fundamento: 'Ley N° 32069, art. 81.3',
        },
        {
          clase: 'fijo',
          texto:
            'Según lo dispuesto en el numeral 330.1 del artículo 330 del Reglamento, en el caso específico de contratos menores, la conciliación es el mecanismo habilitado para resolver incluso controversias sobre nulidad del contrato. El procedimiento se solicita ante un centro de conciliación acreditado por el Ministerio de Justicia y Derechos Humanos. En caso de requerirse una resolución autoritativa para arribar a un acuerdo, el plazo de suspensión del procedimiento es de quince (15) días hábiles.',
          fundamento: 'Reglamento, art. 330.1',
        },
      ],
    },
    {
      id: 'garantia_fiel_cumplimiento',
      titulo: 'Garantía de fiel cumplimiento en los contratos menores',
      bloques: [
        {
          clase: 'fijo',
          texto:
            'En atención a que la presente contratación corresponde a un monto igual o inferior a ocho (8) Unidades Impositivas Tributarias (UIT), y de conformidad con lo dispuesto en el numeral 227.5 del artículo 227 del Reglamento de la Ley N° 32069, por regla general no resulta exigible la presentación de la Garantía de Fiel Cumplimiento.',
          fundamento: 'Reglamento, art. 227.5',
        },
        {
          clase: 'fijo',
          texto:
            'Sin embargo, en el supuesto de que la Entidad prevea la entrega de un pago anticipado (adelanto), el contratista queda obligado a presentar previamente una garantía por idéntico monto al adelanto solicitado, de conformidad con el numeral 67.2 del artículo 67 de la Ley y el numeral 145.2 del artículo 145 del Reglamento.',
          fundamento: 'Ley N° 32069, art. 67.2; Reglamento, art. 145.2',
        },
        {
          clase: 'fijo',
          texto:
            'En tal sentido, el contrato incorpora las cláusulas obligatorias previstas en los literales b), c) y d) del artículo 60 de la citada Ley, referidas a anticorrupción y antisoborno, solución de controversias y resolución de contrato por incumplimiento. Únicamente en caso de otorgarse adelantos, se incluirá adicionalmente la cláusula de garantías prevista en el literal a) del artículo 60 de la Ley.',
          fundamento: 'Ley N° 32069, art. 60',
        },
      ],
    },
    {
      id: 'gestion_riesgos',
      titulo: 'Gestión de riesgos en contratos menores',
      bloques: [
        {
          clase: 'fijo',
          texto:
            'En atención a que la presente contratación califica como un contrato menor (monto igual o inferior a 8 UIT), y de conformidad con lo establecido en el numeral 227.5 del artículo 227 del Reglamento de la Ley N° 32069, no resulta exigible la incorporación de la cláusula de “Gestión de Riesgos” prevista en el literal e) del artículo 60 de la citada Ley.',
          fundamento: 'Reglamento, art. 227.5',
        },
      ],
    },
    {
      id: 'resolucion_contrato',
      titulo: 'Resolución de contrato por incumplimiento en los contratos menores',
      bloques: [
        {
          clase: 'fijo',
          texto:
            'Cualquiera de las partes puede resolver total o parcialmente el contrato cuando se configuren los siguientes supuestos:',
          fundamento: 'Plantilla — contratos menores',
        },
        {
          // Lista cerrada de causales. No admite ampliación por el área
          // usuaria: son las que la norma habilita.
          clase: 'fijo',
          texto:
            'Ocurre un caso fortuito o fuerza mayor que imposibilita la continuación del contrato.\nSe produce el incumplimiento de obligaciones contractuales, por causa atribuible a la parte que incumple.\nSe presenta un hecho sobreviniente al perfeccionamiento del contrato, de supuesto distinto al caso fortuito o fuerza mayor, no imputable a ninguna de las partes, que imposibilite la continuidad del contrato.\nPor incumplimiento la cláusula anticorrupción.\nPor la presentación de documentación falsa o inexacta durante la ejecución contractual.\nSe configura una condición de terminación anticipada establecida en el contrato, de acuerdo con los supuestos que se establezcan en el reglamento para su aplicación.\nSe alcanza el monto máximo permitido por penalidades por mora y otras penalidades, durante la ejecución de la prestación a cargo del contratista.\nCuando la entidad sustente de manera objetiva que, la situación de incumplimiento ya no pueda ser revertida.',
                  lista: true,
        },
        {
          clase: 'fijo',
          texto:
            'Las partes podrán resolver el contrato por mutuo acuerdo, siempre que la prestación objeto de resolución sea autónoma respecto de las demás obligaciones contractuales y no ocasione perjuicio económico a la Entidad. En este supuesto, la resolución debe contar previamente con la opinión favorable del área usuaria.',
        },
      ],
    },
  ];
}

/** Seguridad de la información, confidencialidad y propiedad intelectual. */
/**
 * `conIncumplimiento` porque los dos anexos de servicios cierran la
 * cláusula con las consecuencias de romperla y el de bienes no.
 */
export function seccionConfidencialidad(conIncumplimiento = false): Seccion {
  const bloques: Bloque[] = [
    {
      clase: 'fijo',
      texto:
        'El contratista se obliga a guardar estricta reserva y confidencialidad respecto de toda información a la que tenga acceso como consecuencia de la ejecución del contrato, sea esta de naturaleza técnica, administrativa, operativa, legal, financiera o de cualquier otra índole vinculada a la Entidad.',
      fundamento: 'Plantilla — confidencialidad',
    },
    {
      clase: 'fijo',
      texto:
        'Se considera información confidencial, sin carácter limitativo:\nInformación técnica relacionada con infraestructura tecnológica, sistemas, configuraciones, diagramas, redes o equipamiento.\nDocumentación administrativa o contractual.\nDatos personales o información de acceso restringido.\nInformación verbal, escrita, digital, magnética o en cualquier otro soporte.',
          lista: true,
    },
    {
      clase: 'fijo',
      texto:
        'El contratista se compromete a:\nUtilizar la información única y exclusivamente para la ejecución del contrato.\nNo divulgarla, transferirla, reproducirla ni ponerla a disposición de terceros sin autorización previa y expresa de la Entidad.\nAdoptar las medidas de seguridad necesarias para evitar su pérdida, alteración, acceso no autorizado o uso indebido.\nExtender esta obligación a su personal, técnicos, subcontratistas o cualquier tercero vinculado a la ejecución del servicio, siendo responsable solidariamente por su incumplimiento.',
          lista: true,
    },
  ];
  const subsecciones: Seccion[] = [
      {
        id: 'propiedad_intelectual',
        titulo: 'Propiedad Intelectual',
        bloques: [
          {
            clase: 'fijo',
            texto:
              'Toda documentación, informes, registros técnicos, configuraciones, manuales, esquemas, reportes, archivos digitales, software u otros materiales que se generen como resultado de la ejecución del servicio serán de propiedad exclusiva de la Entidad.',
            fundamento: 'Plantilla — propiedad intelectual',
          },
          {
            clase: 'fijo',
            texto:
              'El contratista cede en forma definitiva, exclusiva, ilimitada y a título gratuito los derechos patrimoniales sobre los productos generados, pudiendo la Entidad utilizarlos, reproducirlos, modificarlos o disponer de ellos sin restricción alguna.',
          },
          {
            clase: 'fijo',
            texto:
              'La cesión no limita el reconocimiento de los derechos morales que correspondan conforme a ley, cuando resulte aplicable.',
          },
        ],
      },
  ];

  if (conIncumplimiento) {
    subsecciones.push({
      id: 'incumplimiento',
      titulo: 'Incumplimiento',
      bloques: [
        {
          clase: 'fijo',
          texto:
            'El incumplimiento de las obligaciones de seguridad de la información, confidencialidad o propiedad intelectual constituirá falta grave y facultará a la Entidad a:',
          fundamento: 'Plantilla — consecuencias del incumplimiento',
        },
        {
          clase: 'fijo',
          texto:
            'Aplicar las penalidades que correspondan.\nResolver el contrato por incumplimiento.\nExigir la indemnización por los daños y perjuicios ocasionados.\nIniciar las acciones administrativas, civiles o penales que resulten pertinentes.',
                  lista: true,
        },
      ],
    });
  }

  return {
    id: 'confidencialidad',
    titulo: 'Seguridad de la Información, Confidencialidad y Propiedad Intelectual',
    bloques,
    subsecciones,
  };
}

/**
 * Cabecera de los formatos de 8 UIT: el cuadro de datos y nada más.
 *
 * La finalidad, el objetivo y los antecedentes vivían aquí dentro. Los
 * sacó la observación de César de agosto de 2026: "la finalidad pública,
 * el objetivo y la justificación y los antecedentes, cada uno debe tener
 * una numeración (2, 3 y 4 respectivamente), esto según modelo de
 * requerimiento". En su ANEXO 1 y su ANEXO 2 son títulos de primer
 * nivel, y en el documento que firma el área usuaria tienen que salir
 * numerados como en el formato.
 *
 * Se construyen con `seccionesCabecera8Uit`, que devuelve las cuatro.
 */
export function seccionEncabezado8Uit(ayudaDenominacion: string): Seccion {
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
        ayuda: ayudaDenominacion,
        tipo: 'texto',
        obligatorio: true,
      },
    ],
  };
}

/**
 * Las cuatro secciones con que abre el formato de 8 UIT.
 *
 * Los textos entre corchetes y los ejemplos son los de los Word de
 * César, copiados sin tocar una coma: es el mismo criterio que rige las
 * quince plantillas —la plantilla manda, la IA solo rellena lo variable—
 * y lo comprueba `auditar-plantilla-requerimiento.ts`.
 *
 * El ejemplo va completo, y no recortado, porque esa fue otra
 * observación de agosto: "al desplegarse, no se muestran el ejemplo
 * completo; al verse una parte del ejemplo no se entiende".
 */
export function seccionesCabecera8Uit(opciones: {
  ayudaDenominacion: string;
  /** "servicio" o "bien": el formato cambia la palabra y nada más. */
  objeto: 'servicio' | 'bien';
  ejemploFinalidad: string;
  ejemploObjetivo: string;
  ejemploAntecedentes: string;
}): Seccion[] {
  const { objeto } = opciones;
  return [
    seccionEncabezado8Uit(opciones.ayudaDenominacion),
    {
      id: 'finalidad_publica',
      titulo: 'FINALIDAD PÚBLICA',
      bloques: [
        {
          clase: 'redactado',
          id: 'finalidad',
          etiqueta: 'Finalidad pública',
          instruccion:
            'Detallar aquello que se busca satisfacer, mejorar y/o atender con la contratación requerida según las actividades previstas en el Plan Operativo Institucional (POI), así como las acciones y objetivos estratégicos del Plan Estratégico Institucional (PEI) de la Entidad',
          ejemplo: opciones.ejemploFinalidad,
          extension: 'parrafo',
        },
      ],
    },
    {
      id: 'objetivo_contratacion',
      titulo: 'OBJETIVO DE LA CONTRATACIÓN',
      bloques: [
        {
          clase: 'redactado',
          id: 'objetivo_general',
          etiqueta: 'Objetivo de la contratación',
          instruccion:
            'Detallar el propósito de la contratación, o aquello que se espera lograr a través de la contratación requerida, por lo que el objetivo debe responder que se contratará y para qué',
          ejemplo: opciones.ejemploObjetivo,
          extension: 'parrafo',
        },
      ],
    },
    {
      id: 'antecedentes_justificacion',
      titulo: 'ANTECEDENTES Y/O JUSTIFICACIÓN DE LA NECESIDAD DE LA CONTRATACIÓN',
      bloques: [
        {
          clase: 'redactado',
          id: 'antecedentes',
          etiqueta: 'Antecedentes y/o justificación de la necesidad de la contratación',
          instruccion:
            objeto === 'servicio'
              ? 'Explicar de manera general respecto del motivo por el cual se efectúa el requerimiento de la contratación del servicio. (En el caso de existir documentos fuente de la contratación mencionarlos y adjuntarlos, por ejemplo: plan de bienestar, plan de capacitación)'
              : 'Explicar de manera general respecto del motivo por el cual se efectúa el requerimiento de la contratación del bien. (En el caso de existir documentos fuente de la contratación mencionarlos y adjuntarlos)',
          ejemplo: opciones.ejemploAntecedentes,
          extension: 'parrafo',
        },
      ],
    },
  ];
}

/** Requisitos del proveedor en contratos menores: añade el CCI. */
export const REQUISITOS_PROVEEDOR_8UIT =
  'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.';
