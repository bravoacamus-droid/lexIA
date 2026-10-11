/**
 * Casos del Tribunal por requisito, para el evaluador de ofertas.
 * GENERADO — no editar a mano: `python scripts/generar-casos-tribunal.py`.
 *
 * Sale de la guía «CASOS PRÁCTICOS DEL TRIBUNAL» (Corporación Gung Ho,
 * 2026) que entregó César el 10/10/2026: 629 cuestionamientos de 322
 * resoluciones, por etapa y requisito. No está en la biblioteca normativa
 * —lo pidió así—: es material para que el evaluador reconozca qué
 * controversias existen sobre cada requisito y cómo las resolvió el
 * Tribunal. Y es una muestra: el evaluador contrasta además con las
 * resoluciones de la biblioteca (ver `jurisprudencia.ts`).
 */

export interface SeccionDeCasos {
  /** «2.6» */
  id: string;
  etapa: 'admision' | 'calificacion' | 'evaluacion' | 'rechazo' | 'bonificacion' | 'negociacion' | 'buena_pro' | 'procesal';
  /** «Equipamiento estratégico» */
  titulo: string;
  /** La orientación de la guía antes de los casos de la sección. */
  antes?: string;
}

export interface CasoDelTribunal {
  caso: number;
  seccion: string;
  /** «Resolución 351-2026-TCP-S3» tal como la cita la guía. */
  resolucion: string;
  cuestionamiento: string;
  /** Cómo resolvió el Tribunal. */
  resolvio: string;
  /** La enseñanza que la guía saca del caso. */
  recordar: string;
  /** Advertencia de la guía sobre el alcance del caso, si la hay. */
  precision: string;
}

export const SECCIONES_DE_CASOS: SeccionDeCasos[] = [
  {
    "id": "1.1",
    "etapa": "admision",
    "titulo": "Declaración jurada de datos del postor Anexo 1",
    "antes": "Coteja la identidad y los datos declarados con los documentos del postor; identifica qué inconsistencia concreta fue discutida."
  },
  {
    "id": "1.2",
    "etapa": "admision",
    "titulo": "Pacto de integridad Anexo 2",
    "antes": "Lee el compromiso completo y distingue el contenido cuestionado de los detalles de formato."
  },
  {
    "id": "1.3",
    "etapa": "admision",
    "titulo": "Representación de quien suscribe la oferta",
    "antes": "Identifica al firmante, la vigencia del poder y las facultades acreditadas; compara la exigencia de las bases con la prueba presentada."
  },
  {
    "id": "1.4",
    "etapa": "admision",
    "titulo": "Declaración jurada Anexo 3",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "1.5",
    "etapa": "admision",
    "titulo": "Promesa de consorcio Anexo 4",
    "antes": "Relaciona integrantes, obligaciones y porcentajes con la documentación del consorcio; precisa qué dato fue decisivo."
  },
  {
    "id": "1.6",
    "etapa": "admision",
    "titulo": "Desafectación del impedimento Anexo 5",
    "antes": "Ubica el impedimento discutido, el hecho invocado para desafectarlo y el documento que lo respalda."
  },
  {
    "id": "1.7",
    "etapa": "admision",
    "titulo": "Otros documentos obligatorios y subsanación",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "2.1",
    "etapa": "calificacion",
    "titulo": "Capacidad legal y habilitación",
    "antes": "Identifica la habilitación exigida y el documento presentado; comprueba su alcance respecto de la actividad contratada."
  },
  {
    "id": "2.2",
    "etapa": "calificacion",
    "titulo": "Experiencia del postor en la especialidad",
    "antes": "Ordena las prestaciones, los montos y las constancias de ejecución o pago; identifica qué experiencia aceptó o descartó el Tribunal y por qué."
  },
  {
    "id": "2.3",
    "etapa": "calificacion",
    "titulo": "Formación académica del personal clave",
    "antes": "Compara la denominación del título y los documentos académicos con la formación exigida; identifica el alcance concreto del pronunciamiento."
  },
  {
    "id": "2.4",
    "etapa": "calificacion",
    "titulo": "Experiencia del personal clave",
    "antes": "Registra cargo, funciones y fechas de cada documento; distingue el tiempo acreditado de la actividad efectivamente evaluada."
  },
  {
    "id": "2.5",
    "etapa": "calificacion",
    "titulo": "Capacitación del personal clave",
    "antes": "Registra materia, duración, emisor y persona capacitada; coteja esos datos con la exigencia discutida."
  },
  {
    "id": "2.6",
    "etapa": "calificacion",
    "titulo": "Equipamiento estratégico",
    "antes": "Identifica el equipo y el documento presentado para acreditar su disponibilidad; comprueba qué exigencia fue objeto del recurso."
  },
  {
    "id": "2.7",
    "etapa": "calificacion",
    "titulo": "Infraestructura estratégica",
    "antes": "Relaciona ubicación, características y disponibilidad de la infraestructura con la prueba presentada y el requisito discutido."
  },
  {
    "id": "2.8",
    "etapa": "calificacion",
    "titulo": "Participación en consorcio",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "3.1",
    "etapa": "evaluacion",
    "titulo": "Evaluación técnica",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. 3.1.1. Plazo de entrega Qué comprobar Compara el plazo ofertado, la unidad de medida y el documento que lo acredita con la regla de las bases."
  },
  {
    "id": "3.2",
    "etapa": "evaluacion",
    "titulo": "Evaluación económica",
    "antes": "Relaciona el precio, el anexo económico y el tratamiento tributario discutido; identifica qué cálculo o documento determinó el resultado. 3.2.1. Oferta económica y Ley de Promoción de la Inversión en la Amazonía Qué comprobar Relaciona el precio, el anexo económico y el tratamiento tributario discutido; identifica qué cálculo o documento determinó el resultado."
  },
  {
    "id": "4.1",
    "etapa": "rechazo",
    "titulo": "Rechazo por precio y sustento de costos",
    "antes": "Ubica la causal invocada y su motivación; verifica el efecto concreto del fallo sobre la oferta."
  },
  {
    "id": "5.1",
    "etapa": "bonificacion",
    "titulo": "Bonificación del 10 por ciento sobre el puntaje total",
    "antes": "Ubica la solicitud, la condición invocada y el cálculo discutido; distingue la procedencia del beneficio de su efecto en el orden de prelación."
  },
  {
    "id": "5.2",
    "etapa": "bonificacion",
    "titulo": "Bonificación del 5 por ciento sobre el puntaje total",
    "antes": "Ubica la solicitud, la condición invocada y el cálculo discutido; distingue la procedencia del beneficio de su efecto en el orden de prelación."
  },
  {
    "id": "6.1",
    "etapa": "negociacion",
    "titulo": "Ampliación de certificación de crédito presupuestario o previsión presupuestal",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. Resolución 6127-2026-TCP-S1 Este cuestionamiento y su respuesta se desarrollan en el caso guiado 6 del capítulo 6 de la parte I. Consulta allí la fuente y el efecto final. Consulta el caso guiado correspondiente. Ir al caso 6"
  },
  {
    "id": "6.2",
    "etapa": "negociacion",
    "titulo": "Negociación con el postor con mejor puntaje total",
    "antes": "Distingue precio ofertado, disponibilidad presupuestaria y actuaciones de negociación; registra qué extremo llegó a resolver el Tribunal. La secuencia de negociación ordenada en la resolución 6127-2026-TCP-S1 se desarrolla en 6.1. La reducción efectuada por el postor descrito en el caso 8117-2026-TCP-S1 se presenta en 6.4, junto con su efecto presupuestario."
  },
  {
    "id": "6.3",
    "etapa": "negociacion",
    "titulo": "Negociación con los siguientes postores",
    "antes": "Distingue precio ofertado, disponibilidad presupuestaria y actuaciones de negociación; registra qué extremo llegó a resolver el Tribunal. No se identifica en las fuentes una decisión individualizada sobre la negociación con los siguientes postores después del rechazo del primero. Se conserva el apartado sin atribuir un criterio de fondo al Tribunal."
  },
  {
    "id": "6.4",
    "etapa": "negociacion",
    "titulo": "Reducción de la oferta económica del postor mejor puntuado",
    "antes": "Relaciona el precio, el anexo económico y el tratamiento tributario discutido; identifica qué cálculo o documento determinó el resultado."
  },
  {
    "id": "7.1",
    "etapa": "buena_pro",
    "titulo": "Otorgamiento y revisión de la buena pro",
    "antes": "Identifica el orden de prelación y el efecto final del fallo; distingue revocar una decisión de otorgar la buena pro."
  },
  {
    "id": "7.2",
    "etapa": "buena_pro",
    "titulo": "Desempate",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "7.3",
    "etapa": "buena_pro",
    "titulo": "Pérdida de la buena pro y perfeccionamiento del contrato",
    "antes": "Identifica el orden de prelación y el efecto final del fallo; distingue revocar una decisión de otorgar la buena pro."
  },
  {
    "id": "A.1",
    "etapa": "procesal",
    "titulo": "Procedencia de la apelación y preclusión",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "A.2",
    "etapa": "procesal",
    "titulo": "Nulidad y derecho de defensa",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "A.3",
    "etapa": "procesal",
    "titulo": "Desistimiento sin pronunciamiento de fondo",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "A.4",
    "etapa": "procesal",
    "titulo": "Procedimientos sancionadores",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  },
  {
    "id": "A.5",
    "etapa": "procesal",
    "titulo": "Pronunciamiento del OECE",
    "antes": "Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
  }
];

export const CASOS_DEL_TRIBUNAL: CasoDelTribunal[] = [
 {
  "caso": 1,
  "seccion": "1.1",
  "resolucion": "Resolución 1607-2023-TCE-S6",
  "cuestionamiento": "Se solicitó la no admisión de la oferta aduciendo incongruencias en el domicilio legal declarado en el Anexo N° 1 frente a otras constancias de la propuesta, así como por una presunta discrepancia entre el \"año de fabricación\" y el \"año modelo\" en las tarjetas de identificación vehicular ofertadas.",
  "resolvio": "El Tribunal confirmó la admisión de la oferta. Determinó que las diferencias formales de domicilio no invalidan la declaración jurada de datos del postor. Sobre la antigüedad vehicular, aclaró que de acuerdo con la norma sectorial del Ministerio de Transportes y Comunicaciones (Decreto Supremo N° 019-2018-MTC), el parámetro técnico legal válido para determinar el año del vehículo es el \"año modelo\" acreditado en la tarjeta de identificación electrónica, por lo que no existía incongruencia.",
  "recordar": "Determinó que las diferencias formales de domicilio no invalidan la declaración jurada de datos del postor.",
  "precision": ""
 },
 {
  "caso": 2,
  "seccion": "1.1",
  "resolucion": "Resolución 3503-2025-TCP-S6",
  "cuestionamiento": "Se cuestionó una omisión o inconsistencia del teléfono consignado en el Anexo 1 respecto del RNP.",
  "resolvio": "El análisis del caso señala que el teléfono tenía finalidad informativa y que esa observación no justificaba la no admisión. El error de digitación del presupuesto, también discutido en el expediente, se desarrolla en el apartado 3.2.1.",
  "recordar": "El error de digitación del presupuesto, también discutido en el expediente, se desarrolla en el apartado 3.2.1.",
  "precision": ""
 },
 {
  "caso": 3,
  "seccion": "1.1",
  "resolucion": "Resolución 351-2026-TCP-S3",
  "cuestionamiento": "Se pidió excluir al adjudicatario porque el domicilio de su Anexo 1 no coincidía con el RNP y se alegó que la falta de actualización ocasionaba suspensión del registro.",
  "resolvio": "La Sala no decidió el fondo de esa objeción. Descalificó al adjudicatario por no acreditar las siete balanzas y declaró innecesario analizar los restantes cuestionamientos a su oferta. Las explicaciones sobre actualización del domicilio que aparecen en los antecedentes pertenecen a las partes, no a un criterio de fondo establecido por el Tribunal.",
  "recordar": "Descalificó al adjudicatario por no acreditar las siete balanzas y declaró innecesario analizar los restantes cuestionamientos a su oferta.",
  "precision": ""
 },
 {
  "caso": 4,
  "seccion": "1.1",
  "resolucion": "Resolución 8010-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó revocar la admisión del adjudicatario argumentando que en un anexo del acta de evaluación el comité consignó el texto \"NO ADMITIDA\", lo que generaba decisiones contradictorias.",
  "resolvio": "El Tribunal desestimó el cuestionamiento indicando que se trató de un error material de transcripción del comité al trasladar los datos entre cuadros del acta. Los errores de tipeo o redacción del órgano evaluador no alteran la verdadera condición técnica de la oferta ni son imputables al postor, debiendo prevalecer la evaluación sustancial obrante en el expediente.",
  "recordar": "Los errores de tipeo o redacción del órgano evaluador no alteran la verdadera condición técnica de la oferta ni son imputables al postor, debiendo prevalecer la evaluación sustancial obrante en el expediente.",
  "precision": ""
 },
 {
  "caso": 5,
  "seccion": "1.1",
  "resolucion": "Resolución 8795-2026-TCP-S2",
  "cuestionamiento": "Un postor solicitó que se rechace la propuesta del ganador argumentando que el Anexo N° 1 no tenía estampado el sello del consorcio y que el D.N.I. del representante común figuraba caducado al momento de presentar la oferta.",
  "resolvio": "El Tribunal determinó que la falta de sello no anula el documento si la firma y los datos consignados permiten identificar claramente al representante. Asimismo, aclaró que para las personas jurídicas que integran un consorcio, el documento legal que demuestra la representación es el certificado de vigencia de poder y no la fecha de caducidad del D.N.I. del apoderado persona natural, por lo que declaró admitida la oferta.",
  "recordar": "El Tribunal determinó que la falta de sello no anula el documento si la firma y los datos consignados permiten identificar claramente al representante.",
  "precision": ""
 },
 {
  "caso": 6,
  "seccion": "1.2",
  "resolucion": "Resolución 5442-2025-TCP-S4",
  "cuestionamiento": "Se cuestionó la admisión de la oferta por omitir el día, mes y año en el Pacto de Integridad, Anexo 2.",
  "resolvio": "La omisión de la fecha no justificaba excluir automáticamente una oferta con el pacto firmado. Los relatos disponibles describen la subsanación y la firma como expresión de la voluntad de asumir el compromiso.",
  "recordar": "Los relatos disponibles describen la subsanación y la firma como expresión de la voluntad de asumir el compromiso.",
  "precision": "No se dispone aquí del fallo completo para precisar si se ordenó subsanar o se tuvo el pacto directamente por válido. Se conserva una sola ficha y se identifica esa diferencia de alcance."
 },
 {
  "caso": 7,
  "seccion": "1.2",
  "resolucion": "Resolución 7259-2025-TCP-S3",
  "cuestionamiento": "El impugnante solicitó declarar no admitida la oferta del adjudicatario alegando que en el Anexo N° 2 omitió consignar el número de DNI debajo de la firma de su representante.",
  "resolvio": "Declaró infundado el cuestionamiento. El Tribunal consideró que dicha omisión constituye un defecto formal no sustancial, pues el nombre y la identidad del representante legal se encontraban plenamente identificables en el cuerpo del documento, no afectándose el compromiso asumido.",
  "recordar": "El Tribunal consideró que dicha omisión constituye un defecto formal no sustancial, pues el nombre y la identidad del representante legal se encontraban plenamente identificables en el cuerpo del documento, no afectándose el compromiso asumido.",
  "precision": ""
 },
 {
  "caso": 8,
  "seccion": "1.2",
  "resolucion": "Resolución 6485-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó la no admisión de una oferta alegando que el Anexo N° 2 presentaba recortes en el pie de página del formato oficial y limitaba temporalmente el compromiso.",
  "resolvio": "El Tribunal determinó que la ausencia de notas al pie o detalles de diseño de las bases estándar no invalida la declaración jurada. Si el documento expresa de forma clara el compromiso anticorrupción del postor, el requisito de admisión se tiene por cumplido.",
  "recordar": "Si el documento expresa de forma clara el compromiso anticorrupción del postor, el requisito de admisión se tiene por cumplido.",
  "precision": ""
 },
 {
  "caso": 9,
  "seccion": "1.2",
  "resolucion": "Resolución 7024-2026-TCP-S4",
  "cuestionamiento": "La Entidad no admitió la oferta al considerar que el Anexo N° 2 presentado en la subsanación mantenía ligeras variaciones en la redacción.",
  "resolvio": "El Tribunal revocó la no admisión, precisando que los errores materiales o variaciones formales en las declaraciones juradas emitidas por los postores que no alteren el contenido esencial de la oferta son subsanables bajo el principio de igualdad de trato y eficacia.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 10,
  "seccion": "1.2",
  "resolucion": "Resolución 8116-2026-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó la admisión del adjudicatario alegando: i) que su Pacto de Integridad fijaba vigencia \"hasta la finalización del proceso de contratación\", lo que supuestamente excluía la etapa de ejecución contractual; y ii) que su certificado de planta indicaba \"no aplica\" en el casillero de molienda de granos, siendo necesaria la molienda para elaborar la harina de maca.",
  "resolvio": "El Tribunal confirmó la admisión de la oferta. Aclaró que la expresión utilizada en el Pacto de Integridad comprende legalmente todas las fases hasta el pago final. Respecto a la planta, se demostró que la maca es un tubérculo sometido a precocción previa, cuyo proceso fue correctamente auditado e identificado como \"molienda de producto cocido\" en el flujograma verificado por los inspectores.",
  "recordar": "Respecto a la planta, se demostró que la maca es un tubérculo sometido a precocción previa, cuyo proceso fue correctamente auditado e identificado como \"molienda de producto cocido\" en el flujograma verificado por los inspectores.",
  "precision": ""
 },
 {
  "caso": 11,
  "seccion": "1.3",
  "resolucion": "Resolución 7937-2025-TCP-S4",
  "cuestionamiento": "El comité descalificó y declaró no admitida la oferta del impugnante afirmando erróneamente que no acreditó la vigencia de poder de su representante legal.",
  "resolvio": "El Tribunal revisó la propuesta técnica e identificó que a folios 3 al 5 sí obraba el certificado de vigencia de poder expedido por la SUNARP a favor del representante legal (Abraham Gamboa Sandoval), vigente a la fecha de presentación de ofertas. Por lo tanto, el argumento del comité carecía de veracidad.",
  "recordar": "Por lo tanto, el argumento del comité carecía de veracidad. Resolución 614-2026-TCP-S3 Este cuestionamiento y su respuesta se desarrollan en el caso guiado 1 del capítulo 1 de la parte I. Consulta allí la fuente y el efecto final. Consulta el caso guiado correspondiente. Ir al caso 1",
  "precision": ""
 },
 {
  "caso": 12,
  "seccion": "1.3",
  "resolucion": "Resolución 8405-2026-TCP-S2",
  "cuestionamiento": "El Comité no admitió la oferta de una empresa aduciendo que en el certificado de vigencia de poder de su Gerente General no figuraban literalmente frases como \"facultad expresamente acreditada para participar en procedimientos de selección o suscribir ofertas\".",
  "resolvio": "El Tribunal revocó la no admisión. Estableció que las facultades generales de administración y representación atribuidas al Gerente General según la Ley General de Sociedades comprenden de manera natural la capacidad de presentar propuestas y obligar a la persona jurídica frente a la Administración. Exigir fórmulas literales no contempladas en la norma es un formalismo arbitrario que vulnera el principio de competencia.",
  "recordar": "Exigir fórmulas literales no contempladas en la norma es un formalismo arbitrario que vulnera el principio de competencia.",
  "precision": ""
 },
 {
  "caso": 13,
  "seccion": "1.4",
  "resolucion": "Resolución 82-2020-TCE-S4",
  "cuestionamiento": "El adjudicatario afirmó que la Declaración Jurada de Cumplimiento de los Términos de Referencia (Anexo N° 3) del impugnante contenía información inexacta respecto al equipamiento ofertado.",
  "resolvio": "El Tribunal confirmó la validez del Anexo N° 3. Recordó que las declaraciones juradas gozan de la presunción de veracidad; por ende, para desvirtuarlas en la fase de admisión se requiere prueba fehaciente e indubitable de falsedad o inexactitud, no bastando meras sospechas o interpretaciones del competidor.",
  "recordar": "Recordó que las declaraciones juradas gozan de la presunción de veracidad; por ende, para desvirtuarlas en la fase de admisión se requiere prueba fehaciente e indubitable de falsedad o inexactitud, no bastando meras sospechas o interpretaciones del competidor.",
  "precision": ""
 },
 {
  "caso": 14,
  "seccion": "1.4",
  "resolucion": "Resolución 3286-2026-TCP-S4",
  "cuestionamiento": "El oficial de compras declaró no admitida la propuesta de un postor al verificar que en el Anexo N° 3 suprimió el numeral VII, eliminando el texto obligatorio en el que se asume el compromiso formal de cumplir con las especificaciones técnicas del requerimiento.",
  "resolvio": "El Tribunal confirmó la no admisión de la oferta. Concluyó que la supresión de cláusulas sustanciales en una declaración jurada estándar altera el contenido esencial de la propuesta, configurando un defecto de fondo que priva a la Entidad del compromiso formal del postor y no puede ser corregido vía subsanación.",
  "recordar": "Concluyó que la supresión de cláusulas sustanciales en una declaración jurada estándar altera el contenido esencial de la propuesta, configurando un defecto de fondo que priva a la Entidad del compromiso formal del postor y no puede ser corregido vía subsanación.",
  "precision": ""
 },
 {
  "caso": 15,
  "seccion": "1.4",
  "resolucion": "Resolución 5113-2026-TCP-S3",
  "cuestionamiento": "Se impugnó la admisión del adjudicatario por omitir la presentación completa del Anexo N° 3 dentro de los documentos obligatorios de su sobre técnico.",
  "resolvio": "El Tribunal declaró no admitida la oferta del adjudicatario. Resolvió que la omisión integral de una declaración jurada de presentación obligatoria constituye la falta de un requisito de admisibilidad esencial que vulnera el principio de igualdad de trato y no admite subsanación extemporánea.",
  "recordar": "Resolvió que la omisión integral de una declaración jurada de presentación obligatoria constituye la falta de un requisito de admisibilidad esencial que vulnera el principio de igualdad de trato y no admite subsanación extemporánea.",
  "precision": ""
 },
 {
  "caso": 16,
  "seccion": "1.4",
  "resolucion": "Resolución 6127-2026-TCP-S1",
  "cuestionamiento": "El Anexo 3 de OPERACIONES CAPO omitía la frase expresa de cumplir todas las condiciones del requerimiento, aunque declaraba aceptar las bases.",
  "resolvio": "La Sala consideró la omisión formal y subsanable, porque el compromiso se desprendía del documento presentado. Ordenó otorgar dos días hábiles para subsanar. La admisión quedó condicionada a cumplir esa subsanación; no fue una declaración de admisión incondicional.",
  "recordar": "Ordenó otorgar dos días hábiles para subsanar.",
  "precision": ""
 },
 {
  "caso": 17,
  "seccion": "1.4",
  "resolucion": "Resolución 7189-2026-TCP-S3",
  "cuestionamiento": "La Entidad declaró no admitida una propuesta aduciendo que el postor no estampó una firma individual dentro de la casilla del numeral 7 del Anexo N° 3.",
  "resolvio": "El Tribunal declaró fundado el recurso, estableciendo que la firma y sello colocados al final del documento respaldan jurídicamente la integridad de la declaración jurada. Asimismo, precisó que de existir duda sobre la firma de un numeral específico, constituye un defecto formal subsanable conforme al artículo 78 del Reglamento.",
  "recordar": "Asimismo, precisó que de existir duda sobre la firma de un numeral específico, constituye un defecto formal subsanable conforme al artículo 78 del Reglamento.",
  "precision": ""
 },
 {
  "caso": 18,
  "seccion": "1.4",
  "resolucion": "Resolución 8000-2026-TCP-S2",
  "cuestionamiento": "El Comité de Selección descalificó/no admitió la oferta porque el postor omitió incluir en el numeral iv del Anexo N° 3 la frase: \"Asimismo, declaro cumplir con todas las condiciones establecidas en el requerimiento y exigidas por la entidad contratante...\".",
  "resolvio": "El Tribunal revocó la no admisión. Resolvió que la omisión de un enunciado aclaratorio en el Anexo N° 3, cuando el resto del documento declara expresamente el sometimiento integral a las bases, no constituye una alteración de la propuesta ni un rechazo a las exigencias técnicas. Por tanto, es una omisión formal plenamente subsanable dentro del plazo legal.",
  "recordar": "Resolvió que la omisión de un enunciado aclaratorio en el Anexo N° 3, cuando el resto del documento declara expresamente el sometimiento integral a las bases, no constituye una alteración de la propuesta ni un rechazo a las exigencias técnicas.",
  "precision": "La fuente agrupa esta resolución con 8020-2026-TCP-S4. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 19,
  "seccion": "1.4",
  "resolucion": "Resolución 8020-2026-TCP-S4",
  "cuestionamiento": "El Comité de Selección descalificó/no admitió la oferta porque el postor omitió incluir en el numeral iv del Anexo N° 3 la frase: \"Asimismo, declaro cumplir con todas las condiciones establecidas en el requerimiento y exigidas por la entidad contratante...\".",
  "resolvio": "El Tribunal revocó la no admisión. Resolvió que la omisión de un enunciado aclaratorio en el Anexo N° 3, cuando el resto del documento declara expresamente el sometimiento integral a las bases, no constituye una alteración de la propuesta ni un rechazo a las exigencias técnicas. Por tanto, es una omisión formal plenamente subsanable dentro del plazo legal.",
  "recordar": "Resolvió que la omisión de un enunciado aclaratorio en el Anexo N° 3, cuando el resto del documento declara expresamente el sometimiento integral a las bases, no constituye una alteración de la propuesta ni un rechazo a las exigencias técnicas.",
  "precision": "La fuente agrupa esta resolución con 8000-2026-TCP-S2. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 20,
  "seccion": "1.4",
  "resolucion": "Resolución 8701-2026-TCP-S1",
  "cuestionamiento": "El comité descalificó la oferta del impugnante al considerar que no adjuntó en su compromiso de alquiler de equipos la lista detallada de envases biodegradables para las raciones de alimento.",
  "resolvio": "El Tribunal revocó la descalificación y declaró calificada la oferta. Aclaró que las especificaciones sobre el uso de envases biodegradables para la entrega de alimentos constituyen condiciones de ejecución contractual y no requisitos de admisibilidad o calificación documental en la oferta. La presentación de la Declaración Jurada (Anexo N° 3) es suficiente para comprometerse a su cumplimiento.",
  "recordar": "Aclaró que las especificaciones sobre el uso de envases biodegradables para la entrega de alimentos constituyen condiciones de ejecución contractual y no requisitos de admisibilidad o calificación documental en la oferta.",
  "precision": ""
 },
 {
  "caso": 21,
  "seccion": "1.4",
  "resolucion": "Resolución 8839-2026-TCP-S6",
  "cuestionamiento": "El adjudicatario solicitó declarar no admitida la oferta del impugnante alegando que en su Anexo N° 3 (Declaración Jurada de presentación obligatoria) figuraba el nombre y número de RUC de una persona jurídica distinta. Sostuvo que no se trataba de un simple error material, sino de la atribución formal de la propuesta a un tercero ajeno al concurso.",
  "resolvio": "El Tribunal analizó que el cumplimiento de los anexos obligatorios garantiza la vinculación jurídica directa del participante con su propuesta. Las reglas de admisibilidad exigen verificar que la oferta se presente de forma clara y sin discordancias de personería. Al confirmarse que el análisis de forma no enervaba la validez de los demás extremos calificados del procedimiento, se procedió a evaluar la continuidad del proceso conforme a las bases integradas.",
  "recordar": "Las reglas de admisibilidad exigen verificar que la oferta se presente de forma clara y sin discordancias de personería.",
  "precision": ""
 },
 {
  "caso": 22,
  "seccion": "1.5",
  "resolucion": "Resolución 3299-2025-TCP-S5",
  "cuestionamiento": "El adjudicatario cuestionó la admisión de la oferta del impugnante, argumentando que la redacción de su Promesa de Consorcio (Anexo N° 4) era imprecisa respecto al alcance de las obligaciones que asumiría cada consorciado.",
  "resolvio": "El Tribunal declaró admitida la oferta del impugnante. Argumentó que la Promesa de Consorcio debe analizarse de manera integral y no literal o aislada; si del cuerpo del documento se desprende con claridad el compromiso, la cuota y las actividades de cada integrante, el anexo cumple con la Directiva N° 005-2019-OSCE/CD.",
  "recordar": "Argumentó que la Promesa de Consorcio debe analizarse de manera integral y no literal o aislada; si del cuerpo del documento se desprende con claridad el compromiso, la cuota y las actividades de cada integrante, el anexo cumple con la Directiva N° 005-2019-OSCE/CD.",
  "precision": ""
 },
 {
  "caso": 23,
  "seccion": "1.5",
  "resolucion": "Resolución 5235-2025-TCP-S2",
  "cuestionamiento": "Se rechazó la admisión de un consorcio alegando observaciones en el Anexo N° 4 (Promesa de Consorcio) por no detallar explícitamente las obligaciones específicas a las que se compromete cada integrante y la falta de formalización previa con firmas legalizadas o digitales.",
  "resolvio": "El Tribunal analizó las exigencias normativas y dispuso que las deficiencias formales en la suscripción de la promesa de consorcio o en el detalle de las obligaciones no alteran la voluntad asociativa previa. Por tanto, corresponde otorgar el plazo legal de subsanación para presentar el Anexo N° 4 debidamente formalizado.",
  "recordar": "Por tanto, corresponde otorgar el plazo legal de subsanación para presentar el Anexo N° 4 debidamente formalizado.",
  "precision": ""
 },
 {
  "caso": 24,
  "seccion": "1.5",
  "resolucion": "Resolución 6503-2025-TCP-S4",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta de un consorcio participante aduciendo que la promesa formal de consorcio no demostraba que el integrante que aportaba el mayor porcentaje de participación tuviera la mayor experiencia requerida en el objeto de la convocatoria. El postor impugnó señalando que la promesa cumplía con las formalidades obligatorias para la admisión y que la evaluación de la experiencia no es un requisito de admisión formal.",
  "resolvio": "Las fuentes coinciden en que se revocó la no admisión y se tuvo por admitida la oferta. El documento 3 explica que la experiencia no debía anticiparse a la admisión; el documento 41 refiere además el cumplimiento del porcentaje consorcial. El examen debe distinguir las formalidades de la promesa y la comprobación de la experiencia.",
  "recordar": "El documento 3 explica que la experiencia no debía anticiparse a la admisión; el documento 41 refiere además el cumplimiento del porcentaje consorcial. Alcance del caso. Se describe una revocación, pero no se atribuye un único fundamento a los relatos disponibles.",
  "precision": ""
 },
 {
  "caso": 25,
  "seccion": "1.5",
  "resolucion": "Resolución 6965-2025-TCP-S2",
  "cuestionamiento": "El comité de selección tuvo por no admitida la oferta del Consorcio impugnante 1 al cuestionar la validez y formalidad de su Promesa de Consorcio.",
  "resolvio": "El Tribunal verificó que el documento contaba con las firmas digitales de los representantes legales de las empresas consorciadas, lo cual es plenamente válido bajo la normativa. Sin embargo, dispuso que el comité solicite al postor la subsanación formal de dicho documento en un plazo de dos (2) días hábiles conforme al Reglamento, a fin de que su oferta sea válidamente admitida.",
  "recordar": "El Tribunal verificó que el documento contaba con las firmas digitales de los representantes legales de las empresas consorciadas, lo cual es plenamente válido bajo la normativa.",
  "precision": ""
 },
 {
  "caso": 26,
  "seccion": "1.5",
  "resolucion": "Resolución 7712-2025-TCP-S6",
  "cuestionamiento": "El oficial de compras declaró no admitida la propuesta del Consorcio impugnante 2 argumentando una incongruencia en su promesa de consorcio, pues la suma de los porcentajes de participación daba 100%, pero en la cláusula de obligaciones ambos consorciados asumieron el compromiso de ejecutar el 50% de las actividades, lo que —según la entidad— generaba una \"suma del 200%\".",
  "resolvio": "El Tribunal revocó la no admisión y declaró admitida la oferta. Explicó didácticamente que el porcentaje de participación delimita la cuota o reparto económico/patrimonial interno entre los socios, mientras que la descripción de las obligaciones reafirma el compromiso de ejecución técnica frente a la Entidad. Al ser conceptos jurídicos distintos, no existía contradicción ni sobreposición alguna.",
  "recordar": "Explicó didácticamente que el porcentaje de participación delimita la cuota o reparto económico/patrimonial interno entre los socios, mientras que la descripción de las obligaciones reafirma el compromiso de ejecución técnica frente a la Entidad.",
  "precision": "Las fuentes no uniformizan los porcentajes consignados en la promesa; coinciden en distinguir porcentajes de obligaciones y cuotas de participación. Debe verificarse el dato numérico en el original."
 },
 {
  "caso": 27,
  "seccion": "1.5",
  "resolucion": "Resolución 7757-2025-TCP-S1",
  "cuestionamiento": "El adjudicatario cuestionó la admisión de la oferta del impugnante, argumentando que la promesa de consorcio presentada en subsanación tenía una fecha y firmas digitales posteriores a la presentación de ofertas.",
  "resolvio": "El Tribunal determinó que la subsanación de las firmas digitales en el Anexo N° 4 se realizó conforme al requerimiento formal del procedimiento, sin modificar los porcentajes de participación ni las obligaciones asumidas por sus integrantes. Por ende, ratificó la validez de la admisión de la oferta.",
  "recordar": "Por ende, ratificó la validez de la admisión de la oferta.",
  "precision": ""
 },
 {
  "caso": 28,
  "seccion": "1.5",
  "resolucion": "Resolución 411-2026-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó la admisión del adjudicatario al detectar incongruencias y falta de formalidades esenciales en su Anexo N° 4 (Promesa de Consorcio).",
  "resolvio": "El Tribunal confirmó que el adjudicatario no cumplió con los requisitos obligatorios de la promesa de consorcio fijados en las bases integradas. En consecuencia, declaró no admitida la propuesta del adjudicatario y le retiró la buena pro.",
  "recordar": "En consecuencia, declaró no admitida la propuesta del adjudicatario y le retiró la buena pro.",
  "precision": ""
 },
 {
  "caso": 29,
  "seccion": "1.5",
  "resolucion": "Resolución 909-2026-TCP-S6",
  "cuestionamiento": "Se solicitó la no admisión de un consorcio alegando la afectación de la presunción de veracidad en la suscripción del Anexo N° 4.",
  "resolvio": "El Tribunal analizó la legalidad formal y la representación de las partes firmantes del Anexo N° 4, ratificando que solo ante pruebas objetivas fehacientes de falsedad cabe dejar sin efecto un documento de admisión.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 30,
  "seccion": "1.5",
  "resolucion": "Resolución 993-2026-TCP-S2",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta del Consorcio Kallpa Ingenieros debido a que en su Anexo N° 4 (Promesa de Consorcio), al momento de señalar el nombre del representante común, se cometió una equivocación e incluyó la denominación de otra entidad y de otro proceso de selección (\"Municipalidad Distrital de Caramba\"). El comité sostuvo que este error afectaba el fondo de la oferta y no podía corregirse.",
  "resolvio": "El Tribunal determinó que la consignación errónea del nombre de otra entidad constituye un error material e involuntario. De la lectura integral de la oferta se desprendía claramente la intención de postular al proceso convocado, por lo que el error no alteraba las obligaciones ni el compromiso de consorciarse. En consecuencia, resolvió que era un supuesto plenamente subsanable y ordenó al comité otorgar el plazo legal para su corrección y admitir la propuesta.",
  "recordar": "En consecuencia, resolvió que era un supuesto plenamente subsanable y ordenó al comité otorgar el plazo legal para su corrección y admitir la propuesta.",
  "precision": ""
 },
 {
  "caso": 31,
  "seccion": "1.5",
  "resolucion": "Resolución 1078-2026-TCP-S2",
  "cuestionamiento": "Se declaró no admitida la oferta de un consorcio porque en la promesa de consorcio no se detalló específicamente qué integrante aportaría la experiencia del postor en la especialidad.",
  "resolvio": "El Tribunal revocó la no admisión. Explicó que la normativa exige consignar de forma obligatoria los porcentajes de participación y las obligaciones de cada consorciado en la ejecución del contrato, pero no requiere detallar explícitamente dentro de la promesa de admisión qué integrante aportará cada requisito de calificación.",
  "recordar": "Explicó que la normativa exige consignar de forma obligatoria los porcentajes de participación y las obligaciones de cada consorciado en la ejecución del contrato, pero no requiere detallar explícitamente dentro de la promesa de admisión qué integrante aportará cada requisito de calificación.",
  "precision": ""
 },
 {
  "caso": 32,
  "seccion": "1.5",
  "resolucion": "Resolución 4293-2026-TCP-S2",
  "cuestionamiento": "El comité de selección tuvo por no admitida la propuesta del consorcio impugnante al formular observaciones sobre la forma en que se redactaron las obligaciones de cada consorciado en la Promesa de Consorcio (Anexo N° 4).",
  "resolvio": "El Tribunal determinó que si la promesa de consorcio identifica claramente a los integrantes, al representante común, el domicilio y correo electrónico, así como las obligaciones de cada miembro y sus porcentajes equivalentes, cumple estrictamente con el contenido obligatorio exigido por las bases integradas para la etapa de admisión. Las exigencias adicionales no previstas en las bases son ilegales; por tanto, revocó la no admisión.",
  "recordar": "El Tribunal determinó que si la promesa de consorcio identifica claramente a los integrantes, al representante común, el domicilio y correo electrónico, así como las obligaciones de cada miembro y sus porcentajes equivalentes, cumple estrictamente con el contenido obligatorio exigido por las bases integradas para la etapa de admisión.",
  "precision": ""
 },
 {
  "caso": 33,
  "seccion": "1.5",
  "resolucion": "Resolución 6718-2026-TCP-S4",
  "cuestionamiento": "El comité no admitió la propuesta de un postor al considerar que asumir labores de \"administración y gestión\" en la promesa de consorcio no guardaba relación directa con el objeto principal del servicio.",
  "resolvio": "El Tribunal ordenó admitir la oferta señalando que las labores administrativas, contables y operativas son indispensables para la ejecución del contrato y garantizan la responsabilidad solidaria de los consorciados, por lo que sí se encuentran directamente vinculadas al objeto de la convocatoria.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 34,
  "seccion": "1.5",
  "resolucion": "Resolución 6900-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó la validez del Anexo N° 4 (Promesa de Consorcio) de la oferta del impugnante debido a inconsistencias entre el porcentaje de participación declarado por los consorciados (50% cada uno) y la mención de responsabilidad absoluta asignada a uno solo.",
  "resolvio": "El Tribunal analizó la naturaleza de la promesa formal de consorcio, distinguiendo entre errores materiales subsanables y contradicciones esenciales sobre las obligaciones asumidas.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 35,
  "seccion": "1.5",
  "resolucion": "Resolución 7102-2026-TCP-S2",
  "cuestionamiento": "Se cuestionó la admisibilidad de la promesa de consorcio por no haber presentado las firmas legalizadas ante notario en la propuesta inicial.",
  "resolvio": "El Tribunal constató que, tras el requerimiento otorgado para subsanar dicha deficiencia formal, el postor presentó el Anexo N° 4 con las firmas debidamente legalizadas dentro del plazo legal, por lo que cumplió satisfactoriamente con el requisito de admisión.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 36,
  "seccion": "1.5",
  "resolucion": "Resolución 7897-2026-TCP-S1",
  "cuestionamiento": "Se declaró no admitida la oferta de A&D porque la legalización de las firmas de su promesa consorcial se efectuó después del día de presentación de ofertas.",
  "resolvio": "La Sala constató que la promesa inicial ya contenía el acuerdo y que la subsanación oportuna añadió la legalización sin cambiar su contenido. Consideró válida esa subsanación, revocó la no admisión y ordenó continuar la calificación y evaluación. No adjudicó directamente la buena pro a A&D.",
  "recordar": "La Sala constató que la promesa inicial ya contenía el acuerdo y que la subsanación oportuna añadió la legalización sin cambiar su contenido.",
  "precision": ""
 },
 {
  "caso": 37,
  "seccion": "1.5",
  "resolucion": "Resolución 8010-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó la admisión de una oferta alegando discrepancias en la designación de los representantes legales entre la Promesa de Consorcio (Anexo N° 4) y las estipulaciones del contrato privado de consorcio.",
  "resolvio": "El Tribunal confirmó la admisión señalando que en la etapa de presentación de ofertas solo se evalúa que la Promesa de Consorcio contenga las declaraciones y formalidades mínimas requeridas por las bases integradas. La exigencia de concordancia formal estricta con el contrato de consorcio legalizado es un requisito previsto para la fase de perfeccionamiento del contrato, no para la admisión.",
  "recordar": "La exigencia de concordancia formal estricta con el contrato de consorcio legalizado es un requisito previsto para la fase de perfeccionamiento del contrato, no para la admisión.",
  "precision": ""
 },
 {
  "caso": 38,
  "seccion": "1.6",
  "resolucion": "Resolución 5672-2025-TCP-S4",
  "cuestionamiento": "El comité de selección declaró no admitida la propuesta de un postor al observar que omitió adjuntar el Anexo N° 5 (Declaración Jurada de Desafectación del Impedimento).",
  "resolvio": "El Tribunal revocó la no admisión. Aclaró que la exigencia documental del Anexo N° 5 es condicional y únicamente resulta obligatoria para los proveedores que al registrarse como participantes declararon encontrarse en un supuesto de desafectación; si el postor declaró en el Anexo N° 3 no tener impedimento alguno, la presentación del Anexo N° 5 no le es exigible.",
  "recordar": "Aclaró que la exigencia documental del Anexo N° 5 es condicional y únicamente resulta obligatoria para los proveedores que al registrarse como participantes declararon encontrarse en un supuesto de desafectación; si el postor declaró en el Anexo N° 3 no tener impedimento alguno, la presentación del Anexo N° 5 no le es exigible.",
  "precision": "La fuente agrupa esta resolución con 8333-2025-TCP-S2. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 39,
  "seccion": "1.6",
  "resolucion": "Resolución 8333-2025-TCP-S2",
  "cuestionamiento": "El comité de selección declaró no admitida la propuesta de un postor al observar que omitió adjuntar el Anexo N° 5 (Declaración Jurada de Desafectación del Impedimento).",
  "resolvio": "El Tribunal revocó la no admisión. Aclaró que la exigencia documental del Anexo N° 5 es condicional y únicamente resulta obligatoria para los proveedores que al registrarse como participantes declararon encontrarse en un supuesto de desafectación; si el postor declaró en el Anexo N° 3 no tener impedimento alguno, la presentación del Anexo N° 5 no le es exigible.",
  "recordar": "Aclaró que la exigencia documental del Anexo N° 5 es condicional y únicamente resulta obligatoria para los proveedores que al registrarse como participantes declararon encontrarse en un supuesto de desafectación; si el postor declaró en el Anexo N° 3 no tener impedimento alguno, la presentación del Anexo N° 5 no le es exigible.",
  "precision": "La fuente agrupa esta resolución con 5672-2025-TCP-S4. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 40,
  "seccion": "1.7",
  "resolucion": "Resolución 680-2025-TCE-S5",
  "cuestionamiento": "El impugnante cuestionó la descalificación de su propuesta y solicitó dejar sin efecto la buena pro del ganador, señalando que su oferta cumplía con las exigencias técnicas y funcionales del servicio.",
  "resolvio": "El Tribunal precisó que, de manera previa a la evaluación de las ofertas, las entidades deben verificar el cumplimiento de los requisitos técnicos mínimos que garantizan la idoneidad del proveedor. Al constatarse que la oferta del impugnante sí cumplía con todas las especificaciones exigidas y ofrecía un menor precio que el valor estimado, se declaró fundado su recurso, teniéndose por calificada su oferta y otorgándole la buena pro.",
  "recordar": "El Tribunal precisó que, de manera previa a la evaluación de las ofertas, las entidades deben verificar el cumplimiento de los requisitos técnicos mínimos que garantizan la idoneidad del proveedor.",
  "precision": ""
 },
 {
  "caso": 41,
  "seccion": "1.7",
  "resolucion": "Resolución 890-2025-TCE-S2",
  "cuestionamiento": "Impugnación sobre la validez de los anexos y documentos presentados en la oferta por contener deficiencias menores de nitidez o legibilidad parcial.",
  "resolvio": "El Tribunal determinó que los defectos menores de impresión o legibilidad en los anexos no impiden la admisión cuando la información principal queda fehacientemente respaldada con los demás documentos integrantes del expediente de la oferta.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 42,
  "seccion": "1.7",
  "resolucion": "Resolución 4788-2025-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante solicitó revocar la admisión de la oferta del postor Consorcio Trucks (ubicado en segundo lugar de prelación), argumentando que la documentación técnica de su propuesta no acreditaba las características del tipo de freno de estacionamiento requerido en los Términos de Referencia.",
  "resolvio": "El Tribunal revisó los folletos y catálogos presentados por Consorcio Trucks y constató que la información técnica resultaba imprecisa e inconsistente respecto al freno de estacionamiento exigido en el requerimiento. En consecuencia, declaró no admitida la oferta de dicho postor.",
  "recordar": "El Tribunal revisó los folletos y catálogos presentados por Consorcio Trucks y constató que la información técnica resultaba imprecisa e inconsistente respecto al freno de estacionamiento exigido en el requerimiento.",
  "precision": ""
 },
 {
  "caso": 43,
  "seccion": "1.7",
  "resolucion": "Resolución 4788-2025-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante cuestionó la admisión de la oferta del adjudicatario, alegando que indicó en su propuesta que el motor correspondía a la marca \"Croner\", pero su ficha técnica no demostraba la existencia ni las características de dicho motor.",
  "resolvio": "El Tribunal verificó que el adjudicatario presentó la declaración jurada de cumplimiento de los Términos de Referencia (Anexo N° 3) y la totalidad de los documentos de presentación obligatoria para la admisión exigidos en las bases. Precisó que el Anexo N° 3 constituye una declaración expresa de cumplimiento que debe ser verificada por la Entidad al momento de la recepción de los bienes, ratificando la admisión y la buena pro del adjudicatario.",
  "recordar": "Precisó que el Anexo N° 3 constituye una declaración expresa de cumplimiento que debe ser verificada por la Entidad al momento de la recepción de los bienes, ratificando la admisión y la buena pro del adjudicatario.",
  "precision": ""
 },
 {
  "caso": 44,
  "seccion": "1.7",
  "resolucion": "Resolución 5025-2025-TCP-S3",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta de un postor al observar que no presentó la copia de su Ficha RUC impresa con fecha de emisión actualizada al momento de la presentación de propuestas.",
  "resolvio": "El Tribunal revocó la decisión del comité de selección y declaró admitida la propuesta. Estableció que las bases integradas constituyen las reglas definitivas del procedimiento y que la Entidad no puede exigir documentos adicionales de admisión de manera obligatoria que no hayan sido previstos expresamente en las bases.",
  "recordar": "Estableció que las bases integradas constituyen las reglas definitivas del procedimiento y que la Entidad no puede exigir documentos adicionales de admisión de manera obligatoria que no hayan sido previstos expresamente en las bases.",
  "precision": ""
 },
 {
  "caso": 45,
  "seccion": "1.7",
  "resolucion": "Resolución 5897-2025-TCP-S2",
  "cuestionamiento": "El comité de selección declaró no admitida la propuesta del impugnante sosteniendo que la firma digital/manuscrita consignada en sus anexos tenía la apariencia visual de haber sido \"pegada\" o superpuesta.",
  "resolvio": "El Tribunal revocó la no admisión. Estableció que la mera sospecha o apreciación subjetiva de una firma \"pegada\" no basta para desestimar una oferta ni para romper la presunción de veracidad, requiriéndose una prueba técnica objetiva o peritaje grafotécnico para desacreditar la validez del documento.",
  "recordar": "Estableció que la mera sospecha o apreciación subjetiva de una firma \"pegada\" no basta para desestimar una oferta ni para romper la presunción de veracidad, requiriéndose una prueba técnica objetiva o peritaje grafotécnico para desacreditar la validez del documento.",
  "precision": ""
 },
 {
  "caso": 46,
  "seccion": "1.7",
  "resolucion": "Resolución 6144-2025-TCP-S3",
  "cuestionamiento": "En una Licitación Pública para la adquisición de alimentos extruidos para peces, el impugnante exigió la descalificación/no admisión de la oferta ganadora, alegando que los productos ofertados no contaban con el Registro Sanitario ni la autorización de comercialización emitida por SANIPES al momento de presentar la propuesta.",
  "resolvio": "El Tribunal determinó que los requisitos de admisión son únicamente aquellos exigidos de forma expresa en el acápite de documentos de presentación obligatoria de las bases integradas. Tras revisar las bases del proceso, constató que la copia del Registro Sanitario de SANIPES no fue establecida como un requisito de admisión de la oferta, sino como una condición técnica requerida para la entrega de los bienes y la forma de pago durante la ejecución contractual. Por ende, no se podía rechazar la propuesta por no incluir dicho registro en la etapa de admisión.",
  "recordar": "Tras revisar las bases del proceso, constató que la copia del Registro Sanitario de SANIPES no fue establecida como un requisito de admisión de la oferta, sino como una condición técnica requerida para la entrega de los bienes y la forma de pago durante la ejecución contractual.",
  "precision": ""
 },
 {
  "caso": 47,
  "seccion": "1.7",
  "resolucion": "Resolución 6994-2025-TCP-S2",
  "cuestionamiento": "El postor impugnante cuestionó la admisión de la oferta del adjudicatario en la compra de camiones cisternas, argumentando que el vehículo ofertado no cumplía con los requerimientos técnicos obligatorios de contar con freno de motor, freno de estacionamiento y medidor de presión de aceite.",
  "resolvio": "El Tribunal declaró no admitida la oferta del adjudicatario y revocó la buena pro. Constató que la ficha técnica del fabricante no acreditaba fehacientemente los dispositivos mecánicos exigidos en las bases y que no resultaba válido reemplazar un freno de motor por un retardo neumático auxiliar.",
  "recordar": "Constató que la ficha técnica del fabricante no acreditaba fehacientemente los dispositivos mecánicos exigidos en las bases y que no resultaba válido reemplazar un freno de motor por un retardo neumático auxiliar.",
  "precision": ""
 },
 {
  "caso": 48,
  "seccion": "1.7",
  "resolucion": "Resolución 7259-2025-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "Se cuestionó la admisión porque el postor adjunto dos registros sanitarios distintos (uno para la planta de Arequipa y otro para Lima) para el mismo producto.",
  "resolvio": "Declaró infundado el reclamo. Se determinó que las bases no prohibían la presentación de más de un registro sanitario siempre que ambos estuvieran vigentes y respaldaran la inocuidad del producto objeto de convocatoria.",
  "recordar": "Se determinó que las bases no prohibían la presentación de más de un registro sanitario siempre que ambos estuvieran vigentes y respaldaran la inocuidad del producto objeto de convocatoria.",
  "precision": ""
 },
 {
  "caso": 49,
  "seccion": "1.7",
  "resolucion": "Resolución 7259-2025-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "Se alegó que la resolución de validación HACCP de la planta de Lima hacía referencia a una línea de producción de leche con enriquecimiento vitamínico distinto al solicitado.",
  "resolvio": "Declaró infundado el cuestionamiento. Se verificó que la resolución correspondiente a la planta de Arequipa acreditaba de manera directa y exacta el producto requerido en las bases, siendo suficiente para dar por cumplido el requisito de admisión.",
  "recordar": "Se verificó que la resolución correspondiente a la planta de Arequipa acreditaba de manera directa y exacta el producto requerido en las bases, siendo suficiente para dar por cumplido el requisito de admisión.",
  "precision": ""
 },
 {
  "caso": 50,
  "seccion": "1.7",
  "resolucion": "Resolución 7278-2025-TCP-S4",
  "cuestionamiento": "El impugnante (GEOSATELITAL PERU E.I.R.L.) solicitó revocar la admisión de la oferta del adjudicatario (VALTAR SECURITY SYSTEM S.A.C.), argumentando que los equipos ofertados no cumplían con las especificaciones técnicas obligatorias requeridas en las bases. En concreto, cuestionó que el monitor ofertado presentaba un tiempo de respuesta de 7.5 ms (cuando las bases exigían exactamente 8 ms G a G), un tratamiento de superficie/neblina del 25% (frente al 3% solicitado), un consumo de energía distinto y diferencias en el ancho del bisel. Asimismo, señaló que no se demostró técnicamente el cumplimiento de la separación entre pantallas (3.5 mm máximo), ni el mecanismo de extracción frontal e independiente de las pantallas sin desmontar módulos contiguos, ni las características requeridas para la workstation del centro de monitoreo.",
  "resolvio": "El Tribunal determinó que las bases administrativas constituyen reglas obligatorias tanto para los postores como para el comité de selección. Al analizar el requerimiento técnico, se verificó que la entidad fijó un tiempo de respuesta específico de 8 ms (G a G) sin contemplar un rango de flexibilidad, por lo que ofertar un parámetro distinto (7.5 ms) no se ajustaba a las reglas fijadas. Adicionalmente, se constató que la oferta del adjudicatario no incorporó elementos gráficos, diagramas ni evidencias técnicas fehacientes que acreditaran el cumplimiento de las características mecánicas de extracción independiente de pantallas ni los demás componentes. Por estas razones, el Tribunal declaró fundado el recurso, revocó la admisión de la oferta del adjudicatario y le otorgó la buena pro al impugnante.",
  "recordar": "El Tribunal determinó que las bases administrativas constituyen reglas obligatorias tanto para los postores como para el comité de selección.",
  "precision": ""
 },
 {
  "caso": 51,
  "seccion": "1.7",
  "resolucion": "Resolución 7937-2025-TCP-S4",
  "cuestionamiento": "El comité y el adjudicatario sostuvieron que la oferta no debía admitirse porque no adjuntó el folleto, catálogo o ficha técnica emitido por el fabricante tanto para el tanque de agua como para la \"válvula de polipropileno (PP) acoplamiento\".",
  "resolvio": "El Tribunal constató que el postor sí incluyó la ficha técnica oficial del fabricante (Eternit) que respaldaba las características del tanque. Respecto a la válvula de PP, precisó que las bases integradas únicamente exigían catálogo del fabricante para el producto principal (tanque), mas no para el accesorio específico de acoplamiento. En consecuencia, declaró fundada la apelación, revocó la no admisión y declaró admitida la propuesta del impugnante.",
  "recordar": "Respecto a la válvula de PP, precisó que las bases integradas únicamente exigían catálogo del fabricante para el producto principal (tanque), mas no para el accesorio específico de acoplamiento.",
  "precision": ""
 },
 {
  "caso": 52,
  "seccion": "1.7",
  "resolucion": "Resolución 190-2026-TCP-S3",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta de un postor al realizar una comparación meramente visual u ocular entre la firma trazada en las declaraciones juradas obligatorias (Anexos N° 1, 2, 3, etc.) y la firma que figura en su DNI, concluyendo de forma subjetiva que \"no guardaban coincidencia gráfica\".",
  "resolvio": "El Tribunal declaró fundado este extremo y tuvo por admitida la oferta. Precisó que la simple apreciación visual o la variación gráfica natural del trazo de una persona al firmar repetidamente no faculta al comité a rechazar una propuesta. Para desvirtuar la validez de una firma o declarar apócrifo un documento se requiere un peritaje grafotécnico u objetividad probatoria que demuestre la falsedad, amparando la propuesta en el principio de presunción de veracidad.",
  "recordar": "Precisó que la simple apreciación visual o la variación gráfica natural del trazo de una persona al firmar repetidamente no faculta al comité a rechazar una propuesta.",
  "precision": ""
 },
 {
  "caso": 53,
  "seccion": "1.7",
  "resolucion": "Resolución 614-2026-TCP-S3",
  "cuestionamiento": "El órgano evaluador empleó observaciones sobre experiencia del postor para excluir a SAN PATRICIO durante la admisión.",
  "resolvio": "El Tribunal consideró incorrecto anticipar la revisión de un requisito de calificación a la etapa de admisión. Ordenó admitir la oferta y continuar las etapas pendientes. No declaró automáticamente cumplida la experiencia ni otorgó directamente la buena pro.",
  "recordar": "El Tribunal consideró incorrecto anticipar la revisión de un requisito de calificación a la etapa de admisión.",
  "precision": ""
 },
 {
  "caso": 54,
  "seccion": "1.7",
  "resolucion": "Resolución 758-2026-TCP-S1",
  "cuestionamiento": "Se alegó la no admisión por contradicciones en los aportes porcentuales de insumos dentro de las fichas sanitarias.",
  "resolvio": "Declaró infundado el cuestionamiento. Se aclaró que las bases exigían acreditar la composición cualitativa del producto por ración conforme a la norma de la materia y no porcentajes cuantitativos absolutos sobre 100g, habiendo cumplido el postor de forma coherente.",
  "recordar": "Se aclaró que las bases exigían acreditar la composición cualitativa del producto por ración conforme a la norma de la materia y no porcentajes cuantitativos absolutos sobre 100g, habiendo cumplido el postor de forma coherente.",
  "precision": ""
 },
 {
  "caso": 55,
  "seccion": "1.7",
  "resolucion": "Resolución 908-2026-TCP-S2",
  "cuestionamiento": "El adjudicatario sostuvo que la oferta del impugnante de todas formas debía rechazarse porque los Anexos N° 1, 2, 3 y 11 carecían de firma manuscrita o digital visible de su titular gerente.",
  "resolvio": "El Tribunal determinó que la omisión de la firma en formatos o declaraciones juradas constituye una omisión formal subsanable. De acuerdo con el Reglamento, el comité de selección debe otorgar al postor un plazo de dos (2) días hábiles para subsanar las firmas faltantes a través del SEACE antes de proceder a la calificación de la oferta.",
  "recordar": "De acuerdo con el Reglamento, el comité de selección debe otorgar al postor un plazo de dos (2) días hábiles para subsanar las firmas faltantes a través del SEACE antes de proceder a la calificación de la oferta.",
  "precision": ""
 },
 {
  "caso": 56,
  "seccion": "1.7",
  "resolucion": "Resolución 1053-2026-TCP-S6",
  "cuestionamiento": "El impugnante solicitó desestimar la oferta del adjudicatario argumentando que su Registro Sanitario figuraba con la denominación \"hojuelas de quinua avena con azúcar enriquecida con vitaminas y minerales\", mientras que las bases solicitaban \"con azúcar fortificada con vitaminas y minerales\". Sostenía que, ante dicha variación, era obligatorio adjuntar anexos técnicos adicionales para acreditar la equivalencia del producto.",
  "resolvio": "El Tribunal determinó que la oferta cumplía plenamente con el requisito. Explicó que, según la práctica regulatoria de DIGESA y el Codex Alimentarius, los términos \"enriquecido\" y \"fortificado\" se emplean como términos equivalentes. Al no existir una discrepancia sustancial sobre el bien ofertado ni exigir las bases documentos adicionales para este supuesto, la sola presentación del Registro Sanitario resulta suficiente.",
  "recordar": "Al no existir una discrepancia sustancial sobre el bien ofertado ni exigir las bases documentos adicionales para este supuesto, la sola presentación del Registro Sanitario resulta suficiente.",
  "precision": ""
 },
 {
  "caso": 57,
  "seccion": "1.7",
  "resolucion": "Resolución 2753-2026-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "El postor impugnante solicitó la no admisión de la oferta del adjudicatario argumentando que su Certificado de Validación Técnica Oficial del Plan HACCP caducaba el 6 de febrero de 2026 (fecha coincidente con la evaluación y adjudicación de la buena pro). Sostenía que, al ser un requisito habilitante de salubridad e inocuidad alimentaria, debía mantenerse vigente durante todo el proceso.",
  "resolvio": "El Tribunal confirmó la admisión de la oferta del adjudicatario. Precisó que las Bases Integradas establecen objetivamente que las exigencias de admisión deben verificarse a la fecha de presentación de ofertas (efectuada el 5 de febrero de 2026), momento en el cual el certificado de inocuidad se encontraba plenamente vigente. No corresponde exigir judicial ni administrativamente plazos de vigencia posteriores no contemplados expresamente en las reglas del proceso.",
  "recordar": "Precisó que las Bases Integradas establecen objetivamente que las exigencias de admisión deben verificarse a la fecha de presentación de ofertas (efectuada el 5 de febrero de 2026), momento en el cual el certificado de inocuidad se encontraba plenamente vigente.",
  "precision": ""
 },
 {
  "caso": 58,
  "seccion": "1.7",
  "resolucion": "Resolución 2753-2026-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante solicitó que se declare no admitida la oferta del adjudicatario alegando que en su Certificado Técnico-Productivo de Planta, en los rubros referidos a las sub-etapas de \"selección y clasificación\", constaba la anotación \"NO APLICA\". Sostuvo que ello evidenciaba un incumplimiento de la norma sanitaria (R.M. N° 451-2006-MINSA) y que no se acreditaba el proceso productivo completo.",
  "resolvio": "El Tribunal declaró INFUNDADA la solicitud de no admisión. Explicó que el certificado presentado fue emitido por un organismo de inspección habilitado (CERTECC S.A.C.) acreditando un nivel de cumplimiento técnico del 100%. Aclaró que la anotación \"NO APLICA\" respondía a que dichas sub-etapas específicas no resultaban aplicables al proceso específico del insumo evaluado, mas no a una omisión sanitaria, confirmando la admisión de la oferta.",
  "recordar": "Explicó que el certificado presentado fue emitido por un organismo de inspección habilitado (CERTECC S.A.C.) acreditando un nivel de cumplimiento técnico del 100%.",
  "precision": ""
 },
 {
  "caso": 59,
  "seccion": "1.7",
  "resolucion": "Resolución 3920-2026-TCP-S2",
  "cuestionamiento": "El impugnante exigió no admitir la oferta por omitir la RD N° 2335-2025/DIGESA (tercera rectificación del Plan HACCP).",
  "resolvio": "Declaró fundado en parte el recurso. El Tribunal concluyó que dicha omisión representaba una deficiencia formal subsanable respecto a la cadena documental del certificado e instructivo técnico, otorgando un plazo de dos (2) días hábiles al adjudicatario para subsanar la omisión.",
  "recordar": "El Tribunal concluyó que dicha omisión representaba una deficiencia formal subsanable respecto a la cadena documental del certificado e instructivo técnico, otorgando un plazo de dos (2) días hábiles al adjudicatario para subsanar la omisión.",
  "precision": ""
 },
 {
  "caso": 60,
  "seccion": "1.7",
  "resolucion": "Resolución 4210-2026-TCP-S6",
  "cuestionamiento": "El impugnante solicitó que se declare no admitida la oferta del adjudicatario sosteniendo que este incluyó restricciones y condiciones comerciales del fabricante en su documentación que alteraban las especificaciones técnicas.",
  "resolvio": "El Tribunal declaró infundado el recurso. Explicó que la fase de admisión de dicha oferta ya había sido analizada y confirmada previamente por el Tribunal mediante un pronunciamiento firme (Res. N° 3064-2026-TCP-S5), por lo que existía cosa decidida en la vía administrativa y no correspondía reevaluarla.",
  "recordar": "N° 3064-2026-TCP-S5), por lo que existía cosa decidida en la vía administrativa y no correspondía reevaluarla.",
  "precision": ""
 },
 {
  "caso": 61,
  "seccion": "1.7",
  "resolucion": "Resolución 4271-2026-TCP-S2",
  "cuestionamiento": "El impugnante pidió la no admisión del adjudicatario porque su Certificado Técnico Productivo acreditaba la inspección de un producto formulado con \"soya\", componente no solicitado en las bases para el ítem de hojuelas.",
  "resolvio": "Declaró infundado el pedido de no admisión estricta, pero fundado en el extremo de la evaluación de puntaje. La inclusión de la harina de soya cambiaba la naturaleza del producto inspeccionado respecto al convocado; por ende, no correspondía asignarle puntaje en los factores técnicos evaluados.",
  "recordar": "La inclusión de la harina de soya cambiaba la naturaleza del producto inspeccionado respecto al convocado; por ende, no correspondía asignarle puntaje en los factores técnicos evaluados.",
  "precision": ""
 },
 {
  "caso": 62,
  "seccion": "1.7",
  "resolucion": "Resolución 4735-2026-TCP-S4",
  "cuestionamiento": "El comité de selección descalificó / no admitió la oferta del impugnante por considerar que existían inconsistencias y omisiones insubsanables en los anexos presentados en su propuesta.",
  "resolvio": "El Tribunal declaró fundado en parte el recurso de apelación y revocó la no admisión. Resolvió que las omisiones o errores formales y materiales en los anexos o documentos presentados que no alteren el contenido esencial de la oferta económica o técnica son plenamente subsanables a través de la Pladicop.",
  "recordar": "Resolvió que las omisiones o errores formales y materiales en los anexos o documentos presentados que no alteren el contenido esencial de la oferta económica o técnica son plenamente subsanables a través de la Pladicop.",
  "precision": ""
 },
 {
  "caso": 63,
  "seccion": "1.7",
  "resolucion": "Resolución 4912-2026-TCP-S2 · Cuestionamiento 1",
  "cuestionamiento": "El adjudicatario cuestionó la admisión de la oferta del impugnante, señalando una contradicción grave: en su declaración jurada indicó que el cargador frontal tenía un \"peso operativo mínimo\" de 19,257 kg, pero en el catálogo técnico adjuntado se indicaba que el \"peso operativo máximo\" del equipo alcanzaba solo los 17,880 kg.",
  "resolvio": "El Tribunal concluyó que existía una insuperable contradicción técnica en la propuesta. Es físicamente imposible que un equipo cuyo límite máximo es 17,880 kg cumpla con el mínimo exigido de 19,257 kg. Dado que la información contradictoria no genera certeza sobre el cumplimiento de las especificaciones técnicas mínimas, el Tribunal declaró no admitida la oferta del impugnante.",
  "recordar": "Es físicamente imposible que un equipo cuyo límite máximo es 17,880 kg cumpla con el mínimo exigido de 19,257 kg.",
  "precision": ""
 },
 {
  "caso": 64,
  "seccion": "1.7",
  "resolucion": "Resolución 4912-2026-TCP-S2 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante cuestionó la oferta del adjudicatario sosteniendo que su compromiso de capacitación era general y no detallaba pruebas ni ajustes específicos.",
  "resolvio": "El Tribunal revisó las bases integradas y constató que no se exigía la presentación de un plan de capacitación estructurado o detallado para la etapa de admisión de ofertas. La declaración jurada simple de compromiso presentada por el adjudicatario cumplió con lo solicitado en las bases, desestimando la objeción.",
  "recordar": "La declaración jurada simple de compromiso presentada por el adjudicatario cumplió con lo solicitado en las bases, desestimando la objeción.",
  "precision": ""
 },
 {
  "caso": 65,
  "seccion": "1.7",
  "resolucion": "Resolución 5003-2026-TCP-S1",
  "cuestionamiento": "La oferta de un camión compactador fue excluida por escribir “5 galores”, omitir la DUA y no desarrollar en la ficha técnica una característica del forro de la tolva.",
  "resolvio": "Los relatos del caso coinciden en que “galores” era un error tipográfico sin efecto sustancial; la DUA debía entregarse con el bien, y la característica de la tolva se acreditaba mediante la declaración jurada prevista. Se reporta revocación de la no admisión y continuación del procedimiento. El perfil del capacitador, cuestionamiento diferente, se explica en el apartado 3.1.9.",
  "recordar": "Se reporta revocación de la no admisión y continuación del procedimiento.",
  "precision": ""
 },
 {
  "caso": 66,
  "seccion": "1.7",
  "resolucion": "Resolución 5273-2026-TCP-S3",
  "cuestionamiento": "Desestimación de propuestas en la subetapa de admisión por supuestos incumplimientos de folios o formatos de componentes tecnológicos.",
  "resolvio": "El Tribunal ordenó admitir las propuestas, recordando que el rechazado en la fase de admisión únicamente procede cuando se verifique la omisión o incumplimiento insubsanable de los documentos expresamente tipificados como obligatorios en las bases integradas.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": "La fuente agrupa esta resolución con 6573-2026-TCP-S6. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 67,
  "seccion": "1.7",
  "resolucion": "Resolución 6049-2026-TCP-S6",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta del postor en los ítems 2 y 3 porque no presentó el Anexo N° 12 (Declaración Jurada de Plazo de Prestación del Servicio), sosteniendo que al figurar el formato en las bases integradas su presentación era obligatoria.",
  "resolvio": "El Tribunal determinó que el listado de documentos de presentación obligatoria para la admisión es cerrado y taxativo. Como las bases integradas no incluyeron el Anexo N° 12 dentro de esa lista, ni tampoco establecieron el plazo como factor de evaluación en dicho proceso, el comité no podía exigir dicho documento como requisito de admisión. Se revocó la no admisión y se ordenó admitir la oferta.",
  "recordar": "El Tribunal determinó que el listado de documentos de presentación obligatoria para la admisión es cerrado y taxativo.",
  "precision": ""
 },
 {
  "caso": 68,
  "seccion": "1.7",
  "resolucion": "Resolución 6423-2026-TCP-S6",
  "cuestionamiento": "No admisión de propuestas en Subasta Inversa Electrónica por supuestas incongruencias en la ficha técnica de los bienes ofertados (combustibles, repuestos).",
  "resolvio": "El Tribunal revocó las decisiones del oficial de compra, disponiendo que la verificación de características técnicas obligatorias debe realizarse evaluando la oferta técnica de manera integral, sin desestimar ofertas que objetivamente se ajustan a las especificaciones del Estado.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": "La fuente agrupa esta resolución con 7334-2026-TCP-S2. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 69,
  "seccion": "1.7",
  "resolucion": "Resolución 6573-2026-TCP-S6",
  "cuestionamiento": "Desestimación de propuestas en la subetapa de admisión por supuestos incumplimientos de folios o formatos de componentes tecnológicos.",
  "resolvio": "El Tribunal ordenó admitir las propuestas, recordando que el rechazado en la fase de admisión únicamente procede cuando se verifique la omisión o incumplimiento insubsanable de los documentos expresamente tipificados como obligatorios en las bases integradas.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": "La fuente agrupa esta resolución con 5273-2026-TCP-S3. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 70,
  "seccion": "1.7",
  "resolucion": "Resolución 6745-2026-TCP-S5",
  "cuestionamiento": "El impugnante cuestionó la admisión de la oferta del Consorcio adjudicatario (Consorcio Poliuretano) aduciendo que no adjuntó las fichas técnicas del fabricante exigidas en las bases integradas para verificar características sustanciales del insumo (temperatura de aplicación, cumplimiento de la norma europea EN 14904, etc.).",
  "resolvio": "El Tribunal constató que las bases integradas y el pliego absolutorio establecieron expresamente que ciertos parámetros técnicos mínimos debían ser garantizados y acreditados en la ficha técnica del producto. Al no haberse verificado objetivamente el cumplimiento de las exigencias técnicas por parte del comité, el Tribunal dejó sin efecto la buena pro otorgada al Consorcio adjudicatario y dispuso reevaluar las ofertas aplicando estrictamente las bases.",
  "recordar": "El Tribunal constató que las bases integradas y el pliego absolutorio establecieron expresamente que ciertos parámetros técnicos mínimos debían ser garantizados y acreditados en la ficha técnica del producto.",
  "precision": ""
 },
 {
  "caso": 71,
  "seccion": "1.7",
  "resolucion": "Resolución 6846-2026-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante pretendió la no admisión o el descuento de 7 puntos argumentando que el Registro Sanitario y HACCP indicaban la planta de Arequipa, mientras que el Certificado Sanitativo de Almacén correspondía a Lurigancho-Lima.",
  "resolvio": "Declaró infundado. El postor se presentó como distribuidor autorizado que recoge el producto de la planta y cuenta con la certificación de almacenamiento correspondiente para el producto ofertado, no existiendo incongruencia ni información inexacta.",
  "recordar": "El postor se presentó como distribuidor autorizado que recoge el producto de la planta y cuenta con la certificación de almacenamiento correspondiente para el producto ofertado, no existiendo incongruencia ni información inexacta.",
  "precision": ""
 },
 {
  "caso": 72,
  "seccion": "1.7",
  "resolucion": "Resolución 6846-2026-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "Se alegó que la DJ de disponibilidad de stock exigía acreditar documentalmente la propiedad o alquiler de almacenes locales.",
  "resolvio": "Declaró infundado. Las bases requerían únicamente la presentación formal de la declaración jurada como compromiso técnico de abastecimiento inicial, sin exigir la presentación obligatoria de títulos de propiedad de inmuebles o infraestructura adicional.",
  "recordar": "Las bases requerían únicamente la presentación formal de la declaración jurada como compromiso técnico de abastecimiento inicial, sin exigir la presentación obligatoria de títulos de propiedad de inmuebles o infraestructura adicional.",
  "precision": ""
 },
 {
  "caso": 73,
  "seccion": "1.7",
  "resolucion": "Resolución 6863-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante solicitó declarar no admitida la oferta del adjudicatario debido a incongruencias técnicas en la especificación A02 (equipo médico con batería recargable). Advirtió que en un folio de la oferta el adjudicatario declaró contar con una batería extraplana, mientras que los catálogos y sustentaciones de otros folios correspondían a un cargador y batería de un modelo cableado distinto.",
  "resolvio": "El Tribunal declaró fundado el recurso y no admitida la oferta del adjudicatario. Explicó que cuando la documentación técnica de la oferta guarda contradicciones entre sí, no se genera certeza sobre cuál es el producto que verdaderamente se entregará. Al no acreditarse fehacientemente el cumplimiento del requerimiento técnico mínimo en la etapa de admisión, correspondió revocar la admisión de la oferta y dejar sin efecto la buena pro.",
  "recordar": "Explicó que cuando la documentación técnica de la oferta guarda contradicciones entre sí, no se genera certeza sobre cuál es el producto que verdaderamente se entregará.",
  "precision": ""
 },
 {
  "caso": 74,
  "seccion": "1.7",
  "resolucion": "Resolución 6863-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "El adjudicatario pretendió descalificar al impugnante alegando que no presentó el Registro Sanitario correspondiente a un accesorio del equipo (lupas asféricas).",
  "resolvio": "El Tribunal desestimó la objeción. Aclaró que las bases integradas establecieron de manera expresa que la exigencia de presentar registro sanitario era requerida únicamente para el bien principal objeto de la convocatoria (oftalmoscopios) y no para sus componentes o accesorios, por lo que la oferta del impugnante cumplió válidamente.",
  "recordar": "Aclaró que las bases integradas establecieron de manera expresa que la exigencia de presentar registro sanitario era requerida únicamente para el bien principal objeto de la convocatoria (oftalmoscopios) y no para sus componentes o accesorios, por lo que la oferta del impugnante cumplió válidamente.",
  "precision": ""
 },
 {
  "caso": 75,
  "seccion": "1.7",
  "resolucion": "Resolución 7243-2026-TCP-S6",
  "cuestionamiento": "El adjudicatario solicitó la descalificación/inadmisión del impugnante argumentando que los Anexos de su oferta (como la Declaración Jurada del Postor y el Pacto de Integridad) no contenían firmas manuscritas originales ni firmas digitales con certificado, sino imágenes de firmas manuscritas escaneadas e insertadas digitalmente.",
  "resolvio": "El Tribunal desestimó el cuestionamiento del adjudicatario y validó la admisión de la oferta. Explicó que, mediante declaración jurada del representante legal, se ratificó que las imágenes de las firmas correspondían a su firma manuscrita y fueron incorporadas con su plena autorización y conocimiento. De acuerdo a los criterios del Tribunal, la firma escaneada expresa válidamente la voluntad del firmante y no invalida las declaraciones juradas presentadas.",
  "recordar": "Explicó que, mediante declaración jurada del representante legal, se ratificó que las imágenes de las firmas correspondían a su firma manuscrita y fueron incorporadas con su plena autorización y conocimiento.",
  "precision": ""
 },
 {
  "caso": 76,
  "seccion": "1.7",
  "resolucion": "Resolución 7334-2026-TCP-S2",
  "cuestionamiento": "No admisión de propuestas en Subasta Inversa Electrónica por supuestas incongruencias en la ficha técnica de los bienes ofertados (combustibles, repuestos).",
  "resolvio": "El Tribunal revocó las decisiones del oficial de compra, disponiendo que la verificación de características técnicas obligatorias debe realizarse evaluando la oferta técnica de manera integral, sin desestimar ofertas que objetivamente se ajustan a las especificaciones del Estado.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": "La fuente agrupa esta resolución con 6423-2026-TCP-S6. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 77,
  "seccion": "1.7",
  "resolucion": "Resolución 7374-2026-TCP-S1",
  "cuestionamiento": "El comité de selección no admitió la oferta del impugnante para la adquisición de repuestos/consumibles aeronáuticos porque no presentó las fichas técnicas individuales requeridas en las bases para ciertos subítems, sino extractos del \"Manual de Mantenimiento de componentes\" del fabricante. El impugnante alegaba que dicho manual contenía toda la información técnica necesaria y debía aceptarse como equivalente.",
  "resolvio": "El Tribunal confirmó la decisión de no admitir la oferta. Precisó que las bases integradas establecieron de forma clara la obligación de presentar \"fichas técnicas\" con datos mínimos específicos (nombre del producto, descripción y número de parte). Un manual de mantenimiento general no sustituye formal ni sustancialmente a una ficha técnica, por lo que no correspondía al comité deducir o equiparar documentos distintos a los expresamente exigidos.",
  "recordar": "Precisó que las bases integradas establecieron de forma clara la obligación de presentar \"fichas técnicas\" con datos mínimos específicos (nombre del producto, descripción y número de parte).",
  "precision": ""
 },
 {
  "caso": 78,
  "seccion": "1.7",
  "resolucion": "Resolución 7392-2026-TCP-S1",
  "cuestionamiento": "Varios impugnantes solicitaron la no admisión de la oferta del adjudicatario (Industrias de Alimentos del Perú S.A.C.). Argumentaron que en el Certificado Técnico Productivo de su planta procesadora constaba la existencia de dos (2) reservorios de agua (de 300 m³ y 150 m³), pero el postor solo presentó el certificado de saneamiento y desinfección de uno de ellos.",
  "resolvio": "El Tribunal declaró fundado el cuestionamiento y declaró NO ADMITIDA la oferta del adjudicatario. Estableció que si la planta procesadora cuenta con dos reservorios en funcionamiento, el postor estaba obligado a presentar la acreditación de saneamiento ambiental de ambos reservorios para garantizar la inocuidad del agua utilizada en la elaboración del alimento, constituyendo una omisión subsanable no realizada que impedía su admisión.",
  "recordar": "Estableció que si la planta procesadora cuenta con dos reservorios en funcionamiento, el postor estaba obligado a presentar la acreditación de saneamiento ambiental de ambos reservorios para garantizar la inocuidad del agua utilizada en la elaboración del alimento, constituyendo una omisión subsanable no realizada que impedía su admisión.",
  "precision": ""
 },
 {
  "caso": 79,
  "seccion": "1.7",
  "resolucion": "Resolución 7529-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante cuestionó la admisión del adjudicatario (Productos Roche Q.F. S.A.), alegando incongruencias entre los sitios de fabricación descritos en su Registro Sanitario emitido por DIGEMID y los insertos técnicos de sus reactivos.",
  "resolvio": "El Tribunal verificó que los documentos de la oferta coincidían plenamente en cuanto al fabricante, plantas autorizadas (Brasil/Japón) y códigos de presentación. Por tanto, declaró infundado el cuestionamiento y ratificó la admisión de la oferta del adjudicatario.",
  "recordar": "El Tribunal verificó que los documentos de la oferta coincidían plenamente en cuanto al fabricante, plantas autorizadas (Brasil/Japón) y códigos de presentación.",
  "precision": ""
 },
 {
  "caso": 80,
  "seccion": "1.7",
  "resolucion": "Resolución 7529-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "El adjudicatario cuestionó la oferta del impugnante (W.P. BIOMED S.A.), señalando que las bases exigían que tanto el analizador principal como el equipo de respaldo (backup) debían utilizar el mismo reactivo para efectuar el recuento directo de normoblastos (NRBC).",
  "resolvio": "El Tribunal constató que el equipo backup ofertado por el impugnante no permitía procesar recuentos directos de normoblastos con el reactivo propuesto. Al incumplir una especificación técnica obligatoria, el Tribunal declaró no admitida la oferta del impugnante y confirmó la buena pro a favor de Productos Roche Q.F. S.A..",
  "recordar": "El Tribunal constató que el equipo backup ofertado por el impugnante no permitía procesar recuentos directos de normoblastos con el reactivo propuesto.",
  "precision": ""
 },
 {
  "caso": 81,
  "seccion": "1.7",
  "resolucion": "Resolución 7668-2026-TCP-S3",
  "cuestionamiento": "La Entidad rechazó la propuesta aduciendo que las firmas en los Anexos N° 1, 2, 3 y 6 habrían sido \"escaneadas o pegadas\" digitalmente.",
  "resolvio": "El Tribunal revocó la no admisión. Determinó dos reglas: i) la acusación de firma pegada/escaneada requiere prueba pericial u objetiva fehaciente en el expediente; y ii) aún en el supuesto de duda sobre la modalidad de la firma, la norma no excluye este defecto de la posibilidad de subsanación técnica conforme al artículo 78 del Reglamento, si es ratificada por el representante legal.",
  "recordar": "Determinó dos reglas: i) la acusación de firma pegada/escaneada requiere prueba pericial u objetiva fehaciente en el expediente; y ii) aún en el supuesto de duda sobre la modalidad de la firma, la norma no excluye este defecto de la posibilidad de subsanación técnica conforme al artículo 78 del Reglamento, si es ratificada por el representante legal.",
  "precision": ""
 },
 {
  "caso": 82,
  "seccion": "1.7",
  "resolucion": "Resolución 8002-2026-TCP-S5",
  "cuestionamiento": "Se alegaba la no admisión por ligeras variaciones de redacción en las cláusulas de los Anexos N° 1 y N° 3.",
  "resolvio": "El Tribunal confirmó la admisión de la propuesta, aplicando el criterio de que debe privilegiarse la evaluación del contenido sustancial y la intención cierta del declarante sobre formalismos.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 83,
  "seccion": "1.7",
  "resolucion": "Resolución 8122-2026-TCP-S2",
  "cuestionamiento": "Al absolver el recurso, el adjudicatario cuestionó la admisión de la oferta del impugnante, advirtiendo que en sus documentos técnicos existían contradicciones respecto de las condiciones y rangos de temperatura de almacenamiento requeridos para garantizar la conservación de las suturas médicas.",
  "resolvio": "El Tribunal declaró no admitida la oferta del impugnante. Determinó que las especificaciones técnicas sobre conservación médica son requisitos de admisión de obligatorio cumplimiento. Al corroborar que la propuesta contenía datos contradictorios sobre las condiciones térmicas de almacenamiento, el Tribunal revocó su admisión. Por lo tanto, aunque se le reconoció el puntaje en el plazo de entrega, el postor quedó excluido del proceso por incumplir la etapa de admisión.",
  "recordar": "Determinó que las especificaciones técnicas sobre conservación médica son requisitos de admisión de obligatorio cumplimiento.",
  "precision": ""
 },
 {
  "caso": 84,
  "seccion": "1.7",
  "resolucion": "Resolución 8515-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó la admisión del adjudicatario en la compra de productos de salud porque las direcciones consignadas en su Certificado de Buenas Prácticas de Almacenamiento (BPA) y Autorizaciones Sanitarias no coincidían con la dirección fiscal o contractual registrada en su RNP y ficha RUC.",
  "resolvio": "El Tribunal declaró no admitida la oferta del adjudicatario en los ítems correspondientes y le revocó la buena pro. Precisó que las licencias y certificaciones sanitarias deben estar vinculadas inequívocamente al establecimiento desde donde se prestará el servicio o almacenarán los bienes.",
  "recordar": "Precisó que las licencias y certificaciones sanitarias deben estar vinculadas inequívocamente al establecimiento desde donde se prestará el servicio o almacenarán los bienes.",
  "precision": ""
 },
 {
  "caso": 85,
  "seccion": "1.7",
  "resolucion": "Resolución 8554-2026-TCP-S6",
  "cuestionamiento": "El comité de selección declaró no admitida la propuesta de un postor para la venta de fertilizantes debido a discrepancias entre los porcentajes de componentes químicos señalados en su ficha técnica y lo declarado en su Anexo N° 3 (Declaración Jurada de Cumplimiento de Especificaciones). El postor alegó que se trataba de un rigorismo formal.",
  "resolvio": "El Tribunal declaró infundado el recurso y confirmó la no admisión de la oferta. Estableció que cuando existen documentos contradictorios dentro de una misma propuesta, se genera incertidumbre sobre qué producto se entregará realmente, lo cual no es subsanable ni atribuye un simple error material.",
  "recordar": "Estableció que cuando existen documentos contradictorios dentro de una misma propuesta, se genera incertidumbre sobre qué producto se entregará realmente, lo cual no es subsanable ni atribuye un simple error material.",
  "precision": ""
 },
 {
  "caso": 86,
  "seccion": "1.7",
  "resolucion": "Resolución 8674-2026-TCP-S4",
  "cuestionamiento": "El postor presentó voluntariamente el Anexo N° 12 comprometiéndose a prestar el servicio en \"365 días calendario o mil (1,000) toneladas\". El comité declaró no admitida su oferta por introducir una condición alternativa no prevista en las bases; ante ello, el postor solicitó subsanar su oferta retirando la frase de las toneladas.",
  "resolvio": "El Tribunal concluyó que todos los documentos de la oferta se evalúan de forma integral. La frase agregada introducía una condición de término alternativa que desnaturalizaba el plazo fijo y la modalidad a precios unitarios. Asimismo, precisó que eliminar dicha frase no constituía la corrección de un error formal, sino una modificación sustancial e insubsanable del contenido de la oferta, confirmando la no admisión.",
  "recordar": "Asimismo, precisó que eliminar dicha frase no constituía la corrección de un error formal, sino una modificación sustancial e insubsanable del contenido de la oferta, confirmando la no admisión.",
  "precision": ""
 },
 {
  "caso": 87,
  "seccion": "1.7",
  "resolucion": "Resolución 8725-2026-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó la no admisión de su oferta debido a que el informe de ensayo de muestras concluyó que su bolsa de polietileno soportó 28 segundos en la prueba de reventazón interna frente a los 30 segundos exigidos. Denunció que se aplicó una norma técnica (ASTM D642-20) impertinente para envases flexibles.",
  "resolvio": "El Tribunal revocó la no admisión y dispuso que la Entidad ejecute una nueva prueba técnica sobre las muestras conforme a las reglas objetivas de las bases integradas.",
  "recordar": "Revisa el documento exigido y el alcance de cualquier subsanación.",
  "precision": ""
 },
 {
  "caso": 88,
  "seccion": "1.7",
  "resolucion": "Resolución 8748-2026-TCP-S2",
  "cuestionamiento": "El impugnante solicitó declarar no admitida la oferta del adjudicatario argumentando que, en los catálogos y folletos adjuntados para acreditar las especificaciones técnicas requeridas en el Anexo N° 3, existía una contradicción directa entre los parámetros técnicos exigidos en las bases y las medidas del equipo ofertado.",
  "resolvio": "El Tribunal declaró fundado el recurso y tuvo por NO ADMITIDA la oferta del adjudicatario. Determinó que los documentos descriptivos (folletos/catálogos) deben guardar estricta congruencia con las declaraciones juradas y las especificaciones técnicas. Al existir discrepancias técnicas no subsanables entre la folletería y lo requerido, la oferta incumple las condiciones mínimas de admisión.",
  "recordar": "Determinó que los documentos descriptivos (folletos/catálogos) deben guardar estricta congruencia con las declaraciones juradas y las especificaciones técnicas.",
  "precision": ""
 },
 {
  "caso": 89,
  "seccion": "1.7",
  "resolucion": "Resolución 8901-2026-TCP-S6",
  "cuestionamiento": "Un postor impugnó el otorgamiento de la buena pro solicitando la desestimación de la oferta ganadora. Alegó que el adjudicatario presentó inconsistencias o defectos en anexos no obligatorios y en cartas de compromiso vinculadas al plazo de prestación del servicio.",
  "resolvio": "El Tribunal verificó que los documentos cuestionados no constituían requisitos de presentación obligatoria para la admisión de la oferta según las bases integradas, ni estaban previstos para acreditar requisitos de calificación o factores de evaluación que otorgaran puntaje en dicho procedimiento. Por consiguiente, concluyó que las supuestas omisiones formales en dichos anexos no ameritaban la descalificación del postor y declaró infundado el recurso de apelación.",
  "recordar": "El Tribunal verificó que los documentos cuestionados no constituían requisitos de presentación obligatoria para la admisión de la oferta según las bases integradas, ni estaban previstos para acreditar requisitos de calificación o factores de evaluación que otorgaran puntaje en dicho procedimiento.",
  "precision": ""
 },
 {
  "caso": 90,
  "seccion": "1.7",
  "resolucion": "Resolución 8921-2026-TCP-S3",
  "cuestionamiento": "El comité de selección excluyó al postor aduciendo la falta de presentación del Anexo N° 15; posteriormente, al absolver el recurso, la entidad pretendió sustentar la descalificación introduciendo nuevos cuestionamientos no notificados en el acta.",
  "resolvio": "El Tribunal acogió el recurso al verificar que el Anexo N° 15 sí obraba formalmente en la propuesta. Asimismo, rechazó las nuevas observaciones de la entidad por vulnerar el derecho de defensa del administrado, fijando que no se pueden alegar causales de descalificación extemporáneas que no fueron oportunamente notificadas en el acta de evaluación.",
  "recordar": "Asimismo, rechazó las nuevas observaciones de la entidad por vulnerar el derecho de defensa del administrado, fijando que no se pueden alegar causales de descalificación extemporáneas que no fueron oportunamente notificadas en el acta de evaluación. Requisitos de calificación",
  "precision": ""
 },
 {
  "caso": 91,
  "seccion": "2.1",
  "resolucion": "Resolución 1607-2023-TCE-S6",
  "cuestionamiento": "Se alegó que un consorcio no cumplió el requisito de capacidad legal para transporte de carga porque la constancia del Registro Nacional de Transporte Terrestre de Mercancías (RNTTM) emitida por el MTC detallaba únicamente un vehículo a nombre de uno de los consorciados.",
  "resolvio": "El Tribunal resolvió que la capacidad legal se satisface al demostrar que la empresa (o el consorciado ejecutor) posee la habilitación administrativa e inscripción vigente en el registro sectorial correspondiente para prestar el servicio. La cantidad de unidades específicas asociadas a la constancia no anula la validez de la autorización legal del proveedor.",
  "recordar": "La cantidad de unidades específicas asociadas a la constancia no anula la validez de la autorización legal del proveedor.",
  "precision": ""
 },
 {
  "caso": 92,
  "seccion": "2.1",
  "resolucion": "Resolución 176-2025-TCE-S4",
  "cuestionamiento": "El comité descalificó al postor en un servicio de vigilancia aduciendo que no acreditó la capacidad legal, ya que su constancia del Registro Nacional de Empresas y Entidades que realizan actividades de intermediación laboral (RENEEIL) no especificaba la autorización para la sede regional de ejecución.",
  "resolvio": "El Tribunal revocó la descalificación en este extremo. Precisó que las bases solo exigían contar con la inscripción vigente en el RENEEIL en el rubro de seguridad y vigilancia; requerir que la autorización de intermediación laboral mencione expresamente la ciudad de ejecución es una exigencia ilegal no contemplada en la normativa.",
  "recordar": "Precisó que las bases solo exigían contar con la inscripción vigente en el RENEEIL en el rubro de seguridad y vigilancia; requerir que la autorización de intermediación laboral mencione expresamente la ciudad de ejecución es una exigencia ilegal no contemplada en la normativa.",
  "precision": ""
 },
 {
  "caso": 93,
  "seccion": "2.1",
  "resolucion": "Resolución 5442-2025-TCP-S4",
  "cuestionamiento": "Alegación sobre la falta de acreditación de aportes mensuales a OSIPTEL/FITEL para cumplir con la capacidad legal exigida en las bases.",
  "resolvio": "Analizó las bases integradas determinando que la exigencia de habilitaciones legales debe ceñirse estrictamente a la normativa especial del sector, amparando la calificación cuando se demuestra la titularidad de los títulos habilitantes.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 94,
  "seccion": "2.1",
  "resolucion": "Resolución 5482-2025-TCP-S3",
  "cuestionamiento": "En un concurso para la destrucción de bienes no peligrosos de la SUNAT, se cuestionó la calificación del adjudicatario por no acreditar la habilitación legal o autorizaciones exigidas por la normativa especial para operar en el rubro.",
  "resolvio": "El Tribunal declaró fundado el recurso, descalificó al adjudicatario y otorgó la buena pro al impugnante. Se estableció que los requisitos de capacidad legal y autorizaciones otorgadas por los organismos competentes son de obligatorio cumplimiento al momento de la calificación para garantizar que el proveedor opere dentro del marco legal administrativo.",
  "recordar": "Se estableció que los requisitos de capacidad legal y autorizaciones otorgadas por los organismos competentes son de obligatorio cumplimiento al momento de la calificación para garantizar que el proveedor opere dentro del marco legal administrativo.",
  "precision": ""
 },
 {
  "caso": 95,
  "seccion": "2.1",
  "resolucion": "Resolución 8626-2025-TCP-S5",
  "cuestionamiento": "El comité de selección descalificó la oferta del Consorcio San Patricio porque, al momento de revisar las propuestas, ingresó al portal web del Colegio de Ingenieros del Perú y observó que la ingeniera propuesta como Especialista en SSOMA figuraba como \"no habilitada\". La entidad sostuvo que todo el personal clave debe estar habilitado desde el día de la presentación de ofertas para garantizar la calidad.",
  "resolvio": "El Tribunal revocó la descalificación. Precisó que el requisito de calificación \"Capacidad técnica y profesional\" únicamente exige acreditar la formación académica (poseer el título profesional o grado académico). La colegiatura y la habilitación profesional no son exigibles para calificar la oferta, sino que son condiciones administrativas requeridas de forma obligatoria recién al momento del inicio efectivo de las prestaciones en la obra. Exigir la habilitación de forma anticipada en la oferta técnica vulnera el principio de libre concurrencia.",
  "recordar": "Precisó que el requisito de calificación \"Capacidad técnica y profesional\" únicamente exige acreditar la formación académica (poseer el título profesional o grado académico).",
  "precision": ""
 },
 {
  "caso": 96,
  "seccion": "2.1",
  "resolucion": "Resolución 167-2026-TCP-S4",
  "cuestionamiento": "Se cuestionó la capacidad legal del adjudicatario aduciendo que las direcciones consignadas en sus autorizaciones oficiales (constancia RENEIL de intermediación laboral y autorización SUCAMEC para vigilancia) diferían de las direcciones que figuraban en sus certificados ISO o en otros anexos de su oferta.",
  "resolvio": "El Tribunal resolvió que la capacidad legal se acredita con la validez de las autorizaciones emitidas por las entidades competentes (SUCAMEC/RENEIL). Las variaciones secundarias de domicilios entre registros no anulan ni desvirtúan la autorización legal vigente otorgada a la empresa para operar.",
  "recordar": "Las variaciones secundarias de domicilios entre registros no anulan ni desvirtúan la autorización legal vigente otorgada a la empresa para operar.",
  "precision": ""
 },
 {
  "caso": 97,
  "seccion": "2.1",
  "resolucion": "Resolución 3458-2026-TCP-S2",
  "cuestionamiento": "Se descalificó la propuesta de un participante en un servicio de transporte al constatarse que la autorización del RENAT presentada para acreditar la Capacidad Legal se encontraba vencida o no cubría la ruta requerida.",
  "resolvio": "El Tribunal confirmó la descalificación de la oferta. Determinó que la Capacidad Legal exige la presentación de autorizaciones administrativas vigentes e idóneas expedidas a favor del postor al momento de presentar su oferta, siendo un requisito obligatorio de calificación no subsanable.",
  "recordar": "Determinó que la Capacidad Legal exige la presentación de autorizaciones administrativas vigentes e idóneas expedidas a favor del postor al momento de presentar su oferta, siendo un requisito obligatorio de calificación no subsanable.",
  "precision": ""
 },
 {
  "caso": 98,
  "seccion": "2.1",
  "resolucion": "Resolución 3917-2026-TCP-S6",
  "cuestionamiento": "El impugnante pretendía que se descalificara la oferta del adjudicatario afirmando que el profesional propuesto como \"Jefe de Grupo\" presentó un reporte de SUCAMEC con la licencia de portar armas vencida.",
  "resolvio": "El Tribunal desestimó el cuestionamiento. Aclaró que la exigencia de contar con la licencia vigente emitida por SUCAMEC estaba contemplada en las bases integradas como una condición obligatoria para la etapa de perfeccionamiento del contrato, y no como un requisito de calificación para la admisión o evaluación de la oferta.",
  "recordar": "Aclaró que la exigencia de contar con la licencia vigente emitida por SUCAMEC estaba contemplada en las bases integradas como una condición obligatoria para la etapa de perfeccionamiento del contrato, y no como un requisito de calificación para la admisión o evaluación de la oferta.",
  "precision": ""
 },
 {
  "caso": 99,
  "seccion": "2.1",
  "resolucion": "Resolución 7384-2026-TCP-S1",
  "cuestionamiento": "Evaluación formal de la habilitación legal y representación estatutaria para ejecutar el contrato.",
  "resolvio": "La capacidad legal debe constatarse mediante los documentos públicos habilitantes previstos en el ordenamiento, sin exigir formalidades extraordenamiento.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": "La fuente agrupa esta resolución con 7626-2026-TCP-S6. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 100,
  "seccion": "2.1",
  "resolucion": "Resolución 7626-2026-TCP-S6",
  "cuestionamiento": "Evaluación formal de la habilitación legal y representación estatutaria para ejecutar el contrato.",
  "resolvio": "La capacidad legal debe constatarse mediante los documentos públicos habilitantes previstos en el ordenamiento, sin exigir formalidades extraordenamiento.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": "La fuente agrupa esta resolución con 7384-2026-TCP-S1. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 101,
  "seccion": "2.1",
  "resolucion": "Resolución 8186-2026-TCP-S1",
  "cuestionamiento": "El comité de selección descalificó la oferta del impugnante debido a que advirtió una divergencia entre las fechas de incorporación al Colegio de Ingenieros del Perú (CIP) que figuraban en los diplomas de colegiatura frente a las registradas en los Certificados de Habilidad de los ingenieros propuestos como Residente y Especialista en Estructuras.",
  "resolvio": "El Tribunal declaró fundado el reclamo. Resolvió que la incongruencia de fechas constituyó una discrepancia meramente formal o administrativa que de ninguna manera alteró ni desvirtuó la condición real de profesionales titulados, colegiados y habilitados para el ejercicio. Al tratarse de una inconsistencia aclara y no un defecto insubsanable, el comité debió otorgar el procedimiento de subsanación de ofertas (Art. 78 del Reglamento) antes de aplicar la descalificación directa. Se revocó la descalificación.",
  "recordar": "Al tratarse de una inconsistencia aclara y no un defecto insubsanable, el comité debió otorgar el procedimiento de subsanación de ofertas (Art. 78 del Reglamento) antes de aplicar la descalificación directa.",
  "precision": ""
 },
 {
  "caso": 102,
  "seccion": "2.1",
  "resolucion": "Resolución 8839-2026-TCP-S6",
  "cuestionamiento": "Se discutió la diferencia entre las exigencias de vigencia para la acreditación legal de la empresa frente a la capacitación de su personal técnico.",
  "resolvio": "El Tribunal precisó que las bases integradas establecieron de manera obligatoria que el postor debía contar con una acreditación vigente ante INACAL como laboratorio de ensayo bajo la norma NTP-ISO/IEC 17025 al momento de la presentación de ofertas. Esta exigencia legal evalúa la habilitación formal e idoneidad operativa actual de la empresa para ejecutar los ensayos, diferenciándose de los requisitos de formación del personal.",
  "recordar": "Esta exigencia legal evalúa la habilitación formal e idoneidad operativa actual de la empresa para ejecutar los ensayos, diferenciándose de los requisitos de formación del personal.",
  "precision": ""
 },
 {
  "caso": 103,
  "seccion": "2.2",
  "resolucion": "Resolución 1607-2023-TCE-S6",
  "cuestionamiento": "Se cuestionaron órdenes de servicio presentadas para acreditar experiencia por no demostrar el pago fehaciente o por tener actas de conformidad defectuosas.",
  "resolvio": "El Tribunal ordenó descontar las contrataciones cuyas conformidades no cumplían el Reglamento o cuyos pagos no fueron demostrados documentalmente (mediante vouchers o sellos). No obstante, al verificar que tras el descuento el postor aún superaba el monto mínimo facturado, ratificó su calificación.",
  "recordar": "No obstante, al verificar que tras el descuento el postor aún superaba el monto mínimo facturado, ratificó su calificación.",
  "precision": ""
 },
 {
  "caso": 104,
  "seccion": "2.2",
  "resolucion": "Resolución 3139-2024-TCE-S1",
  "cuestionamiento": "Un postor pretendía acreditar su experiencia mediante facturas, constancias de detracción y estados de cuenta bancarios. No obstante, los abonos depositados en la cuenta bancaria eran menores al monto neto de las facturas. El postor y la entidad alegaron que las diferencias se debían a \"descuentos por penalidades\" aplicadas durante la ejecución del contrato.",
  "resolvio": "El Tribunal descalificó la experiencia de las facturas inconsistentes. Criterio clave: Para validar la experiencia con comprobantes de pago, el postor debe acreditar documental y fehacientemente la cancelación total de la factura. Si el abono en cuenta no coincide con el importe de la factura (descontando la detracción), no hay trazabilidad. Las penalidades deducidas deben estar fehacientemente documentadas en la oferta; el comité no puede \"asumir\" o \"presumir\" que las diferencias monetarias corresponden a penalidades si no hay documentos oficiales que lo sustenten.",
  "recordar": "Criterio clave: Para validar la experiencia con comprobantes de pago, el postor debe acreditar documental y fehacientemente la cancelación total de la factura.",
  "precision": ""
 },
 {
  "caso": 105,
  "seccion": "2.2",
  "resolucion": "Resolución 3948-2024-TCE-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se cuestionó que las experiencias 8 y 9 de TRANSVEL provinieran de subcontrataciones privadas sin autorización de la entidad pública y, por ello, no pudieran utilizarse para acreditar experiencia.",
  "resolvio": "La Sala validó esas experiencias para la calificación: las bases exigían contratos y conformidades y no habían previsto presentar la autorización de subcontratación como documento de acreditación. No correspondía añadir esa exigencia al evaluar la oferta. Ello no equivale a autorizar cualquier subcontratación irregular: la resolución dispuso fiscalización posterior de la documentación cuestionada.",
  "recordar": "La Sala validó esas experiencias para la calificación: las bases exigían contratos y conformidades y no habían previsto presentar la autorización de subcontratación como documento de acreditación.",
  "precision": ""
 },
 {
  "caso": 106,
  "seccion": "2.2",
  "resolucion": "Resolución 3948-2024-TCE-S1 · Cuestionamiento 2",
  "cuestionamiento": "Se objetó la experiencia 7 porque se acreditó una valorización de un servicio de mantenimiento periódico, en lugar de demostrar la culminación del contrato completo.",
  "resolvio": "El Tribunal aceptó la experiencia correspondiente al monto efectivamente ejecutado y pagado. En una prestación periódica, la factura de la valorización, el abono y la detracción permitían acreditar ese monto, sin exigir que el contrato entero hubiese terminado. Este resultado se refiere a la prestación y a los comprobantes examinados.",
  "recordar": "En una prestación periódica, la factura de la valorización, el abono y la detracción permitían acreditar ese monto, sin exigir que el contrato entero hubiese terminado.",
  "precision": ""
 },
 {
  "caso": 107,
  "seccion": "2.2",
  "resolucion": "Resolución 176-2025-TCE-S4 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante solicitó que se dé por cumplida su experiencia acumulada en la especialidad para servicios de seguridad.",
  "resolvio": "El Tribunal desestimó este extremo del recurso. Confirmó que, tras el recalculo de los comprobantes presentados, el postor no alcanzó el monto facturado mínimo exigido por las bases integradas, manteniéndose su condición de descalificado.",
  "recordar": "Confirmó que, tras el recalculo de los comprobantes presentados, el postor no alcanzó el monto facturado mínimo exigido por las bases integradas, manteniéndose su condición de descalificado.",
  "precision": ""
 },
 {
  "caso": 108,
  "seccion": "2.2",
  "resolucion": "Resolución 176-2025-TCE-S4 · Cuestionamiento 2",
  "cuestionamiento": "Descalificación del impugnante por presentar contratos de ejecución continuada cuyo periodo facturado sobrepasaba el rango de antigüedad permitido.",
  "resolvio": "Confirmó la descalificación explicando que en contratos de ejecución continuada solo se valida el monto efectivamente facturado y ejecutado dentro del periodo de experiencia fijado en las bases.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 109,
  "seccion": "2.2",
  "resolucion": "Resolución 890-2025-TCE-S2",
  "cuestionamiento": "Se cuestionó la validez de resoluciones de liquidación de obra presentadas para acreditar la experiencia por contener cuadros con números de difícil lectura.",
  "resolvio": "El Tribunal resolvió validar la experiencia al establecer que las deficiencias menores de nitidez no anulan el documento si del contexto general de la liquidación y del expediente de obra se logra verificar con claridad el monto ejecutado.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 110,
  "seccion": "2.2",
  "resolucion": "Resolución 893-2025-TCE-S5",
  "cuestionamiento": "El impugnante fue descalificado porque el comité rechazó sus principales comprobantes de experiencia debido a diferencias entre el monto del contrato original y el monto final consignado en el acta de recepción o resolución de liquidación de obra.",
  "resolvio": "En concordancia con el Acuerdo de Sala Plena N° 002-2023/TCE, el Tribunal señaló que los documentos de experiencia deben evaluarse de forma integral y lógica. Si del contrato, sus adendas, el acta de recepción y la liquidación es posible derivar con certeza la culminación de la obra y el monto final total ejecutado, la experiencia es válida. Se revocó la descalificación del postor.",
  "recordar": "En concordancia con el Acuerdo de Sala Plena N° 002-2023/TCE, el Tribunal señaló que los documentos de experiencia deben evaluarse de forma integral y lógica.",
  "precision": ""
 },
 {
  "caso": 111,
  "seccion": "2.2",
  "resolucion": "Resolución 1006-2025-TCE-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se debatió si un contrato de ejecución de obra en una institución educativa que incluía la construcción de losas y coberturas podía computarse totalmente o si solo debían sumarse los montos específicos de las partidas deportivas.",
  "resolvio": "El Tribunal confirmó la calificación. Precisó que si la definición de obra similar aprobada en las bases integradas incluyó expresamente la \"construcción y/o mejoramiento de centros educativos que incluyan losas o coberturas deportivas\", debe valorarse el monto total de la obra ejecutada y no únicamente el costo de la losa, por estar así contemplado en las reglas del proceso.",
  "recordar": "Precisó que si la definición de obra similar aprobada en las bases integradas incluyó expresamente la \"construcción y/o mejoramiento de centros educativos que incluyan losas o coberturas deportivas\", debe valorarse el monto total de la obra ejecutada y no únicamente el costo de la losa, por estar así contemplado en las reglas del proceso.",
  "precision": ""
 },
 {
  "caso": 112,
  "seccion": "2.2",
  "resolucion": "Resolución 1006-2025-TCE-S1 · Cuestionamiento 2",
  "cuestionamiento": "El postor pretendió validar como \"obra similar\" a una construcción de edificación pública un contrato cuyo objeto consistió únicamente en trabajos aislados de reemplazo de coberturas y techos metálicos.",
  "resolvio": "El Tribunal ratificó la descalificación. Resolvió que las intervenciones parciales o partidas aisladas de techado no satisfacen la definición técnica de obra similar establecida en las bases para proyectos de edificación integral.",
  "recordar": "Resolvió que las intervenciones parciales o partidas aisladas de techado no satisfacen la definición técnica de obra similar establecida en las bases para proyectos de edificación integral.",
  "precision": ""
 },
 {
  "caso": 113,
  "seccion": "2.2",
  "resolucion": "Resolución 2414-2025-TCE-S1",
  "cuestionamiento": "El impugnante alegó que los contratos presentados por el adjudicatario no acreditaban fehacientemente el monto facturado en la especialidad.",
  "resolvio": "Se verificó que los comprobantes y conformidades presentados correspondían a prestaciones ejecutadas dentro del periodo de ocho años anteriores a las ofertas y alcanzaban el monto mínimo exigido, confirmando la calificación del postor.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 114,
  "seccion": "2.2",
  "resolucion": "Resolución 2931-2025-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "En un proceso para la \"Renovación de puente\", el comité descalificó la oferta del Consorcio Monte Verde argumentando que el contrato presentado correspondía a la \"Creación de puente y mejoramiento de accesos\" y que no se podía determinar el monto exacto atribuible al puente.",
  "resolvio": "El Tribunal confirmó la descalificación. Precisó que el nombre del contrato no es determinante sino la naturaleza de las prestaciones; sin embargo, cuando el contrato abarca obras complejas (puente + accesos viales) y el acta de recepción no desglosa con claridad el monto final ejecutado únicamente en la prestación similar exigida (puente vehicular), la experiencia no genera certeza y debe ser desestimada conforme al Acuerdo de Sala Plena Nº 002-2023/TCE.",
  "recordar": "Precisó que el nombre del contrato no es determinante sino la naturaleza de las prestaciones; sin embargo, cuando el contrato abarca obras complejas (puente + accesos viales) y el acta de recepción no desglosa con claridad el monto final ejecutado únicamente en la prestación similar exigida (puente vehicular), la experiencia no genera certeza y debe ser desestimada conforme al Acuerdo de Sala Plena Nº 002-2023/TCE.",
  "precision": ""
 },
 {
  "caso": 115,
  "seccion": "2.2",
  "resolucion": "Resolución 2931-2025-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "Discrepancia sobre los criterios técnicos aplicables para validar la experiencia en la construcción de puentes de concreto.",
  "resolvio": "El Tribunal estableció que los pliegos de absolución de consultas integrados a las bases constituyen reglas definitivas del procedimiento; por tanto, el comité debe ceñirse estrictamente a las definiciones integradas para computar la experiencia.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 116,
  "seccion": "2.2",
  "resolucion": "Resolución 3299-2025-TCP-S5",
  "cuestionamiento": "El impugnante cuestionó la experiencia del adjudicatario debido a que presentó un Acta de Recepción de Obra que consignaba únicamente el monto del contrato original y no el monto real final ejecutado.",
  "resolvio": "El Tribunal acogió el cuestionamiento. Reiteró que el acta de recepción que solo indica el monto primitivo del contrato no genera certeza sobre el valor final ejecutado si existieron adendas o variaciones, requiriéndose la liquidación para validar el monto.",
  "recordar": "Reiteró que el acta de recepción que solo indica el monto primitivo del contrato no genera certeza sobre el valor final ejecutado si existieron adendas o variaciones, requiriéndose la liquidación para validar el monto.",
  "precision": ""
 },
 {
  "caso": 117,
  "seccion": "2.2",
  "resolucion": "Resolución 3597-2025-TCP-S5 · Cuestionamiento 1",
  "cuestionamiento": "Se descalificó a GOLDEN por acreditar una obra denominada reconstrucción de un puente, cuando las bases describían obras de creación, construcción o renovación de puentes de concreto.",
  "resolvio": "La Sala examinó conjuntamente el objeto y las partidas de la obra y encontró correspondencia con la experiencia exigida. La denominación “reconstrucción” no justificaba excluir una obra técnicamente comparable. Revocó la descalificación; el análisis no consistió en aceptar cualquier partida aislada como experiencia independiente.",
  "recordar": "La Sala examinó conjuntamente el objeto y las partidas de la obra y encontró correspondencia con la experiencia exigida.",
  "precision": ""
 },
 {
  "caso": 118,
  "seccion": "2.2",
  "resolucion": "Resolución 3597-2025-TCP-S5 · Cuestionamiento 2",
  "cuestionamiento": "Se objetó una diferencia de un céntimo en el monto declarado de experiencia y se pretendió exigir una liquidación como único medio para acreditar el importe.",
  "resolvio": "El Tribunal consideró que la diferencia entre S/ 8 253 707,33 y S/ 8 253 707,32 era de redondeo y no alteraba el cumplimiento del mínimo. El contrato, el porcentaje de participación y la documentación de recepción permitían acreditar el monto; no correspondía imponer exclusivamente la liquidación.",
  "recordar": "El contrato, el porcentaje de participación y la documentación de recepción permitían acreditar el monto; no correspondía imponer exclusivamente la liquidación.",
  "precision": ""
 },
 {
  "caso": 119,
  "seccion": "2.2",
  "resolucion": "Resolución 3782-2025-TCP-S6",
  "cuestionamiento": "El impugnante solicitó descalificar al adjudicatario alegando que 7 de sus 13 experiencias presentadas en el Anexo N° 8 no correspondían a la especialidad requerida (supervisión de puentes). Sostuvo que en los certificados de conformidad de obras internacionales (Corea y Bolivia) figuraban denominaciones como \"reconstrucción de superestructura de puentes\", \"vía\" o \"seguimiento de ejecución\", lo cual según el impugnante no equivalía a la construcción pura de puentes.",
  "resolvio": "El Tribunal analizó detalladamente la documentación técnica y los contratos electrónicos traducidos de los proyectos internacionales. Constató que la descripción de las obras en las constancias correspondía a la supervisión integral de puentes carreteros, urbanos y ferroviarios (como el Gran Puente Amsa o puentes ferroviarios Tanbu-Yeonha). La mención a \"superestructura\" o \"vía\" era parte descriptiva de las etapas del proyecto puente. Fallo del Tribunal: Declaró infundado el cuestionamiento del impugnante, confirmando la validez de la calificación del adjudicatario.",
  "recordar": "El Tribunal analizó detalladamente la documentación técnica y los contratos electrónicos traducidos de los proyectos internacionales.",
  "precision": ""
 },
 {
  "caso": 120,
  "seccion": "2.2",
  "resolucion": "Resolución 4080-2025-TCP-S2",
  "cuestionamiento": "Se impugnó la experiencia del adjudicatario aduciendo que sus constancias no detallaban las \"metas físicas\" ejecutadas en sus obras anteriores.",
  "resolvio": "El Tribunal descalificó al adjudicatario por no alcanzar el monto facturado acumulado, pero aclaró que el comité no puede exigir el detalle de \"metas físicas\" si dicha exigencia no estuvo explícitamente prevista en las bases integradas.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 121,
  "seccion": "2.2",
  "resolucion": "Resolución 4708-2025-TCP-S1",
  "cuestionamiento": "El comité de selección descalificó la oferta de BADALSA alegando que en su declaración jurada (Anexo N° 8) señaló que parte de su experiencia provenía de \"BARRIGA DALL' ORTO S.A. INGENIEROS CONSULTORES\" y otra de \"BADALLSA INGENIEROS CONSULTORES S.A.\". El comité sostuvo erróneamente que se trataba de dos empresas distintas (como una matriz o sucursal) sin sustento de reorganización societaria, además de indicar supuestas incongruencias en los datos del anexo. BADALSA demostró que no existió transferencia de experiencia ni reorganización societaria con un tercero, sino un simple cambio formal de denominación social de la misma persona jurídica (conservando su mismo RUC y partida registral).",
  "resolvio": "El Tribunal determinó que la descalificación fue arbitraria e injustificada. Explicó que el cambio de razón social de una empresa no altera su identidad jurídica ni su RUC, por lo que la experiencia le pertenece plenamente al postor. Tras verificar que el postor cumplió con acreditar el monto facturado acumulado requerido por las bases, el Tribunal revocó la descalificación de BADALSA (teniéndola por calificada) y revocó la buena pro otorgada al Consorcio León XIV.",
  "recordar": "El Tribunal determinó que la descalificación fue arbitraria e injustificada.",
  "precision": ""
 },
 {
  "caso": 122,
  "seccion": "2.2",
  "resolucion": "Resolución 4827-2025-TCP-S5",
  "cuestionamiento": "El comité de selección descalificó la oferta del Consorcio Galindos aduciendo que en su promesa de consorcio las obligaciones de las partes se redactaron de forma genérica y no permitían identificar la cuota exacta de ejecución de obra.",
  "resolvio": "El Tribunal realizó un análisis integral del documento y comprobó que ambas consorciadas se comprometieron formalmente a ejecutar la obra de manera conjunta asignándose un 50% de participación a cada una. Al apreciarse con claridad la responsabilidad directa en la ejecución prestacional, el Tribunal validó la experiencia presentada (S/ 3,910,912.53), revocó la descalificación y declaró calificada la propuesta.",
  "recordar": "El Tribunal realizó un análisis integral del documento y comprobó que ambas consorciadas se comprometieron formalmente a ejecutar la obra de manera conjunta asignándose un 50% de participación a cada una.",
  "precision": ""
 },
 {
  "caso": 123,
  "seccion": "2.2",
  "resolucion": "Resolución 4964-2025-TCP-S4",
  "cuestionamiento": "El comité descalificó la propuesta del impugnante al restar tres contratos de su Anexo N° 10, argumentando variaciones entre el presupuesto base y el monto reflejado en la liquidación de obra.",
  "resolvio": "Aplicando el Acuerdo de Sala Plena N° 002-2023/TCE, el Tribunal determinó que las variaciones de monto producto de adicionales, deductivos o reajustes plasmadas en las liquidaciones no invalidan la experiencia si de los documentos se acredita la conclusión de la obra y el monto efectivamente pagado. Al validar la experiencia acumulada (S/ 30,165,852.36), el postor superó el exigido de S/ 29.7 millones, por lo que declaró calificada su propuesta.",
  "recordar": "Aplicando el Acuerdo de Sala Plena N° 002-2023/TCE, el Tribunal determinó que las variaciones de monto producto de adicionales, deductivos o reajustes plasmadas en las liquidaciones no invalidan la experiencia si de los documentos se acredita la conclusión de la obra y el monto efectivamente pagado.",
  "precision": ""
 },
 {
  "caso": 124,
  "seccion": "2.2",
  "resolucion": "Resolución 5482-2025-TCP-S3",
  "cuestionamiento": "Impugnación contra facturas y órdenes de compra presentadas por el adjudicatario que no contaban con sello de conformidad de recepción ni constancia de abono bancario.",
  "resolvio": "El Tribunal descalificó la oferta del adjudicatario. Dictaminó que los comprobantes de pago o las órdenes de compra emitidas sin la correspondiente conformidad formal ni documento financiero que pruebe su cancelación fehaciente carecen de valor probatorio.",
  "recordar": "Dictaminó que los comprobantes de pago o las órdenes de compra emitidas sin la correspondiente conformidad formal ni documento financiero que pruebe su cancelación fehaciente carecen de valor probatorio.",
  "precision": ""
 },
 {
  "caso": 125,
  "seccion": "2.2",
  "resolucion": "Resolución 5604-2025-TCP-S4",
  "cuestionamiento": "El comité descalificó al Consorcio Capulí argumentando contradicciones en las cláusulas de su contrato privado de consorcio respecto a la asignación de responsabilidades de ejecución.",
  "resolvio": "Tras examinar el contrato privado, el Tribunal concluyó que no existían incongruencias y que la distribución porcentual de las tareas de ejecución de obra era clara e idónea para validar la facturación atribuida, declarando calificada la propuesta.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 126,
  "seccion": "2.2",
  "resolucion": "Resolución 5725-2025-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó la calificación de la oferta del adjudicatario alegando que la experiencia acreditada mediante un contrato ejecutado en consorcio no alcanzaba el monto mínimo facturado requerido por las bases.",
  "resolvio": "El Tribunal confirmó la calificación del adjudicatario. Precisó que al aplicar el porcentaje de participación del integrante del consorcio (30%) sobre el monto facturado del contrato presentado, la cifra obtenida superaba válidamente el monto mínimo exigido en las bases integradas.",
  "recordar": "Precisó que al aplicar el porcentaje de participación del integrante del consorcio (30%) sobre el monto facturado del contrato presentado, la cifra obtenida superaba válidamente el monto mínimo exigido en las bases integradas.",
  "precision": ""
 },
 {
  "caso": 127,
  "seccion": "2.2",
  "resolucion": "Resolución 5897-2025-TCP-S2",
  "cuestionamiento": "Cuestionamiento al cómputo de la experiencia de una obra que sufrió variaciones contractuales, adicionales y deductivos, sin adjuntar la resolución de liquidación.",
  "resolvio": "El Tribunal descalificó la experiencia. Estableció que cuando el contrato principal ha tenido modificaciones en sus montos, el postor está obligado a adjuntar la liquidación u orden de servicio final que acredite el valor neto ejecutado.",
  "recordar": "Estableció que cuando el contrato principal ha tenido modificaciones en sus montos, el postor está obligado a adjuntar la liquidación u orden de servicio final que acredite el valor neto ejecutado.",
  "precision": ""
 },
 {
  "caso": 128,
  "seccion": "2.2",
  "resolucion": "Resolución 6965-2025-TCP-S2",
  "cuestionamiento": "El Consorcio impugnante 1 alegó que los contratos presentados por el adjudicatario correspondían a la ejecución de obras de infraestructura de agua potable y no a la subespecialidad exigida en las bases integradas (infraestructura para alcantarillado).",
  "resolvio": "El Tribunal analizó las bases integradas y la documentación presentada, concluyendo que los contratos validados acreditaban la especialidad de saneamiento y la subespecialidad requerida, cumpliendo con el monto facturado acumulado mínimo exigido. Por ello, declaró infundado este extremo del recurso.",
  "recordar": "El Tribunal analizó las bases integradas y la documentación presentada, concluyendo que los contratos validados acreditaban la especialidad de saneamiento y la subespecialidad requerida, cumpliendo con el monto facturado acumulado mínimo exigido.",
  "precision": ""
 },
 {
  "caso": 129,
  "seccion": "2.2",
  "resolucion": "Resolución 7147-2025-TCP-S1",
  "cuestionamiento": "El impugnante solicitó descalificar la oferta del adjudicatario (Mia Consulting & Trading E.I.R.L.) debido a que presentó órdenes de compra de contrataciones ejecutadas en consorcio, pero omitió adjuntar la promesa formal o el contrato de consorcio para verificar el porcentaje de sus obligaciones.",
  "resolvio": "Conforme a las bases integradas y la Directiva de Consorcios del OSCE, cuando un postor acredita experiencia con facturación efectuada en consorcio, resulta obligatorio adjuntar el contrato o promesa de consorcio en el que se consigne expresamente su porcentaje de obligaciones; de lo contrario, la experiencia no puede ser validada. Al revisar la propuesta del adjudicatario, se constató que no adjuntó dicho documento para cinco de sus contrataciones y que la sexta carecía de constancia de conformidad. En consecuencia, el Tribunal descalificó la oferta del adjudicatario, revocó la buena pro y se la otorgó al impugnante.",
  "recordar": "Conforme a las bases integradas y la Directiva de Consorcios del OSCE, cuando un postor acredita experiencia con facturación efectuada en consorcio, resulta obligatorio adjuntar el contrato o promesa de consorcio en el que se consigne expresamente su porcentaje de obligaciones; de lo contrario, la experiencia no puede ser validada.",
  "precision": ""
 },
 {
  "caso": 130,
  "seccion": "2.2",
  "resolucion": "Resolución 7177-2025-TCP-S5 · Cuestionamiento 1",
  "cuestionamiento": "Un competidor sostuvo que las Facturas Electrónicas N° E001-13 y E001-25 presentadas por un postor para respaldar bienes e infraestructura eran falsas o adulteradas, debido a que omitían consignar datos visibles sobre la forma de pago (al contado o a crédito) en su apartado inferior.",
  "resolvio": "El Tribunal desestimó la alegación de falsedad documental tras consultar formalmente a la SUNAT. Se confirmó que los comprobantes electrónicos fueron válidamente emitidos y registrados en el sistema tributario. La omisión de datos accesorios en la representación impresa no altera la validez ni el contenido de la transacción, por lo que prima el principio de presunción de veracidad.",
  "recordar": "Se confirmó que los comprobantes electrónicos fueron válidamente emitidos y registrados en el sistema tributario.",
  "precision": ""
 },
 {
  "caso": 131,
  "seccion": "2.2",
  "resolucion": "Resolución 7177-2025-TCP-S5 · Cuestionamiento 2",
  "cuestionamiento": "Se observó una experiencia privada del adjudicatario que fue acreditada únicamente con el contrato, sin adjuntar los comprobantes de pago ni los estados de cuenta bancarios que exigían las bases.",
  "resolvio": "El Tribunal determinó que las contrataciones con el sector privado requieren obligatoriamente adjuntar comprobantes de pago cancelados o documentos financieros que acrediten la cancelación efectiva. Al descontar dicho contrato por falta de sustento de pago, el postor no alcanzó el monto mínimo acumulado y fue descalificado.",
  "recordar": "Al descontar dicho contrato por falta de sustento de pago, el postor no alcanzó el monto mínimo acumulado y fue descalificado.",
  "precision": ""
 },
 {
  "caso": 132,
  "seccion": "2.2",
  "resolucion": "Resolución 7259-2025-TCP-S3",
  "cuestionamiento": "El impugnante sostuvo que el adjudicatario presentó 6 contratos en el Anexo N° 11, pero que la mayoría correspondía a bienes no similares.",
  "resolvio": "Declaró infundado el cuestionamiento. Al revisar la oferta, la Sala constató que el postor acreditó su experiencia con un único contrato suscrito con la Municipalidad del Callao por un monto de S/ 1’438,945.20, monto que superaba el mínimo exigido.",
  "recordar": "Al revisar la oferta, la Sala constató que el postor acreditó su experiencia con un único contrato suscrito con la Municipalidad del Callao por un monto de S/ 1’438,945.20, monto que superaba el mínimo exigido.",
  "precision": ""
 },
 {
  "caso": 133,
  "seccion": "2.2",
  "resolucion": "Resolución 7702-2025-TCP-S2",
  "cuestionamiento": "La empresa BELLTECH PERU S.A.C. impugnó la descalificación de su oferta y la declaratoria de desierto del proceso de selección. El comité la descalificó al considerar que no acreditó el monto mínimo de facturación para la experiencia en la especialidad, debido a que presentó un contrato (Contrato N° 195-2020/SUNAT) cuyo objeto principal era la venta de equipos de telefonía IP, videoconferencia y licencias, el cual a criterio del comité no guardaba semejanza con el servicio convocado (\"modernización de plataforma de videoconferencia\").",
  "resolvio": "El Tribunal analizó el contrato presentado y determinó que su objeto principal abarcaba la adquisición de bienes informáticos y soporte accesorio, lo cual no es igual ni similar al servicio de modernización objeto de la convocatoria. Además, al ser un contrato mixto sin montos desagregados respecto a las prestaciones similares, no resultaba posible determinar qué monto correspondía exactamente a la especialidad. Por ello, al no alcanzar el monto mínimo requerido, el Tribunal confirmó la descalificación de la oferta y la declaratoria de desierto.",
  "recordar": "El Tribunal analizó el contrato presentado y determinó que su objeto principal abarcaba la adquisición de bienes informáticos y soporte accesorio, lo cual no es igual ni similar al servicio de modernización objeto de la convocatoria.",
  "precision": ""
 },
 {
  "caso": 134,
  "seccion": "2.2",
  "resolucion": "Resolución 7714-2025-TCP-S5 · Cuestionamiento 1",
  "cuestionamiento": "Se descalificó al CONSORCIO SUPERVISOR AS-CPS porque el contrato comprendía estudios y supervisión de ejecución y se consideró imposible identificar el monto correspondiente al expediente técnico.",
  "resolvio": "El contrato diferenciaba el importe de supervisión de estudios y la constancia era coherente con él. La lectura conjunta permitía identificar el componente acreditado. La Sala revocó la descalificación por ese motivo, pero dejó la calificación supeditada a verificar la experiencia de ejecución y los restantes requisitos. No adjudicó la buena pro al consorcio.",
  "recordar": "La lectura conjunta permitía identificar el componente acreditado.",
  "precision": ""
 },
 {
  "caso": 135,
  "seccion": "2.2",
  "resolucion": "Resolución 7714-2025-TCP-S5 · Cuestionamiento 2",
  "cuestionamiento": "Se rechazó la experiencia 1 del CONSORCIO SUPERVISOR PUENTE LAS BEGONIAS porque sus facturas no separaban la supervisión del expediente técnico de la supervisión de ejecución.",
  "resolvio": "La Sala relacionó las facturas, los abonos, las detracciones y la fecha de aprobación del expediente. Los pagos eran anteriores a esa aprobación y correspondían al componente declarado, sin contradicción documental. Con esa experiencia se superaba el mínimo incluso sin computar la experiencia 5, cuyo análisis resultaba innecesario. Revocó la descalificación y ordenó verificar los demás requisitos antes de continuar la evaluación.",
  "recordar": "Los pagos eran anteriores a esa aprobación y correspondían al componente declarado, sin contradicción documental.",
  "precision": ""
 },
 {
  "caso": 136,
  "seccion": "2.2",
  "resolucion": "Resolución 7793-2025-TCP-S2",
  "cuestionamiento": "El adjudicatario sostuvo que las órdenes de servicio presentadas por el impugnante para acreditar su experiencia no resultaban idóneas para el objeto de la convocatoria.",
  "resolvio": "El Tribunal verificó que las contrataciones acreditadas por el impugnante correspondían a servicios similares exigidos en las bases y superaban ampliamente el monto facturado acumulado requerido (S/ 2,000,000.00). En consecuencia, declaró fundado el recurso del impugnante en este extremo y le otorgó la buena pro.",
  "recordar": "El Tribunal verificó que las contrataciones acreditadas por el impugnante correspondían a servicios similares exigidos en las bases y superaban ampliamente el monto facturado acumulado requerido (S/ 2,000,000.00).",
  "precision": ""
 },
 {
  "caso": 137,
  "seccion": "2.2",
  "resolucion": "Resolución 7813-2025-TCP-S4",
  "cuestionamiento": "El comité de selección descalificó al postor impugnante porque, en las constancias de obras ejecutadas anteriormente bajo la modalidad de consorcio (Contratos Nº 34-2010, Nº 116-2018 y Nº 4-2024), la promesa o el contrato de consorcio no precisaba detalladamente cuáles eran las obligaciones ejecutadas por cada empresa integrante que estuvieran directamente vinculadas a la ejecución física de la obra. El postor alegó que figurar en el contrato y tener un porcentaje asignado bastaba para validar su experiencia.",
  "resolvio": "El Tribunal desestimó el argumento del postor y confirmó su descalificación. Estableció que en las contrataciones en consorcio no basta con establecer compromisos generales o porcentajes globales. Es obligatorio que el contrato de consorcio desglose y detalle con precisión las obligaciones operativas asumidas por cada integrante directamente asociadas al objeto del contrato (ejecución de la obra). Al no existir ese detalle, no era posible determinar qué parte de la facturación le correspondía efectivamente al postor, por lo que su experiencia no pudo ser computada.",
  "recordar": "Es obligatorio que el contrato de consorcio desglose y detalle con precisión las obligaciones operativas asumidas por cada integrante directamente asociadas al objeto del contrato (ejecución de la obra).",
  "precision": ""
 },
 {
  "caso": 138,
  "seccion": "2.2",
  "resolucion": "Resolución 7937-2025-TCP-S4",
  "cuestionamiento": "La Entidad argumentó en un informe posterior que el impugnante tampoco cumpliría la experiencia del postor porque sus comprobantes de pago solo contenían un sello de \"cancelado\" colocado por el propio postor.",
  "resolvio": "Si bien el fallo principal versó sobre la admisión, el Tribunal emitió una precisión y recomendación binding/orientadora al comité para la etapa de calificación: recordó que conforme a las bases estándar, el sello de \"cancelado\" puesto por el propio postor no es suficiente por sí solo, pero sí es totalmente válido cuando el sello de cancelado o pagado ha sido estampado por el cliente que recibió el bien o servicio.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 139,
  "seccion": "2.2",
  "resolucion": "Resolución 8034-2025-TCP-S5",
  "cuestionamiento": "El impugnante cuestionó su descalificación alegando que la Entidad omitió computar la experiencia de una obra ejecutada anteriormente en consorcio.",
  "resolvio": "El Tribunal confirmó la descalificación. Precisó que para validar la experiencia adquirida en consorcio es obligatorio presentar la promesa o el contrato de consorcio de dicha contratación que acredite de manera fehaciente el porcentaje de participación y las obligaciones ejecutadas. Al omitir dicho documento en la oferta, el monto no era computable, no alcanzando la experiencia mínima exigida.",
  "recordar": "Precisó que para validar la experiencia adquirida en consorcio es obligatorio presentar la promesa o el contrato de consorcio de dicha contratación que acredite de manera fehaciente el porcentaje de participación y las obligaciones ejecutadas.",
  "precision": ""
 },
 {
  "caso": 140,
  "seccion": "2.2",
  "resolucion": "Resolución 8386-2025-TCP-S6",
  "cuestionamiento": "El adjudicatario cuestionó las órdenes de compra y estados de cuenta presentados por el impugnante, alegando que los reportes bancarios tenían las casillas de \"saldo contable\" ocultadas o suprimidas, lo que a su criterio configuraba adulteración e invalidaba la fehaciencia de los pagos.",
  "resolvio": "El Tribunal resolvió que la eliminación de saldos bancarios contables no altera la veracidad ni la fehaciencia de la información sobre el abono o transferencia efectuada para cancelar la factura correspondiente. Al verificarse la efectividad del pago, dio por válidamente acreditada la experiencia del postor.",
  "recordar": "Al verificarse la efectividad del pago, dio por válidamente acreditada la experiencia del postor.",
  "precision": ""
 },
 {
  "caso": 141,
  "seccion": "2.2",
  "resolucion": "Resolución 8537-2025-TCP-S1",
  "cuestionamiento": "El adjudicatario cuestionó la calificación de la oferta del impugnante, afirmando que no había acreditado el monto mínimo facturado exigido para la venta/suministro de bienes similares mediante los contratos y comprobantes presentados.",
  "resolvio": "El Tribunal declaró INfundado el cuestionamiento del adjudicatario. Evaluó la documentación obrante en la oferta y confirmó que los comprobantes y constancias cumplían estrictamente con las reglas de acreditación de las bases integradas.",
  "recordar": "Evaluó la documentación obrante en la oferta y confirmó que los comprobantes y constancias cumplían estrictamente con las reglas de acreditación de las bases integradas.",
  "precision": ""
 },
 {
  "caso": 142,
  "seccion": "2.2",
  "resolucion": "Resolución 8594-2025-TCP-S2",
  "cuestionamiento": "El comité de selección descalificó la oferta del postor (declarando desierto el proceso) al considerar que existía una incongruencia en la constancia de prestación de un contrato de consultoría. La constancia indicaba como fecha de inicio el 30/12/2017 y culminación el 07/04/2021 (período de 1,194 días), pero fijaba un plazo total ejecutado de \"495 días calendario\".",
  "resolvio": "El Tribunal explicó que la diferencia entre las fechas extremas del contrato y los días efectivamente contabilizados se debía a suspensiones o paralizaciones en la ejecución contractual, lo cual es habitual en obras públicas y no resta veracidad al plazo real de ejecución (495 días) ni al monto facturado. Por tanto, revocó la descalificación, dio por válida la experiencia presentada e integró su monto para la calificación del postor.",
  "recordar": "El Tribunal explicó que la diferencia entre las fechas extremas del contrato y los días efectivamente contabilizados se debía a suspensiones o paralizaciones en la ejecución contractual, lo cual es habitual en obras públicas y no resta veracidad al plazo real de ejecución (495 días) ni al monto facturado.",
  "precision": ""
 },
 {
  "caso": 143,
  "seccion": "2.2",
  "resolucion": "Resolución 219-2026-TCP-S3",
  "cuestionamiento": "El adjudicatario cuestionó la oferta del impugnante manifestando que pretendió acreditar su experiencia en la especialidad con un contrato derivado de una entidad privada o estatal sin adjuntar comprobantes de pago ni constancias de retención.",
  "resolvio": "El Tribunal desestimó la objeción del adjudicatario. Explicó que el contrato presentado fue suscrito con la empresa Electrosur S.A., la cual califica normativamente como una empresa del Estado. De acuerdo con las bases integradas, para contrataciones con entidades públicas, bastaba presentar la copia del contrato y su respectiva conformidad (vía elegida por el postor), siendo la presentación de comprobantes de pago una vía alternativa para contratos privados, por lo que la experiencia fue válidamente acreditada.",
  "recordar": "De acuerdo con las bases integradas, para contrataciones con entidades públicas, bastaba presentar la copia del contrato y su respectiva conformidad (vía elegida por el postor), siendo la presentación de comprobantes de pago una vía alternativa para contratos privados, por lo que la experiencia fue válidamente acreditada.",
  "precision": ""
 },
 {
  "caso": 144,
  "seccion": "2.2",
  "resolucion": "Resolución 232-2026-TCP-S1",
  "cuestionamiento": "El postor buscó validar su experiencia con un contrato de obra del año 2018 ejecutado en consorcio. El comité lo descalificó porque el contrato privado de consorcio adjuntado contenía cláusulas genéricas de responsabilidad y un porcentaje total de participación, sin detallar ni individualizar las obligaciones cuantitativas o cualitativas asumidas por la empresa consorciada.",
  "resolvio": "Aplicando la Directiva N° 006-2017-OSCE/CD, el Tribunal reiteró que la experiencia derivada de consorcios exige presentar documentos de los que se desprenda con certeza qué prestaciones específicas ejecutó cada integrante. Asignar un porcentaje genérico sin precisar las tareas no permite validar la experiencia. Se restó el contrato cuestionado (S/ 1,069,524.20), dejando al postor con S/ 0.00 acreditados, por lo que confirmó su descalificación.",
  "recordar": "Aplicando la Directiva N° 006-2017-OSCE/CD, el Tribunal reiteró que la experiencia derivada de consorcios exige presentar documentos de los que se desprenda con certeza qué prestaciones específicas ejecutó cada integrante.",
  "precision": ""
 },
 {
  "caso": 145,
  "seccion": "2.2",
  "resolucion": "Resolución 758-2026-TCP-S1",
  "cuestionamiento": "Se solicitó descalificar la propuesta argumentando que el postor incurrió en error en la suma del monto facturado acumulado en su formato de experiencia.",
  "resolvio": "Declaró infundado el reclamo. Se trató de una diferencia insignificante de centavos por redondeo (S/ 1’563,287.60 frente a S/ 1’563,287.70) que no afectó el monto mínimo requerido de S/ 1’200,000.00.",
  "recordar": "Se trató de una diferencia insignificante de centavos por redondeo (S/ 1’563,287.60 frente a S/ 1’563,287.70) que no afectó el monto mínimo requerido de S/ 1’200,000.00.",
  "precision": ""
 },
 {
  "caso": 146,
  "seccion": "2.2",
  "resolucion": "Resolución 909-2026-TCP-S6",
  "cuestionamiento": "Descalificación del adjudicatario alegando no alcanzar el monto facturado acumulado requerido (S/ 6 000 000.00) en servicios de lavandería de ropa hospitalaria por no validarse contrataciones similares.",
  "resolvio": "El Tribunal analizó la definición de \"servicios similares\" establecida en las bases definitivas (que incluía lavandería y limpieza en general), confirmando que las contrataciones que encajen dentro de dicha definición amplia deben computarse para la experiencia acumulada.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 147,
  "seccion": "2.2",
  "resolucion": "Resolución 1111-2026-TCP-S1",
  "cuestionamiento": "El comité descalificó al Consorcio Cristo 1 porque presentó el contrato y el acta de recepción de obra pero no incluyó la resolución de liquidación financiera. El acta de recepción contenía variaciones de plazos, deductivos y adicionales.",
  "resolvio": "El Tribunal confirmó la descalificación. Explicó que, en aplicación del Acuerdo de Sala Plena Nº 002-2023/TCE, si bien el acta de recepción es un documento válido para acreditar la conclusión de la obra, si de su texto o de la oferta se desprende que existieron modificaciones presupuestales (adicionales/deductivos) que alteraron el monto contractual original y no se adjunta la liquidación o documentos aprobatorios que fijen el monto final ejecutado con exactitud, la experiencia carece de certeza y no puede ser computada.",
  "recordar": "Explicó que, en aplicación del Acuerdo de Sala Plena Nº 002-2023/TCE, si bien el acta de recepción es un documento válido para acreditar la conclusión de la obra, si de su texto o de la oferta se desprende que existieron modificaciones presupuestales (adicionales/deductivos) que alteraron el monto contractual original y no se adjunta la liquidación o documentos aprobatorios que fijen el monto final ejecutado con exactitud, la experiencia carece de certeza y no puede ser computada.",
  "precision": ""
 },
 {
  "caso": 148,
  "seccion": "2.2",
  "resolucion": "Resolución 1580-2026-TCP-S5",
  "cuestionamiento": "Se cuestionó la calificación del adjudicatario alegando que para alcanzar el monto mínimo facturado de S/ 750,000.00 presentó una orden de compra a la que le faltaba la página donde constaba el precio total del contrato.",
  "resolvio": "El Tribunal descalificó la propuesta del adjudicatario. Resolvió que los postores son responsables de la integridad de sus ofertas y el comité no puede presumir importes de documentos incompletos; al descontar dicha orden, el postor no alcanzaba la facturación mínima requerida.",
  "recordar": "Resolvió que los postores son responsables de la integridad de sus ofertas y el comité no puede presumir importes de documentos incompletos; al descontar dicha orden, el postor no alcanzaba la facturación mínima requerida.",
  "precision": ""
 },
 {
  "caso": 149,
  "seccion": "2.2",
  "resolucion": "Resolución 1675-2026-TCP-S3",
  "cuestionamiento": "El adjudicatario alegó que la experiencia del postor impugnante contenía datos incongruentes respecto a los montos facturados, cobrados y ejecutados en un contrato privado N° 152-2023 y su adenda.",
  "resolvio": "El Tribunal realizó una evaluación integral y conjunta del contrato, adenda, facturas, comprobantes de detracción y estados de cuenta bancarios. Concluyó que los documentos eran trazables y acreditaban con certeza el monto facturado acumulado exigido por las bases, revocando la descalificación del impugnante.",
  "recordar": "Concluyó que los documentos eran trazables y acreditaban con certeza el monto facturado acumulado exigido por las bases, revocando la descalificación del impugnante.",
  "precision": ""
 },
 {
  "caso": 150,
  "seccion": "2.2",
  "resolucion": "Resolución 1727-2026-TCP-S2",
  "cuestionamiento": "Se cuestionó que el adjudicatario presentó experiencias ejecutadas por otra persona jurídica (su matriz o una empresa reorganizada) sin haber presentado el Anexo N° 14 ni la documentación sustentatoria del proceso de reorganización societaria.",
  "resolvio": "El Tribunal estableció que, cuando la experiencia invocada no pertenece directamente al postor sino a su matriz o a una entidad reorganizada, es de obligatorio cumplimiento presentar la documentación legal de respaldo y el Anexo N° 14. Al omitirse dichos requisitos, la experiencia no puede ser computada.",
  "recordar": "Al omitirse dichos requisitos, la experiencia no puede ser computada.",
  "precision": ""
 },
 {
  "caso": 151,
  "seccion": "2.2",
  "resolucion": "Resolución 1854-2026-TCP-S2",
  "cuestionamiento": "El impugnante cuestionó la calificación del adjudicatario sosteniendo que la empresa consorciada que aportó las facturas de experiencia no asumió obligaciones directamente vinculadas con la ejecución principal del objeto contractual en la promesa de consorcio.",
  "resolvio": "El Tribunal fijó que solo es computable la experiencia de aquellos integrantes del consorcio que se hayan comprometido a ejecutar directamente prestaciones vinculadas al objeto de la contratación. Si un consorciado solo asume tareas secundarias o de asesoría, su experiencia previa no se puede sumar para calificar al consorcio.",
  "recordar": "Si un consorciado solo asume tareas secundarias o de asesoría, su experiencia previa no se puede sumar para calificar al consorcio.",
  "precision": ""
 },
 {
  "caso": 152,
  "seccion": "2.2",
  "resolucion": "Resolución 2051-2026-TCP-S4",
  "cuestionamiento": "El comité desestimó la experiencia de un postor derivada de una Contratación Directa por Emergencia porque entre la fecha de suscripción del contrato regularizado y la constancia de conformidad no transcurrieron los 180 días del plazo de ejecución.",
  "resolvio": "El Tribunal revocó la decisión y dio por calificada la oferta. Recordó que en las contrataciones por emergencia la norma faculta a iniciar las prestaciones de forma inmediata antes del perfeccionamiento formal del contrato. Por ende, el plazo computable para la experiencia es el periodo real de ejecución pactado y no la fecha de suscripción del documento contractual regularizado.",
  "recordar": "Por ende, el plazo computable para la experiencia es el periodo real de ejecución pactado y no la fecha de suscripción del documento contractual regularizado.",
  "precision": ""
 },
 {
  "caso": 153,
  "seccion": "2.2",
  "resolucion": "Resolución 2100-2026-TCP-S4",
  "cuestionamiento": "Se cuestionó la calificación del adjudicatario alegando que no todos los integrantes del consorcio comprometidos en la ejecución aportaron individualmente experiencia en la especialidad.",
  "resolvio": "El Tribunal ratificó la validez de la calificación del adjudicatario. Recordó que, salvo disposición legal o regla de las bases en contrario, en las contrataciones públicas los integrantes de un consorcio pueden acumular sus experiencias conforme a los compromisos asumidos en la promesa formal de consorcio, sin que sea exigible que cada uno de ellos valide individualmente la totalidad de la experiencia.",
  "recordar": "Recordó que, salvo disposición legal o regla de las bases en contrario, en las contrataciones públicas los integrantes de un consorcio pueden acumular sus experiencias conforme a los compromisos asumidos en la promesa formal de consorcio, sin que sea exigible que cada uno de ellos valide individualmente la totalidad de la experiencia.",
  "precision": ""
 },
 {
  "caso": 154,
  "seccion": "2.2",
  "resolucion": "Resolución 2753-2026-TCP-S3",
  "cuestionamiento": "El impugnante cuestionó la calificación de la experiencia del adjudicatario señalando que presentó contratos y comprobantes que aludían de manera genérica a \"hojuelas de cereales\" o \"harina de cebada\", en lugar de especificar taxativamente \"hojuelas de avena precocida\", tal como figuraba en las bases.",
  "resolvio": "El Tribunal confirmó la calificación de la oferta. Determinó que se debe aplicar el criterio de valoración integral de los documentos. Cuando la denominación en la carátula o título del contrato sea general, es válido revisar las conformidades, liquidaciones o comprobantes adjuntos; si de su análisis conjunto se desprende fehacientemente que la prestación ejecutada corresponde a la especialidad requerida (cereales y harinas similares), la experiencia debe darse por válida.",
  "recordar": "Determinó que se debe aplicar el criterio de valoración integral de los documentos.",
  "precision": ""
 },
 {
  "caso": 155,
  "seccion": "2.2",
  "resolucion": "Resolución 3048-2026-TCP-S2",
  "cuestionamiento": "Se debatió si el Contrato N° 117-2023, cuyo objeto fue la \"limpieza, descolmatación y conformación de dique con material propio\", calificaba como servicio similar para la rehabilitación de cauces y canales de riego.",
  "resolvio": "El Tribunal validó la experiencia. Determinó que las actividades esenciales de movimiento de tierras y descolmatación guardan la misma naturaleza técnica exigida en la definición de servicios similares de las bases.",
  "recordar": "Determinó que las actividades esenciales de movimiento de tierras y descolmatación guardan la misma naturaleza técnica exigida en la definición de servicios similares de las bases.",
  "precision": ""
 },
 {
  "caso": 156,
  "seccion": "2.2",
  "resolucion": "Resolución 3540-2026-TCP-S1",
  "cuestionamiento": "En un concurso para mantenimiento de un resonador magnético, se cuestionaron las facturas presentadas por el adjudicatario alegando que los conceptos (\"reinstalación del sistema\", \"revisión funcional\") no correspondían al objeto del servicio. Además, se cuestionó la acreditación del pago de las facturas.",
  "resolvio": "El Tribunal declaró infundada la impugnación. Verificó con el área técnica de la entidad que los trabajos descritos en las facturas constituían actividades operativas directamente inherentes e indispensables dentro del mantenimiento preventivo y correctivo de resonadores, resultando válidas. El Tribunal confirmó la calificación y el otorgamiento de la buena pro al adjudicatario. Verificó que los contratos y comprobantes acreditaban la ejecución de actividades de naturaleza similar y que la documentación bancaria complementaria sustentaba válidamente la cancelación total exigida.",
  "recordar": "Verificó con el área técnica de la entidad que los trabajos descritos en las facturas constituían actividades operativas directamente inherentes e indispensables dentro del mantenimiento preventivo y correctivo de resonadores, resultando válidas.",
  "precision": ""
 },
 {
  "caso": 157,
  "seccion": "2.2",
  "resolucion": "Resolución 3920-2026-TCP-S2",
  "cuestionamiento": "Se solicitó la descalificación porque tres constancias de prestación no indicaban el plazo contractual expreso.",
  "resolvio": "Declaró infundado este cuestionamiento. La experiencia se evalúa en función del monto facturado y ejecutado en bienes similares. Al haberse adjuntado los contratos respectivos donde sí figuraba la vigencia, la información quedaba acreditada.",
  "recordar": "La experiencia se evalúa en función del monto facturado y ejecutado en bienes similares.",
  "precision": ""
 },
 {
  "caso": 158,
  "seccion": "2.2",
  "resolucion": "Resolución 4906-2026-TCE-S1",
  "cuestionamiento": "Se descalificó a E&S por omitir el Anexo 11, cuadro resumen de experiencia, pese a adjuntar la documentación de sustento.",
  "resolvio": "La Sala consideró subsanable la omisión del resumen: completarlo con la información ya presentada no modificaba la esencia de la oferta ni añadía una nueva experiencia. Revocó ese fundamento de descalificación. Ello no convirtió finalmente la oferta en válida, pues otro certificado de su personal fue declarado inexacto.",
  "recordar": "La Sala consideró subsanable la omisión del resumen: completarlo con la información ya presentada no modificaba la esencia de la oferta ni añadía una nueva experiencia.",
  "precision": ""
 },
 {
  "caso": 159,
  "seccion": "2.2",
  "resolucion": "Resolución 5305-2026-TCP-S2",
  "cuestionamiento": "Evaluación documental de la experiencia en servicios de mantenimiento vial mediante comprobantes de pago.",
  "resolvio": "Ordenó la reevaluación técnica de las ofertas exigiendo que la cancelación de cada factura se compruebe con el reporte del sistema financiero, conforme al Reglamento.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 160,
  "seccion": "2.2",
  "resolucion": "Resolución 5356-2026-TCP-S2",
  "cuestionamiento": "El postor descalificado sostuvo que las incongruencias de fechas entre sus comprobantes de pago y sus constancias de servicio eran errores formales que no debían anular su experiencia.",
  "resolvio": "El Tribunal ratificó la descalificación. Sostuvo que las contradicciones en los periodos de ejecución alteran la certeza sobre el cómputo de la antigüedad de la experiencia, constituyendo un defecto insubsanable.",
  "recordar": "Sostuvo que las contradicciones en los periodos de ejecución alteran la certeza sobre el cómputo de la antigüedad de la experiencia, constituyendo un defecto insubsanable.",
  "precision": ""
 },
 {
  "caso": 161,
  "seccion": "2.2",
  "resolucion": "Resolución 6127-2026-TCP-S1",
  "cuestionamiento": "Se cuestionaron las experiencias de OPERACIONES CAPO por ausencia de adendas y supuesta falta de claridad de la documentación contractual.",
  "resolvio": "Las constancias de las experiencias 2 y 8 identificaban los importes finales y eran coherentes con los contratos. La experiencia 6 también era identificable y legible. La Sala validó S/ 3 241 104,46, por encima del mínimo de S/ 2 000 000; no necesitó decidir sobre los demás contratos para acreditar el requisito.",
  "recordar": "La experiencia 6 también era identificable y legible.",
  "precision": ""
 },
 {
  "caso": 162,
  "seccion": "2.2",
  "resolucion": "Resolución 6485-2026-TCP-S1",
  "cuestionamiento": "impugnante pretendió invalidar facturas presentadas para acreditar la experiencia aduciendo que la constancia de bancarización provenía del banco del ordenante/receptor y no de la entidad exigida.",
  "resolvio": "El Tribunal estableció que la cancelación de facturas mediante bancarización se demuestra fehacientemente con cualquier documento emitido por una entidad del sistema financiero (ej. constancia de transferencia de Interbank) que contenga la trazabilidad de la operación (monto, fecha, cuenta origen y destino), sin que las bases puedan restringir la validez a un solo tipo de banco.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 163,
  "seccion": "2.2",
  "resolucion": "Resolución 6601-2026-TCP-S3",
  "cuestionamiento": "Se impugnó una experiencia presentada por el postor porque, si bien presentó el contrato y el acta de recepción, en esta última se señalaba que existieron adicionales y deductivos netos, sin adjuntar la liquidación final que demostrara el monto real y efectivamente ejecutado.",
  "resolvio": "El Tribunal determinó que, cuando los documentos de la oferta evidencian que el monto original del contrato varió por adicionales o deductivos, el postor está obligado a presentar la liquidación o documento equivalente que dé certeza del monto final. Ante la falta de certeza, se descontó dicha experiencia.",
  "recordar": "Ante la falta de certeza, se descontó dicha experiencia.",
  "precision": ""
 },
 {
  "caso": 164,
  "seccion": "2.2",
  "resolucion": "Resolución 6745-2026-TCP-S5",
  "cuestionamiento": "La oferta del postor Sport Field Engineering E.I.R.L. fue descalificada por el comité al sostener que el Contrato N° 89-2022/ORA presentado no acreditaba experiencia en servicios similares de suministro e instalación de piso de poliuretano deportivo de 11 mm.",
  "resolvio": "El Tribunal examinó el contrato, comprobantes de pago y especificaciones técnicas, verificando que la contratación previa incluía la adquisición e instalación de piso de poliuretano de 11 mm para losas deportivas. Al ser una prestación similar y cumplir con el monto facturado acumulado, el Tribunal declaró fundado el recurso, revocó la descalificación y declaró calificada la oferta del impugnante.",
  "recordar": "El Tribunal examinó el contrato, comprobantes de pago y especificaciones técnicas, verificando que la contratación previa incluía la adquisición e instalación de piso de poliuretano de 11 mm para losas deportivas.",
  "precision": ""
 },
 {
  "caso": 165,
  "seccion": "2.2",
  "resolucion": "Resolución 7837-2026-TCP-S4",
  "cuestionamiento": "JOHNNY pretendió acreditar experiencia con constancias que consignaban montos iniciales de los contratos, sin demostrar los importes finalmente facturados.",
  "resolvio": "La Sala no aceptó sustituir el monto facturado por el precio inicial. Excluyó las experiencias 1, 2 y 3; las experiencias válidas no alcanzaban el mínimo de S/ 540 491,23. Confirmó la descalificación de ese impugnante, cuya situación era distinta de LAS VIOLETAS.",
  "recordar": "Excluyó las experiencias 1, 2 y 3; las experiencias válidas no alcanzaban el mínimo de S/ 540 491,23.",
  "precision": ""
 },
 {
  "caso": 166,
  "seccion": "2.2",
  "resolucion": "Resolución 7922-2026-TCP-S6",
  "cuestionamiento": "Se objetaron diversas órdenes de compra del adjudicatario alegando que correspondían a bienes que no eran idénticos ni similares al mobiliario de madera solicitado.",
  "resolvio": "El Tribunal confirmó la calificación. Comprobó que una sola de las órdenes presentadas (Orden de Compra N° 1458 por suministro de carpetas y sillas de madera) correspondía a bienes idénticos y superaba por sí sola el monto mínimo facturado acumulado exigido, haciendo innecesario revisar las demás.",
  "recordar": "Comprobó que una sola de las órdenes presentadas (Orden de Compra N° 1458 por suministro de carpetas y sillas de madera) correspondía a bienes idénticos y superaba por sí sola el monto mínimo facturado acumulado exigido, haciendo innecesario revisar las demás.",
  "precision": ""
 },
 {
  "caso": 167,
  "seccion": "2.2",
  "resolucion": "Resolución 8075-2026-TCP-S5",
  "cuestionamiento": "El impugnante reclamó que el comité de selección lo descalificó por segunda vez de forma arbitraria mediante apreciaciones subjetivas sobre sus contratos.",
  "resolvio": "Declaró fundado el recurso, dio por acreditada la experiencia y remitió actuados al Órgano de Control Institucional (OCI) para que deslinde responsabilidades por el accionar reiterado e ilegal del comité.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 168,
  "seccion": "2.2",
  "resolucion": "Resolución 8323-2026-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó las comprobaciones presentadas por el adjudicatario señalando que incluían servicios de publicidad y difusión estática, los cuales no correspondían al objeto de la convocatoria (soporte operativo en atención al cliente).",
  "resolvio": "El Tribunal descalificó al adjudicatario. Señaló que los servicios acreditados para la experiencia en la especialidad deben guardar semejanza directa con las prestaciones del objeto de la convocatoria; la publicidad estática no constituye atención al cliente ni soporte operativo.",
  "recordar": "Señaló que los servicios acreditados para la experiencia en la especialidad deben guardar semejanza directa con las prestaciones del objeto de la convocatoria; la publicidad estática no constituye atención al cliente ni soporte operativo.",
  "precision": ""
 },
 {
  "caso": 169,
  "seccion": "2.2",
  "resolucion": "Resolución 8509-2026-TCP-S2",
  "cuestionamiento": "Se excluyó la experiencia 9 de ALEGRA porque dos documentos del mismo proyecto consignaban distintos códigos únicos de inversión.",
  "resolvio": "La Sala contrastó el contrato, la recepción, la liquidación y el contrato de consorcio. La documentación permitía identificar la misma obra; la diferencia del CUI era material y no desvirtuaba la experiencia. Validó S/ 1 315 934,33, superior al mínimo de S/ 356 895,83, y revocó la descalificación. Ordenó evaluar la oferta; no otorgó automáticamente la buena pro.",
  "recordar": "La documentación permitía identificar la misma obra; la diferencia del CUI era material y no desvirtuaba la experiencia.",
  "precision": ""
 },
 {
  "caso": 170,
  "seccion": "2.2",
  "resolucion": "Resolución 8557-2026-TCP-S1",
  "cuestionamiento": "La Entidad y el impugnante observaron la calificación del adjudicatario porque el consorciado que aportó la experiencia únicamente asumió en la promesa de consorcio la \"Elaboración de la oferta\" y \"Experiencia en la especialidad\", sin comprometerse a ejecutar el servicio.",
  "resolvio": "El Tribunal confirmó que no es computable la experiencia de un miembro que no asume la ejecución física de las prestaciones. Al restar dicha experiencia, el adjudicatario no alcanzó el mínimo exigido, por lo que se ordenó su descalificación.",
  "recordar": "Al restar dicha experiencia, el adjudicatario no alcanzó el mínimo exigido, por lo que se ordenó su descalificación.",
  "precision": ""
 },
 {
  "caso": 171,
  "seccion": "2.2",
  "resolucion": "Resolución 8723-2026-TCP-S1",
  "cuestionamiento": "El Jurado descalificó la oferta del Consorcio DJ (impugnante 1) en la etapa de calificación, descartando 6 de sus contratos ejecutados en consorcio (Experiencias 1, 2, 3, 5, 6 y 7). El Jurado argumentó que en las promesas/contratos de consorcio las obligaciones de los integrantes estaban delimitadas únicamente a la \"ejecución física de la obra\", sin mencionar expresamente la etapa de liquidación.",
  "resolvio": "El Tribunal estableció que la liquidación de obra es una actuación posterior técnico-económica derivada de la ejecución de la prestación. La falta de mención explícita a la etapa de liquidación en el contrato de consorcio no desvirtúa ni anula la experiencia efectivamente adquirida durante la ejecución física de la obra. La evaluación de la experiencia debe realizarse de manera conjunta con los contratos, actas de recepción y resoluciones de liquidación. Al verificarse que con dichas experiencias el Consorcio DJ alcanzaba S/ 18,678,764.48 (superando ampliamente el mínimo de S/ 5,667,044.53), el Tribunal revocó su descalificación y dio por cumplido el requisito de calificación.",
  "recordar": "La falta de mención explícita a la etapa de liquidación en el contrato de consorcio no desvirtúa ni anula la experiencia efectivamente adquirida durante la ejecución física de la obra.",
  "precision": ""
 },
 {
  "caso": 172,
  "seccion": "2.2",
  "resolucion": "Resolución 8741-2026-TCP-S6",
  "cuestionamiento": "Un postor cuestionó la calificación de la experiencia de un competidor (ocupante del segundo lugar), alegando que la documentación presentada para sustentar contrataciones previas contenía inconsistencias graves que no reflejaban la realidad de los servicios prestados.",
  "resolvio": "El Tribunal declaró descalificada la oferta de dicho postor. Determinó que al constatarse que la documentación de experiencia contenía datos no concordantes con la realidad, se vulneró el principio de presunción de veracidad, por lo que la oferta debía quedar excluida del proceso.",
  "recordar": "Determinó que al constatarse que la documentación de experiencia contenía datos no concordantes con la realidad, se vulneró el principio de presunción de veracidad, por lo que la oferta debía quedar excluida del proceso.",
  "precision": ""
 },
 {
  "caso": 173,
  "seccion": "2.2",
  "resolucion": "Resolución 8848-2026-TCP-S6",
  "cuestionamiento": "Un postor pretendió calificar su experiencia en la especialidad utilizando contratos de servicios periódicos o continuados que aún se encontraban en ejecución (no concluidos), asignándose el monto total del contrato.",
  "resolvio": "El Tribunal declaró infundado el recurso. Estableció que en contratos de ejecución continuada o periódica que siguen en curso, únicamente se considera como experiencia la fracción del contrato efectivamente ejecutada dentro de los 15 años anteriores, la cual debe estar acreditada de manera fehaciente con las conformidades parciales o comprobantes de pago cancelados de esos periodos específicos.",
  "recordar": "Estableció que en contratos de ejecución continuada o periódica que siguen en curso, únicamente se considera como experiencia la fracción del contrato efectivamente ejecutada dentro de los 15 años anteriores, la cual debe estar acreditada de manera fehaciente con las conformidades parciales o comprobantes de pago cancelados de esos periodos específicos.",
  "precision": ""
 },
 {
  "caso": 174,
  "seccion": "2.2",
  "resolucion": "Resolución 8945-2026-TCP-S2",
  "cuestionamiento": "El comité otorgó la buena pro al adjudicatario luego de requerirle en la etapa de \"subsanación\" que incorpore nuevos contratos de experiencia para cubrir el monto facturado que le faltaba.",
  "resolvio": "El Tribunal descalificó al adjudicatario y revocó la buena pro. Resolvió de forma categórica que la falta de acreditación de la experiencia no es un requisito subsanable, por lo que incorporar nuevos contratos no presentados originariamente viola el principio de igualdad de trato.",
  "recordar": "Resolvió de forma categórica que la falta de acreditación de la experiencia no es un requisito subsanable, por lo que incorporar nuevos contratos no presentados originariamente viola el principio de igualdad de trato.",
  "precision": ""
 },
 {
  "caso": 175,
  "seccion": "2.2",
  "resolucion": "Resolución 8986-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se objetaron experiencias del CONSORCIO SUPERVISOR MOYOBAMBA porque sus contratos consorciales empleaban el término participación, en lugar de porcentaje de obligaciones.",
  "resolvio": "La Sala leyó el contenido completo de los contratos y encontró compromisos concretos de ejecución que permitían identificar la participación atribuible. Validó las experiencias 3, 10 y 11. No sostuvo que toda distribución de utilidades o toda mención genérica de participación sea suficiente.",
  "recordar": "Validó las experiencias 3, 10 y 11.",
  "precision": ""
 },
 {
  "caso": 176,
  "seccion": "2.2",
  "resolucion": "Resolución 8986-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "Se cuestionó la acreditación de pagos del adjudicatario porque algunos abonos no coincidían con los importes íntegros de las facturas.",
  "resolvio": "El resultado dependió de la trazabilidad de cada pago. En la experiencia 5, las diferencias quedaban explicadas con detracciones y retenciones y se aceptó el monto. En la experiencia 6, cuatro facturas no tenían pago fehacientemente vinculado: descontó S/ 398 716,26. No declaró válidos todos los depósitos por el solo hecho de existir retenciones.",
  "recordar": "En la experiencia 5, las diferencias quedaban explicadas con detracciones y retenciones y se aceptó el monto.",
  "precision": ""
 },
 {
  "caso": 177,
  "seccion": "2.2",
  "resolucion": "Resolución 9005-2026-TCP-S4",
  "cuestionamiento": "Se alegó que existían divergencias entre el monto del contrato original y el importe indicado en la constancia de conformidad de una de las experiencias del adjudicatario.",
  "resolvio": "Se aclaró que la experiencia de un postor se valida y computa en función del monto efectivamente ejecutado consignado en la constancia de prestación otorgada por la entidad contratante, y no por el monto inicialmente pactado en el contrato. Se recalculó el monto acreditado a S/ 1,407,805.75, monto que continuó superando el mínimo requerido.",
  "recordar": "Se recalculó el monto acreditado a S/ 1,407,805.75, monto que continuó superando el mínimo requerido.",
  "precision": ""
 },
 {
  "caso": 178,
  "seccion": "2.3",
  "resolucion": "Resolución 1607-2023-TCE-S6",
  "cuestionamiento": "Se solicitó descalificar al adjudicatario aduciendo que el certificado académico del profesional propuesto como \"Coordinador\" consignaba el nombre \"Edwin Javier\", mientras que en su DNI figuraba \"Eduin Javier\".",
  "resolvio": "El Tribunal desestimó el cuestionamiento al calificarlo como una discrepancia ortográfica menor que no generaba duda sobre la identidad del profesional. Bajo los principios de presunción de veracidad y libertad de concurrencia, una variación de una letra en el nombre no invalida la formación acreditada.",
  "recordar": "Bajo los principios de presunción de veracidad y libertad de concurrencia, una variación de una letra en el nombre no invalida la formación acreditada.",
  "precision": ""
 },
 {
  "caso": 179,
  "seccion": "2.3",
  "resolucion": "Resolución 7787-2025-TCP-S6",
  "cuestionamiento": "MAFORSE fue descalificado por no adjuntar certificados de secundaria completa de los agentes de seguridad, aunque el requerimiento sí contemplaba esa condición del personal.",
  "resolvio": "El Tribunal diferenció el requisito sustantivo del medio de prueba exigible en la oferta. Las bases no habían previsto presentar esos certificados como documentos de admisión o calificación; las declaraciones juradas acreditaban el compromiso asumido. Revocó la descalificación por ese motivo. No dispensó al personal de contar con secundaria completa ni otorgó de inmediato la buena pro: faltaba revisar experiencia y capacitación.",
  "recordar": "El Tribunal diferenció el requisito sustantivo del medio de prueba exigible en la oferta.",
  "precision": ""
 },
 {
  "caso": 180,
  "seccion": "2.3",
  "resolucion": "Resolución 247-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "En la contratación del servicio de impresión de carpetas de liquidación tributaria, el impugnante cuestionó que el adjudicatario propuso como \"Coordinador de Producción\" a un profesional Bachiller en Ciencias Administrativas, cuando las bases integradas requerían ingenierías específicas (Sistemas, Redes, Informática, Industrial o Software).",
  "resolvio": "El Tribunal declaró descalificada la oferta del adjudicatario y le revocó la buena pro. Resolvió que, dado que en la etapa de consultas y observaciones la Entidad no acogió la solicitud de ampliar las carreras a Administración, las bases integradas quedaron fijadas como las reglas definitivas e inmutables del proceso, siendo obligatorio exigir el título o grado en la rama de ingeniería exactamente requerida.",
  "recordar": "Resolvió que, dado que en la etapa de consultas y observaciones la Entidad no acogió la solicitud de ampliar las carreras a Administración, las bases integradas quedaron fijadas como las reglas definitivas e inmutables del proceso, siendo obligatorio exigir el título o grado en la rama de ingeniería exactamente requerida.",
  "precision": ""
 },
 {
  "caso": 181,
  "seccion": "2.3",
  "resolucion": "Resolución 247-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "El adjudicatario alegó que la constancia del Analista Programador del impugnante era inexacta porque el profesional no se encontraba colegiado ni habilitado.",
  "resolvio": "El Tribunal aclaró que las bases exigían únicamente formación técnica o universitaria en computación/sistemas para dicho cargo, sin requerir colegiatura ni habilitación por no realizar labores exclusivas de ingeniería de colegiado. Por ende, la constancia era válida.",
  "recordar": "Por ende, la constancia era válida.",
  "precision": ""
 },
 {
  "caso": 182,
  "seccion": "2.3",
  "resolucion": "Resolución 351-2026-TCP-S3",
  "cuestionamiento": "También se alegó falta de registro del título de una nutricionista y falta de legibilidad de su reverso. ¿La Sala estableció un criterio sobre esos documentos?",
  "resolvio": "No emitió un pronunciamiento de fondo sobre este extremo. Después de determinar la descalificación por equipamiento, declaró innecesario analizar los cuestionamientos restantes. Por ello, esta resolución no sustenta ni una aceptación ni un rechazo del título por su antigüedad, registro o legibilidad.",
  "recordar": "Después de determinar la descalificación por equipamiento, declaró innecesario analizar los cuestionamientos restantes.",
  "precision": ""
 },
 {
  "caso": 183,
  "seccion": "2.3",
  "resolucion": "Resolución 3011-2026-TCP-S5",
  "cuestionamiento": "El adjudicatario cuestionó la oferta del impugnante afirmando que no presentó constancia física de habilidad del colegio profesional respecto de sus ingenieros.",
  "resolvio": "El Tribunal resolvió que las bases no exigían adjuntar un certificado de habilidad expedido por el colegio profesional, siendo suficiente la presentación del título universitario. Precisó que la verificación de la colegiatura y habilidad es exigible para la suscripción del contrato y no en la fase de calificación de ofertas.",
  "recordar": "Precisó que la verificación de la colegiatura y habilidad es exigible para la suscripción del contrato y no en la fase de calificación de ofertas. Resolución 5431-2026-TCP-S3 Este cuestionamiento y su respuesta se desarrollan en el caso guiado 2 del capítulo 2 de la parte I. Consulta allí la fuente y el efecto final. Consulta el caso guiado correspondiente. Ir al caso 2",
  "precision": ""
 },
 {
  "caso": 184,
  "seccion": "2.3",
  "resolucion": "Resolución 5477-2026-TCP-S5 · Cuestionamiento 1",
  "cuestionamiento": "El Comité descalificó a la supervisora de control de calidad porque en la búsqueda en el portal del Colegio de Ingenieros (CIP) figuraba como \"No Habilitada\" al momento de la evaluación.",
  "resolvio": "El Tribunal revocó la descalificación. Precisó que, salvo que las bases exijan la habilidad vigente al momento de presentar la oferta, la colegiatura y certificado de habilidad profesional son condiciones exigibles obligatoriamente para el inicio efectivo de la prestación del servicio/suscripción del contrato, no para la calificación técnica.",
  "recordar": "Precisó que, salvo que las bases exijan la habilidad vigente al momento de presentar la oferta, la colegiatura y certificado de habilidad profesional son condiciones exigibles obligatoriamente para el inicio efectivo de la prestación del servicio/suscripción del contrato, no para la calificación técnica.",
  "precision": ""
 },
 {
  "caso": 185,
  "seccion": "2.3",
  "resolucion": "Resolución 5477-2026-TCP-S5 · Cuestionamiento 2",
  "cuestionamiento": "Se descalificó al Chef/Cocinero propuesto porque su título técnico no arrojaba resultados en la web pública del Ministerio de Educación.",
  "resolvio": "El Tribunal revocó la descalificación. Estableció que si el postor adjunta la copia simple del título/diploma requerido por las bases, la mera ausencia de registro en una plataforma web no demuestra falsedad ni invalida el documento, salvo que el comité realice un procedimiento de fiscalización con el instituto emisor que desmienta su emisión.",
  "recordar": "Estableció que si el postor adjunta la copia simple del título/diploma requerido por las bases, la mera ausencia de registro en una plataforma web no demuestra falsedad ni invalida el documento, salvo que el comité realice un procedimiento de fiscalización con el instituto emisor que desmienta su emisión.",
  "precision": ""
 },
 {
  "caso": 186,
  "seccion": "2.3",
  "resolucion": "Resolución 6693-2026-TCP-S1",
  "cuestionamiento": "El adjudicatario omitió adjuntar en su oferta la copia simple del Título Profesional de Ingeniero Civil para el \"Responsable Técnico de la Actividad\", aunque el grado/título figuraba declarado en el Anexo N° 19 y verificado en el portal de SUNEDU.",
  "resolvio": "El Tribunal determinó que la falta de presentación de la copia física de un título profesional emitido con anterioridad a la fecha de presentación de ofertas configura una omisión de carácter formal plenamente subsanable (artículo 78 del Reglamento). Por ello, declaró fundada en parte la apelación, revocando la buena pro únicamente para que la Entidad le otorgue al adjudicatario el plazo legal de dos (2) días hábiles para subsanar dicha copia.",
  "recordar": "El Tribunal determinó que la falta de presentación de la copia física de un título profesional emitido con anterioridad a la fecha de presentación de ofertas configura una omisión de carácter formal plenamente subsanable (artículo 78 del Reglamento).",
  "precision": ""
 },
 {
  "caso": 187,
  "seccion": "2.3",
  "resolucion": "Resolución 8618-2026-TCP-S3",
  "cuestionamiento": "Para el puesto de Técnico Mecánico Automotriz, el adjudicatario presentó un \"Certificado de Calificación Extraordinaria en Aprendizaje\" emitido por SENATI en lugar de un título o grado académico.",
  "resolvio": "El Tribunal descalificó la oferta y otorgó la buena pro al impugnante. Resolvió que un certificado de aprendizaje modular o capacitación no ostenta el rango de título técnico profesional o grado académico, no siendo jurídicamente procedente que la Entidad convalide documentos de menor nivel académico.",
  "recordar": "Resolvió que un certificado de aprendizaje modular o capacitación no ostenta el rango de título técnico profesional o grado académico, no siendo jurídicamente procedente que la Entidad convalide documentos de menor nivel académico.",
  "precision": ""
 },
 {
  "caso": 188,
  "seccion": "2.3",
  "resolucion": "Resolución 8619-2026-TCP-S4",
  "cuestionamiento": "En un concurso de servicios de alimentación, el Consorcio Adauto fue descalificado por presentar para el cargo de cocinera a una persona con título de \"Técnico en Cocina\" en lugar del \"título profesional técnico\" exigido en las bases, y por certificados de capacitación en HACCP para las nutricionistas sin temario adjunto.",
  "resolvio": "El Tribunal confirmó la descalificación al verificar que la formación académica no cumplía el nivel requerido por las bases y que los certificados de capacitación no permitían comprobar objetivamente que se hayan impartido las materias específicas exigidas.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 189,
  "seccion": "2.3",
  "resolucion": "Resolución 8741-2026-TCP-S6",
  "cuestionamiento": "Se discutió si la oferta del adjudicatario debía ser descalificada por supuestas omisiones formales en los Anexos N° 19 relativos a la acreditación del personal profesional propuesto para el servicio.",
  "resolvio": "El Tribunal determinó que la observación advertida en el Anexo N° 19 constituía una omisión formal susceptible de subsanación. Por ello, dispuso que la Entidad le otorgue un plazo para subsanar dicha observación antes de definir la asignación final de la buena pro.",
  "recordar": "El Tribunal determinó que la observación advertida en el Anexo N° 19 constituía una omisión formal susceptible de subsanación.",
  "precision": ""
 },
 {
  "caso": 190,
  "seccion": "2.3",
  "resolucion": "Resolución 8874-2026-TCP-S6",
  "cuestionamiento": "El adjudicatario pretendió descalificar a la especialista ambiental del impugnante porque ostentaba el título de \"Ingeniera Ambiental\", mientras que las bases integradas listaban denominaciones como \"Ingeniero de Gestión Ambiental\" o \"Ingeniero Ambiental y de Recursos Naturales\".",
  "resolvio": "El Tribunal declaró INfundado el cuestionamiento. Precisó que, conforme a las bases estándar, las carreras profesionales requeridas no son fórmulas nominales cerradas ni rígidas, debiendo aceptarse títulos equivalentes que se ajusten al perfil técnico.",
  "recordar": "Precisó que, conforme a las bases estándar, las carreras profesionales requeridas no son fórmulas nominales cerradas ni rígidas, debiendo aceptarse títulos equivalentes que se ajusten al perfil técnico.",
  "precision": ""
 },
 {
  "caso": 191,
  "seccion": "2.3",
  "resolucion": "Resolución 9005-2026-TCP-S4",
  "cuestionamiento": "El impugnante solicitó la descalificación de la oferta del adjudicatario aduciendo que su propuesta para el cargo de Coordinadora General ostentaba el título de \"Licenciada en Administración de Servicios\", mientras que las bases integradas exigían la carrera de \"Administración\" sin haber incorporado textualmente la frase \"o afines\".",
  "resolvio": "El Tribunal declaró INfundado el pedido de descalificación. Concluyó que la denominación \"Administración de Servicios\" comparte el mismo núcleo profesional, científico y funcional de las Ciencias Administrativas, capacitando idóneamente para la dirección y gestión. Las bases integradas no establecieron una denominación académica cerrada ni excluyente, por lo que rechazar la titulación constituiría un rigorismo formal ajeno a la idoneidad técnica.",
  "recordar": "Las bases integradas no establecieron una denominación académica cerrada ni excluyente, por lo que rechazar la titulación constituiría un rigorismo formal ajeno a la idoneidad técnica. Resolución 7757-2025-TCP-S1: la misma controversia se desarrolla una sola vez en el apartado 2.4.",
  "precision": ""
 },
 {
  "caso": 192,
  "seccion": "2.4",
  "resolucion": "Resolución 680-2025-TCE-S5 · Cuestionamiento 1",
  "cuestionamiento": "El comité de selección descalificó la propuesta de un postor argumentando que la constancia presentaba los años de inicio y fin de labores expresados en dos dígitos (por ejemplo: \"21/08/97\"), lo cual, a criterio del comité, generaba incertidumbre sobre las fechas exactas.",
  "resolvio": "El Tribunal revocó la descalificación. Consideró que la interpretación del comité fue irrazonable, ya que en la lectura corriente y cotidiana de documentos las fechas en dos dígitos como \"97\" aluden inequívocamente al año 1997 (y no a 1897 o 2097). Por ende, la constancia acreditaba fehacientemente la experiencia laboral del profesional.",
  "recordar": "Consideró que la interpretación del comité fue irrazonable, ya que en la lectura corriente y cotidiana de documentos las fechas en dos dígitos como \"97\" aluden inequívocamente al año 1997 (y no a 1897 o 2097).",
  "precision": ""
 },
 {
  "caso": 193,
  "seccion": "2.4",
  "resolucion": "Resolución 680-2025-TCE-S5 · Cuestionamiento 2",
  "cuestionamiento": "El comité no consideró válidos los certificados de trabajo del personal clave aduciendo que indicaban únicamente el mes y año en la fecha de emisión.",
  "resolvio": "El Tribunal acogió el recurso y revocó la descalificación. Explicó que si los certificados consignan el periodo laborado detallando día, mes y año de inicio y fin, la omisión del día exacto en la fecha de emisión del documento no le resta valor probatorio.",
  "recordar": "Explicó que si los certificados consignan el periodo laborado detallando día, mes y año de inicio y fin, la omisión del día exacto en la fecha de emisión del documento no le resta valor probatorio.",
  "precision": ""
 },
 {
  "caso": 194,
  "seccion": "2.4",
  "resolucion": "Resolución 2414-2025-TCE-S1",
  "cuestionamiento": "Se descalificó a un postor porque su \"Especialista Técnico\" presentó constancias con el cargo de \"Jefe de Operaciones\" (puesto distinto en el nombre al exigido en las bases integradas). Además, la entidad pretendió exigir que el cómputo de la experiencia se realice obligatoriamente desde la fecha de colegiatura profesional.",
  "resolvio": "El Tribunal revocó la descalificación. Estableció dos criterios clave: (i) si las bases no establecieron expresamente que la experiencia se computa desde la colegiatura, esta debe ser contabilizada a partir de la obtención del título profesional; y (ii) al evaluar la experiencia laboral se debe analizar la naturaleza de las funciones desempeñadas y no la denominación exacta o literal del puesto.",
  "recordar": "Estableció dos criterios clave: (i) si las bases no establecieron expresamente que la experiencia se computa desde la colegiatura, esta debe ser contabilizada a partir de la obtención del título profesional; y (ii) al evaluar la experiencia laboral se debe analizar la naturaleza de las funciones desempeñadas y no la denominación exacta o literal del puesto.",
  "precision": ""
 },
 {
  "caso": 195,
  "seccion": "2.4",
  "resolucion": "Resolución 2947-2025-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "Un postor fue descalificado porque el certificado del \"Responsable del Servicio\" indicaba el cargo de \"Supervisor de Mantenimiento Industrial\". Asimismo, existía una divergencia en la redacción de las actividades requeridas entre el texto de las bases integradas y lo absuelto por el comité en el pliego de consultas.",
  "resolvio": "El Tribunal revocó la descalificación. Determinó que conforme al Reglamento (Art. 72.6), cuando exista contradicción entre el pliego de absolución de consultas y la integración de bases, prevalece siempre lo establecido en el pliego de consultas. Asimismo, reiteró que la evaluación de los certificados debe realizarse de manera integral, validando el documento si las funciones reales corresponden a las exigidas en el requerimiento.",
  "recordar": "Determinó que conforme al Reglamento (Art. 72.6), cuando exista contradicción entre el pliego de absolución de consultas y la integración de bases, prevalece siempre lo establecido en el pliego de consultas.",
  "precision": ""
 },
 {
  "caso": 196,
  "seccion": "2.4",
  "resolucion": "Resolución 2947-2025-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "La Entidad descalificó al postor argumentando que en las constancias de su \"Responsable del Servicio\" no se detallaba si el trabajo fue continuo o si existió traslape, y porque la denominación exacta del cargo no coincidía literalmente con las bases.",
  "resolvio": "El Tribunal determinó que lo relevante es la valoración integral de los documentos; si de ellos se desprende que las actividades realizadas corresponden a las funciones del cargo convocado, debe validarse la experiencia aunque la denominación del puesto no coincida textualmente o existan formalismos en el detalle de las fechas.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 197,
  "seccion": "2.4",
  "resolucion": "Resolución 5037-2025-TCP-S6",
  "cuestionamiento": "El impugnante cuestionó la oferta del adjudicatario argumentando que el único certificado de trabajo presentado para acreditar la experiencia del personal clave propuesto como Residente presentaba una firma totalmente ilegible, lo que impedía identificar los nombres y apellidos de la persona que lo suscribió, incumpliendo el contenido mínimo obligatorio fijado en las bases integradas.",
  "resolvio": "El Tribunal declaró fundado el recurso y revocó la buena pro, descalificando la oferta del adjudicatario. Señaló que las bases integradas constituyen las reglas definitivas del proceso y exigían expresamente consignar el nombre y apellido del firmante como requisito esencial de validez; por ende, al ser ilegible la firma y no figurar la identificación de quien emitió el documento, la experiencia no quedó acreditada fehacientemente.",
  "recordar": "Señaló que las bases integradas constituyen las reglas definitivas del proceso y exigían expresamente consignar el nombre y apellido del firmante como requisito esencial de validez; por ende, al ser ilegible la firma y no figurar la identificación de quien emitió el documento, la experiencia no quedó acreditada fehacientemente.",
  "precision": ""
 },
 {
  "caso": 198,
  "seccion": "2.4",
  "resolucion": "Resolución 5442-2025-TCP-S4",
  "cuestionamiento": "Certificado de trabajo de un profesional emitido por una empresa antes de la fecha formal de su inscripción en SUNAT.",
  "resolvio": "Indicó que en atención al principio de presunción de veracidad los certificados se presumen válidos salvo prueba en contrario, pero amparó el cuestionamiento al constatarse la inconsistencia temporal de la persona jurídica emisora.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 199,
  "seccion": "2.4",
  "resolucion": "Resolución 5725-2025-TCP-S1",
  "cuestionamiento": "La Entidad descalificó la oferta del postor impugnante argumentando que los certificados presentados para su Especialista en Seguridad en Obra y Salud en el Trabajo no acreditaban el monto final liquidado de la obra. Posteriormente, durante el procedimiento de apelación, la Entidad presentó una carta del profesional propuesto indicando que él no había firmado un compromiso individual ni autorizado el uso de sus documentos.",
  "resolvio": "El Tribunal revocó la descalificación de la oferta del impugnante. Explicó que las bases integradas para calificar la experiencia del personal clave solo requerían constancias o certificados que indicaran el cargo y el periodo trabajado, sin exigir la acreditación del monto liquidado de la obra. Respecto a la denuncia del profesional, el Tribunal verificó que la oferta no contenía ningún compromiso firmado falsamente a nombre del profesional, sino la promesa del consorcio, por lo que la discrepancia entre el profesional y la empresa era un asunto ajeno al procedimiento de selección que no configuraba declaración falsa.",
  "recordar": "Explicó que las bases integradas para calificar la experiencia del personal clave solo requerían constancias o certificados que indicaran el cargo y el periodo trabajado, sin exigir la acreditación del monto liquidado de la obra.",
  "precision": ""
 },
 {
  "caso": 200,
  "seccion": "2.4",
  "resolucion": "Resolución 6503-2025-TCP-S4",
  "cuestionamiento": "El impugnante pretendía que se exigiera la acreditación documental completa de la experiencia del personal clave en la etapa de presentación de ofertas en un supuesto donde correspondía evaluarse posteriormente.",
  "resolvio": "El Colegiado dispuso que la acreditación y evaluación deben ceñirse estrictamente al momento del procedimiento establecido en las bases estándar aplicables, desestimando los cuestionamientos extemporáneos.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 201,
  "seccion": "2.4",
  "resolucion": "Resolución 6965-2025-TCP-S2",
  "cuestionamiento": "Se cuestionó la validez de un certificado presentado para acreditar la experiencia del profesional propuesto como especialista ambiental.",
  "resolvio": "El Tribunal desestimó la validez del certificado analizado debido a que no consignaba de manera clara y precisa el plazo exacto de la prestación del servicio (días, meses y años de inicio y término). Las bases exigían expresamente que los documentos para calificar al personal clave contengan de forma clara el periodo efectivo del servicio.",
  "recordar": "Las bases exigían expresamente que los documentos para calificar al personal clave contengan de forma clara el periodo efectivo del servicio.",
  "precision": ""
 },
 {
  "caso": 202,
  "seccion": "2.4",
  "resolucion": "Resolución 7140-2025-TCP-S1",
  "cuestionamiento": "El comité descalificó al postor Diseño y Construcciones Argos E.I.R.L. porque en el certificado de su especialista ambiental figuraba una discrepancia en el encabezado (mencionaba \"Consorcio Los Jardines\" en una parte y \"Consorcio Puente Uruya\" en otra), lo que según el comité generaba duda sobre su veracidad.",
  "resolvio": "El Tribunal resolvió que se trataba de un error material que no alteraba la veracidad ni la sustancia de la prestación. Dado que el representante del consorcio emisor confirmó la autenticidad del documento y la prestación efectiva de la profesional por 15.20 meses (superando los 12 meses requeridos), el Tribunal revocó la descalificación y dio por calificada la oferta.",
  "recordar": "El Tribunal resolvió que se trataba de un error material que no alteraba la veracidad ni la sustancia de la prestación.",
  "precision": ""
 },
 {
  "caso": 203,
  "seccion": "2.4",
  "resolucion": "Resolución 7144-2025-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó la calificación del adjudicatario señalando que el Residente de Obra propuesto no acreditaba los 24 meses mínimos de experiencia en la especialidad requeridos como requisito de calificación, al existir traslapes e inconsistencias en sus certificados de trabajo.",
  "resolvio": "El Tribunal declaró fundado el cuestionamiento. Al revisar los certificados presentados por el adjudicatario, comprobó que dos de ellos contenían información inexacta respecto de las fechas reales de ejecución y que el tiempo válido sumaba solo 211 días (menos de 12 meses). En consecuencia, descalificó la oferta del adjudicatario por incumplir el requisito de calificación y por vulnerar el principio de presunción de veracidad.",
  "recordar": "Al revisar los certificados presentados por el adjudicatario, comprobó que dos de ellos contenían información inexacta respecto de las fechas reales de ejecución y que el tiempo válido sumaba solo 211 días (menos de 12 meses).",
  "precision": ""
 },
 {
  "caso": 204,
  "seccion": "2.4",
  "resolucion": "Resolución 7278-2025-TCP-S4",
  "cuestionamiento": "El postor adjudicatario (VALTAR SECURITY SYSTEM S.A.C.) presentó un certificado de trabajo para acreditar la experiencia de su personal clave propuesto como \"Supervisor/Jefe de Proyecto\". El postor impugnante cuestionó la veracidad de dicho documento alegando incoherencias en las fechas de prestación de servicios y en la representación legal del consorcio emisor.",
  "resolvio": "En el marco de la fiscalización posterior efectuada durante el procedimiento recursal, el supuesto emisor del certificado confirmó por escrito que no elaboró ni firmó dicho documento. Al comprobarse la falta de autenticidad e inexactitud del documento presentado, el Tribunal revocó la admisión de la oferta del adjudicatario, teniéndola por no admitida. En consecuencia, se revocó la buena pro al adjudicatario y se le otorgó al impugnante, disponiendo además el inicio del procedimiento administrativo sancionador correspondiente.",
  "recordar": "Al comprobarse la falta de autenticidad e inexactitud del documento presentado, el Tribunal revocó la admisión de la oferta del adjudicatario, teniéndola por no admitida.",
  "precision": ""
 },
 {
  "caso": 205,
  "seccion": "2.4",
  "resolucion": "Resolución 7757-2025-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "El adjudicatario cuestionó diversos contratos y certificados presentados por el impugnante para validar la experiencia de su residente de obra, alegando que algunos certificados omitían el año de inicio (Consorcio Lleclli) o que los contratos no adjuntaban la conformidad explícita.",
  "resolvio": "El Tribunal realizó un análisis individual de los documentos de acreditación: Desestimó el certificado del Consorcio Lleclli por omitir el año de inicio de la prestación, contraviniendo la exigencia explícita de las bases. Validó los contratos acompañados de Actas de Recepción de Obra, señalando que estas constituyen documentación fehaciente que demuestra la ejecución y culminación del servicio. Al recalcular el tiempo acumulado descontando el certificado omitido, se comprobó que el profesional sumaba 1,481 días (48.7 meses) de experiencia válida, superando holgadamente los 24 meses mínimos exigidos. Por tanto, desestimó la objeción del adjudicatario.",
  "recordar": "Validó los contratos acompañados de Actas de Recepción de Obra, señalando que estas constituyen documentación fehaciente que demuestra la ejecución y culminación del servicio.",
  "precision": ""
 },
 {
  "caso": 206,
  "seccion": "2.4",
  "resolucion": "Resolución 7757-2025-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "El adjudicatario alegó que el residente de obra propuesto por el impugnante no acreditaba fehacientemente su experiencia mediante los certificados presentados y que se omitió consignar el número de DNI del personal clave.",
  "resolvio": "El Tribunal desestimó el cuestionamiento. Aclaró que, aun descontando periodos dudosos o traslapados, el profesional acreditaba un tiempo superior al mínimo exigido (24 meses). Respecto al DNI, determinó que la omisión del número de DNI en el Currículum Vitae no invalida la oferta si dicho dato figura formalmente en otros documentos oficiales (como títulos o constancias) incluidos en el mismo expediente de la oferta.",
  "recordar": "Aclaró que, aun descontando periodos dudosos o traslapados, el profesional acreditaba un tiempo superior al mínimo exigido (24 meses).",
  "precision": ""
 },
 {
  "caso": 207,
  "seccion": "2.4",
  "resolucion": "Resolución 7787-2025-TCP-S6",
  "cuestionamiento": "Se sostuvo que la oferta del adjudicatario era inexacta porque algunos agentes propuestos estaban trabajando para otras empresas.",
  "resolvio": "La Sala desestimó el cuestionamiento: las bases no exigían que el personal estuviera desempleado o vinculado exclusivamente al postor al presentar la oferta. Tener otro empleo en ese momento no probaba, por sí solo, imposibilidad de disponibilidad para ejecutar el futuro contrato. El resultado se limita a esa exigencia documental y temporal.",
  "recordar": "El resultado se limita a esa exigencia documental y temporal.",
  "precision": ""
 },
 {
  "caso": 208,
  "seccion": "2.4",
  "resolucion": "Resolución 7915-2025-TCP-S5",
  "cuestionamiento": "El comité descalificó al Consorcio impugnante porque en el folio correspondiente a la experiencia del \"Especialista en NICSP\" se traspapeló la constancia de trabajo de otro profesional (la Especialista Ambiental).",
  "resolvio": "El Tribunal revocó la descalificación. Al revisar la integridad del expediente de la oferta, comprobó que el certificado correcto del Especialista en NICSP sí obraba en otro folio de la propuesta. Tratándose de un evidente traspapeleo o error de foliación/compaginación, el comité tenía el deber de revisar la oferta integralmente antes de descalificar indebidamente al postor.",
  "recordar": "Al revisar la integridad del expediente de la oferta, comprobó que el certificado correcto del Especialista en NICSP sí obraba en otro folio de la propuesta.",
  "precision": ""
 },
 {
  "caso": 209,
  "seccion": "2.4",
  "resolucion": "Resolución 7999-2025-TCP-S4 · Cuestionamiento 1",
  "cuestionamiento": "El comité no admitió/descalificó una propuesta argumentando que los certificados del profesional propuesto indicaban el cargo de \"Responsable de Ejecución\" o \"Responsable en la Ejecución\", mientras que las bases exigían \"Ingeniero Residente\" o \"Supervisor\".",
  "resolvio": "El Tribunal revocó la descalificación y declaró calificado al personal. Determinó que las entidades no deben limitarse a una revisión hiperformal de la denominación del puesto en los certificados. Si de la revisión de las funciones descritas en el documento se evidencia que el profesional desempeñó de manera efectiva y continua las obligaciones y responsabilidades equivalentes a las de un Residente de Obra, la experiencia es plenamente válida.",
  "recordar": "Determinó que las entidades no deben limitarse a una revisión hiperformal de la denominación del puesto en los certificados.",
  "precision": ""
 },
 {
  "caso": 210,
  "seccion": "2.4",
  "resolucion": "Resolución 7999-2025-TCP-S4 · Cuestionamiento 2",
  "cuestionamiento": "Un postor impugnante cuestionó la calificación del ganador de la buena pro alegando que las constancias de su personal clave registraban traslapes de fechas y denominaciones como \"Responsable en Ejecución\".",
  "resolvio": "El Tribunal mantuvo la calificación del postor. Concluyó que, tras aplicar la regla de descontar los periodos simultáneos (traslapados) para contarlos una sola vez, el profesional aún superaba el tiempo mínimo exigido (3 años o 1095 días). Asimismo, determinó que denominaciones como \"Responsable en Ejecución\" representan una diferencia puramente terminológica que no altera la equivalencia de los servicios prestados.",
  "recordar": "Concluyó que, tras aplicar la regla de descontar los periodos simultáneos (traslapados) para contarlos una sola vez, el profesional aún superaba el tiempo mínimo exigido (3 años o 1095 días).",
  "precision": ""
 },
 {
  "caso": 211,
  "seccion": "2.4",
  "resolucion": "Resolución 7999-2025-TCP-S4 · Cuestionamiento 3",
  "cuestionamiento": "Se cuestionaron los certificados del \"Ingeniero Residente y/o Supervisor\", alegando incongruencias en el DNI del emisor y que el cargo figuraba como \"responsable en...\" en lugar de \"residente\".",
  "resolvio": "El Tribunal precisó que no es exigible una coincidencia literal de los cargos; basta con que la documentación demuestre de manera fehaciente que el profesional ejecutó tareas equivalentes de mantenimiento o supervisión de infraestructura para dar por cumplido el requisito.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 212,
  "seccion": "2.4",
  "resolucion": "Resolución 40-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó la constancia de experiencia del personal clave firmada por un exfuncionario que ya no ejercía representación legal al momento de la expedición.",
  "resolvio": "Descalificó la oferta al determinar que las constancias emitidas por personas que carecen de competencia administrativa vigente carecen de idoneidad probatoria.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 213,
  "seccion": "2.4",
  "resolucion": "Resolución 190-2026-TCP-S3",
  "cuestionamiento": "Se discutió la validez de constancias de experiencia al faltar datos no sustanciales o alegarse supuestas inconsistencias.",
  "resolvio": "Al tenerse por admitida la propuesta, se ordenó al comité de selección proceder con la calificación de los requisitos técnicos de la oferta.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 214,
  "seccion": "2.4",
  "resolucion": "Resolución 219-2026-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante solicitó la descalificación de la oferta del adjudicatario sosteniendo que su personal clave propuesto no cumplía con acreditar el tiempo mínimo de experiencia exigido en las bases integradas para la instalación de equipos.",
  "resolvio": "El Tribunal declaró fundado este cuestionamiento al verificar que la documentación presentada por el adjudicatario no sustentaba fehacientemente el periodo de experiencia requerido conforme a las exigencias de las bases integradas.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 215,
  "seccion": "2.4",
  "resolucion": "Resolución 219-2026-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "Impugnación contra la experiencia del personal clave del adjudicatario alegando que sus certificados consignaban funciones simultáneas en diversos cargos.",
  "resolvio": "El Tribunal descalificó la oferta al verificar que los certificados no permitían discernir el tiempo de dedicación efectiva acumulado en la especialidad requerida.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 216,
  "seccion": "2.4",
  "resolucion": "Resolución 251-2026-TCP-S6",
  "cuestionamiento": "El comité descalificó la oferta porque el certificado del profesional propuesto como \"Ingeniero Especialista en Seguridad y Salud\" indicaba el cargo de \"Responsable de Salud y Seguridad de Trabajo\", alegando que la denominación no coincidía de forma exacta con la terminología de las bases (\"Jefe responsable\").",
  "resolvio": "El Tribunal revocó la descalificación. Estableció que la evaluación de la experiencia del personal no debe ser meramente literal o rígida; si las funciones descritas en el certificado técnico acreditan objetivamente las actividades propias de la especialidad requerida, la experiencia es válida sin importar variaciones secundarias en el nombre del cargo.",
  "recordar": "Estableció que la evaluación de la experiencia del personal no debe ser meramente literal o rígida; si las funciones descritas en el certificado técnico acreditan objetivamente las actividades propias de la especialidad requerida, la experiencia es válida sin importar variaciones secundarias en el nombre del cargo.",
  "precision": ""
 },
 {
  "caso": 217,
  "seccion": "2.4",
  "resolucion": "Resolución 405-2026-TCP-S6",
  "cuestionamiento": "El impugnante solicitó la descalificación del adjudicatario original argumentando que su Ingeniero Supervisor pretendió acreditar los 36 meses de experiencia mínima exigida adjuntando certificados emitidos y firmados por él mismo en su condición de persona natural, violando la Opinión N° 118-2018/DTN.",
  "resolvio": "Al otorgarle al impugnante los 35 puntos en el factor \"Monitoreo y Control\", su oferta alcanzó el puntaje perfecto de 100 puntos técnicos y, al tener un precio menor, ascendió al primer lugar del orden de prelación. Por ello, el Tribunal le otorgó directamente la buena pro del procedimiento de selección.",
  "recordar": "Al otorgarle al impugnante los 35 puntos en el factor \"Monitoreo y Control\", su oferta alcanzó el puntaje perfecto de 100 puntos técnicos y, al tener un precio menor, ascendió al primer lugar del orden de prelación.",
  "precision": ""
 },
 {
  "caso": 218,
  "seccion": "2.4",
  "resolucion": "Resolución 2051-2026-TCP-S4",
  "cuestionamiento": "El comité descalificó a un postor señalando que el certificado de su profesional \"Ingeniero Supervisor\" no describía detalladamente las actividades específicas ejecutadas durante el contrato, limitándose a indicar el nombre del puesto y la entidad.",
  "resolvio": "El Tribunal revocó la descalificación. Argumentó que si el certificado incluye el nombre completo del profesional, el periodo de inicio y fin, la entidad emisora y un cargo que se adecua formalmente a las labores solicitadas (supervisión de servicios de limpieza hospitalaria), cumple con los requisitos normativos mínimos de acreditación, sin que se pueda exigir la enumeración detallada de tareas no solicitadas expresamente en las bases.",
  "recordar": "Argumentó que si el certificado incluye el nombre completo del profesional, el periodo de inicio y fin, la entidad emisora y un cargo que se adecua formalmente a las labores solicitadas (supervisión de servicios de limpieza hospitalaria), cumple con los requisitos normativos mínimos de acreditación, sin que se pueda exigir la enumeración detallada de tareas no solicitadas expresamente en las bases.",
  "precision": ""
 },
 {
  "caso": 219,
  "seccion": "2.4",
  "resolucion": "Resolución 2673-2026-TCP-S6",
  "cuestionamiento": "Se descalificó a un participante aduciendo que los certificados de trabajo para acreditar la experiencia no indicaban los días exactos de inicio y fin, sino solo el periodo acumulado en meses.",
  "resolvio": "El Tribunal revocó la descalificación. Estableció que, conforme a las bases estándar de contratación pública, cuando un certificado o constancia expresa la duración en meses sin especificar los días, la entidad evaluadora debe contabilizar el mes completo a favor del postor para el cómputo de la experiencia.",
  "recordar": "Estableció que, conforme a las bases estándar de contratación pública, cuando un certificado o constancia expresa la duración en meses sin especificar los días, la entidad evaluadora debe contabilizar el mes completo a favor del postor para el cómputo de la experiencia.",
  "precision": ""
 },
 {
  "caso": 220,
  "seccion": "2.4",
  "resolucion": "Resolución 3011-2026-TCP-S5",
  "cuestionamiento": "Objeción contra las equivalencias de cargos del personal propuesto.",
  "resolvio": "Se confirmó la validez de los títulos y certificados al valorarse la amplitud de denominaciones admitidas en las bases.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 221,
  "seccion": "2.4",
  "resolucion": "Resolución 3047-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "Evaluaciones de los certificados presentados para el \"Especialista en Seguridad en Obra y Salud Ocupacional\".",
  "resolvio": "Bajo los principios de razonabilidad y proporcionalidad, el Tribunal concluyó que las constancias acreditaban de forma fehaciente las funciones de prevención de riesgos requeridas, declarando fundado el recurso y otorgando la buena pro al impugnante.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 222,
  "seccion": "2.4",
  "resolucion": "Resolución 3047-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "Se cuestionó la veracidad de los certificados de trabajo presentados por los adjudicatarios para su personal clave. Se demostró mediante cruce de información pública (INFOBRAS/SEACE) que las fechas de inicio y culminación de labores certificadas por las empresas privadas resultaban física y legalmente imposibles por encontrarse la obra paralizada o no convocada en dichos periodos.",
  "resolvio": "El Tribunal declaró fundadas las impugnaciones, descalificó a los adjudicatarios e inició procedimiento sancionador. Sostuvo de forma categórica que la presentación de certificados que contienen datos discordantes con la realidad vulnera los principios de presunción de veracidad e integridad. En los casos resumidos, ello determinó la descalificación reportada.",
  "recordar": "En los casos resumidos, ello determinó la descalificación reportada.",
  "precision": "La fuente agrupa esta resolución con 8709-2026-TCP-S6. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 223,
  "seccion": "2.4",
  "resolucion": "Resolución 3048-2026-TCP-S2",
  "cuestionamiento": "El impugnante denunció que la constancia de trabajo de un supervisor contenía información inexacta, pues indicaba labores desde septiembre de 2023 en una obra cuyo contrato con el Estado se firmó recién en octubre de 2023.",
  "resolvio": "El Tribunal explicó que los documentos presentados se amparan en la presunción de veracidad. Al no existir prueba fehaciente que demuestre que el profesional no prestó los servicios o que el documento sea falso (puesto que los trabajos preparatorios o privados pueden iniciar antes de la firma formal de un contrato público), desestimó la acusación de información inexacta.",
  "recordar": "El Tribunal explicó que los documentos presentados se amparan en la presunción de veracidad.",
  "precision": ""
 },
 {
  "caso": 224,
  "seccion": "2.4",
  "resolucion": "Resolución 3078-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "La Entidad descalificó la oferta del impugnante al considerar que los certificados de trabajo de su Especialista en Seguridad y Salud Ocupacional no detallaban objetivamente el nombre de la obra ni acreditaban continuidad contractual.",
  "resolvio": "El Tribunal revocó la descalificación y declaró calificada la oferta del impugnante. Dictaminó que los certificados cumplían con todos los datos exigidos por las bases integradas (nombre del profesional, cargo, fechas de inicio y fin, emisor y suscriptor), por lo que la Entidad no podía exigir requisitos adicionales no previstos en la normativa para restarles validez.",
  "recordar": "Dictaminó que los certificados cumplían con todos los datos exigidos por las bases integradas (nombre del profesional, cargo, fechas de inicio y fin, emisor y suscriptor), por lo que la Entidad no podía exigir requisitos adicionales no previstos en la normativa para restarles validez.",
  "precision": ""
 },
 {
  "caso": 225,
  "seccion": "2.4",
  "resolucion": "Resolución 3078-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante cuestionó la experiencia del especialista en seguridad del adjudicatario, demostrando que los certificados presentados asignaban labores continuas durante fechas en las que la obra estuvo oficialmente suspendida y paralizada.",
  "resolvio": "El Tribunal descalificó la oferta del adjudicatario. Determinó que certificar la prestación de servicios en periodos de paralización de obra constituye información no concordante con la realidad, quebrantando el principio de presunción de veracidad.",
  "recordar": "Determinó que certificar la prestación de servicios en periodos de paralización de obra constituye información no concordante con la realidad, quebrantando el principio de presunción de veracidad.",
  "precision": ""
 },
 {
  "caso": 226,
  "seccion": "2.4",
  "resolucion": "Resolución 3318-2026-TCP-S6",
  "cuestionamiento": "Se cuestionó la experiencia del \"Responsable de la ejecución del servicio\", debido a que los certificados presentados consignaban el cargo de \"Jefe de Obra\" o denominaciones técnico-comerciales privadas, argumentando que no coincidían literalmente con la denominación solicitada en las bases.",
  "resolvio": "El Tribunal resolvió que la calificación debe realizarse de manera integral. Aun cuando la denominación del cargo no coincida de forma literal, si la descripción del proyecto y los certificados demuestran que el profesional realizó actividades equivalentes a la especialidad requerida, la experiencia debe ser validada.",
  "recordar": "Aun cuando la denominación del cargo no coincida de forma literal, si la descripción del proyecto y los certificados demuestran que el profesional realizó actividades equivalentes a la especialidad requerida, la experiencia debe ser validada.",
  "precision": ""
 },
 {
  "caso": 227,
  "seccion": "2.4",
  "resolucion": "Resolución 3503-2026-TCP-S3",
  "cuestionamiento": "El comité de selección asignó cero puntos / descalificó al postor al considerar que el certificado de trabajo del profesional propuesto como supervisor no generaba certeza, pues señalaba que laboraba \"desde el 13 de abril de 2020 hasta la actualidad\" y porque el documento estaba impreso en papel membretado de la empresa.",
  "resolvio": "El Tribunal determinó que la frase \"hasta la actualidad\" en una constancia o certificado de trabajo acredita válidamente el tiempo de servicios prestado de forma ininterrumpida desde la fecha de inicio hasta la fecha de emisión del documento. Asimismo, aclaró que el uso de papel membretado corporativo es una práctica común que no invalida el contenido sustancial de la certificación. Por tanto, tuvo por acreditada la experiencia del profesional y revocó la decisión del comité.",
  "recordar": "El Tribunal determinó que la frase \"hasta la actualidad\" en una constancia o certificado de trabajo acredita válidamente el tiempo de servicios prestado de forma ininterrumpida desde la fecha de inicio hasta la fecha de emisión del documento.",
  "precision": ""
 },
 {
  "caso": 228,
  "seccion": "2.4",
  "resolucion": "Resolución 3512-2026-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "Un postor cuestionó la calificación del personal clave del competidor alegando que en varios certificados el sello del emisor estaba borroso u opaco impidiendo leer claramente el nombre, y que se contabilizaron periodos en los cuales la obra estuvo oficialmente suspendida.",
  "resolvio": "El Tribunal desestimó los cuestionamientos. Estableció que la opacidad parcial de un sello no invalida el certificado si en el encabezado o texto del documento se identifica al funcionario que firma (ej. Alcalde de la municipalidad). Asimismo, resolvió que si el profesional continuó realizando labores técnicas efectivas de gabinete durante la suspensión del plazo de la obra (lo cual fue acreditado con actas), dicho tiempo es plenamente computable como experiencia.",
  "recordar": "Estableció que la opacidad parcial de un sello no invalida el certificado si en el encabezado o texto del documento se identifica al funcionario que firma (ej.",
  "precision": ""
 },
 {
  "caso": 229,
  "seccion": "2.4",
  "resolucion": "Resolución 3512-2026-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante alegó la inexactitud de los certificados de trabajo presentados por el adjudicatario para acreditar la experiencia del personal clave.",
  "resolvio": "Habiendo quedado descalificado el adjudicatario por la incongruencia en su oferta económica, el Tribunal estimó innecesario recalcular su puntaje técnico, pero dispuso que la Entidad ejecute la fiscalización posterior sobre tales documentos en un plazo no mayor a 20 días hábiles. Resultado del caso: Recurso fundado, se descalificó al adjudicatario, se reasignó el puntaje y se otorgó la buena pro a AMC Ingenieros S.A.C..",
  "recordar": "Resultado del caso: Recurso fundado, se descalificó al adjudicatario, se reasignó el puntaje y se otorgó la buena pro a AMC Ingenieros S.A.C..",
  "precision": ""
 },
 {
  "caso": 230,
  "seccion": "2.4",
  "resolucion": "Resolución 3540-2026-TCP-S1",
  "cuestionamiento": "Cuestionamiento a certificados de trabajo que no especificaban el cómputo exacto de días o presentaban firmas ilegibles.",
  "resolvio": "Resolvió que la falta de precisión del periodo laborado invalida el cómputo, pero aclaró que una firma ilegible no anula el certificado si los demás datos y el emisor son identificables.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 231,
  "seccion": "2.4",
  "resolucion": "Resolución 4104-2026-TCP-S1",
  "cuestionamiento": "El adjudicatario denunció que el certificado presentado por el impugnante para su Ingeniero Supervisor en la obra SENCICO contenía información no concordante con la realidad.",
  "resolvio": "Tras consultar formalmente a SENCICO, dicha entidad confirmó que el profesional nunca ocupó el cargo de \"ingeniero supervisor\" en la obra mencionada. Al comprobarse la falsedad de la afirmación, el Tribunal declaró la descalificación del impugnante por vulneración del principio de integridad y el Pacto de Integridad (Anexo N° 2), desestimando su pretensión de obtener la buena pro y disponiendo el inicio de procedimiento sancionador.",
  "recordar": "Al comprobarse la falsedad de la afirmación, el Tribunal declaró la descalificación del impugnante por vulneración del principio de integridad y el Pacto de Integridad (Anexo N° 2), desestimando su pretensión de obtener la buena pro y disponiendo el inicio de procedimiento sancionador.",
  "precision": ""
 },
 {
  "caso": 232,
  "seccion": "2.4",
  "resolucion": "Resolución 4286-2026-TCP-S2",
  "cuestionamiento": "El impugnante solicitó descalificar la oferta del adjudicatario alegando que las actas de entrega de terreno, recepción de obra y reinicio presentadas para acreditar la experiencia del profesional propuesto como residente de obra fueron emitidas a nombre de las empresas contratistas ejecutoras y no a favor del profesional en forma individual.",
  "resolvio": "El Tribunal declaró descalificada la oferta del adjudicatario. Resolvió que las actas de obra emitidas a favor de las empresas contratistas no constituyen documentos expedidos directamente al profesional que permitan acreditar con certeza su desempeño individual, cargo específico y periodo efectivamente laborado.",
  "recordar": "Resolvió que las actas de obra emitidas a favor de las empresas contratistas no constituyen documentos expedidos directamente al profesional que permitan acreditar con certeza su desempeño individual, cargo específico y periodo efectivamente laborado.",
  "precision": ""
 },
 {
  "caso": 233,
  "seccion": "2.4",
  "resolucion": "Resolución 4403-2026-TCP-S5 · Cuestionamiento 1",
  "cuestionamiento": "Se cuestionó la veracidad e idoneidad del certificado de trabajo del Residente de Obra de un consorcio calificado, solicitando su descalificación automática por supuesta inexactitud.",
  "resolvio": "El Tribunal ratificó la calificación. Explicó que, incluso si se descontara por completo el certificado cuestionado, el profesional propuesto acreditaba suficiente experiencia válida mediante los demás documentos presentados en la oferta, alcanzando el umbral mínimo exigido sin que la supuesta inexactitud de uno de los certificados haya otorgado una ventaja indebida en la calificación.",
  "recordar": "Explicó que, incluso si se descontara por completo el certificado cuestionado, el profesional propuesto acreditaba suficiente experiencia válida mediante los demás documentos presentados en la oferta, alcanzando el umbral mínimo exigido sin que la supuesta inexactitud de uno de los certificados haya otorgado una ventaja indebida en la calificación.",
  "precision": ""
 },
 {
  "caso": 234,
  "seccion": "2.4",
  "resolucion": "Resolución 4403-2026-TCP-S5 · Cuestionamiento 2",
  "cuestionamiento": "Un participante solicitó la descalificación del adjudicatario por cometer errores de suma en el Anexo N° 19 respecto a los días totales de experiencia acumulada de su personal.",
  "resolvio": "El Tribunal dispuso otorgar el plazo de subsanación correspondiente. Señaló que el Anexo N° 19 es un formato declarativo que no constituye la prueba de fondo de la experiencia, prevaleciendo la documentación probatoria primaria (contratos, títulos, certificados) adjuntada en la propuesta.",
  "recordar": "Señaló que el Anexo N° 19 es un formato declarativo que no constituye la prueba de fondo de la experiencia, prevaleciendo la documentación probatoria primaria (contratos, títulos, certificados) adjuntada en la propuesta.",
  "precision": ""
 },
 {
  "caso": 235,
  "seccion": "2.4",
  "resolucion": "Resolución 4906-2026-TCE-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se objetó el certificado de la especialista en calidad de E&S porque la fecha de inicio de actividades en el RUC de la empresa emisora era posterior al período laboral acreditado.",
  "resolvio": "La Sala contrastó el dato tributario con SUNARP y el RNP, que mostraban existencia y actividad anteriores de la empresa. La fecha del RUC, aisladamente, no desvirtuaba el certificado del período 2017–2022. Desestimó esta objeción concreta.",
  "recordar": "La Sala contrastó el dato tributario con SUNARP y el RNP, que mostraban existencia y actividad anteriores de la empresa.",
  "precision": ""
 },
 {
  "caso": 236,
  "seccion": "2.4",
  "resolucion": "Resolución 4906-2026-TCE-S1 · Cuestionamiento 2",
  "cuestionamiento": "Se cuestionó un certificado del especialista eléctrico del CONSORCIO SICÁN II después de que el supuesto emisor negara haberlo expedido y suscrito.",
  "resolvio": "La Sala verificó que quien aparecía como suscriptor negaba la emisión y el cargo consignado. Concluyó que el documento era falso y contenía información inexacta, descalificó al adjudicatario y dispuso remitir antecedentes para el procedimiento sancionador. La remisión no equivale a una sanción firme.",
  "recordar": "La Sala verificó que quien aparecía como suscriptor negaba la emisión y el cargo consignado.",
  "precision": ""
 },
 {
  "caso": 237,
  "seccion": "2.4",
  "resolucion": "Resolución 4906-2026-TCE-S1 · Cuestionamiento 3",
  "cuestionamiento": "El certificado del especialista en estructuras de E&S declaraba una participación continua, pero la información del proyecto de PRONIED no correspondía con ese período y alcance.",
  "resolvio": "El Tribunal encontró información inexacta y descalificó la oferta, además de disponer la remisión de antecedentes. Como también se había excluido al adjudicatario y no quedaban otras ofertas válidas, declaró desierto el procedimiento. Así se distinguen los motivos que E&S logró revertir de aquel que determinó su exclusión final.",
  "recordar": "Así se distinguen los motivos que E&S logró revertir de aquel que determinó su exclusión final.",
  "precision": ""
 },
 {
  "caso": 238,
  "seccion": "2.4",
  "resolucion": "Resolución 5055-2026-TCP-S3",
  "cuestionamiento": "Se descalificó la oferta de un postor aduciendo que los certificados de trabajo emitidos por empresas privadas para sustentar la experiencia de su personal clave contenían firmas pegadas o escaneadas.",
  "resolvio": "El Tribunal revocó la descalificación. Aclaró que la prohibición de usar imágenes de firmas aplica a los documentos elaborados y emitidos directamente por el postor (anexos y formatos), mas no a las constancias privadas de terceros presentadas como medios probatorios de experiencia, las cuales se presumen veraces.",
  "recordar": "Aclaró que la prohibición de usar imágenes de firmas aplica a los documentos elaborados y emitidos directamente por el postor (anexos y formatos), mas no a las constancias privadas de terceros presentadas como medios probatorios de experiencia, las cuales se presumen veraces.",
  "precision": ""
 },
 {
  "caso": 239,
  "seccion": "2.4",
  "resolucion": "Resolución 5338-2026-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó la experiencia del Residente de Obra presentado por el Consorcio adjudicatario. En el certificado de trabajo presentado se declaraba que el profesional laboró de forma continua entre el 8 de agosto de 2024 y el 5 de febrero de 2025. No obstante, el impugnante demostró mediante el portal oficial INFOBRAS y el Acta de Recepción de Obra que dicho proyecto estuvo paralizado por una suspensión de plazo del 3 de diciembre de 2024 al 14 de enero de 2025.",
  "resolvio": "El Tribunal concluyó que el documento de experiencia presentado contenía información inexacta que no se ajustaba a la realidad, afectando el principio de presunción de veracidad y el enfoque de integridad. Por ello, descalificó la oferta del Consorcio adjudicatario y dispuso la apertura de un expediente administrativo sancionador en su contra.",
  "recordar": "El Tribunal concluyó que el documento de experiencia presentado contenía información inexacta que no se ajustaba a la realidad, afectando el principio de presunción de veracidad y el enfoque de integridad.",
  "precision": ""
 },
 {
  "caso": 240,
  "seccion": "2.4",
  "resolucion": "Resolución 5398-2026-TCP-S6",
  "cuestionamiento": "El Consorcio Hospitalario Angaraes (impugnante 2) cuestionó la experiencia del personal clave del adjudicatario (Consorcio Supervisor Salud Sur), demostrando que 6 certificados de trabajo contenían periodos de labores que se superponían de forma imposible con las fechas reales de inicio de obra o con periodos en los que los proyectos estuvieron oficialmente suspendidos.",
  "resolvio": "El Tribunal realizó la contrastación con los registros oficiales de Infobras y sistemas públicos, constatando la existencia de datos falsos e incongruentes con la realidad factual de los proyectos. Al haberse quebrantado el principio de presunción de veracidad, el Colegiado DESCALIFICÓ la oferta del adjudicatario, le revocó la buena pro y dispuso la apertura de procedimiento administrativo sancionador en su contra.",
  "recordar": "El Tribunal realizó la contrastación con los registros oficiales de Infobras y sistemas públicos, constatando la existencia de datos falsos e incongruentes con la realidad factual de los proyectos.",
  "precision": ""
 },
 {
  "caso": 241,
  "seccion": "2.4",
  "resolucion": "Resolución 5558-2026-TCP-S4",
  "cuestionamiento": "Se cuestionó la calificación del personal clave del adjudicatario y de otros postores, argumentando que sus certificados acreditaban experiencia en \"mantenimiento e infraestructura de edificaciones educativas y de salud\", mientras que las bases exigían específicamente \"infraestructura educativa superior\".",
  "resolvio": "El Tribunal determinó que el comité de selección incurrió en una interpretación restrictiva e injustificada de la experiencia acreditada para el personal clave, revocando la calificación y la buena pro otorgada para que el comité efectúe una reevaluación objetiva conforme a las bases.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 242,
  "seccion": "2.4",
  "resolucion": "Resolución 5569-2026-TCP-S1",
  "cuestionamiento": "El comité de selección descalificó la oferta del impugnante aduciendo que la experiencia de su profesional propuesto como \"Especialista en calidad\" fue acreditada con certificados que consignaban los cargos de \"Jefe responsable de calidad\" y \"Supervisor especialista en calidad\". El comité y la Entidad sostuvieron que debía exigirse la denominación literal exacta fijada en las bases.",
  "resolvio": "El Tribunal realizó un análisis sustancial y de equivalencia funcional. Determinó que los cargos de \"Jefe responsable de calidad\" o \"Supervisor especialista en calidad\" comprenden de manera inherente e integral las mismas funciones técnicas de control, verificación y gestión de calidad exigidas para un especialista de área, sumando incluso responsabilidades de coordinación. Privilegiar la denominación literal del certificado por encima de las funciones reales desempeñadas constituye un formalismo que desnaturaliza la finalidad de la calificación. Fallo del Tribunal: Declaró fundado el recurso, revocó la descalificación del impugnante y dio por acreditado el requisito de experiencia del personal clave.",
  "recordar": "Determinó que los cargos de \"Jefe responsable de calidad\" o \"Supervisor especialista en calidad\" comprenden de manera inherente e integral las mismas funciones técnicas de control, verificación y gestión de calidad exigidas para un especialista de área, sumando incluso responsabilidades de coordinación.",
  "precision": ""
 },
 {
  "caso": 243,
  "seccion": "2.4",
  "resolucion": "Resolución 5680-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante solicitó descalificar la oferta del adjudicatario argumentando que las constancias de trabajo presentadas para acreditar la experiencia del personal clave (nutricionistas) no identificaban de manera explícita el nombre del hospital específico en el cual prestó los servicios.",
  "resolvio": "El Tribunal declaró INfundado el pedido de descalificación. Determinó que las constancias de trabajo cumplían con todos los datos mínimos exigidos por las bases (nombre del profesional, cargo, periodo laborado y emisor). Exigir el nombre del establecimiento de salud final cuando la labor se desempeñó a través de contratistas privadas constituía un formalismo restrictivo no previsto en las reglas de la convocatoria.",
  "recordar": "Determinó que las constancias de trabajo cumplían con todos los datos mínimos exigidos por las bases (nombre del profesional, cargo, periodo laborado y emisor).",
  "precision": ""
 },
 {
  "caso": 244,
  "seccion": "2.4",
  "resolucion": "Resolución 5680-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante denunció presunta información inexacta alegando que uno de los nutricionistas presentaba constancias de trabajo con periodos laborales superpuestos/coincidentes en dos empresas distintas, lo que según su postura demostraba falsedad.",
  "resolvio": "El Tribunal declaró INfundado este extremo. Argumentó que en la legislación peruana no existe impedimento legal para que un profesional preste servicios para más de un empleador en periodos coincidentes (a través de turnos rotativos, guardias o contratos a tiempo parcial). La sola superposición de fechas no constituye prueba de falsedad ni inexactitud documental.",
  "recordar": "Argumentó que en la legislación peruana no existe impedimento legal para que un profesional preste servicios para más de un empleador en periodos coincidentes (a través de turnos rotativos, guardias o contratos a tiempo parcial).",
  "precision": ""
 },
 {
  "caso": 245,
  "seccion": "2.4",
  "resolucion": "Resolución 6025-2026-TCP-S5",
  "cuestionamiento": "Se impugnó la experiencia del Jefe de Supervisión y otros especialistas presentados por el adjudicatario, debido a que los certificados emitidos por el representante común de un consorcio anterior mostraban fechas e información abiertamente incongruentes sobre la ejecución de los trabajos.",
  "resolvio": "El Tribunal declaró fundado el recurso y descalificó la oferta del adjudicatario. Precisó que, cuando la información declarada en un certificado pierde fehaciencia por contradicciones internas que no generan certeza sobre el tiempo efectivamente laborado, la experiencia no puede ser validada.",
  "recordar": "Precisó que, cuando la información declarada en un certificado pierde fehaciencia por contradicciones internas que no generan certeza sobre el tiempo efectivamente laborado, la experiencia no puede ser validada.",
  "precision": ""
 },
 {
  "caso": 246,
  "seccion": "2.4",
  "resolucion": "Resolución 6127-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó la experiencia del responsable de seguridad de APULEMA porque un certificado contenía períodos incompatibles y describía descolmatación, sin acreditar las labores de perforación y voladura exigidas.",
  "resolvio": "La Sala no computó los 224 días de ese certificado. Identificó dos períodos distintos y ausencia de sustento suficiente de la especialidad requerida. De los 925 días declarados quedaron 701, insuficientes para los veinticuatro meses exigidos. Descalificó al adjudicatario. No se trató de aceptar íntegramente los 925 días ni de un simple descuento por traslape.",
  "recordar": "De los 925 días declarados quedaron 701, insuficientes para los veinticuatro meses exigidos.",
  "precision": ""
 },
 {
  "caso": 247,
  "seccion": "2.4",
  "resolucion": "Resolución 6354-2026-TCP-S4",
  "cuestionamiento": "El impugnante cuestionó la experiencia del especialista en seguridad propuesto por el adjudicatario, argumentando que las constancias presentadas no especificaban expresamente la ejecución de \"obras públicas\" ni la denominación exacta del cargo requerido en las bases.",
  "resolvio": "El Tribunal precisó que, conforme a las reglas del procedimiento, las bases no limitaban la experiencia del personal exclusivamente a obras públicas ni a títulos o denominaciones del cargo cerrados. Lo determinante para calificar la experiencia es la verificación de las funciones materiales desarrolladas por el profesional. Al constatarse el cumplimiento de las actividades técnicas requeridas, declaró infundado el cuestionamiento.",
  "recordar": "El Tribunal precisó que, conforme a las reglas del procedimiento, las bases no limitaban la experiencia del personal exclusivamente a obras públicas ni a títulos o denominaciones del cargo cerrados.",
  "precision": ""
 },
 {
  "caso": 248,
  "seccion": "2.4",
  "resolucion": "Resolución 6693-2026-TCP-S1",
  "cuestionamiento": "Cuestionamiento a la acreditación de experiencia de los profesionales mediante el Anexo N° 19 y certificados de trabajo.",
  "resolvio": "Se ratificó que la experiencia del personal clave se acredita válidamente presentando el Anexo N° 19 en conjunto con copias simples de contratos, constancias o certificados que indiquen fehacientemente el cargo desempeñando y las fechas exactas (día, mes, año) de inicio y fin.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": "La fuente agrupa esta resolución con 7245-2026-TCP-S5. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 249,
  "seccion": "2.4",
  "resolucion": "Resolución 7210-2026-TCP-S5",
  "cuestionamiento": "El comité descalificó al impugnante debido a que el profesional propuesto como Residente de Obra presentó una carta posterior ante la Entidad afirmando que no había autorizado el uso de sus documentos para dicho consorcio y que tenía compromiso exclusivo con el adjudicatario.",
  "resolvio": "El Tribunal estableció que una declaración o carta posterior de un profesional no puede desvirtuar automáticamente las evidencias electrónicas contemporáneas presentadas en la oferta que acreditaban su consentimiento inicial. Al no probarse mala fe o falsedad en la propuesta al momento de su presentación, el Tribunal revocó la descalificación y declaró calificada la oferta del impugnante.",
  "recordar": "El Tribunal estableció que una declaración o carta posterior de un profesional no puede desvirtuar automáticamente las evidencias electrónicas contemporáneas presentadas en la oferta que acreditaban su consentimiento inicial.",
  "precision": ""
 },
 {
  "caso": 250,
  "seccion": "2.4",
  "resolucion": "Resolución 7245-2026-TCP-S5",
  "cuestionamiento": "Cuestionamiento a la acreditación de experiencia de los profesionales mediante el Anexo N° 19 y certificados de trabajo.",
  "resolvio": "Se ratificó que la experiencia del personal clave se acredita válidamente presentando el Anexo N° 19 en conjunto con copias simples de contratos, constancias o certificados que indiquen fehacientemente el cargo desempeñando y las fechas exactas (día, mes, año) de inicio y fin.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": "La fuente agrupa esta resolución con 6693-2026-TCP-S1. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 251,
  "seccion": "2.4",
  "resolucion": "Resolución 7837-2026-TCP-S4 · Cuestionamiento 1",
  "cuestionamiento": "Se rechazó la experiencia del especialista en calidad de LAS VIOLETAS porque el contrato original nombraba a otro profesional.",
  "resolvio": "El certificado, la confirmación del emisor y la autorización de reemplazo demostraban que el profesional propuesto intervino posteriormente durante el período acreditado. La Sala validó la experiencia y revocó la descalificación de este impugnante. No extrapoló ese resultado a los otros postores del mismo expediente.",
  "recordar": "El certificado, la confirmación del emisor y la autorización de reemplazo demostraban que el profesional propuesto intervino posteriormente durante el período acreditado.",
  "precision": ""
 },
 {
  "caso": 252,
  "seccion": "2.4",
  "resolucion": "Resolución 7837-2026-TCP-S4 · Cuestionamiento 2",
  "cuestionamiento": "Un certificado del especialista ambiental de CENTRAL PARK, emitido el 1 de noviembre de 2022, acreditaba servicios hasta el 30 de noviembre de ese mismo año.",
  "resolvio": "La Sala consideró que el documento no daba certeza del período efectivamente ejecutado. No admitió completar fuera de la oferta la información faltante ni presumir un error de fecha. Sin esa experiencia quedaban 10,93 meses frente a los dieciocho exigidos y confirmó la descalificación. Esta insuficiencia probatoria no fue una declaración automática de falsedad.",
  "recordar": "La Sala consideró que el documento no daba certeza del período efectivamente ejecutado.",
  "precision": ""
 },
 {
  "caso": 253,
  "seccion": "2.4",
  "resolucion": "Resolución 7862-2026-TCP-S1",
  "cuestionamiento": "El impugnante apeló su descalificación argumentando que sus certificados de trabajo del personal clave (Jefe de Proyecto y especialistas) emitidos por un consorcio privado eran auténticos. La Entidad alegó que las fechas de término consignadas no concordaban con la realidad de las obras.",
  "resolvio": "El Tribunal realizó la verificación documental y constató que las fechas de culminación registradas en los certificados del personal clave no guardaban concordancia con la realidad de la ejecución contractual de dichas obras. Esta distorsión quebrantó el principio de presunción de veracidad y el Pacto de Integridad (Anexo N° 2). El Tribunal declaró infundada la apelación, confirmó la descalificación del impugnante y dispuso remitir los actuados a la Secretaría Técnica para el inicio del procedimiento sancionador.",
  "recordar": "El Tribunal realizó la verificación documental y constató que las fechas de culminación registradas en los certificados del personal clave no guardaban concordancia con la realidad de la ejecución contractual de dichas obras.",
  "precision": ""
 },
 {
  "caso": 254,
  "seccion": "2.4",
  "resolucion": "Resolución 7865-2026-TCP-S1",
  "cuestionamiento": "Se impugnó la experiencia del Gerente de Obra alegando la presentación de un certificado de trabajo falso.",
  "resolvio": "El Tribunal descalificó la oferta tras comprobarse que el certificado de trabajo no guardaba concordancia con la realidad. Dispuso remitir los actuados a la Secretaría del Tribunal para el inicio del procedimiento administrativo sancionador por vulneración al principio de presunción de veracidad e integridad.",
  "recordar": "Dispuso remitir los actuados a la Secretaría del Tribunal para el inicio del procedimiento administrativo sancionador por vulneración al principio de presunción de veracidad e integridad.",
  "precision": ""
 },
 {
  "caso": 255,
  "seccion": "2.4",
  "resolucion": "Resolución 7897-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se alegó que un certificado del arquitecto de SUPERVISIÓN 1220 acreditaba servicios futuros porque habría sido expedido antes de su culminación.",
  "resolvio": "La Sala verificó que los servicios terminaron el 14 de mayo de 2025 y que el certificado fue emitido el 9 de abril de 2026, casi once meses después. La premisa del cuestionamiento era incorrecta. Validó la experiencia y no descalificó al adjudicatario por este documento.",
  "recordar": "La Sala verificó que los servicios terminaron el 14 de mayo de 2025 y que el certificado fue emitido el 9 de abril de 2026, casi once meses después.",
  "precision": ""
 },
 {
  "caso": 256,
  "seccion": "2.4",
  "resolucion": "Resolución 7897-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "Se cuestionó otro certificado porque parte del apellido del especialista en seguridad se apreciaba borrosa.",
  "resolvio": "La Sala pudo identificar al profesional y los demás datos relevantes mediante el propio documento. La ilegibilidad parcial no impedía atribuirle la experiencia. Desestimó la objeción, sin establecer que cualquier documento ilegible deba aceptarse.",
  "recordar": "La Sala pudo identificar al profesional y los demás datos relevantes mediante el propio documento.",
  "precision": ""
 },
 {
  "caso": 257,
  "seccion": "2.4",
  "resolucion": "Resolución 7897-2026-TCP-S1 · Cuestionamiento 3",
  "cuestionamiento": "SELVAVERDE acreditó un período continuo del supervisor, pese a que su propia oferta registraba una paralización. También se observó que el certificado había sido emitido por el propio profesional.",
  "resolvio": "La Sala encontró discordancia entre el certificado continuo y la conformidad que evidenciaba la paralización del 1 de abril al 14 de septiembre de 2015. Consideró inexacta la información, confirmó la descalificación y dispuso remitir antecedentes sancionadores. La decisión se sustentó en el período inexacto; no estableció una prohibición autónoma basada únicamente en que el profesional hubiese emitido el documento. Los restantes cuestionamientos no modificaban el resultado.",
  "recordar": "La decisión se sustentó en el período inexacto; no estableció una prohibición autónoma basada únicamente en que el profesional hubiese emitido el documento.",
  "precision": ""
 },
 {
  "caso": 258,
  "seccion": "2.4",
  "resolucion": "Resolución 7969-2026-TCP-S3",
  "cuestionamiento": "Se pidió excluir certificados del personal del adjudicatario porque no consignaban expresamente el año de inicio.",
  "resolvio": "La Sala consideró que, en los documentos examinados, la fecha de culminación y la duración declarada permitían determinar objetivamente el período. Validó esas experiencias a partir de los datos de la propia oferta, sin introducir una experiencia nueva.",
  "recordar": "Validó esas experiencias a partir de los datos de la propia oferta, sin introducir una experiencia nueva.",
  "precision": ""
 },
 {
  "caso": 259,
  "seccion": "2.4",
  "resolucion": "Resolución 8002-2026-TCP-S5",
  "cuestionamiento": "Cuestionamiento a un certificado de trabajo por no consignar la fecha exacta de emisión.",
  "resolvio": "El Tribunal resolvió que, aun excluyendo el documento observado, la profesional acreditaba documentalmente un tiempo acumulado superior a los 24 meses mínimos exigidos.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 260,
  "seccion": "2.4",
  "resolucion": "Resolución 8010-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó la experiencia del \"Jefe de Oficina de Ingeniería\" sosteniendo que debían descontarse los periodos en los que la obra estuvo paralizada o suspendida.",
  "resolvio": "El Tribunal precisó que la paralización de los trabajos físicos de una obra no implica necesariamente la interrupción o cese de las labores de gestión del personal de jefatura o ingeniería. Asimismo, constató que aun realizando el cálculo más desfavorable, el profesional mantenía un tiempo superior a los 24 meses mínimos requeridos.",
  "recordar": "Asimismo, constató que aun realizando el cálculo más desfavorable, el profesional mantenía un tiempo superior a los 24 meses mínimos requeridos.",
  "precision": ""
 },
 {
  "caso": 261,
  "seccion": "2.4",
  "resolucion": "Resolución 8050-2026-TCP-S1",
  "cuestionamiento": "El Consorcio Supervisor Lima (impugnante 2) fue descalificado porque los certificados de su Especialista en Calidad provenían de obras públicas ejecutadas entre 2009 y 2016 donde no existía obligatoriamente dicho cargo, habiendo sido emitidas las constancias por el contratista privado.",
  "resolvio": "El Tribunal verificó en el SEACE que en los contratos originales de las obras públicas indicadas no estuvo previsto ni contratado el cargo de especialista en calidad. Por ello, las constancias privadas no guardaban correspondencia con la estructura real de ejecución de dichas obras. El Tribunal confirmó la descalificación del impugnante 2.",
  "recordar": "El Tribunal verificó en el SEACE que en los contratos originales de las obras públicas indicadas no estuvo previsto ni contratado el cargo de especialista en calidad.",
  "precision": ""
 },
 {
  "caso": 262,
  "seccion": "2.4",
  "resolucion": "Resolución 8066-2026-TCP-S3",
  "cuestionamiento": "El comité descalificó la oferta de Inversiones Mcontac S.A.C. argumentando que los documentos presentados para acreditar la experiencia de su personal clave en servicio de contact center se denominaban \"certificados de trabajo\", sosteniendo el comité que por tratarse de locación de servicios (servicios independientes/freelance) debieron presentarse obligatoriamente \"constancias de prestación de servicios\".",
  "resolvio": "El Tribunal estableció que la palabra \"trabajo\" o \"certificado\" debe interpretarse en sentido amplio, comprendiendo toda actividad profesional efectivamente realizada, sin importar la naturaleza laboral o civil del vínculo. Las bases integradas no restringían la denominación del documento. Al contener los certificados toda la información requerida (nombre, cargo, periodos y emisor), el Tribunal revocó la descalificación, declaró calificada la oferta y dejó sin efecto la declaratoria de desierto.",
  "recordar": "Las bases integradas no restringían la denominación del documento.",
  "precision": ""
 },
 {
  "caso": 263,
  "seccion": "2.4",
  "resolucion": "Resolución 8069-2026-TCP-S3",
  "cuestionamiento": "El comité descalificó la oferta del impugnante sosteniendo que la constancia de experiencia de su \"Jefe de Proyecto\" en el proyecto IMARPE (Centro de Investigación Científica) no pertenecía a la subespecialidad de \"edificación educativa\", argumentando que un centro de investigación no presta servicio educativo directo escolar/universitario ni constituye una edificación escolar integral.",
  "resolvio": "El Tribunal determinó que las bases integradas únicamente exigían acreditar experiencia en \"obras en edificaciones y afines\" y subespecialidad \"edificación educativa\", sin requerir que la infraestructura estuviera destinada a la enseñanza escolar directa ni que perteneciera al sector educación. Asimismo, la normativa de tipologías (Resolución Directoral N° 016-2025-EF/54.01) incluye expresamente a los laboratorios y centros de investigación dentro de la infraestructura educativa. El comité incorporó exigencias no previstas en las bases, por lo que el Tribunal declaró fundado el recurso, validó la experiencia (2 años, 7 meses y 23 días) y ordenó calificar la propuesta.",
  "recordar": "El Tribunal determinó que las bases integradas únicamente exigían acreditar experiencia en \"obras en edificaciones y afines\" y subespecialidad \"edificación educativa\", sin requerir que la infraestructura estuviera destinada a la enseñanza escolar directa ni que perteneciera al sector educación.",
  "precision": ""
 },
 {
  "caso": 264,
  "seccion": "2.4",
  "resolucion": "Resolución 8100-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se observó la experiencia de un especialista acreditada mediante Órdenes de Servicio emitidas por entidades públicas, sosteniendo que no se adjuntó la conformidad expresa del contrato.",
  "resolvio": "El Tribunal tuvo por acreditada la experiencia. Resolvió que la presentación de la Orden de Servicio junto con la correspondiente Constancia de Prestación emitida por la entidad contratante constituye documentación fehaciente que prueba la culminación y conformidad del servicio prestado.",
  "recordar": "Resolvió que la presentación de la Orden de Servicio junto con la correspondiente Constancia de Prestación emitida por la entidad contratante constituye documentación fehaciente que prueba la culminación y conformidad del servicio prestado.",
  "precision": ""
 },
 {
  "caso": 265,
  "seccion": "2.4",
  "resolucion": "Resolución 8100-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "El comité descalificó las ofertas de varios impugnantes (Consorcio Supervisor EESS Soritor, Consorcio Consultor Soritor, Consorcio Ingeniería Hospitalaria del Norte y Consorcio Supervisor Soritor) cuestionando los certificados de sus especialistas (Estructuras, Comunicaciones TIC, etc.), al sostener que fueron firmados por el \"Representante Legal\" o \"Gerente General\" de una de las empresas consorciadas emisoras y no por el \"Representante Común\" del consorcio emisor.",
  "resolvio": "El Tribunal resolvió que exigir que los certificados de consorcios privados sean firmados exclusivamente por el \"representante común\" es una formalidad no prevista en las bases ni en la ley. Bajo el principio de presunción de veracidad, los documentos emitidos por los representantes legales de las empresas integrantes son válidos salvo prueba en contrario. El Tribunal revocó las descalificaciones y ordenó tener por calificadas las ofertas.",
  "recordar": "El Tribunal resolvió que exigir que los certificados de consorcios privados sean firmados exclusivamente por el \"representante común\" es una formalidad no prevista en las bases ni en la ley.",
  "precision": ""
 },
 {
  "caso": 266,
  "seccion": "2.4",
  "resolucion": "Resolución 8100-2026-TCP-S1 · Cuestionamiento 3",
  "cuestionamiento": "El comité descalificó la oferta del postor impugnante aduciendo que el certificado de trabajo de su Especialista en Seguridad y Salud en el Trabajo fue firmado por un apoderado/representante legal de la empresa emisora y no por el representante común del consorcio emisor, y por no consignar explícitamente el cargo del suscriptor.",
  "resolvio": "El Tribunal revocó la descalificación. Determinó que al estar plenamente identificada la empresa emisora, el profesional, la obra, el cargo y el periodo de trabajo, y habiéndose verificado que el suscriptor contaba con facultades de representación legal, el documento es completamente válido, no pudiendo el comité imponer formalismos no fijados en las bases.",
  "recordar": "Determinó que al estar plenamente identificada la empresa emisora, el profesional, la obra, el cargo y el periodo de trabajo, y habiéndose verificado que el suscriptor contaba con facultades de representación legal, el documento es completamente válido, no pudiendo el comité imponer formalismos no fijados en las bases.",
  "precision": ""
 },
 {
  "caso": 267,
  "seccion": "2.4",
  "resolucion": "Resolución 8100-2026-TCP-S1 · Cuestionamiento 4",
  "cuestionamiento": "El comité de selección descalificó al impugnante N° 1 argumentando que la firma contenida en la constancia de trabajo de su Especialista en Medio Ambiente era poco legible. Al desestimar este documento, el profesional no alcanzaba los dos años de experiencia mínima exigidos.",
  "resolvio": "El Tribunal determinó que la poca legibilidad de la firma de un emisor no justifica la invalidez del documento si este contiene los datos indispensables exigidos por las bases (nombre del profesional, cargo, periodo laborado e identificación de la entidad emisora). Por tanto, se revocó la descalificación y se dio por cumplida la experiencia mínima exigida.",
  "recordar": "El Tribunal determinó que la poca legibilidad de la firma de un emisor no justifica la invalidez del documento si este contiene los datos indispensables exigidos por las bases (nombre del profesional, cargo, periodo laborado e identificación de la entidad emisora).",
  "precision": ""
 },
 {
  "caso": 268,
  "seccion": "2.4",
  "resolucion": "Resolución 8100-2026-TCP-S1 · Cuestionamiento 5",
  "cuestionamiento": "El Comité descalificó al impugnante N° 1 aduciendo que su profesional propuesto no acreditaba los 2 años mínimos de experiencia en obras de salud.",
  "resolvio": "Durante la apelación, la propia Entidad reconoció que el Comité incurrió en un error involuntario de revisión al no considerar documentos válidos. El Tribunal rectificó la calificación y declaró que el profesional cumple el requisito.",
  "recordar": "Durante la apelación, la propia Entidad reconoció que el Comité incurrió en un error involuntario de revisión al no considerar documentos válidos.",
  "precision": ""
 },
 {
  "caso": 269,
  "seccion": "2.4",
  "resolucion": "Resolución 8100-2026-TCP-S1 · Cuestionamiento 6",
  "cuestionamiento": "Los impugnantes denunciaron que el Consorcio adjudicatario presentó certificados de trabajo emitidos por la empresa China Gezhouba Group Co. Ltd. y otras consultoras para certificar a varios profesionales clave, los cuales contenían información que no concordaba con la realidad.",
  "resolvio": "Tras solicitar información y verificar los registros administrativos correspondientes, el Tribunal comprobó que los certificados presentados por el adjudicatario contenían inconsistencias sobre la permanencia efectiva del personal y la capacidad de las emisoras. En consecuencia, se descalificó la propuesta del adjudicatario por vulnerar los principios de veracidad e integridad.",
  "recordar": "",
  "precision": ""
 },
 {
  "caso": 270,
  "seccion": "2.4",
  "resolucion": "Resolución 8100-2026-TCP-S1 · Cuestionamiento 7",
  "cuestionamiento": "En el acta de evaluación, el comité registró la condición de \"No cumple\" al Especialista en Instalaciones Mecánicas del impugnante N° 1, pese a que la documentación presentada abarcaba el tiempo requerido.",
  "resolvio": "La propia Entidad admitió ante el Tribunal que la consignación de \"No cumple\" en el acta obedeció a un error material involuntario de digitación y que la documentación sí acreditaba la experiencia. El Tribunal rectificó dicho error y dio por superado el requisito de calificación.",
  "recordar": "El Tribunal rectificó dicho error y dio por superado el requisito de calificación.",
  "precision": ""
 },
 {
  "caso": 271,
  "seccion": "2.4",
  "resolucion": "Resolución 8113-2026-TCP-S1",
  "cuestionamiento": "El impugnante alegó que los certificados de los conductores no especificaban la categoría vehicular \"N3\" y que las licencias A-III-C no demostraban experiencia real en la conducción del camión.",
  "resolvio": "El Tribunal desestimó el cuestionamiento. Explicó que exigir la mención explícita de la categoría N3 cuando las bases solo pedían acreditar la experiencia en el puesto y la licencia de conducir vigente constituye un formalismo no previsto en las reglas.",
  "recordar": "Explicó que exigir la mención explícita de la categoría N3 cuando las bases solo pedían acreditar la experiencia en el puesto y la licencia de conducir vigente constituye un formalismo no previsto en las reglas.",
  "precision": ""
 },
 {
  "caso": 272,
  "seccion": "2.4",
  "resolucion": "Resolución 8118-2026-TCP-S1",
  "cuestionamiento": "El Consorcio Supervisor CVNC fue descalificado en la supervisión de una obra de movilidad urbana porque las experiencias presentadas para el personal clave (Especialista en Calidad y Jefe de Supervisión) correspondían a obras denominadas \"Caminos Vecinales\", las cuales la Entidad clasificó en la subespecialidad de \"Obras Rurales\" y no en \"Vías Urbanas\".",
  "resolvio": "Conforme al clasificador de especialidades del MEF/OECE, la experiencia del personal clave en consultorías debe corresponder estrictamente a la subespecialidad requerida. Al no haberse demostrado que las obras en caminos vecinales tenían características técnicas de vías urbanas, el Tribunal confirmó la invalidación de dichas experiencias y la descalificación del postor.",
  "recordar": "Conforme al clasificador de especialidades del MEF/OECE, la experiencia del personal clave en consultorías debe corresponder estrictamente a la subespecialidad requerida.",
  "precision": ""
 },
 {
  "caso": 273,
  "seccion": "2.4",
  "resolucion": "Resolución 8159-2026-TCP-S4",
  "cuestionamiento": "Se cuestionó la experiencia del Jefe de Supervisión, alegando que en el certificado se consignó un período continuo de labores que incluía lapsos en los que la obra estuvo paralizada o suspendida según el acta de recepción.",
  "resolvio": "El Tribunal resolvió que para el cómputo de experiencia del personal clave solo debe considerarse el tiempo de prestación efectiva del servicio. Los períodos de suspensión de plazo de obra no pueden contabilizarse como experiencia efectiva, por lo que descontó dichos lapsos.",
  "recordar": "Los períodos de suspensión de plazo de obra no pueden contabilizarse como experiencia efectiva, por lo que descontó dichos lapsos.",
  "precision": ""
 },
 {
  "caso": 274,
  "seccion": "2.4",
  "resolucion": "Resolución 8437-2026-TCP-S3",
  "cuestionamiento": "El impugnante cuestionó la oferta del adjudicatario, señalando que acreditó la experiencia de su Especialista en Estructuras (Ing. Jim Domínguez Alvino) mediante actas de entrega de terreno y recepción de obras donde figuraba otro profesional en el contrato original, sin adjuntar la resolución de aprobación del cambio de personal.",
  "resolvio": "El Tribunal verificó que en los contratos de origen de las obras figuraba otra persona como titular. Al no haberse presentado la resolución o documento oficial que probara que el profesional propuesto sustituyó legítimamente al titular durante la ejecución contractual, no resultaba computable dicha experiencia. Por ello, el adjudicatario no alcanzó la experiencia mínima de su personal clave y el Tribunal dispuso la descalificación del adjudicatario.",
  "recordar": "El Tribunal verificó que en los contratos de origen de las obras figuraba otra persona como titular.",
  "precision": ""
 },
 {
  "caso": 275,
  "seccion": "2.4",
  "resolucion": "Resolución 8476-2026-TCP-S6",
  "cuestionamiento": "Se denunció que el certificado presentado para validar la experiencia del Jefe de Mantenimiento del postor ganador contenía firma falsa.",
  "resolvio": "El Tribunal descalificó la oferta y ordenó iniciar procedimiento sancionador. El supuesto emisor del documento declaró ante notario público que la firma no era suya y que nunca emitió tal constancia, vulnerando el principio de presunción de veracidad e integridad.",
  "recordar": "El supuesto emisor del documento declaró ante notario público que la firma no era suya y que nunca emitió tal constancia, vulnerando el principio de presunción de veracidad e integridad.",
  "precision": ""
 },
 {
  "caso": 276,
  "seccion": "2.4",
  "resolucion": "Resolución 8520-2026-TCP-S6",
  "cuestionamiento": "Se analizó la calificación de los profesionales para Ingeniero Residente y Especialista en Arquitectura, verificando los tiempos mínimos en meses/días y la presencia de traslapes en las fechas.",
  "resolvio": "El Tribunal precisó que cuando existen períodos trabajados en forma simultánea (traslape de fechas), únicamente se computa el período una sola vez. Asimismo, remarcó que las bases no pueden exigir que un mismo profesional clave acredite experiencia simultánea en más de un cargo clave distinto.",
  "recordar": "Asimismo, remarcó que las bases no pueden exigir que un mismo profesional clave acredite experiencia simultánea en más de un cargo clave distinto.",
  "precision": ""
 },
 {
  "caso": 277,
  "seccion": "2.4",
  "resolucion": "Resolución 8533-2026-TCP-S6",
  "cuestionamiento": "Se cuestionó la experiencia del Especialista Previsionista de Seguridad del adjudicatario, afirmando que los plazos de trabajo consignados en sus certificados eran anormalmente extensos en comparación con la duración ordinaria de las obras.",
  "resolvio": "El Tribunal declaró infundado el cuestionamiento. Señalo que los certificados de trabajo constituyen medios válidos de acreditación y gozan de la presunción de veracidad. Quien alegue que un certificado contiene datos irreales o falsos tiene la carga de presentar prueba fehaciente que lo demuestre, no bastando meras presunciones.",
  "recordar": "Señalo que los certificados de trabajo constituyen medios válidos de acreditación y gozan de la presunción de veracidad.",
  "precision": ""
 },
 {
  "caso": 278,
  "seccion": "2.4",
  "resolucion": "Resolución 8557-2026-TCP-S1",
  "cuestionamiento": "El adjudicatario pretendió descalificar al personal clave del impugnante (Ingeniero Electrónico/Biomédico) sosteniendo que sus certificados de trabajo consignaban los cargos de \"Ingeniero Residente\" e \"Ingeniero Residente Coordinador\", argumentando que dichas denominaciones no coincidían literalmente con la nomenclatura requerida en las bases.",
  "resolvio": "El Tribunal estableció que la experiencia del personal clave debe evaluarse de forma integral según la correspondencia funcional de las actividades desempeñadas y no por la coincidencia literal del título del puesto. Como de los documentos se acreditó que el profesional realizó las funciones técnicas solicitadas, confirmó la validez de su calificación.",
  "recordar": "El Tribunal estableció que la experiencia del personal clave debe evaluarse de forma integral según la correspondencia funcional de las actividades desempeñadas y no por la coincidencia literal del título del puesto.",
  "precision": ""
 },
 {
  "caso": 279,
  "seccion": "2.4",
  "resolucion": "Resolución 8709-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "Se cuestionó la veracidad de los certificados de trabajo presentados por los adjudicatarios para su personal clave. Se demostró mediante cruce de información pública (INFOBRAS/SEACE) que las fechas de inicio y culminación de labores certificadas por las empresas privadas resultaban física y legalmente imposibles por encontrarse la obra paralizada o no convocada en dichos periodos.",
  "resolvio": "El Tribunal declaró fundadas las impugnaciones, descalificó a los adjudicatarios e inició procedimiento sancionador. Sostuvo de forma categórica que la presentación de certificados que contienen datos discordantes con la realidad vulnera los principios de presunción de veracidad e integridad. En los casos resumidos, ello determinó la descalificación reportada.",
  "recordar": "En los casos resumidos, ello determinó la descalificación reportada.",
  "precision": "La fuente agrupa esta resolución con 3047-2026-TCP-S6. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 280,
  "seccion": "2.4",
  "resolucion": "Resolución 8709-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "Se descalificó al consorcio impugnante al considerar que las actas de recepción de obra no eran suficientes para probar la prestación ininterrumpida del \"Jefe de Supervisión\" durante todo el plazo contractual.",
  "resolvio": "El Tribunal revocó la descalificación. Concluyó que al evaluar conjuntamente el Contrato de Supervisión, el Acta de Entrega de Terreno y el Acta de Recepción Final de la Obra, se verifica el periodo efectivo en el que el profesional ejerció la jefatura, siendo computable para alcanzar los 36 meses exigidos.",
  "recordar": "Concluyó que al evaluar conjuntamente el Contrato de Supervisión, el Acta de Entrega de Terreno y el Acta de Recepción Final de la Obra, se verifica el periodo efectivo en el que el profesional ejerció la jefatura, siendo computable para alcanzar los 36 meses exigidos.",
  "precision": ""
 },
 {
  "caso": 281,
  "seccion": "2.4",
  "resolucion": "Resolución 8723-2026-TCP-S1",
  "cuestionamiento": "El Consorcio DJ cuestionó la experiencia del Residente de Obra del adjudicatario (Consorcio Las Pampas), señalar que su certificado indicaba la \"Construcción de Nuevas Vías de Acceso Tramos I y II\" en un asiento minero privado (Shahuindo), lo cual no acreditaba la subespecialidad de \"Vías Urbanas\" ni la tipología requerida en las bases.",
  "resolvio": "El Tribunal constató que el certificado presentado no identificaba la obra dentro de las tipologías admitidas por las bases integradas (pistas, veredas, ciclovías, carreteras vecinales). La mera denominación \"vías de acceso\" en una unidad minera privada no permite asumir que se trate de una vía urbana o carretera vecinal. Al descontar este periodo, el profesional no alcanzaba los 36 meses mínimos requeridos. Por lo tanto, el Tribunal descalificó la oferta del adjudicatario y le revocó la buena pro.",
  "recordar": "El Tribunal constató que el certificado presentado no identificaba la obra dentro de las tipologías admitidas por las bases integradas (pistas, veredas, ciclovías, carreteras vecinales).",
  "precision": ""
 },
 {
  "caso": 282,
  "seccion": "2.4",
  "resolucion": "Resolución 8786-2026-TCP-S4",
  "cuestionamiento": "El Comité descalificó al Jefe de Mantenimiento argumentando que el postor no adjuntó el \"Certificado de Habilidad\" para probar que la experiencia computó a partir de su colegiatura.",
  "resolvio": "El Tribunal revocó la descalificación. Argumentó que el Certificado de Habilidad no fue solicitado en las bases como documento obligatorio para acreditar la experiencia del personal clave. Los evaluadores no pueden trasladar ni exigir a los postores documentos no previstos expresamente en las bases del procedimiento.",
  "recordar": "Argumentó que el Certificado de Habilidad no fue solicitado en las bases como documento obligatorio para acreditar la experiencia del personal clave.",
  "precision": ""
 },
 {
  "caso": 283,
  "seccion": "2.4",
  "resolucion": "Resolución 8867-2026-TCP-S5",
  "cuestionamiento": "Se adujo que el certificado de trabajo de un Especialista en Estructuras Metálicas contenía información inexacta porque la persona que lo firmó presuntamente no contaba con poderes vigentes a la fecha de emisión.",
  "resolvio": "El Tribunal concluyó que, al verificarse en el expediente que el firmante sí ostentaba la representación legal permanente de la empresa emisora al momento de la suscripción, el documento mantenía su fehaciencia y validez legal.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 284,
  "seccion": "2.4",
  "resolucion": "Resolución 8874-2026-TCP-S6",
  "cuestionamiento": "El impugnante solicitó descalificar la oferta del adjudicatario sosteniendo que el certificado de trabajo presentado para acreditar la experiencia de su personal clave (supervisor) contenía datos falsos o inexactos respecto a las fechas de ejecución de la obra al contrastarlo con las plataformas oficiales INFOBRAS y SSI.",
  "resolvio": "El Tribunal declaró fundado este extremo y DESCALIFICÓ la oferta del adjudicatario. Al verificar de oficio con las bases públicas del Estado, constató que las fechas consignadas en el certificado no eran consistentes con la realidad, quebrantando el principio de presunción de veracidad.",
  "recordar": "Al verificar de oficio con las bases públicas del Estado, constató que las fechas consignadas en el certificado no eran consistentes con la realidad, quebrantando el principio de presunción de veracidad.",
  "precision": ""
 },
 {
  "caso": 285,
  "seccion": "2.4",
  "resolucion": "Resolución 8935-2026-TCP-S3",
  "cuestionamiento": "La Entidad descalificó a un residente de obra al detectar que presentó certificados de trabajo en dos obras privadas distintas cuyas fechas de ejecución se superponían exactamente en localidades distantes.",
  "resolvio": "El Tribunal confirmó el criterio de que el cargo de Residente de Obra exige presencia física permanente y dedicación exclusiva en el lugar de ejecución. Existiendo simultaneidad geográfica e imposible permanencia simultánea en ambas obras, la documentación pierde fehaciencia y no es válida para computar la experiencia.",
  "recordar": "Existiendo simultaneidad geográfica e imposible permanencia simultánea en ambas obras, la documentación pierde fehaciencia y no es válida para computar la experiencia.",
  "precision": ""
 },
 {
  "caso": 286,
  "seccion": "2.4",
  "resolucion": "Resolución 8944-2026-TCP-S1",
  "cuestionamiento": "Discrepancia entre la fecha de inicio de actividades de la empresa emisora según la consulta SUNAT y las fechas de los servicios certificados al profesional clave.",
  "resolvio": "Confirmó la descalificación por quebrantamiento del principio de presunción de veracidad al verificarse la imposibilidad de que la empresa haya emitido certificados antes de su existencia jurídica.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 287,
  "seccion": "2.4",
  "resolucion": "Resolución 8986-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se pidió descontar experiencia del jefe de supervisión de MOYOBAMBA porque su participación comprendía actuaciones de recepción posteriores a la ejecución física.",
  "resolvio": "La Sala examinó las actas que demostraban intervención profesional en las actuaciones relevantes. Validó la experiencia del jefe de supervisión y no descalificó al adjudicatario por este extremo. No convirtió toda extensión del contrato de consultoría en experiencia automática de cualquier profesional.",
  "recordar": "No convirtió toda extensión del contrato de consultoría en experiencia automática de cualquier profesional.",
  "precision": ""
 },
 {
  "caso": 288,
  "seccion": "2.4",
  "resolucion": "Resolución 8986-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "Se objetó la experiencia del especialista sanitario de MOYOBAMBA porque los certificados lo denominaban supervisor sin reproducir PTAP o PTAR.",
  "resolvio": "La Sala contrastó las funciones efectivas y la naturaleza de las obras: redes de agua potable, alcantarillado e instalaciones sanitarias. Encontró correspondencia con la especialidad y subespecialidades requeridas y validó los dos certificados. La denominación se evaluó junto con las funciones documentadas.",
  "recordar": "La denominación se evaluó junto con las funciones documentadas.",
  "precision": ""
 },
 {
  "caso": 289,
  "seccion": "2.4",
  "resolucion": "Resolución 8986-2026-TCP-S1 · Cuestionamiento 3",
  "cuestionamiento": "El CONSORCIO SANEAMIENTO BAGUA utilizó constancias emitidas a su integrante como contratista para acreditar que había ejercido como jefe de supervisión.",
  "resolvio": "La Sala distinguió experiencia del proveedor y experiencia del profesional. Las constancias no identificaban el cargo ni la participación personal exigida. Excluyó cuatro experiencias, descontó 1 422 días y dejó 165, insuficientes para treinta y seis meses. Descalificó a este consorcio; otros cuestionamientos a su oferta quedaron sin análisis de fondo.",
  "recordar": "La Sala distinguió experiencia del proveedor y experiencia del profesional.",
  "precision": ""
 },
 {
  "caso": 290,
  "seccion": "2.4",
  "resolucion": "Resolución 8986-2026-TCP-S1 · Cuestionamiento 4",
  "cuestionamiento": "El CONSORCIO SUPERVISOR AGUA AMAZONAS acreditó a su especialista electromecánico con un certificado de especialista en equipamiento e instalaciones hidráulicas que mencionaba tareas eléctricas.",
  "resolvio": "La Sala concluyó que mencionar esas tareas no demostraba haberlas desarrollado como especialista en las materias exigidas ni acreditaba equivalencia del cargo. Al ser la única experiencia presentada para ese perfil, descalificó al consorcio. Este resultado corresponde al especialista electromecánico y no contradice por sí solo la validación del especialista sanitario de otro postor.",
  "recordar": "La Sala concluyó que mencionar esas tareas no demostraba haberlas desarrollado como especialista en las materias exigidas ni acreditaba equivalencia del cargo.",
  "precision": ""
 },
 {
  "caso": 291,
  "seccion": "2.4",
  "resolucion": "Resolución 8986-2026-TCP-S1 · Cuestionamiento 5",
  "cuestionamiento": "En los antecedentes se invocó una consulta de SINADEF para cuestionar la documentación de un profesional y se aportaron declaraciones posteriores para contradecir esa consulta.",
  "resolvio": "La Sala no formuló un criterio de fondo que validara la documentación por esas declaraciones ni resolvió que la consulta bastara para excluir la oferta. Las respuestas reseñadas en los antecedentes son alegaciones de las partes. El fallo decidió la descalificación de las ofertas por los incumplimientos de experiencia explicados en las otras fichas y dispuso fiscalización posterior de documentación observada.",
  "recordar": "La Sala no formuló un criterio de fondo que validara la documentación por esas declaraciones ni resolvió que la consulta bastara para excluir la oferta.",
  "precision": ""
 },
 {
  "caso": 292,
  "seccion": "2.5",
  "resolucion": "Resolución 4710-2025-TCP-S1",
  "cuestionamiento": "El comité descalificó al postor exigiendo que los certificados de capacitación del personal estuvieran refrendados por universidades conforme a la Ley N° 30220.",
  "resolvio": "El Tribunal revocó la descalificación. Explicó que si las bases solo solicitaron \"copia simple de constancias o certificados\", la entidad no puede exigir válidamente requisitos no previstos como el respaldo universitario.",
  "recordar": "Explicó que si las bases solo solicitaron \"copia simple de constancias o certificados\", la entidad no puede exigir válidamente requisitos no previstos como el respaldo universitario.",
  "precision": ""
 },
 {
  "caso": 293,
  "seccion": "2.5",
  "resolucion": "Resolución 5037-2025-TCP-S6",
  "cuestionamiento": "Se impugnó la calificación del personal clave argumentando que el certificado presentado por el adjudicatario consignaba el curso \"Elaboración de Sistemas de Gestión de Seguridad y Salud en el Trabajo\", el cual no coincidía de manera literal con la denominación \"Seguridad y Salud Ocupacional\" exigida en las bases.",
  "resolvio": "El Tribunal mantuvo la calificación conforme del personal. Determinó que no se requiere una coincidencia literal en el título del documento cuando el área técnica de la Entidad confirma que las materias impartidas se encuentran comprendidas dentro del ámbito temático y la especialidad solicitada.",
  "recordar": "Determinó que no se requiere una coincidencia literal en el título del documento cuando el área técnica de la Entidad confirma que las materias impartidas se encuentran comprendidas dentro del ámbito temático y la especialidad solicitada.",
  "precision": ""
 },
 {
  "caso": 294,
  "seccion": "2.5",
  "resolucion": "Resolución 6270-2025-TCP-S5",
  "cuestionamiento": "Cuestionamiento sobre si los temas dictados en las constancias de capacitación guardaban estricta congruencia con la especialidad.",
  "resolvio": "Validó las constancias presentadas al comprobar que las materias impartidas se alineaban razonablemente con los términos de referencia.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 295,
  "seccion": "2.5",
  "resolucion": "Resolución 7229-2025-TCP-S2",
  "cuestionamiento": "El impugnante argumentaba que se debía exigir que los certificados de capacitación presentados para el Director Técnico indicaran de forma desagregada el número exacto de horas lectivas dictadas por cada curso individual.",
  "resolvio": "El Tribunal declaró infundado el recurso. Dispuso que cuando las bases integradas no fijan un desglose específico de horas por cada subcurso, los evaluadores deben verificar únicamente el cumplimiento global exigido, respetando la literalidad de las bases.",
  "recordar": "Dispuso que cuando las bases integradas no fijan un desglose específico de horas por cada subcurso, los evaluadores deben verificar únicamente el cumplimiento global exigido, respetando la literalidad de las bases.",
  "precision": ""
 },
 {
  "caso": 296,
  "seccion": "2.5",
  "resolucion": "Resolución 167-2026-TCP-S4",
  "cuestionamiento": "Un competidor cuestionó la calificación del personal clave del ganador alegando que el trazo manuscrito de la firma del emisor en los certificados de capacitación era ilegible.",
  "resolvio": "El Tribunal desestimó la objeción y confirmó la calificación. Explicó que la falta de nitidez en el trazo de la firma no invalida la constancia si en el texto impreso o membrete institucional figuran claramente el nombre, apellidos, cargo y la entidad emisora responsable.",
  "recordar": "Explicó que la falta de nitidez en el trazo de la firma no invalida la constancia si en el texto impreso o membrete institucional figuran claramente el nombre, apellidos, cargo y la entidad emisora responsable.",
  "precision": ""
 },
 {
  "caso": 297,
  "seccion": "2.5",
  "resolucion": "Resolución 351-2026-TCP-S3",
  "cuestionamiento": "Se objetó que certificados de capacitación HACCP mencionaran diez horas sin precisar que fueran horas lectivas.",
  "resolvio": "El cuestionamiento fue recogido entre las alegaciones, pero no dio lugar a una decisión de fondo: la descalificación por equipamiento hacía innecesario examinar los restantes requisitos. No puede atribuirse a la Sala un criterio sobre conversión de horas a partir de este expediente.",
  "recordar": "No puede atribuirse a la Sala un criterio sobre conversión de horas a partir de este expediente.",
  "precision": ""
 },
 {
  "caso": 298,
  "seccion": "2.5",
  "resolucion": "Resolución 3041-2026-TCP-S5",
  "cuestionamiento": "El adjudicatario presentó múltiples constancias de corta duración sumando 232 horas acumuladas para cumplir el requisito, pese a que las bases exigían acreditar únicamente 2 capacitaciones específicas con una duración individual no menor a 25 horas cada una.",
  "resolvio": "El Tribunal declaró descalificada la oferta del adjudicatario. Precisó que no es válido acumular capacitaciones fragmentadas cuando las reglas de la convocatoria imponen que cada curso individual alcance un número mínimo de horas.",
  "recordar": "Precisó que no es válido acumular capacitaciones fragmentadas cuando las reglas de la convocatoria imponen que cada curso individual alcance un número mínimo de horas.",
  "precision": ""
 },
 {
  "caso": 299,
  "seccion": "2.5",
  "resolucion": "Resolución 3533-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se cuestionó la descalificación de un postor cuyo profesional clave presentó dos certificados de capacitación que, evaluados individualmente por el comité, no alcanzaban el total de horas, pero sumados sí cubrían el requerimiento.",
  "resolvio": "El Tribunal dispuso la evaluación conjunta e integral de los documentos. Señaló que si la normativa y las bases no prohíben la presentación de más de una constancia para una misma materia, el comité debe evaluar acumulativamente los certificados para verificar el cumplimiento del total de horas exigido.",
  "recordar": "Señaló que si la normativa y las bases no prohíben la presentación de más de una constancia para una misma materia, el comité debe evaluar acumulativamente los certificados para verificar el cumplimiento del total de horas exigido.",
  "precision": ""
 },
 {
  "caso": 300,
  "seccion": "2.5",
  "resolucion": "Resolución 3533-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "El comité descalificó al impugnante porque para cumplir el requisito de capacitación obligatoria del Coordinador (que exigía especialización en base al PMI de mínimo 24 horas lectivas), presentó la acreditación PMP (Project Management Professional) del PMI. El impugnante sostenía que ser certificado PMP demuestra un estándar superior y más de 35 horas de estudio previo.",
  "resolvio": "El Tribunal confirmó la descalificación. Resolvió que las bases requerían de manera objetiva verificar la constancia de al menos 24 horas lectivas en el documento académico. Debido a que la credencial/certificado PMP no detalla expresamente el número de horas lectivas dictadas, el comité no puede inferir ni presumir datos omitidos, siendo correcto no dar por acreditado el requisito.",
  "recordar": "Resolvió que las bases requerían de manera objetiva verificar la constancia de al menos 24 horas lectivas en el documento académico.",
  "precision": ""
 },
 {
  "caso": 301,
  "seccion": "2.5",
  "resolucion": "Resolución 3540-2026-TCP-S1",
  "cuestionamiento": "El impugnante alegó que el adjudicatario no acreditó la capacitación de su personal clave porque varios certificados adjuntos en su oferta no precisaban las horas lectivas o no cumplían los requisitos mínimos.",
  "resolvio": "El Tribunal desestimó el cuestionamiento. Confirmó que, si bien algunos certificados secundarios eran insuficientes, la oferta contenía al menos un certificado principal que cumplía con la totalidad de horas, materias y exigencias establecidas en las bases integradas, siendo suficiente para otorgar la calificación.",
  "recordar": "Confirmó que, si bien algunos certificados secundarios eran insuficientes, la oferta contenía al menos un certificado principal que cumplía con la totalidad de horas, materias y exigencias establecidas en las bases integradas, siendo suficiente para otorgar la calificación.",
  "precision": ""
 },
 {
  "caso": 302,
  "seccion": "2.5",
  "resolucion": "Resolución 8002-2026-TCP-S5",
  "cuestionamiento": "Se impugnó al adjudicatario por no acreditar la vigencia de la homologación en la norma técnica ASME IX solicitada para el personal especialista.",
  "resolvio": "El Tribunal declaró fundado el recurso y descalificó al adjudicatario, al comprobar que los certificados adjuntos no demostraban que la certificación estuviera vigente al momento de la presentación de ofertas.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 303,
  "seccion": "2.5",
  "resolucion": "Resolución 8405-2026-TCP-S2",
  "cuestionamiento": "Verificación de las horas de capacitación técnica requeridas para el plantel profesional.",
  "resolvio": "Las horas de capacitación deben contarse de acuerdo con lo consignado expresamente en los certificados e instituciones acreditadas según las reglas del procedimiento.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 304,
  "seccion": "2.5",
  "resolucion": "Resolución 8619-2026-TCP-S4",
  "cuestionamiento": "El impugnante fue descalificado porque presentó un certificado del curso \"Análisis de Peligros y Puntos Críticos de Control (HACCP)\" pretendiendo acreditar la capacitación exigida en manipulación de alimentos, sin que el documento indicara de forma expresa esa temática.",
  "resolvio": "El Tribunal confirmó la descalificación. Precisó que ni el comité de selección ni el Tribunal pueden presumir ni inferir temáticas o contenidos que no aparezcan expresamente redactados en los certificados presentados.",
  "recordar": "Precisó que ni el comité de selección ni el Tribunal pueden presumir ni inferir temáticas o contenidos que no aparezcan expresamente redactados en los certificados presentados.",
  "precision": ""
 },
 {
  "caso": 305,
  "seccion": "2.5",
  "resolucion": "Resolución 8839-2026-TCP-S6",
  "cuestionamiento": "El impugnante cuestionó la calificación de la Especialista en Análisis de Hidrocarburos del adjudicatario, argumentando que su diplomado (132 horas) fue emitido bajo la norma ISO/IEC 17025:2005, la cual fue sustituida por la versión 2017 antes de la convocatoria. Sostuvo que, por regla de actualización normativa, esas 132 horas no debían computarse, dejando a la profesional con solo 38 horas (menos de las 40 requeridas).",
  "resolvio": "El Tribunal confirmó la validez de la calificación de la profesional y desestimó la impugnación. La Sala diferenció entre dos conceptos: Capacidad legal del laboratorio: Exige contar con la norma técnica vigente para ejecutar los ensayos. Capacitación del personal clave: Acredita los conocimientos y competencias adquiridas por la persona. Dado que las bases no fijaron una versión específica de la norma ISO ni una fecha de caducidad para las capacitaciones, el comité de selección no podía restar valor a los conocimientos adquiridos ni exigir requisitos no previstos explícitamente en las reglas del procedimiento.",
  "recordar": "La Sala diferenció entre dos conceptos: Capacidad legal del laboratorio: Exige contar con la norma técnica vigente para ejecutar los ensayos.",
  "precision": ""
 },
 {
  "caso": 306,
  "seccion": "2.6",
  "resolucion": "Resolución 82-2020-TCE-S4",
  "cuestionamiento": "El postor ofertó un equipo cuya potencia superaba el límite máximo expresado en el rango de las bases integradas.",
  "resolvio": "El Tribunal estableció que cuando las bases integradas fijan un rango técnico cerrado (con límites inferior y superior), ofertar un equipo que sobrepasa el límite máximo resulta inadmisible si desnaturaliza las condiciones de operación previstas por la Entidad.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 307,
  "seccion": "2.6",
  "resolucion": "Resolución 3362-2021-TCE-S3",
  "cuestionamiento": "El compromiso de alquiler presentado (emitido por Ferreyros Cat) indicaba que la disponibilidad del cargador frontal quedaba sujeta al stock existente a la fecha de emisión de la orden de compra.",
  "resolvio": "El Tribunal confirmó la descalificación. Las acreditaciones de disponibilidad de equipamiento no pueden estar sometidas a condiciones o incertidumbres comerciales que pongan en riesgo la ejecución inmediata de la prestación.",
  "recordar": "Las acreditaciones de disponibilidad de equipamiento no pueden estar sometidas a condiciones o incertidumbres comerciales que pongan en riesgo la ejecución inmediata de la prestación.",
  "precision": ""
 },
 {
  "caso": 308,
  "seccion": "2.6",
  "resolucion": "Resolución 7712-2025-TCP-S6",
  "cuestionamiento": "Se cuestionó una cisterna cuya capacidad era mayor que la exigida en las bases y se sostuvo que ello debía considerarse una mejora admisible.",
  "resolvio": "El Tribunal descalificó la oferta del postor. Sentó como criterio que la oferta debe responder de forma exacta y coordinada a las especificaciones fijadas por la Entidad. No cabe sustituir el equipo requerido por otro de capacidad sustancialmente distinta bajo el pretexto de ser \"mayor\", si las bases no establecieron expresamente que la medida era un mínimo ampliable, pues las dimensiones impactan la planificación operativa de la obra o servicio.",
  "recordar": "No cabe sustituir el equipo requerido por otro de capacidad sustancialmente distinta bajo el pretexto de ser \"mayor\", si las bases no establecieron expresamente que la medida era un mínimo ampliable, pues las dimensiones impactan la planificación operativa de la obra o servicio.",
  "precision": "Los resúmenes discrepan en la unidad de la capacidad requerida (litros o galones). Se conserva el resultado reportado sin fijar una unidad como dato verificado."
 },
 {
  "caso": 309,
  "seccion": "2.6",
  "resolucion": "Resolución 7757-2025-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "El Consorcio Ponte cuestionó su descalificación. El comité descalificó su propuesta alegando que no acreditó el requisito de \"Equipamiento Estratégico\" en la oferta técnica. El comité sostuvo que, como las bases incluyeron el factor de evaluación \"experiencia específica adicional del personal clave\", la normativa obligaba a acreditar el equipamiento técnico junto con la oferta.",
  "resolvio": "El Tribunal aclaró que en las contrataciones de obras, los requisitos de capacidad técnica (como el equipamiento estratégico) se acreditan de manera obligatoria durante la etapa de suscripción del contrato. La salvedad normativa que exige acreditar capacidad técnica en la oferta cuando hay factores de evaluación adicionales aplica al personal clave, pero no al equipamiento estratégico. En consecuencia, revocó la descalificación del impugnante y tuvo por calificada su oferta.",
  "recordar": "El Tribunal aclaró que en las contrataciones de obras, los requisitos de capacidad técnica (como el equipamiento estratégico) se acreditan de manera obligatoria durante la etapa de suscripción del contrato.",
  "precision": ""
 },
 {
  "caso": 310,
  "seccion": "2.6",
  "resolucion": "Resolución 7757-2025-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "El comité descalificó la propuesta de un postor en su sobre inicial por presentar compromisos simples de alquiler en lugar de títulos de propiedad de las maquinarias requeridas.",
  "resolvio": "El Tribunal revocó la descalificación. Confirmó que las bases estándar permiten acreditar la disponibilidad del equipamiento estratégico mediante promesas de arrendamiento o compromisos de compraventa, correspondiendo la verificación formal definitiva en la fase de suscripción del contrato.",
  "recordar": "Confirmó que las bases estándar permiten acreditar la disponibilidad del equipamiento estratégico mediante promesas de arrendamiento o compromisos de compraventa, correspondiendo la verificación formal definitiva en la fase de suscripción del contrato.",
  "precision": ""
 },
 {
  "caso": 311,
  "seccion": "2.6",
  "resolucion": "Resolución 7793-2025-TCP-S2",
  "cuestionamiento": "El impugnante cuestionó la oferta del adjudicatario indicando que su compromiso de alquiler consignaba un equipo de pintado de pistas con capacidad de 3000 PSI, valor inferior al mínimo de 3300 PSI exigido en las bases integradas (a pesar de que en la ficha técnica adjunta figuraba 3300 PSI). A su vez, el adjudicatario cuestionó al impugnante argumentando que en sus cartas de compromiso de alquiler citó de forma errónea la nomenclatura del procedimiento de selección.",
  "resolvio": "Respecto al adjudicatario, el Tribunal determinó que existía una incongruencia insubsanable entre el compromiso de alquiler (3000 PSI) y la ficha técnica (3300 PSI), lo cual impedía tener certeza sobre la disponibilidad real del equipo requerido, procediendo a su descalificación. Respecto al impugnante, el Tribunal aclaró que la consignación inexacta de la nomenclatura del proceso constituía un simple error material de redacción que no afectaba la validez ni la identificación del compromiso ofertado.",
  "recordar": "Respecto al impugnante, el Tribunal aclaró que la consignación inexacta de la nomenclatura del proceso constituía un simple error material de redacción que no afectaba la validez ni la identificación del compromiso ofertado.",
  "precision": ""
 },
 {
  "caso": 312,
  "seccion": "2.6",
  "resolucion": "Resolución 251-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "Un postor fue descalificado porque su carta de compromiso de alquiler de maquinaria describía los equipos mediante rangos (ej. \"Cargador frontal de 110 - 125 HP\") en lugar de identificar el modelo y potencia exacta a proveer.",
  "resolvio": "El Tribunal confirmó la descalificación en este extremo. Estableció que la acreditación del equipamiento estratégico debe permitir la identificación inequívoca de las características del bien ofrecido; la consignación de intervalos o rangos imprecisos genera incertidumbre y constituye un incumplimiento técnico.",
  "recordar": "Estableció que la acreditación del equipamiento estratégico debe permitir la identificación inequívoca de las características del bien ofrecido; la consignación de intervalos o rangos imprecisos genera incertidumbre y constituye un incumplimiento técnico.",
  "precision": ""
 },
 {
  "caso": 313,
  "seccion": "2.6",
  "resolucion": "Resolución 251-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "La Entidad pretendió exigir la acreditación documental de la propiedad o disponibilidad de la maquinaria pesada durante la presentación de ofertas.",
  "resolvio": "El Tribunal dejó sentado que el equipamiento estratégico configurado como requisito de calificación se acredita obligatoriamente al momento de la suscripción del contrato (artículo 72.3 del Reglamento) y no junto con la oferta técnica, salvo que se hubiese establecido como un factor de evaluación de mejoras.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 314,
  "seccion": "2.6",
  "resolucion": "Resolución 351-2026-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "COTECNIA debía acreditar siete balanzas, pero presentó inicialmente prueba de una y añadió documentación de las restantes durante la subsanación.",
  "resolvio": "La Sala consideró que agregar la prueba del equipamiento faltante modificaba sustancialmente la oferta. No era una aclaración formal de la documentación inicial. Descalificó al adjudicatario por ese requisito.",
  "recordar": "La Sala consideró que agregar la prueba del equipamiento faltante modificaba sustancialmente la oferta.",
  "precision": ""
 },
 {
  "caso": 315,
  "seccion": "2.6",
  "resolucion": "Resolución 351-2026-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "CIMPO presentó una congeladora horizontal para acreditar el equipo requerido, consistente en una congeladora vertical de acero inoxidable de al menos 25 pies cúbicos.",
  "resolvio": "El Tribunal determinó que los equipos eran técnicamente distintos: la orientación y configuración no eran una diferencia de nombre. El incumplimiento era insubsanable, pues corregirlo supondría cambiar el equipo ofrecido. Descalificó a CIMPO y, al no quedar ofertas válidas tras la exclusión de COTECNIA, declaró desierto el procedimiento.",
  "recordar": "El Tribunal determinó que los equipos eran técnicamente distintos: la orientación y configuración no eran una diferencia de nombre.",
  "precision": ""
 },
 {
  "caso": 316,
  "seccion": "2.6",
  "resolucion": "Resolución 542-2026-TCP-S5",
  "cuestionamiento": "El comité descalificó al impugnante sosteniendo que su carta de compromiso de alquiler no detallaba minuciosamente las especificaciones técnicas internas de la maquinaria.",
  "resolvio": "El Tribunal revocó la descalificación. Explicó que si las bases integradas solicitaron acreditar la disponibilidad mediante compromiso de alquiler conteniendo la descripción y cantidad exigida, el comité no puede exigir válidamente detalles técnicos adicionales que no fueron regulados explícitamente en las reglas del proceso.",
  "recordar": "Explicó que si las bases integradas solicitaron acreditar la disponibilidad mediante compromiso de alquiler conteniendo la descripción y cantidad exigida, el comité no puede exigir válidamente detalles técnicos adicionales que no fueron regulados explícitamente en las reglas del proceso.",
  "precision": ""
 },
 {
  "caso": 317,
  "seccion": "2.6",
  "resolucion": "Resolución 614-2026-TCP-S3",
  "cuestionamiento": "El CONSORCIO PORVENIR acreditó una excavadora con la expresión genérica “115–165 HP”, coincidente con el rango del requerimiento, sin identificar las características concretas de la máquina.",
  "resolvio": "La Sala consideró insuficiente repetir el rango de las bases sin precisar el equipo efectivamente disponible y sus propiedades. Descalificó al adjudicatario. Que las bases admitieran un rango no eximía de demostrar cuál era la maquinaria ofrecida.",
  "recordar": "La Sala consideró insuficiente repetir el rango de las bases sin precisar el equipo efectivamente disponible y sus propiedades.",
  "precision": ""
 },
 {
  "caso": 318,
  "seccion": "2.6",
  "resolucion": "Resolución 1111-2026-TCP-S1",
  "cuestionamiento": "El impugnante alegó que el adjudicatario solo presentó una declaración jurada simple sobre la disponibilidad de la maquinaria requerida, en lugar de presentar la propiedad, contratos o compromisos firmados de alquiler de los equipos.",
  "resolvio": "El Tribunal acogió el cuestionamiento y descalificó al adjudicatario. Criterio descrito en la fuente: Los requisitos de calificación (incluido el equipamiento estratégico) no se acreditan con simples declaraciones juradas. El postor tiene la obligación documental de adjuntar facturas de compra, compromisos de compraventa o contratos/compromisos de alquiler firmados por ambas partes que aseguren la disponibilidad real del equipo.",
  "recordar": "Criterio descrito en la fuente: Los requisitos de calificación (incluido el equipamiento estratégico) no se acreditan con simples declaraciones juradas.",
  "precision": ""
 },
 {
  "caso": 319,
  "seccion": "2.6",
  "resolucion": "Resolución 4037-2026-TCP-S3",
  "cuestionamiento": "El impugnante sostuvo que el comité otorgó un trato preferencial e ilegal al adjudicatario al concederle un día hábil para subsanar la información de su equipamiento estratégico (precisar la potencia/capacidad de la maquinaria), lo cual, a su criterio, quebrantaba el principio de igualdad de trato.",
  "resolvio": "El Tribunal determinó que la subsanación otorgada fue legalmente válida, ya que consistió en la aclaración de una omisión formal sobre las características de los equipos que no alteraba el contenido esencial ni la sustancia de la propuesta técnica ofertada. Al no existir favorecimiento indebido, declaró infundado el recurso de apelación.",
  "recordar": "El Tribunal determinó que la subsanación otorgada fue legalmente válida, ya que consistió en la aclaración de una omisión formal sobre las características de los equipos que no alteraba el contenido esencial ni la sustancia de la propuesta técnica ofertada.",
  "precision": ""
 },
 {
  "caso": 320,
  "seccion": "2.6",
  "resolucion": "Resolución 5100-2026-TCP-S2",
  "cuestionamiento": "El comité de selección descalificó la oferta de N&P Global Construction E.I.R.L. señalando que no adjuntó dentro de su propuesta técnica una Declaración Jurada que indicara las características del equipamiento estratégico ofertado (compactador, mezcladora, vibrador).",
  "resolvio": "El Tribunal determinó que, según las bases integradas, la acreditación del equipamiento estratégico es un requisito exigible para la etapa de suscripción del contrato, no para la presentación de ofertas. Además, las bases no exigían una declaración jurada adicional en la oferta. Por ende, el comité adelantó indebidamente exigencias contractuales a la etapa de evaluación. El Tribunal revocó la descalificación y declaró calificada la oferta en este extremo.",
  "recordar": "El Tribunal determinó que, según las bases integradas, la acreditación del equipamiento estratégico es un requisito exigible para la etapa de suscripción del contrato, no para la presentación de ofertas.",
  "precision": ""
 },
 {
  "caso": 321,
  "seccion": "2.6",
  "resolucion": "Resolución 6693-2026-TCP-S1",
  "cuestionamiento": "Inconsistencia en la consignación del RUC (error en un dígito) en la carta de compromiso de equipamiento.",
  "resolvio": "Se determinó que fue un error material manifiesto que no afectaba la validez ni el compromiso de disponibilidad del equipo.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 322,
  "seccion": "2.6",
  "resolucion": "Resolución 8020-2026-TCP-S4",
  "cuestionamiento": "Se exigió descalificar ofertas porque las cartas/compromisos de alquiler de maquinaria (ej. camión volquete) no incluían la tarjeta de propiedad, DNI del arrendador o la prueba de posesión previa.",
  "resolvio": "El Tribunal rechazó las descalificaciones. Dispuso que en la etapa de evaluación de ofertas únicamente corresponde exigir la acreditación de la disponibilidad de los equipos (a través de compromisos o promesas de alquiler). Exigir documentos de propiedad o posesión no previstos en las bases contraviene el principio de libre concurrencia.",
  "recordar": "Exigir documentos de propiedad o posesión no previstos en las bases contraviene el principio de libre concurrencia.",
  "precision": "La fuente agrupa esta resolución con 8786-2026-TCP-S4. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 323,
  "seccion": "2.6",
  "resolucion": "Resolución 8057-2026-TCP-S4",
  "cuestionamiento": "El Consorcio Señor de Huanca impugnó su descalificación y la declaratoria de desierto del ítem III (alquiler de camiones volquete). El comité descalificó su propuesta al constatar que las promesas de alquiler y tarjetas de propiedad de 4 de los 10 volquetes ofertados no indicaban la capacidad mínima de tolva exigida (15 m³), pretendiendo acreditar dicha característica mediante una declaración jurada unilateral. El impugnante sostenía que dicha característica podía inferirse del modelo o de los otros vehículos de la flota.",
  "resolvio": "El Tribunal determinó que una declaración jurada emitida por el propio postor no constituye un documento fehaciente ni idóneo para reemplazar la falta de acreditación en los documentos de respaldo (tarjetas de propiedad o contratos de alquiler). Tampoco es admisible trasladar especificaciones técnicas por inferencia o presunción entre vehículos cuando la documentación omite datos esenciales o registra potencias menores a las requeridas. Al no haberse acreditado de forma fehaciente las características del equipamiento estratégico, el Tribunal declaró infundado el recurso y confirmó la descalificación.",
  "recordar": "El Tribunal determinó que una declaración jurada emitida por el propio postor no constituye un documento fehaciente ni idóneo para reemplazar la falta de acreditación en los documentos de respaldo (tarjetas de propiedad o contratos de alquiler).",
  "precision": ""
 },
 {
  "caso": 324,
  "seccion": "2.6",
  "resolucion": "Resolución 8113-2026-TCP-S1",
  "cuestionamiento": "El comité descalificó al postor porque en el Certificado de Cubicación de su camión cisterna indicó que el tanque era de color \"Azul/Blanco\", mientras que en la Ficha Técnica indicó \"Azul/Celeste\".",
  "resolvio": "El Tribunal confirmó la descalificación. Argumentó que los documentos presentados en la propuesta técnica deben mantener consistencia. La presencia de datos contradictorios sobre las características del mismo equipo afecta la certidumbre de la oferta.",
  "recordar": "Argumentó que los documentos presentados en la propuesta técnica deben mantener consistencia.",
  "precision": ""
 },
 {
  "caso": 325,
  "seccion": "2.6",
  "resolucion": "Resolución 8786-2026-TCP-S4",
  "cuestionamiento": "Se exigió descalificar ofertas porque las cartas/compromisos de alquiler de maquinaria (ej. camión volquete) no incluían la tarjeta de propiedad, DNI del arrendador o la prueba de posesión previa.",
  "resolvio": "El Tribunal rechazó las descalificaciones. Dispuso que en la etapa de evaluación de ofertas únicamente corresponde exigir la acreditación de la disponibilidad de los equipos (a través de compromisos o promesas de alquiler). Exigir documentos de propiedad o posesión no previstos en las bases contraviene el principio de libre concurrencia.",
  "recordar": "Exigir documentos de propiedad o posesión no previstos en las bases contraviene el principio de libre concurrencia.",
  "precision": "La fuente agrupa esta resolución con 8020-2026-TCP-S4. Se conserva identificada por separado; el resumen no individualiza todos los hechos de cada expediente."
 },
 {
  "caso": 326,
  "seccion": "2.6",
  "resolucion": "Resolución 8848-2026-TCP-S6",
  "cuestionamiento": "El adjudicatario cuestionó la oferta del impugnante por omitir la copia del Registro de Cubicaje de sus vehículos en la propuesta técnica.",
  "resolvio": "El Tribunal desestimó la objeción. Resolvió que el Registro de Cubicaje fue previsto en las bases para ser entregado dentro de los 10 días posteriores a la firma del contrato (fase de ejecución) y no como un requisito de calificación para la oferta técnica.",
  "recordar": "Resolvió que el Registro de Cubicaje fue previsto en las bases para ser entregado dentro de los 10 días posteriores a la firma del contrato (fase de ejecución) y no como un requisito de calificación para la oferta técnica.",
  "precision": ""
 },
 {
  "caso": 327,
  "seccion": "2.7",
  "resolucion": "Resolución 65-2025-TCE-S2",
  "cuestionamiento": "El comité de selección descalificó la oferta del postor impugnante alegando que en su contrato de arrendamiento no se especificaba expresamente si el inmueble era techado o con piso de loza de cemento, y aduciendo inconsistencias en el área indicada entre el contrato de alquiler y la memoria descriptiva adjunta.",
  "resolvio": "El Tribunal declaró fundado el recurso de apelación y revocó la descalificación. Explicó que las bases integradas exigen únicamente adjuntar la copia del documento que acredite la propiedad, posesión o compromiso/contrato de alquiler del bien. No es necesario ni exigible que el contrato de alquiler describa literalmente las especificaciones técnicas del inmueble (techado o loza), cuando estas características se desprenden objetivamente de los planos y documentos complementarios que integran la oferta técnica.",
  "recordar": "Explicó que las bases integradas exigen únicamente adjuntar la copia del documento que acredite la propiedad, posesión o compromiso/contrato de alquiler del bien.",
  "precision": ""
 },
 {
  "caso": 328,
  "seccion": "2.7",
  "resolucion": "Resolución 7177-2025-TCP-S5",
  "cuestionamiento": "Se impugnó la infraestructura de un taller de reparación de transformadores alegando que el compromiso de alquiler presentado por el adjudicatario no adjuntaba recibos de servicio eléctrico para demostrar el suministro trifásico requerido.",
  "resolvio": "El Tribunal confirmó la calificación. Estableció que los compromisos de arrendamiento suscritos por los representantes legales de los inmuebles constituyen documentos idóneos y suficientes para acreditar la disponibilidad de la infraestructura en la fase de ofertas, al amparo del principio de presunción de veracidad.",
  "recordar": "Estableció que los compromisos de arrendamiento suscritos por los representantes legales de los inmuebles constituyen documentos idóneos y suficientes para acreditar la disponibilidad de la infraestructura en la fase de ofertas, al amparo del principio de presunción de veracidad.",
  "precision": ""
 },
 {
  "caso": 329,
  "seccion": "2.7",
  "resolucion": "Resolución 35-2026-TCP-S2",
  "cuestionamiento": "El adjudicatario cuestionó la oferta del impugnante alegando que el contrato de arrendamiento presentado para acreditar el taller/laboratorio contenía discrepancias en la numeración y titularidad frente a escrituras públicas de donación antiguas.",
  "resolvio": "El Tribunal confirmó la calificación de la oferta del impugnante y le otorgó la buena pro. Se precisó que la función de la entidad y del Tribunal en la etapa de calificación es verificar la disponibilidad física y jurídica del inmueble mediante los documentos vigentes exigidos por las bases (contrato de alquiler y licencia), sin que corresponda auditar modificaciones históricas, registrales o catastrales pasadas del predio.",
  "recordar": "Se precisó que la función de la entidad y del Tribunal en la etapa de calificación es verificar la disponibilidad física y jurídica del inmueble mediante los documentos vigentes exigidos por las bases (contrato de alquiler y licencia), sin que corresponda auditar modificaciones históricas, registrales o catastrales pasadas del predio.",
  "precision": ""
 },
 {
  "caso": 330,
  "seccion": "2.7",
  "resolucion": "Resolución 351-2026-TCP-S3",
  "cuestionamiento": "El comité descalificó a CIMPO por considerar que no había acreditado la disponibilidad de su planta de producción.",
  "resolvio": "La licencia municipal y la documentación de DIGESA identificaban el establecimiento y permitían demostrar su disponibilidad mediante el medio alternativo previsto en las bases. La Sala validó la infraestructura y revocó ese motivo de descalificación. El resultado final de CIMPO fue distinto por el incumplimiento de equipamiento explicado en el apartado 2.6.",
  "recordar": "La licencia municipal y la documentación de DIGESA identificaban el establecimiento y permitían demostrar su disponibilidad mediante el medio alternativo previsto en las bases.",
  "precision": ""
 },
 {
  "caso": 331,
  "seccion": "2.7",
  "resolucion": "Resolución 1441-2026-TCP-S4 · Cuestionamiento 1",
  "cuestionamiento": "Se cuestionó la infraestructura de P&A CONSULTORÍA porque su compromiso identificaba el local, pero no acreditaba el área mínima de 60 m².",
  "resolvio": "La Sala concluyó que indicar una dirección no demostraba el área exigida. El documento debía permitir verificar las características del local ofrecido; una declaración general no suplía el dato faltante. Descalificó esa oferta.",
  "recordar": "La Sala concluyó que indicar una dirección no demostraba el área exigida.",
  "precision": ""
 },
 {
  "caso": 332,
  "seccion": "2.7",
  "resolucion": "Resolución 1441-2026-TCP-S4 · Cuestionamiento 2",
  "cuestionamiento": "Se objetó la promesa de alquiler de AEROCAM porque no precisaba la dirección ni el área de la oficina, exigida dentro de un radio de dos kilómetros.",
  "resolvio": "El Tribunal determinó que la promesa no permitía comprobar ni los 60 m² ni la ubicación requerida. Descalificó al adjudicatario. GEOSOLUTIONS pasó al primer lugar y recibió la buena pro, con la verificación del área y radio de su propio local expresamente indicada por la Sala.",
  "recordar": "El Tribunal determinó que la promesa no permitía comprobar ni los 60 m² ni la ubicación requerida.",
  "precision": ""
 },
 {
  "caso": 333,
  "seccion": "2.7",
  "resolucion": "Resolución 4521-2026-TCP-S1",
  "cuestionamiento": "Se solicitó descalificar al adjudicatario alegando que la licencia municipal del inmueble ofrecido para almacenes de alimentos no consignaba expresamente el término \"almacén de alimentos\" en su giro comercial.",
  "resolvio": "El Tribunal desestimó el cuestionamiento. Explicó que las bases exigían acreditar la disponibilidad de la infraestructura (almacén). Exigir que la licencia municipal contenga una denominación textual específica no prevista en las bases constituye un formulismo que vulnera el principio de libertad de concurrencia.",
  "recordar": "Explicó que las bases exigían acreditar la disponibilidad de la infraestructura (almacén).",
  "precision": ""
 },
 {
  "caso": 334,
  "seccion": "2.7",
  "resolucion": "Resolución 8848-2026-TCP-S6",
  "cuestionamiento": "El impugnante cuestionó la infraestructura del adjudicatario sosteniendo que acreditó el área mínima de 6,300 m² sumando tres predios colindantes con partidas electrónicas independientes, argumentando que no formaban una sola unidad inmobiliaria.",
  "resolvio": "El Tribunal confirmó la calificación y la buena pro del adjudicatario. Determinó que las bases no proscriben la acreditación de la infraestructura técnica mediante la suma funcional de predios continuos o colindantes, siempre que en conjunto garanticen el área requerida y cuenten con la correspondiente autorización ambiental (MINAM).",
  "recordar": "Determinó que las bases no proscriben la acreditación de la infraestructura técnica mediante la suma funcional de predios continuos o colindantes, siempre que en conjunto garanticen el área requerida y cuenten con la correspondiente autorización ambiental (MINAM).",
  "precision": ""
 },
 {
  "caso": 335,
  "seccion": "2.8",
  "resolucion": "Resolución 3948-2024-TCE-S1",
  "cuestionamiento": "El CONSORCIO VIAL VIRGEN CHAPI pretendió acreditar experiencia con un contrato de consorcio que señalaba porcentajes de participación en las utilidades, pero no precisaba los porcentajes de obligaciones ejecutadas.",
  "resolvio": "La Sala no aceptó equiparar la distribución de utilidades con la participación en las obligaciones. Sin esa información no podía determinar el monto de experiencia atribuible al integrante. Confirmó la descalificación del impugnante, declaró infundado su recurso y mantuvo la buena pro de TRANSVEL.",
  "recordar": "Sin esa información no podía determinar el monto de experiencia atribuible al integrante.",
  "precision": ""
 },
 {
  "caso": 336,
  "seccion": "2.8",
  "resolucion": "Resolución 3299-2025-TCP-S5",
  "cuestionamiento": "Evaluación del porcentaje de participación del integrante del consorcio que debía acreditar la mayor experiencia en la especialidad.",
  "resolvio": "Validó la experiencia al verificar que el integrante que aportó la mayor facturación cumplía exactamente con el porcentaje de participación exigido por las bases integradas.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 337,
  "seccion": "2.8",
  "resolucion": "Resolución 3597-2025-TCP-S5",
  "cuestionamiento": "Se solicitó excluir la experiencia del CONSORCIO PUENTE SEGURO porque la copia de su contrato consorcial no incluía la última hoja notarial.",
  "resolvio": "La Sala validó la documentación: en las hojas presentadas constaban el porcentaje de obligaciones y las referencias a la legalización, por lo que la omisión alegada no impedía acreditar la experiencia examinada. El consorcio no fue descalificado por este cuestionamiento. Sin embargo, al restituirse GOLDEN al primer lugar, se revocó la buena pro y se otorgó a este último.",
  "recordar": "La Sala validó la documentación: en las hojas presentadas constaban el porcentaje de obligaciones y las referencias a la legalización, por lo que la omisión alegada no impedía acreditar la experiencia examinada.",
  "precision": ""
 },
 {
  "caso": 338,
  "seccion": "2.8",
  "resolucion": "Resolución 351-2026-TCP-S3",
  "cuestionamiento": "En los antecedentes se objetó la relación entre la experiencia declarada y el diez por ciento de participación de un integrante del CONSORCIO SAN CRISTÓBAL.",
  "resolvio": "El fallo no desarrolla una decisión de fondo sobre ese porcentaje. Resuelve la infraestructura y el equipamiento de las ofertas examinadas y explica por qué otros cuestionamientos no modificarían el resultado. No corresponde atribuirle el criterio general de que cualquier promesa con un porcentaje mínimo demuestra por sí sola toda la experiencia del consorcio.",
  "recordar": "No corresponde atribuirle el criterio general de que cualquier promesa con un porcentaje mínimo demuestra por sí sola toda la experiencia del consorcio.",
  "precision": ""
 },
 {
  "caso": 339,
  "seccion": "2.8",
  "resolucion": "Resolución 730-2026-TCP-S2",
  "cuestionamiento": "El impugnante cuestionó la calificación del Consorcio Lavafresh alegando que no presentó el contrato de consorcio formalizado y que la documentación de experiencia contenía inconsistencias.",
  "resolvio": "El Tribunal desestimó los cuestionamientos al comprobar que en la etapa de selección solo se exige la promesa de consorcio (Anexo N° 4) y que los documentos de experiencia cumplían con los requisitos de las bases integradas.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases.",
  "precision": ""
 },
 {
  "caso": 340,
  "seccion": "2.8",
  "resolucion": "Resolución 1078-2026-TCP-S2",
  "cuestionamiento": "Se cuestionó el cumplimiento del porcentaje mínimo del consorciado que aportaba la mayor experiencia.",
  "resolvio": "Para el requisito de participación en consorcio basta con comprobar que la promesa cumple con el porcentaje mínimo de participación asignado al integrante que aporta mayor experiencia.",
  "recordar": "Relaciona la prueba presentada con la exigencia concreta de las bases. Alcance del caso. El relato disponible aborda conjuntamente dos resoluciones y no permite individualizar todos los hechos de esta controversia.",
  "precision": ""
 },
 {
  "caso": 341,
  "seccion": "2.8",
  "resolucion": "Resolución 8678-2026-TCP-S1",
  "cuestionamiento": "El Comité descalificó la oferta del Consorcio Integra en un servicio de supervisión de obra, alegando dudas sobre la Declaración Jurada de Domicilio de uno de sus integrantes y presuntas inconsistencias en el Diagrama de Gantt.",
  "resolvio": "Domicilio y presunción de veracidad: El Tribunal ratificó que las declaraciones juradas de admisión y calificación se encuentran amparadas por el principio de presunción de veracidad. La sola duda sobre una dirección no autoriza al Comité a descalificar una propuesta; en caso de sospechas, la Entidad debe admitir la oferta y verificar la veracidad en la etapa de fiscalización posterior. Metodología y Diagrama de Gantt: El Tribunal comprobó que el Consorcio Integra desarrolló de manera completa e integral la propuesta metodológica y los Anexos obligatorios exigidos en las bases integradas. Decisión: El Tribunal revocó la descalificación del Consorcio Integra, le otorgó los 100 puntos técnicos, revocó la buena pro al consorcio competidor y le adjudicó directamente la buena pro al Consorcio Integra.",
  "recordar": "La sola duda sobre una dirección no autoriza al Comité a descalificar una propuesta; en caso de sospechas, la Entidad debe admitir la oferta y verificar la veracidad en la etapa de fiscalización posterior.",
  "precision": ""
 },
 {
  "caso": 342,
  "seccion": "2.8",
  "resolucion": "Resolución 8986-2026-TCP-S1",
  "cuestionamiento": "Las experiencias 7 y 9 del adjudicatario se apoyaban en contratos de consorcio cuyos porcentajes de obligaciones sumaban 150 %.",
  "resolvio": "La Sala consideró imposible determinar una distribución válida con esos porcentajes y excluyó S/ 3 402 827,36. Aun después de los descuentos, MOYOBAMBA acreditó S/ 6 654 640,15, por encima del mínimo de S/ 6 149 873,83. Por tanto, el cuestionamiento no determinó su descalificación.",
  "recordar": "Aun después de los descuentos, MOYOBAMBA acreditó S/ 6 654 640,15, por encima del mínimo de S/ 6 149 873,83.",
  "precision": ""
 },
 {
  "caso": 343,
  "seccion": "3.1",
  "resolucion": "Resolución 219-2026-TCP-S3",
  "cuestionamiento": "El oficial de compras le asignó cero (0) puntos al impugnante en el factor \"Plazo de entrega\" (bajo el sistema llave en mano). La Entidad argumentó que, si bien el postor mejoró el plazo de entrega del bien (ofertando 21 días de un rango de 21 a 23 días), también ofreció un plazo de instalación y capacitación de 2 días calendarios. Según la Entidad, esto alteraba el formato del Anexo N° 12 al modificar el plazo de actividades complementarias.",
  "resolvio": "El Tribunal declaró fundado el punto controvertido. Aclaró que la regla de evaluación de las bases establecía de manera expresa que el único aspecto evaluable para asignar puntaje era el plazo de entrega del bien. Ofertar un plazo de 2 días para la instalación y capacitación se encontraba dentro del límite máximo requerido por la Entidad (máximo 5 días) y no vulneraba las bases ni alteraba la entrega del bien. En consecuencia, revocó la calificación del oficial de compra y le otorgó al impugnante los 40 puntos correspondientes.",
  "recordar": "Aclaró que la regla de evaluación de las bases establecía de manera expresa que el único aspecto evaluable para asignar puntaje era el plazo de entrega del bien.",
  "precision": ""
 },
 {
  "caso": 344,
  "seccion": "3.1",
  "resolucion": "Resolución 520-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó revocar los 60 puntos otorgados en el factor \"Plazo de entrega\" tanto a la adjudicataria como a otro postor. Cuestionó que en sus declaraciones juradas (Anexo N° 12) hayan ofertado el plazo indicando un rango: \"de 1 a 2 días\". Sostuvo que las ofertas técnicas deben ser concretas y que expresar un rango genera ambigüedad e incertidumbre en la ejecución contractual.",
  "resolvio": "El Tribunal declaró fundado el cuestionamiento. Determinó que toda información contenida en las propuestas debe ser clara, precisa y determinada. Al indicar un rango (\"de 1 a 2 días\"), no es posible saber con exactitud en cuál de los dos días el postor se obliga formalmente a entregar los productos. Dado que los evaluadores no pueden interpretar ni adivinar el alcance de las propuestas, el Tribunal revocó los 60 puntos a ambos postores (asignándoles 0 puntos).",
  "recordar": "Determinó que toda información contenida en las propuestas debe ser clara, precisa y determinada.",
  "precision": ""
 },
 {
  "caso": 345,
  "seccion": "3.1",
  "resolucion": "Resolución 2100-2026-TCP-S4",
  "cuestionamiento": "El impugnante 1 alegó que el comité de selección le otorgó de manera errónea cero (0) puntos en el factor facultativo \"Plazo de entrega\" respecto del Ítem N° 1 del procedimiento. Sostuvo que a folio 22 de su oferta adjunto el Anexo N° 12 comprometiéndose a entregar los bienes en 34 días. Por su parte, la Entidad y el adjudicatario señalaron que dicho anexo consignaba expresamente que correspondía al Ítem N° 2 y no al Ítem N° 1.",
  "resolvio": "El Tribunal declaró infundado el recurso en este extremo. Señaló que la formulación y presentación de las ofertas es de exclusiva responsabilidad de cada postor. Al haber indicado de forma explícita en su declaración jurada que el plazo correspondía al Ítem N° 2, existía una deficiencia insubsanable para el Ítem N° 1. Por ende, la asignación de 0 puntos realizada por el comité se ajustó a derecho.",
  "recordar": "Señaló que la formulación y presentación de las ofertas es de exclusiva responsabilidad de cada postor.",
  "precision": ""
 },
 {
  "caso": 346,
  "seccion": "3.1",
  "resolucion": "Resolución 5768-2026-TCP-S2",
  "cuestionamiento": "El impugnante alegó que el comité cometió un error aritmético al calcular la asignación de puntaje por plazo de entrega en la oferta del adjudicatario.",
  "resolvio": "El Tribunal declaró fundado en parte este extremo. Recalculó el puntaje técnico del adjudicatario conforme a la fórmula matemática de las bases, corrigiendo la tabla de evaluación final.",
  "recordar": "Recalculó el puntaje técnico del adjudicatario conforme a la fórmula matemática de las bases, corrigiendo la tabla de evaluación final.",
  "precision": ""
 },
 {
  "caso": 347,
  "seccion": "3.1",
  "resolucion": "Resolución 6863-2026-TCP-S6",
  "cuestionamiento": "El adjudicatario alegó que en el Anexo N° 12 el impugnante consignó 51 días calendarios como plazo total, lo cual superaba el plazo de 49 días previsto en el requerimiento y lo dejaba fuera de los rangos para obtener puntaje.",
  "resolvio": "Dado que la oferta del adjudicatario fue declarada no admitida en la etapa de admisión por las incongruencias técnicas, el Tribunal determinó que resultaba inoficioso profundizar en la controversia de su puntaje, procediendo a otorgarle la buena pro al impugnante al contar con una propuesta válida.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 348,
  "seccion": "3.1",
  "resolucion": "Resolución 7895-2026-TCP-S3",
  "cuestionamiento": "El impugnante reclamó que el comité no le otorgó los 25 puntos del factor facultativo \"Plazo de entrega\" a pesar de haber ofertado en su Anexo N° 12 entregar los bienes en el plazo de \"un (1) día calendario\". La Entidad y el adjudicatario explicaron que las bases exigían que el plazo de 1 día se computara \"a partir del día siguiente de notificado el requerimiento/orden de compra\", pero el impugnante modificó la condición en su formato declarando \"un (1) día calendario después de la firma del contrato\".",
  "resolvio": "Por decisión de la mayoría de la Sala, el Tribunal declaró infundado el recurso. Fundamentó que la asignación de puntaje no depende únicamente de ofrecer un menor número de días, sino de respetar de forma estricta el hito inicial de cómputo fijado en las bases integradas. Al pretender que el plazo se cuente desde la firma del contrato, el postor alteró la regla de ejecución y obligaría a la Entidad a recibir bienes en una condición distinta a la solicitada. (Nota: Un vocal emitió un voto en discordia opinando que las bases tenían un vicio, pero la resolución vinculante ratificó la decisión de la mayoría).",
  "recordar": "Fundamentó que la asignación de puntaje no depende únicamente de ofrecer un menor número de días, sino de respetar de forma estricta el hito inicial de cómputo fijado en las bases integradas.",
  "precision": ""
 },
 {
  "caso": 349,
  "seccion": "3.1",
  "resolucion": "Resolución 8122-2026-TCP-S2",
  "cuestionamiento": "En una licitación para suministros médicos con 12 entregas periódicas mensuales, el comité le asignó 0 puntos al impugnante en el factor \"Plazo de entrega\". El comité sostuvo que consignar 53 días para la primera entrega en el Anexo N° 12 resultaba contradictorio con el formato obligatorio o desnaturalizaba las entregas periódicas. El impugnante apeló señalando que la metodología de las bases evaluaba específicamente la reducción del plazo de la primera entrega.",
  "resolvio": "El Tribunal le dio la razón al impugnante en este factor. Estableció que las bases integradas fijaron objetivamente que el puntaje se asignaba en función de los días ofertados para la primera entrega. Al haber ofertado 53 días calendarios, la propuesta se encontraba dentro del rango de máxima puntuación, correspondiéndole los 25 puntos.",
  "recordar": "Estableció que las bases integradas fijaron objetivamente que el puntaje se asignaba en función de los días ofertados para la primera entrega. 3.1.2. Sostenibilidad social Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 350,
  "seccion": "3.1",
  "resolucion": "Resolución 1675-2026-TCP-S3",
  "cuestionamiento": "Se objetó el otorgamiento del puntaje máximo (10 puntos) al ganador en el factor \"Sostenibilidad Social\" debido a que únicamente adjuntó un (1) certificado ISO 45001.",
  "resolvio": "El Tribunal declaró fundado el reclamo y redujo el puntaje de 10 a 5 puntos. Constató que la regla de las bases asignaba 5 puntos por presentar una (1) práctica y reservaba los 10 puntos a quienes acreditaran más de una (>1) práctica, por lo que el comité incurrió en un error material al otorgar el puntaje máximo.",
  "recordar": "Constató que la regla de las bases asignaba 5 puntos por presentar una (1) práctica y reservaba los 10 puntos a quienes acreditaran más de una (>1) práctica, por lo que el comité incurrió en un error material al otorgar el puntaje máximo.",
  "precision": ""
 },
 {
  "caso": 351,
  "seccion": "3.1",
  "resolucion": "Resolución 3503-2026-TCP-S3",
  "cuestionamiento": "El comité no le otorgó puntaje al postor en el factor \"Sostenibilidad social\" alegando que el certificado del sistema de gestión de seguridad y salud ISO 45001:2018 no precisaba en su alcance textual la frase \"servicio de habilitación de mercancías\" (objeto de la convocatoria).",
  "resolvio": "El Tribunal concluyó que las bases integradas únicamente exigían la presentación de la copia simple del certificado ISO 45001 acorde con la norma técnica, sin exigir que el documento incluyera literalmente la descripción de la prestación contractual. El comité impuso una exigencia no prevista en las bases, por lo que el Tribunal ordenó asignar los 5 puntos al impugnante.",
  "recordar": "El comité impuso una exigencia no prevista en las bases, por lo que el Tribunal ordenó asignar los 5 puntos al impugnante.",
  "precision": ""
 },
 {
  "caso": 352,
  "seccion": "3.1",
  "resolucion": "Resolución 4259-2026-TCP-S4",
  "cuestionamiento": "El impugnante cuestionó los 10 puntos asignados al adjudicatario en Sostenibilidad Social con el certificado SA 8000:2014, afirmando que la empresa emisora (\"BSI Inspection Limited\") no se encontraba acreditada ante el Social Accountability Accreditation Services (SAAS) para emitir certificaciones en el Perú.",
  "resolvio": "Tras requerir información oficial al INACAL y verificar los registros internacionales del SAAS, el Tribunal confirmó que BSI Inspection Limited no tenía acreditación válida para realizar auditorías SA 8000 en el ámbito geográfico del Perú. Al incumplir la regla expresa de las bases que exigía certificación por organismo acreditado ante SAAS, se le retiró el puntaje al adjudicatario y se revocó la buena pro.",
  "recordar": "Al incumplir la regla expresa de las bases que exigía certificación por organismo acreditado ante SAAS, se le retiró el puntaje al adjudicatario y se revocó la buena pro.",
  "precision": ""
 },
 {
  "caso": 353,
  "seccion": "3.1",
  "resolucion": "Resolución 4521-2026-TCP-S1",
  "cuestionamiento": "Se impugnó el puntaje otorgado por la certificación del Sistema de Gestión de Seguridad y Salud en el Trabajo, porque el certificado indicaba aplicarse a \"toda la organización\" y no usó la frase exacta de las bases.",
  "resolvio": "El Tribunal mantuvo el puntaje. Decidió que un certificado emitido para \"toda la organización\" de una empresa de alimentos comprende plenamente los procesos operativos exigidos por la entidad.",
  "recordar": "Decidió que un certificado emitido para \"toda la organización\" de una empresa de alimentos comprende plenamente los procesos operativos exigidos por la entidad.",
  "precision": ""
 },
 {
  "caso": 354,
  "seccion": "3.1",
  "resolucion": "Resolución 6354-2026-TCP-S4",
  "cuestionamiento": "El impugnante sostuvo que el adjudicatario presentó certificados SA 8000:2014 para pretender acreditar la Práctica C.2 (Reconocimiento del MTPE u otras certificaciones en buenas prácticas laborales), cuando el estándar SA 8000 corresponde exclusivamente a la Práctica C.1.",
  "resolvio": "El Tribunal explicó que las bases estándar contemplan distintas prácticas de sostenibilidad social de naturaleza independiente. Si la Entidad seleccionó en sus bases integradas únicamente la opción C.2 (vinculada a buenas prácticas laborales/MTPE) y no la C.1 (SA 8000), no es legalmente válido evaluar un certificado SA 8000 bajo la práctica C.2.",
  "recordar": "Si la Entidad seleccionó en sus bases integradas únicamente la opción C.2 (vinculada a buenas prácticas laborales/MTPE) y no la C.1 (SA 8000), no es legalmente válido evaluar un certificado SA 8000 bajo la práctica C.2.",
  "precision": ""
 },
 {
  "caso": 355,
  "seccion": "3.1",
  "resolucion": "Resolución 7783-2026-TCP-S2",
  "cuestionamiento": "Se impugnó la asignación de 4 puntos en sostenibilidad social a un consorcio porque una de las empresas certificadoras no estaba acreditada y la otra poseía certificación para laboratorios farmacéuticos (GLP), mas no para el sector construcción.",
  "resolvio": "El Tribunal declaró fundado el cuestionamiento y revocó los 4 puntos. Explicó que las certificaciones de buenas prácticas laborales dictadas por organismos evaluadores deben corresponder estrictamente al sector económico u operativo del objeto contractual (construcción de obras), no siendo válidos certificados emitidos para actividades disímiles como la industria farmacéutica.",
  "recordar": "Explicó que las certificaciones de buenas prácticas laborales dictadas por organismos evaluadores deben corresponder estrictamente al sector económico u operativo del objeto contractual (construcción de obras), no siendo válidos certificados emitidos para actividades disímiles como la industria farmacéutica.",
  "precision": ""
 },
 {
  "caso": 356,
  "seccion": "3.1",
  "resolucion": "Resolución 8323-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó el puntaje del adjudicatario por adjuntar únicamente la constancia del registro de empresa promocional sin anexar la planilla electrónica del mes anterior.",
  "resolvio": "El Tribunal revocó el puntaje asignado. Precisó que para asignar puntaje por Sostenibilidad Social a favor de personas con discapacidad, es obligatorio presentar conjuntamente el certificado de registro y la planilla electrónica que demuestre la contratación efectiva del personal en el porcentaje exigido.",
  "recordar": "Precisó que para asignar puntaje por Sostenibilidad Social a favor de personas con discapacidad, es obligatorio presentar conjuntamente el certificado de registro y la planilla electrónica que demuestre la contratación efectiva del personal en el porcentaje exigido.",
  "precision": ""
 },
 {
  "caso": 357,
  "seccion": "3.1",
  "resolucion": "Resolución 8644-2026-TCP-S6",
  "cuestionamiento": "Las bases integradas fijaron una escala de 5 puntos para el \"Reconocimiento del MTPE\" y 2 puntos para \"otro tipo de certificaciones\". El comité le otorgó 5 puntos al adjudicatario pese a que presentó una certificación privada de buenas prácticas.",
  "resolvio": "El Tribunal confirmó que otorgar el puntaje máximo (5 puntos) a un documento distinto al Reconocimiento expedido por el MTPE infringía la regla de puntuación explícitamente contenida en la tabla de evaluación de las bases integradas. En consecuencia, corrigió la evaluación asignándole únicamente 2 puntos y reordenó la prelación.",
  "recordar": "En consecuencia, corrigió la evaluación asignándole únicamente 2 puntos y reordenó la prelación. 3.1.3. Sostenibilidad ambiental Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 358,
  "seccion": "3.1",
  "resolucion": "Resolución 7147-2025-TCP-S1",
  "cuestionamiento": "En la evaluación del factor \"Sostenibilidad Ambiental\", el impugnante cuestionó el certificado ISO 14001 presentado por el adjudicatario afirmando que, al ingresar el número a la página web del ente certificador privado, este no aparecía registrado.",
  "resolvio": "El Tribunal dispuso evaluar el factor considerando que, en virtud del principio de presunción de veracidad, los certificados presentados en copia simple se presumen válidos salvo que exista una prueba o informe fehaciente que demuestre su falsedad o invalidez expedido formalmente por la autoridad competente.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 359,
  "seccion": "3.1",
  "resolucion": "Resolución 8537-2025-TCP-S1",
  "cuestionamiento": "Se le denegaron los 5 puntos de Sostenibilidad Ambiental al postor bajo el mismo argumento: la dirección que figuraba en el Certificado ISO 14001 pertenecía a su planta/sede operativa y no al domicilio legal del Anexo Nº 1.",
  "resolvio": "El Tribunal le otorgó los 5 puntos. Fundamentó que las certificaciones ambientales evalúan los procesos de producción y gestión ambiental en el lugar donde se realiza la actividad operativa. Por lo tanto, es totalmente válido que la dirección del certificado ISO corresponda a la sede operativa donde se producen las alcantarillas, sin importar que su oficina legal esté en otra dirección.",
  "recordar": "Fundamentó que las certificaciones ambientales evalúan los procesos de producción y gestión ambiental en el lugar donde se realiza la actividad operativa.",
  "precision": ""
 },
 {
  "caso": 360,
  "seccion": "3.1",
  "resolucion": "Resolución 1580-2026-TCP-S5",
  "cuestionamiento": "Evaluaciones de los certificados del Sistema de Gestión Ambiental presentados por las empresas consorciadas.",
  "resolvio": "Validó el otorgamiento de puntaje al verificar que las certificaciones se encontraban vigentes a la presentación de ofertas y fueron emitidas por entes acreditados.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 361,
  "seccion": "3.1",
  "resolucion": "Resolución 2655-2026-TCP-S1",
  "cuestionamiento": "El Comité de Selección otorgó 0 puntos al postor impugnante en el factor de Sostenibilidad Ambiental. El Comité argumentó que, si bien el postor presentó un Certificado ISO 14001:2015 de Gestión Ambiental, en el texto del alcance no figuraba literalmente la frase \"mantenimiento vial\".",
  "resolvio": "El Tribunal determinó que exigirse una coincidencia hiperliteral del término \"mantenimiento vial\" constituía una interpretación restrictiva e injustificada de las bases integradas. Al verificar que el certificado abarcaba la ejecución, rehabilitación y construcción de infraestructura vial y carreteras, el Tribunal concluyó que cubría el objeto de la convocatoria. Por tanto, revocó la decisión del Comité y asignó los 5 puntos correspondientes.",
  "recordar": "El Tribunal determinó que exigirse una coincidencia hiperliteral del término \"mantenimiento vial\" constituía una interpretación restrictiva e injustificada de las bases integradas.",
  "precision": ""
 },
 {
  "caso": 362,
  "seccion": "3.1",
  "resolucion": "Resolución 3128-2026-TCP-S4",
  "cuestionamiento": "El impugnante cuestionó la asignación de 0 puntos en sostenibilidad ambiental, pues el comité adujo que la promesa formal de consorcio no detallaba explícitamente qué integrante ejecutaría las actividades ambientales.",
  "resolvio": "El Tribunal señaló que los consorcios asumen responsabilidad solidaria sobre la totalidad de la propuesta técnica y de las obligaciones ambientales asumidas. Sin embargo, al haber quedado descalificada la oferta del impugnante por presentar información inexacta en la experiencia de su profesional clave, careció de objeto modificar el puntaje de este factor. Fallo del Tribunal: Declaró infundado el extremo de otorgarle la buena pro, disponiendo la devolución de la garantía al impugnante.",
  "recordar": "Sin embargo, al haber quedado descalificada la oferta del impugnante por presentar información inexacta en la experiencia de su profesional clave, careció de objeto modificar el puntaje de este factor.",
  "precision": ""
 },
 {
  "caso": 363,
  "seccion": "3.1",
  "resolucion": "Resolución 3583-2026-TCP-S1",
  "cuestionamiento": "El impugnante reclamó los 5 puntos de sostenibilidad ambiental presentando un certificado ISO 14001 emitido a favor de un fabricante/proveedor tercero (Industrias Alimentarias R&R E.I.R.L.), argumentando que al ser comercializador/distribuidor era válido acreditar la línea de producción de su proveedor.",
  "resolvio": "El Tribunal declaró INfundado el recurso. Determinó que los factores de evaluación reconocen condiciones o prácticas inherentes al propio postor (o a los integrantes del consorcio) que asumirán la ejecución del contrato, no siendo válido usar certificaciones de terceros ajenos al procedimiento.",
  "recordar": "Determinó que los factores de evaluación reconocen condiciones o prácticas inherentes al propio postor (o a los integrantes del consorcio) que asumirán la ejecución del contrato, no siendo válido usar certificaciones de terceros ajenos al procedimiento.",
  "precision": ""
 },
 {
  "caso": 364,
  "seccion": "3.1",
  "resolucion": "Resolución 5398-2026-TCP-S6",
  "cuestionamiento": "El Consorcio Hospitalario Angaraes (impugnante 2) reclamó la asignación de 0 puntos en \"Sostenibilidad ambiental\". El comité le denegó el puntaje alegando que en la promesa formal de consorcio no se incluyó un texto explícito que indicara \"actividades de sostenibilidad ambiental\", pese a que las empresas consorciadas contaban con ISO 14001:2015 vigente y asumían la ejecución de la supervisión.",
  "resolvio": "El Tribunal precisó que el sistema de gestión ambiental ISO 14001 no constituye una actividad autónoma o aislada del objeto del contrato, sino una práctica de gestión transversal aplicable a la ejecución de las prestaciones asumidas. Dado que los integrantes con certificado ISO asumieron la ejecución directa del servicio, correspondía asignar los 10 puntos en Sostenibilidad Ambiental. Resultado del caso: Se declaró fundado el recurso del impugnante 2, otorgándole la buena pro.",
  "recordar": "El Tribunal precisó que el sistema de gestión ambiental ISO 14001 no constituye una actividad autónoma o aislada del objeto del contrato, sino una práctica de gestión transversal aplicable a la ejecución de las prestaciones asumidas.",
  "precision": ""
 },
 {
  "caso": 365,
  "seccion": "3.1",
  "resolucion": "Resolución 5569-2026-TCP-S1",
  "cuestionamiento": "Se objetó que el certificado ISO presentado correspondía a la actividad de \"ejecución de obras\" y no a \"consultoría de obra\".",
  "resolvio": "Dispuso que el comité evalúe técnicamente los alcances de la certificación respetando las reglas de las bases integradas.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 366,
  "seccion": "3.1",
  "resolucion": "Resolución 6485-2026-TCP-S1",
  "cuestionamiento": "Se pidió retirar el puntaje en Sostenibilidad Ambiental alegando que el ISO 14001 presentado abarcaba el alcance de \"indumentaria en general\" mientras que el objeto convocado era \"kits de abrigo\", además de existir diferencias entre la dirección del RUC y la del certificado ISO.",
  "resolvio": "El Tribunal mantuvo el puntaje. Fundamentó que: i) los kits de abrigo (mantas, buzos, prendas) están comprendidos dentro del concepto técnico de indumentaria; y ii) las bases no exigen que el domicilio fiscal del RNP/RUC coincida en una única dirección física con el taller o sede certificada en el ISO.",
  "recordar": "Fundamentó que: i) los kits de abrigo (mantas, buzos, prendas) están comprendidos dentro del concepto técnico de indumentaria; y ii) las bases no exigen que el domicilio fiscal del RNP/RUC coincida en una única dirección física con el taller o sede certificada en el ISO.",
  "precision": ""
 },
 {
  "caso": 367,
  "seccion": "3.1",
  "resolucion": "Resolución 6601-2026-TCP-S3",
  "cuestionamiento": "Se impugnó el puntaje de 5 puntos otorgado en Sostenibilidad Ambiental al consorcio impugnante, debido a que su certificado ISO 14001 señalaba que aplicaba para \"ejecución de obras\", pero las bases exigían que el alcance aplique tanto a \"servicios de consultoría de obra\" como a \"ejecución de obra\".",
  "resolvio": "El Tribunal resolvió que, al haberse fijado en las bases integradas la exigencia acumulativa de ambos alcances, el certificado que solo acredita uno de ellos no cumple con la regla, por lo que le descontó los 5 puntos.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 368,
  "seccion": "3.1",
  "resolucion": "Resolución 7783-2026-TCP-S2",
  "cuestionamiento": "Se cuestionó el otorgamiento de puntaje ambiental a un consorcio cuya promesa consignaba la frase genérica \"Ejecución de la obra...\" sin precisar qué consorciado asumiría la gestión ambiental.",
  "resolvio": "El Tribunal confirmó el puntaje otorgado (5 puntos). Estableció que en contratos de obra, la obligación contraída por ambos miembros de ejecutar integralmente la obra abarca legal y operativamente la ejecución de los componentes medioambientales. Por ende, basta que uno de los consorciados aporte el ISO 14001 válido para la actividad de construcción para otorgar el puntaje.",
  "recordar": "Por ende, basta que uno de los consorciados aporte el ISO 14001 válido para la actividad de construcción para otorgar el puntaje.",
  "precision": ""
 },
 {
  "caso": 369,
  "seccion": "3.1",
  "resolucion": "Resolución 8547-2026-TCP-S3",
  "cuestionamiento": "El Oficial de Compra le quitó los 5 puntos de este factor al postor porque al escanear el código QR del certificado ISO 14001 aparecía la palabra \"EXPIRED\".",
  "resolvio": "El Tribunal le devolvió los 5 puntos. Demostró que la lectura del código QR abría una búsqueda general donde la palabra \"Expired\" pertenecía a una tercera empresa, mientras que la verificación directa del certificado de la consorciada figuraba en estado \"ACTIVE\".",
  "recordar": "Demostró que la lectura del código QR abría una búsqueda general donde la palabra \"Expired\" pertenecía a una tercera empresa, mientras que la verificación directa del certificado de la consorciada figuraba en estado \"ACTIVE\".",
  "precision": ""
 },
 {
  "caso": 370,
  "seccion": "3.1",
  "resolucion": "Resolución 8986-2026-TCP-S1",
  "cuestionamiento": "VAESCO cuestionó el puntaje de sostenibilidad ambiental de AGUA AMAZONAS y de SANEAMIENTO BAGUA.",
  "resolvio": "No hubo decisión de fondo sobre esos factores. Ambos postores quedaron descalificados por experiencia del personal y la Sala consideró que recalcular el puntaje ambiental no modificaría su situación. No corresponde atribuir a este fallo aceptación o rechazo de los certificados ambientales cuestionados.",
  "recordar": "Ambos postores quedaron descalificados por experiencia del personal y la Sala consideró que recalcular el puntaje ambiental no modificaría su situación.",
  "precision": ""
 },
 {
  "caso": 371,
  "seccion": "3.1",
  "resolucion": "Resolución 4558-2025-TCP-S2",
  "cuestionamiento": "El impugnante cuestionó los 7 puntos asignados al adjudicatario en el factor \"Integridad\", aduciendo que su certificado ISO 37001:2016 consignaba la dirección de su sede en Jauja (Junín), mientras que el taller/oficina para la prestación del servicio se ubicaba en Tarapoto.",
  "resolvio": "El Tribunal declaró infundado el recurso. Determinó que, al estar certificada la empresa en el alcance de mantenimiento y reparación de vehículos, el certificado resulta válido bajo el principio de presunción de veracidad y eficiencia, sin que el domicilio operativo secundario restrinja el otorgamiento del puntaje.",
  "recordar": "Determinó que, al estar certificada la empresa en el alcance de mantenimiento y reparación de vehículos, el certificado resulta válido bajo el principio de presunción de veracidad y eficiencia, sin que el domicilio operativo secundario restrinja el otorgamiento del puntaje.",
  "precision": ""
 },
 {
  "caso": 372,
  "seccion": "3.1",
  "resolucion": "Resolución 8537-2025-TCP-S1",
  "cuestionamiento": "El Oficial de Compras no le asignó puntaje al postor impugnante en el factor Integridad porque la dirección de la sede que figuraba en su certificado ISO 37001 (Jr. Arica s/n, La Convención) no coincidía textualmente con el domicilio legal administrativo que declaró en su Anexo Nº 1 (Av. Tomasa Tito Condemayta, Wanchaq).",
  "resolvio": "El Tribunal revocó la decisión de la entidad y otorgó los 5 puntos al postor. Explicó que el Anexo Nº 1 sirve para fijar el domicilio legal y de notificaciones procesales del postor. En cambio, el certificado ISO debe indicar la dirección de la sede, planta o filial operativa responsable de la ejecución o fabricación de los bienes. La normativa no exige coincidencia entre el domicilio legal administrativo del Anexo 1 y la sede operativa certificada en el ISO.",
  "recordar": "La normativa no exige coincidencia entre el domicilio legal administrativo del Anexo 1 y la sede operativa certificada en el ISO.",
  "precision": ""
 },
 {
  "caso": 373,
  "seccion": "3.1",
  "resolucion": "Resolución 1580-2026-TCP-S5",
  "cuestionamiento": "Acreditación del estándar Antisoborno mediante la norma ISO 37001:2016.",
  "resolvio": "El Tribunal ajustó los puntajes al comprobar que los certificados cumplían con las condiciones y alcances exigidos por las bases del proceso.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 374,
  "seccion": "3.1",
  "resolucion": "Resolución 2655-2026-TCP-S1",
  "cuestionamiento": "Se evaluó si correspondía la asignación de puntaje al impugnante por la presentación de la documentación destinada a acreditar las prácticas e instrumentos de integridad requeridos por las bases integradas.",
  "resolvio": "El Tribunal confirmó que la oferta cumplía con los medios de acreditación previstos en las bases, asignando formalmente los 5 puntos del factor.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 375,
  "seccion": "3.1",
  "resolucion": "Resolución 3503-2026-TCP-S3",
  "cuestionamiento": "De igual manera que en el factor anterior, el comité negó el puntaje en el factor de Integridad al estimar que el certificado ISO 37001 (Sistema de Gestión Antisoborno) no describía el alcance de \"servicio de habilitación de mercancías\".",
  "resolvio": "El Tribunal reiteró que las entidades no pueden exigir condiciones adicionales a las establecidas objetivamente en las bases integradas. Al haberse presentado el certificado ISO 37001 emitido por una entidad de certificación acreditada, dispuso otorgar los 5 puntos correspondientes y adjudicar la buena pro al impugnante.",
  "recordar": "El Tribunal reiteró que las entidades no pueden exigir condiciones adicionales a las establecidas objetivamente en las bases integradas.",
  "precision": ""
 },
 {
  "caso": 376,
  "seccion": "3.1",
  "resolucion": "Resolución 4323-2026-TCP-S5",
  "cuestionamiento": "El comité retiró los puntos al consorcio impugnante por haber presentado el certificado ISO 37001:2016. El postor alegó que a la fecha de presentación de ofertas la versión 2016 era plenamente válida y reconocida por el régimen oficial de transición de INACAL.",
  "resolvio": "El Tribunal declaró fundado este extremo. Determinó que no se puede desconocer la eficacia de certificaciones emitidas bajo la versión ISO 37001:2016 mientras se encuentren dentro del período de coexistencia y transición hacia la versión 2025 aprobado por la autoridad técnica (INACAL).",
  "recordar": "Determinó que no se puede desconocer la eficacia de certificaciones emitidas bajo la versión ISO 37001:2016 mientras se encuentren dentro del período de coexistencia y transición hacia la versión 2025 aprobado por la autoridad técnica (INACAL).",
  "precision": ""
 },
 {
  "caso": 377,
  "seccion": "3.1",
  "resolucion": "Resolución 4331-2026-TCP-S1",
  "cuestionamiento": "Se negó puntaje a NUTRICIÓN E INGENIERÍA ALIMENTARIA por presentar ISO 37001:2016, cuando las bases mencionaban la versión 2025.",
  "resolvio": "La Sala reconoció la coexistencia de versiones durante el período de transición examinado. El certificado 2016 seguía siendo válido en la fecha relevante del procedimiento y correspondía asignar los cinco puntos del factor. Con esa corrección el impugnante alcanzó 105 puntos y superó al adjudicatario, que conservó 101,50.",
  "recordar": "El certificado 2016 seguía siendo válido en la fecha relevante del procedimiento y correspondía asignar los cinco puntos del factor.",
  "precision": ""
 },
 {
  "caso": 378,
  "seccion": "3.1",
  "resolucion": "Resolución 4735-2026-TCP-S4",
  "cuestionamiento": "Se cuestionó la asignación de puntaje al adjudicatario por haber presentado una certificación bajo la versión actualizada ISO 37001:2026, cuando la literalidad de las bases requería la versión ISO 37001:2025.",
  "resolvio": "El Tribunal resolvió que la presentación de una versión actualizada vigente del estándar antisoborno cumple con la finalidad del factor de evaluación y no desnaturaliza la exigencia de las bases.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica. Alcance del caso. La denominación «ISO 37001:2026» figura en el relato disponible. Antes de utilizarla en otro procedimiento, comprueba la versión exigida y su identificación en la resolución.",
  "precision": ""
 },
 {
  "caso": 379,
  "seccion": "3.1",
  "resolucion": "Resolución 4780-2026-TCP-S4",
  "cuestionamiento": "El impugnante reclamó que se le asignó 0 puntos en \"Integridad\" por presentar un certificado ISO 37001:2016 vigente hasta el 2026, sosteniendo que dicha versión se encontraba dentro del período de transición dispuesto por INACAL y que las bases exigían ISO 37001:2025.",
  "resolvio": "El Tribunal declaró infundado el recurso. Resolvió que las bases integradas constituyen las reglas definitivas del proceso. Al haberse solicitado expresamente la versión ISO 37001:2025, la presentación de una versión distinta (2016) no se adecua a la exigencia fija del factor de evaluación.",
  "recordar": "Resolvió que las bases integradas constituyen las reglas definitivas del proceso.",
  "precision": ""
 },
 {
  "caso": 380,
  "seccion": "3.1",
  "resolucion": "Resolución 5431-2026-TCP-S3",
  "cuestionamiento": "Se solicitó retirar puntaje por presentar ISO 37001:2025 cuando las bases citaban ISO 37001:2016.",
  "resolvio": "La Sala validó la certificación durante la transición entre versiones y mantuvo el puntaje de integridad. No consideró que la sola diferencia de año obligara a descartarla en las circunstancias del procedimiento.",
  "recordar": "No consideró que la sola diferencia de año obligara a descartarla en las circunstancias del procedimiento.",
  "precision": ""
 },
 {
  "caso": 381,
  "seccion": "3.1",
  "resolucion": "Resolución 6044-2026-TCP-S3",
  "cuestionamiento": "El adjudicatario pretendió la descalificación del impugnante argumentando que la empresa que emitió el certificado ISO 37001 no tenía la representación legal de su casa matriz inscrita en la SUNARP.",
  "resolvio": "El Tribunal resolvió que los comités de selección no están facultados ni obligados a efectuar auditorías registrales sobre la personería de las certificadoras. En virtud del principio de presunción de veracidad, los certificados presentados son válidos salvo tacha de falsedad comprobada.",
  "recordar": "En virtud del principio de presunción de veracidad, los certificados presentados son válidos salvo tacha de falsedad comprobada.",
  "precision": ""
 },
 {
  "caso": 382,
  "seccion": "3.1",
  "resolucion": "Resolución 6085-2026-TCP-S5",
  "cuestionamiento": "Cuestionamiento sobre la asignación de puntaje por la presentación de certificado ISO 37001:2016 en un consorcio.",
  "resolvio": "El Tribunal confirmó que la coexistencia temporal entre las versiones 2016 y 2025 garantiza el derecho de los postores en proceso de migración, resultando amparable la asignación de puntaje.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 383,
  "seccion": "3.1",
  "resolucion": "Resolución 6127-2026-TCP-S1",
  "cuestionamiento": "Se objetó un ISO 37001:2016 frente a la referencia de las bases a la versión 2025.",
  "resolvio": "La Sala aceptó la certificación en el período de transición examinado y reconoció el puntaje correspondiente. La sola diferencia de versión no justificaba negar el factor en ese expediente.",
  "recordar": "La sola diferencia de versión no justificaba negar el factor en ese expediente.",
  "precision": ""
 },
 {
  "caso": 384,
  "seccion": "3.1",
  "resolucion": "Resolución 6485-2026-TCP-S1",
  "cuestionamiento": "El impugnante pretendió invalidad la acreditación del factor de integridad del adjudicatario manifestando que el Certificado ISO 37001 presentado correspondía a la versión 2016 y no a la versión 2025.",
  "resolvio": "El Tribunal declaró infundado el cuestionamiento. Explicó que la norma técnica internacional otorga un periodo de transición para la actualización de la certificación, durante el cual la versión 2016 mantiene plena validez jurídica y técnica.",
  "recordar": "Explicó que la norma técnica internacional otorga un periodo de transición para la actualización de la certificación, durante el cual la versión 2016 mantiene plena validez jurídica y técnica.",
  "precision": ""
 },
 {
  "caso": 385,
  "seccion": "3.1",
  "resolucion": "Resolución 6601-2026-TCP-S3",
  "cuestionamiento": "Denegatoria de 5 puntos por presentar ISO 37001:2016 en consultoría de obra.",
  "resolvio": "El Tribunal otorgó los 5 puntos al postor, ratificando la línea interpretativa de que la versión 2016 vigente dentro del régimen de transición satisface el factor de Integridad.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 386,
  "seccion": "3.1",
  "resolucion": "Resolución 7863-2026-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante cuestionó el puntaje de Integridad otorgado al adjudicatario, revelando que el certificado ISO 37001 presentado en su oferta pertenecía a una empresa tercera fabricante/distribuidora (Industrias Copsa EIRL), pretendiendo hacerla valer mediante una carta de autorización comercial.",
  "resolvio": "El Tribunal declaró fundado el cuestionamiento. Sentó como criterio que las certificaciones ISO son estrictamente personalísimas, pues se emiten tras auditar los procesos internos y matrices de riesgo de una persona jurídica específica. Un certificado ISO no puede transferirse ni acreditarse mediante cartas de representación o autorizaciones de comercialización. En consecuencia, revocó la buena pro y se la otorgó al postor impugnante.",
  "recordar": "Un certificado ISO no puede transferirse ni acreditarse mediante cartas de representación o autorizaciones de comercialización.",
  "precision": ""
 },
 {
  "caso": 387,
  "seccion": "3.1",
  "resolucion": "Resolución 7863-2026-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "El comité no le otorgó los 5 puntos del factor \"Integridad en la contratación pública\" al impugnante porque presentó un certificado de Sistema de Gestión Antisoborno bajo la norma ISO 37001:2016, pese a que las bases integradas citaban textualmente la versión ISO 37001:2025.",
  "resolvio": "El Tribunal (por mayoría) declaró fundado el recurso del impugnante. Fundamentó su decisión en las directrices técnicas del International Accreditation Forum (documento IAF MD 30:2025) y en comunicados del INACAL, los cuales establecen un periodo de transición de 2 años (hasta el 28 de febrero de 2027) donde coexisten y mantienen plena validez técnica y legal tanto la versión 2016 como la 2025. Desestimar una certificación vigente en pleno periodo de transición por una mera diferencia en el año de versión constituye un rigorismo formalista que desnaturaliza la finalidad de evaluar estándares antisoborno. Se le otorgaron los 5 puntos al impugnante.",
  "recordar": "Fundamentó su decisión en las directrices técnicas del International Accreditation Forum (documento IAF MD 30:2025) y en comunicados del INACAL, los cuales establecen un periodo de transición de 2 años (hasta el 28 de febrero de 2027) donde coexisten y mantienen plena validez técnica y legal tanto la versión 2016 como la 2025.",
  "precision": ""
 },
 {
  "caso": 388,
  "seccion": "3.1",
  "resolucion": "Resolución 7969-2026-TCP-S3",
  "cuestionamiento": "Se pidió retirar los cinco puntos de integridad del adjudicatario por acreditar ISO 37001:2016 cuando las bases citaban la versión 2025.",
  "resolvio": "La mayoría mantuvo los cinco puntos al reconocer la validez de la versión 2016 durante la transición. Hubo voto en discordia que proponía aplicar literalmente la versión exigida, retirar los puntos y otorgar la buena pro al otro postor. Esa posición discrepante no fue la decisión adoptada por la Sala.",
  "recordar": "Hubo voto en discordia que proponía aplicar literalmente la versión exigida, retirar los puntos y otorgar la buena pro al otro postor.",
  "precision": ""
 },
 {
  "caso": 389,
  "seccion": "3.1",
  "resolucion": "Resolución 8509-2026-TCP-S2",
  "cuestionamiento": "Se cuestionaron los certificados ISO 37001:2025 de los integrantes del adjudicatario por diferencias de logos y por información de las acreditadoras.",
  "resolvio": "La Sala examinó las certificaciones y la acreditación correspondiente y mantuvo los cinco puntos. Las variaciones gráficas y la información consultada no bastaban para invalidar esos certificados. Ambos correspondían a la versión 2025: este extremo no fue un caso de aceptación de ISO 2016 frente a bases 2025.",
  "recordar": "Ambos correspondían a la versión 2025: este extremo no fue un caso de aceptación de ISO 2016 frente a bases 2025.",
  "precision": ""
 },
 {
  "caso": 390,
  "seccion": "3.1",
  "resolucion": "Resolución 8701-2026-TCP-S1",
  "cuestionamiento": "Se impugnó la evaluación del adjudicatario por inconsistencias en el alcance de sus certificaciones de integridad.",
  "resolvio": "El Tribunal descalificó al adjudicatario y otorgó la buena pro al impugnante.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": "La fuente refiere un resultado general, pero no detalla el certificado observado, el puntaje exacto o la fundamentación específica de este extremo. No permite reconstruir una explicación más precisa sin la resolución original."
 },
 {
  "caso": 391,
  "seccion": "3.1",
  "resolucion": "Resolución 8986-2026-TCP-S1",
  "cuestionamiento": "AGUA AMAZONAS pidió puntaje de integridad por certificados ISO 37001:2025, frente a bases que citaban la versión 2016.",
  "resolvio": "La Sala reconoció la certificación y otorgó diez puntos en este factor. Sin embargo, el mismo consorcio quedó después descalificado por la experiencia de su especialista electromecánico. Obtener puntaje en un factor no subsanaba un incumplimiento independiente de calificación.",
  "recordar": "Sin embargo, el mismo consorcio quedó después descalificado por la experiencia de su especialista electromecánico.",
  "precision": ""
 },
 {
  "caso": 392,
  "seccion": "3.1",
  "resolucion": "Resolución 9005-2026-TCP-S4",
  "cuestionamiento": "Se cuestionó el puntaje otorgado en Integridad al postor adjudicatario porque el alcance del servicio descrito en su certificado ISO 37001 no guardaba relación con las prestaciones del concurso público convocado.",
  "resolvio": "El Tribunal declaró fundado el extremo y retiró los 5 puntos al adjudicatario. Resolvió que no es posible realizar inferencias no escritas: si los procesos certificados no cubren el alcance específico del servicio contratado, no corresponde otorgar el puntaje.",
  "recordar": "Resolvió que no es posible realizar inferencias no escritas: si los procesos certificados no cubren el alcance específico del servicio contratado, no corresponde otorgar el puntaje. 3.1.5. Garantía comercial del postor Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 393,
  "seccion": "3.1",
  "resolucion": "Resolución 6994-2025-TCP-S2",
  "cuestionamiento": "El adjudicatario obtuvo 35 puntos en el factor de garantía comercial adjuntando una declaración jurada donde ofrecía 5 años de garantía, pero referida a vehículos de un ítem completamente distinto al cual postulaba.",
  "resolvio": "El Tribunal confirmó que correspondió retirar el puntaje de 35 puntos. La garantía comercial ofertada debe corresponder inequívocamente al bien o ítem por el cual se compite.",
  "recordar": "La garantía comercial ofertada debe corresponder inequívocamente al bien o ítem por el cual se compite.",
  "precision": ""
 },
 {
  "caso": 394,
  "seccion": "3.1",
  "resolucion": "Resolución 7404-2025-TCP-S4",
  "cuestionamiento": "El adjudicatario solicitó que se reste puntaje o descalifique la oferta del impugnante, argumentando que en su declaración jurada ofertó 38 meses de garantía comercial, pero no detalló de manera expresa cláusulas de cobertura como \"bien nuevo\", \"mano de obra\" o \"reemplazo por empaque dañado\".",
  "resolvio": "El Tribunal declaró infundado el cuestionamiento y mantuvo el puntaje de 30 puntos al impugnante. Aclaró que la garantía comercial es un factor facultativo de evaluación cuyo único parámetro de puntuación es el tiempo ofertado que supere el mínimo exigido, sin que sea obligatorio detallar coberturas que no han sido estructuradas como criterio de asignación de puntos en las bases.",
  "recordar": "Aclaró que la garantía comercial es un factor facultativo de evaluación cuyo único parámetro de puntuación es el tiempo ofertado que supere el mínimo exigido, sin que sea obligatorio detallar coberturas que no han sido estructuradas como criterio de asignación de puntos en las bases.",
  "precision": ""
 },
 {
  "caso": 395,
  "seccion": "3.1",
  "resolucion": "Resolución 7822-2025-TCP-S1",
  "cuestionamiento": "El impugnante pretendía que se retire el puntaje asignado a sus competidores sosteniendo que las declaraciones juradas de garantía comercial presentadas por estos contenían pequeñas imprecisiones en su redacción formal.",
  "resolvio": "El Tribunal declaró infundado el recurso. Ratificó que los errores u omisiones de carácter puramente formal que no generen duda razonable sobre la voluntad del postor ni sobre el plazo de tiempo comprometido no justifican la quita de puntaje.",
  "recordar": "Ratificó que los errores u omisiones de carácter puramente formal que no generen duda razonable sobre la voluntad del postor ni sobre el plazo de tiempo comprometido no justifican la quita de puntaje.",
  "precision": ""
 },
 {
  "caso": 396,
  "seccion": "3.1",
  "resolucion": "Resolución 7989-2025-TCP-S5",
  "cuestionamiento": "El comité le quitó el puntaje al impugnante porque este presentó una garantía indicando que cubría determinado tiempo u \"operación ilimitada\" bajo la frase \"lo que ocurra primero\". El comité alegó que dicha frase generaba ambigüedad sobre el plazo.",
  "resolvio": "El Tribunal declaró fundado el recurso y ordenó restituir el puntaje. Explicó que en el mercado de maquinaria y vehículos pesados, ofertar \"uso o kilometraje ilimitado\" implica que el postor no pone restricciones de uso, siendo el plazo de tiempo el único límite, lo cual representa una ventaja y no un motivo de penalización.",
  "recordar": "Explicó que en el mercado de maquinaria y vehículos pesados, ofertar \"uso o kilometraje ilimitado\" implica que el postor no pone restricciones de uso, siendo el plazo de tiempo el único límite, lo cual representa una ventaja y no un motivo de penalización.",
  "precision": ""
 },
 {
  "caso": 397,
  "seccion": "3.1",
  "resolucion": "Resolución 5662-2026-TCP-S1",
  "cuestionamiento": "HORIZONS reclamó treinta puntos por ofrecer seis meses de garantía desde el día siguiente de culminado el servicio.",
  "resolvio": "Las fuentes coinciden en que la oferta no demostraba una ampliación efectiva respecto de la garantía mínima exigida. El documento 47 precisa que el requerimiento ya contemplaba seis meses obligatorios. Se mantuvieron cero puntos: para puntuar debía acreditarse el plazo adicional conforme a las bases.",
  "recordar": "El documento 47 precisa que el requerimiento ya contemplaba seis meses obligatorios.",
  "precision": ""
 },
 {
  "caso": 398,
  "seccion": "3.1",
  "resolucion": "Resolución 5768-2026-TCP-S2",
  "cuestionamiento": "El oficial de compras le asignó 0 puntos en garantía comercial al impugnante porque en su propuesta técnica incluyó dos documentos que indicaban plazos de garantía distintos y contradictorios entre sí.",
  "resolvio": "El Tribunal confirmó la asignación de 0 puntos. Sustentó que la responsabilidad de formular una oferta clara, coherente y libre de incongruencias recae exclusivamente en el postor, sin que la Entidad deba adivinar cuál de los plazos contradictorios fue el realmente querido.",
  "recordar": "Sustentó que la responsabilidad de formular una oferta clara, coherente y libre de incongruencias recae exclusivamente en el postor, sin que la Entidad deba adivinar cuál de los plazos contradictorios fue el realmente querido.",
  "precision": ""
 },
 {
  "caso": 399,
  "seccion": "3.1",
  "resolucion": "Resolución 6485-2026-TCP-S1",
  "cuestionamiento": "Se impugnó la asignación del puntaje máximo en garantía comercial (14 y 13 meses) alegando que la declaración jurada presentada no detalló la fecha exacta de inicio del cómputo ni reprodujo todas las cláusulas de reposición del requerimiento.",
  "resolvio": "El Tribunal ratificó el puntaje. Explicó que cuando las bases fijan que la garantía se califica exclusivamente en función del tiempo ofertado que supere el mínimo exigido (ej. ofertar más de 12 meses), el postor cumple acreditándolo mediante declaración jurada que indique el plazo ofertado (ej. 14 meses). El momento de inicio del cómputo (recepción del bien) es una condición contractual legalmente prefijada que no requiere ser reiterada en la propuesta.",
  "recordar": "Explicó que cuando las bases fijan que la garantía se califica exclusivamente en función del tiempo ofertado que supere el mínimo exigido (ej. ofertar más de 12 meses), el postor cumple acreditándolo mediante declaración jurada que indique el plazo ofertado (ej. 14 meses).",
  "precision": ""
 },
 {
  "caso": 400,
  "seccion": "3.1",
  "resolucion": "Resolución 6973-2026-TCP-S4",
  "cuestionamiento": "En la compra de motocicletas, el requerimiento técnico obligatorio exigía una garantía mínima \"sin límite de kilometraje\". El impugnante ofertó un plazo mayor (25 meses) para obtener puntaje adicional, pero en su declaración jurada omitió escribir la frase \"sin límite de kilometraje\", por lo que el comité le otorgó 0 puntos.",
  "resolvio": "El Tribunal declaró infundado el recurso y confirmó los 0 puntos. Determinó que la garantía comercial ofrecida como mejora facultativa debe mantener obligatoriamente las mismas condiciones estructurales del requerimiento técnico mínimo, por lo que al no garantizar expresamente el \"sin límite de kilometraje\", la mejora no resultaba puntuable.",
  "recordar": "Determinó que la garantía comercial ofrecida como mejora facultativa debe mantener obligatoriamente las mismas condiciones estructurales del requerimiento técnico mínimo, por lo que al no garantizar expresamente el \"sin límite de kilometraje\", la mejora no resultaba puntuable.",
  "precision": ""
 },
 {
  "caso": 401,
  "seccion": "3.1",
  "resolucion": "Resolución 8741-2026-TCP-S6",
  "cuestionamiento": "El comité otorgó 0 puntos al impugnante porque su declaración jurada señalaba que ofertaba \"36 meses de garantía contados a partir del día siguiente de la conformidad del servicio, conforme a lo establecido en los términos de referencia\". El comité argumentó que la frase final abría confusión con el plazo mínimo de 18 meses de los términos de referencia.",
  "resolvio": "El Tribunal declaró fundado este extremo y le asignó los 35 puntos. Explicó que la mención genérica a los términos de referencia no restringe ni anula la manifestación expresa de ofertar 36 meses, sino que debe entenderse como la aceptación de las condiciones generales de cobertura acordadas en el requerimiento.",
  "recordar": "Explicó que la mención genérica a los términos de referencia no restringe ni anula la manifestación expresa de ofertar 36 meses, sino que debe entenderse como la aceptación de las condiciones generales de cobertura acordadas en el requerimiento. 3.1.6. Sistema de gestión de la calidad Qué comprobar Identifica el certificado o documento, su alcance y la regla de acreditación discutida; distingue requisitos mínimos de factores de puntaje.",
  "precision": ""
 },
 {
  "caso": 402,
  "seccion": "3.1",
  "resolucion": "Resolución 4558-2025-TCP-S2",
  "cuestionamiento": "Cuestionamiento al otorgamiento de puntaje en el factor \"Sistema de gestión de la calidad\" porque el certificado ISO 9001 consignaba la sede de Jauja y no la localidad específica de ejecución del servicio.",
  "resolvio": "El Tribunal confirmó la validez del puntaje asignado, considerando que el sistema de gestión de calidad auditado abarcaba la actividad principal de la empresa y cumplía las condiciones de las bases.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 403,
  "seccion": "3.1",
  "resolucion": "Resolución 9089-2025-TCP-S1",
  "cuestionamiento": "El consorcio impugnante cuestionó los 10 puntos otorgados al adjudicatario en el factor \"Sistema de gestión de la calidad\" (ISO 9001:2015 con alcance en Gestión de Seguridad, Salud en el Trabajo y Medio Ambiente). Argumentó que, en el caso de consorcios, las bases establecían explícitamente que cada integrante que ejecutara actividades vinculadas al alcance del certificado debía acreditar la certificación correspondiente. Afirmó que uno de los consorciados del adjudicatario no acreditó contar con el certificado con el alcance exigido.",
  "resolvio": "El Tribunal declaró fundado este extremo del recurso, le retiró los 10 puntos al adjudicatario, revocó la buena pro otorgada a su favor y se la adjudicó al consorcio impugnante. El Tribunal explicó que cuando dos o más empresas forman un consorcio y asumen obligaciones de ejecución técnica, la regla de las bases exige que cada consorciado involucrado en dicha ejecución cuente individualmente con la certificación ISO requerida. Al verificarse que uno de los integrantes presentó un certificado sin el alcance correspondiente, no procedía otorgar el puntaje.",
  "recordar": "El Tribunal explicó que cuando dos o más empresas forman un consorcio y asumen obligaciones de ejecución técnica, la regla de las bases exige que cada consorciado involucrado en dicha ejecución cuente individualmente con la certificación ISO requerida.",
  "precision": ""
 },
 {
  "caso": 404,
  "seccion": "3.1",
  "resolucion": "Resolución 1580-2026-TCP-S5",
  "cuestionamiento": "Verificación del alcance de los certificados de calidad presentados por los postores.",
  "resolvio": "Se recalificó la propuesta técnica otorgando el puntaje correcto según los antecedentes del expediente.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": "La fuente refiere un resultado general, pero no detalla el certificado observado, el puntaje exacto o la fundamentación específica de este extremo. No permite reconstruir una explicación más precisa sin la resolución original."
 },
 {
  "caso": 405,
  "seccion": "3.1",
  "resolucion": "Resolución 2655-2026-TCP-S1",
  "cuestionamiento": "El comité de selección le otorgó solo 10 puntos (de 20 posibles) al impugnante en este factor. El comité argumentó que la certificación ISO 9001:2015 presentada por uno de los integrantes de su consorcio no acreditaba de forma específica el alcance para servicios de \"mantenimiento vial rutinario y/o periódico\".",
  "resolvio": "El Tribunal revisó el certificado ISO 9001:2015 expedido por la certificadora (UKS Egypt) obrante en la oferta. Se constató que el alcance de la certificación indicaba explícitamente: \"Mantenimiento... de infraestructura vial y urbana, vías locales, transitables, caminos departamentales o rurales, carreteras...\". Por lo tanto, la fundamentación del comité no correspondía a la realidad de los documentos. Fallo del Tribunal: Declaró fundado el recurso, corrigió la evaluación asignándole el puntaje máximo de 20 puntos en Gestión de Calidad, revocó la buena pro y se la otorgó al consorcio impugnante.",
  "recordar": "Por lo tanto, la fundamentación del comité no correspondía a la realidad de los documentos.",
  "precision": "Las fuentes refieren cero o diez puntos iniciales, pero coinciden en el resultado de veinte puntos."
 },
 {
  "caso": 406,
  "seccion": "3.1",
  "resolucion": "Resolución 3156-2026-TCP-S2 · Cuestionamiento 1",
  "cuestionamiento": "El comité de selección asignó 0 puntos al Consorcio impugnante en el factor \"Sistema de Gestión de la Calidad\". El motivo del comité fue que, al solicitársele subsanar la presentación del certificado ISO 9001:2015 (originalmente en idioma inglés), el postor adjuntó un certificado emitido directamente en idioma español por la misma certificadora, en lugar de presentar una traducción oficial firmada por traductor público juramentado o colegiado certificado.",
  "resolvio": "El Tribunal declaró fundado este extremo de la apelación. Explicó que el documento presentado durante la subsanación constituyó un certificado oficial emitido directamente en español por el mismo organismo certificador y con la misma fecha de emisión que el documento primigenio. Por lo tanto, exigir una traducción juramentada de un documento técnico cuyo original fue emitido oficialmente en español por la propia certificadora resultaba un formalismo irrazonable y contrario a los principios de eficacia y eficiencia. Se procedió a validar el certificado e incrementar el puntaje al impugnante.",
  "recordar": "Explicó que el documento presentado durante la subsanación constituyó un certificado oficial emitido directamente en español por el mismo organismo certificador y con la misma fecha de emisión que el documento primigenio.",
  "precision": ""
 },
 {
  "caso": 407,
  "seccion": "3.1",
  "resolucion": "Resolución 3156-2026-TCP-S2 · Cuestionamiento 2",
  "cuestionamiento": "El adjudicatario cuestionó la oferta del impugnante afirmando que su certificado ISO 9001:2015 solo hacía referencia al esquema internacional IAF (International Accreditation Forum), pero no demostró que el organismo acreditador fuera signatario de los Acuerdos de Reconocimiento Mutuo de ILAC o IAAC, tal como lo solicitaban literalmente las bases integradas.",
  "resolvio": "El Tribunal declaró INfundado el cuestionamiento del adjudicatario. Tras revisar la documentación en el expediente, el Colegiado concluyó que la certificación presentada por la empresa consorciada del impugnante cumplía con el respaldo técnico internacional exigido por la normativa y mantuvo la validación de los 20 puntos otorgados al impugnante en dicho factor.",
  "recordar": "Tras revisar la documentación en el expediente, el Colegiado concluyó que la certificación presentada por la empresa consorciada del impugnante cumplía con el respaldo técnico internacional exigido por la normativa y mantuvo la validación de los 20 puntos otorgados al impugnante en dicho factor.",
  "precision": ""
 },
 {
  "caso": 408,
  "seccion": "3.1",
  "resolucion": "Resolución 3407-2026-TCP-S2",
  "cuestionamiento": "El postor impugnante cuestionó que el comité de selección le asignara cero (0) puntos en el factor \"Sistema de gestión de la calidad\". Argumentó que presentó un certificado ISO 9001:2015 cuyo alcance comprendía servicios de asesoría, consultoría y patrocinio legal en general, materia arbitral, comercial y corporativa. Sostuvo que dicho alcance cubría sustancialmente los servicios específicos requeridos en las bases (patrocinio en cobranza judicial de laudos arbitrales, anulación de laudos y materia societaria), por lo que exigir una coincidencia literal de términos constituía una interpretación restrictiva e irrazonable.",
  "resolvio": "El Tribunal declaró infundado el recurso de apelación y confirmó la decisión del comité de no otorgarle puntaje. El Colegiado fundamentó que las bases integradas constituyen las reglas definitivas del proceso y son de estricto cumplimiento. Como el certificado ISO 9001:2015 del impugnante omitía dos de los servicios específicos exigidos expresamente en las bases, el comité no estaba facultado para interpretar, complementar o deducir el alcance del documento, debiendo evaluarse estrictamente al tenor de lo declarado. Se confirmó el otorgamiento de la buena pro al adjudicatario.",
  "recordar": "El Colegiado fundamentó que las bases integradas constituyen las reglas definitivas del proceso y son de estricto cumplimiento.",
  "precision": ""
 },
 {
  "caso": 409,
  "seccion": "3.1",
  "resolucion": "Resolución 4239-2026-TCP-S4",
  "cuestionamiento": "El impugnante cuestionó que el comité otorgara el puntaje máximo (15 puntos) al adjudicatario y al segundo lugar, mientras que le asignó 0 puntos a su oferta. Sostuvo que su certificado ISO cubría licenciamiento y correo en la nube, y que al ser \"partner autorizado\" existía una equivalencia técnica con el término \"Colaboración en la Nube\" solicitado en las bases.",
  "resolvio": "El Tribunal declaró infundado el recurso y ratificó las evaluaciones. Señaló que los certificados ISO del adjudicatario y del segundo lugar consignaban expresamente en sus alcances \"soluciones de nube\" y \"tecnologías de nube IAAS, PAAS, SAAS\", cumpliendo directamente con la regla de las bases. En cambio, el certificado del impugnante no hacía referencia a servicios de nube en su alcance, recordando que los evaluadores no están facultados para interpretar, integrar o admitir documentos extemporáneos que modifiquen el texto original de la oferta.",
  "recordar": "Señaló que los certificados ISO del adjudicatario y del segundo lugar consignaban expresamente en sus alcances \"soluciones de nube\" y \"tecnologías de nube IAAS, PAAS, SAAS\", cumpliendo directamente con la regla de las bases.",
  "precision": ""
 },
 {
  "caso": 410,
  "seccion": "3.1",
  "resolucion": "Resolución 4286-2026-TCP-S2",
  "cuestionamiento": "El impugnante reclamó que el comité le otorgó 0 puntos en el factor \"Gestión de calidad\", solicitando que se le reconozca el puntaje máximo (20 puntos) al haber presentado un certificado ISO vigente.",
  "resolvio": "El Tribunal amparó el reclamo y le asignó los 20 puntos al impugnante. Constató que el certificado ISO 9001:2025 presentado en su oferta contenía dentro de su alcance la supervisión y ejecución de obras civiles, edificaciones y mantenimiento vial, coincidiendo con el objeto de la licitación. En consecuencia, revocó la buena pro y se la otorgó al impugnante.",
  "recordar": "El Tribunal amparó el reclamo y le asignó los 20 puntos al impugnante.",
  "precision": ""
 },
 {
  "caso": 411,
  "seccion": "3.1",
  "resolucion": "Resolución 5518-2026-TCP-S4",
  "cuestionamiento": "ASSIS recibió cero puntos por un ISO 9001:2015 que consignaba una dirección en Cusco, aunque el servicio licitado se ejecutaría en Arequipa.",
  "resolvio": "La Sala examinó el alcance del certificado, que comprendía servicios de seguridad y vigilancia en el ámbito nacional. La dirección consignada no restringía esa cobertura a Cusco. Asignó diez puntos, con lo que ASSIS alcanzó 100 puntos técnicos y 105 totales, y obtuvo la buena pro frente a DEFENSA PRIVADA.",
  "recordar": "La dirección consignada no restringía esa cobertura a Cusco.",
  "precision": ""
 },
 {
  "caso": 412,
  "seccion": "3.1",
  "resolucion": "Resolución 5680-2026-TCP-S6",
  "cuestionamiento": "El impugnante cuestionó los 10 puntos del adjudicatario en \"Sistema de Gestión de la Calidad\", señalando que el certificado ISO 9001:2015 fue emitido por Americo Quality Standards Registech con la acreditadora UAF (United Accreditation Foundation), la cual no es miembro firmante de los Acuerdos de Reconocimiento Mutuo de ILAC o IAAC exigidos explícitamente en las bases.",
  "resolvio": "El Tribunal declaró fundado este extremo, le retiró los 10 puntos al adjudicatario y otorgó la buena pro al consorcio impugnante. Mediante informe oficial de INACAL, se confirmó que UAF es miembro de IAF pero NO es firmante de los acuerdos de reconocimiento de ILAC o IAAC. Al no cumplir la entidad acreditadora con la condición institucional requerida en las bases integradas, el certificado carecía de validez para el otorgamiento de puntaje.",
  "recordar": "Al no cumplir la entidad acreditadora con la condición institucional requerida en las bases integradas, el certificado carecía de validez para el otorgamiento de puntaje.",
  "precision": ""
 },
 {
  "caso": 413,
  "seccion": "3.1",
  "resolucion": "Resolución 7783-2026-TCP-S2",
  "cuestionamiento": "Se solicitó restar los 10 puntos del factor Gestión de Calidad al adjudicatario alegando indefinición en la promesa de consorcio.",
  "resolvio": "El Tribunal confirmó la asignación de los 10 puntos. Reiteró que la presentación del certificado ISO 9001 con alcance para la construcción por parte de un integrante del consorcio beneficia a la propuesta en su conjunto cuando ambos consorciados asumen la ejecución del contrato.",
  "recordar": "Reiteró que la presentación del certificado ISO 9001 con alcance para la construcción por parte de un integrante del consorcio beneficia a la propuesta en su conjunto cuando ambos consorciados asumen la ejecución del contrato.",
  "precision": ""
 },
 {
  "caso": 414,
  "seccion": "3.1",
  "resolucion": "Resolución 7785-2026-TCP-S2",
  "cuestionamiento": "El postor impugnante solicitó la revisión y asignación del máximo puntaje en el factor de evaluación de Gestión de Calidad.",
  "resolvio": "El Tribunal verificó los certificados de gestión de calidad (ISO) presentados en la oferta conforme a la Guía de Puntuación de las bases integradas y ordenó la reevaluación de las ofertas de los postores habilitados para determinar la asignación exacta de puntaje y el orden de prelación definitivo.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 415,
  "seccion": "3.1",
  "resolucion": "Resolución 8186-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó retirar el puntaje en Gestión de Calidad al adjudicatario sosteniendo que la Promesa de Consorcio no asignaba de forma individualizada el compromiso de calidad a la consorciada acreditante.",
  "resolvio": "El Tribunal declaró INfundado en este extremo el pedido. Constató que la empresa aportante del certificado asumió responsabilidades directas en la ejecución de la obra, por lo que el puntaje otorgado por la Entidad estuvo ajustado a derecho.",
  "recordar": "Constató que la empresa aportante del certificado asumió responsabilidades directas en la ejecución de la obra, por lo que el puntaje otorgado por la Entidad estuvo ajustado a derecho.",
  "precision": ""
 },
 {
  "caso": 416,
  "seccion": "3.1",
  "resolucion": "Resolución 8986-2026-TCP-S1",
  "cuestionamiento": "Se pidió retirar el puntaje de calidad de MOYOBAMBA por considerar vencido el ISO 9001:2015 de uno de sus integrantes al 19 de junio de 2026.",
  "resolvio": "La Sala comprobó que esa fecha correspondía al término de una versión y a la evaluación periódica, no al vencimiento del ciclo de certificación, vigente hasta el 19 de junio de 2028. A la presentación de ofertas el certificado estaba vigente. Mantuvo el puntaje de calidad.",
  "recordar": "Mantuvo el puntaje de calidad.",
  "precision": ""
 },
 {
  "caso": 417,
  "seccion": "3.1",
  "resolucion": "Resolución 9005-2026-TCP-S4",
  "cuestionamiento": "El impugnante exigió retirar los 5 puntos otorgados al adjudicatario en el Factor D (ISO 9001:2015), sosteniendo que su certificado indicaba \"alquiler de vehículos y transporte local\", pero no mencionaba expresamente ninguno de los procesos requeridos en las bases (control operativo, trazabilidad documentaria, seguimiento de entregas o atención de incidencias).",
  "resolvio": "El Tribunal determinó que para otorgar puntaje en este factor es indispensable que el alcance del certificado consigne de manera explícita y objetiva al menos uno de los procesos específicos exigidos en las bases. No es admisible realizar inferencias o asumir que el servicio de \"transporte local\" comprende internamente el control operativo o la trazabilidad. En consecuencia, el Tribunal descontó los 5 puntos al adjudicatario. Resultado Final: Tras descontar los 5 puntos, Kusa Perú S.A.C. obtuvo un puntaje total recalculado de 96.50 puntos, manteniéndose en el primer lugar del orden de prelación por encima del impugnante (95.73 puntos). Por ello, el Tribunal confirmó el otorgamiento de la buena pro a favor de Kusa Perú S.A.C..",
  "recordar": "El Tribunal determinó que para otorgar puntaje en este factor es indispensable que el alcance del certificado consigne de manera explícita y objetiva al menos uno de los procesos específicos exigidos en las bases. 3.1.7. Gestión de calidad del personal clave Qué comprobar Identifica el certificado o documento, su alcance y la regla de acreditación discutida; distingue requisitos mínimos de factores de puntaje.",
  "precision": ""
 },
 {
  "caso": 418,
  "seccion": "3.1",
  "resolucion": "Resolución 3034-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó el puntaje máximo en \"Gestión de la Calidad\" sosteniendo que adjuntó el certificado ISO 9001, pese a que no acreditó la herramienta o software digital exigido por las bases.",
  "resolvio": "El Tribunal confirmó la decisión de no otorgar el puntaje en el sub-componente tecnológico. Precisó que cuando el factor se desglosa en certificación ISO y uso verificado de plataformas digitales, el postor debe acreditar ambos extremos para acceder al puntaje total.",
  "recordar": "Precisó que cuando el factor se desglosa en certificación ISO y uso verificado de plataformas digitales, el postor debe acreditar ambos extremos para acceder al puntaje total.",
  "precision": ""
 },
 {
  "caso": 419,
  "seccion": "3.1",
  "resolucion": "Resolución 3512-2026-TCP-S3",
  "cuestionamiento": "El comité de selección asignó cero (0) puntos al postor AMC INGENIEROS S.A.C. (impugnante) en el factor \"Gestión de calidad\", argumentando que sus profesionales propuestos (Jefe de Supervisión y Especialista en Metrados y Valorizaciones) solo presentaron certificaciones en la metodología Lean Construction. Según el comité y la entidad, las bases exigían que cada profesional acreditara de manera acumulativa y obligatoria certificaciones en las tres materias mencionadas (Lean Construction, Six Sigma y Total Quality Management - TQM).",
  "resolvio": "El Tribunal revisó las bases integradas definitivas y concluyó que no se exigía la presentación acumulativa de las tres certificaciones, sino que estas se planteaban como alternativas elegibles (\"serán consideradas\"). El criterio fijado en las bases establecía que se otorgaría el puntaje máximo de 10 puntos si al menos el 30% del personal clave contaba con alguna de dichas certificaciones. Dado que 2 de los 4 profesionales del personal clave (es decir, el 50%) acreditaron la capacitación en Lean Construction, el impugnante superó el umbral del 30%, correspondiéndole de manera legítima la asignación de los 10 puntos.",
  "recordar": "El criterio fijado en las bases establecía que se otorgaría el puntaje máximo de 10 puntos si al menos el 30% del personal clave contaba con alguna de dichas certificaciones. 3.1.8. Disponibilidad de servicios y repuestos Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 420,
  "seccion": "3.1",
  "resolucion": "Resolución 4788-2025-TCP-S6",
  "cuestionamiento": "El postor impugnante (Gatt Perú S.R.L.) solicitó que se le asigne puntaje en este factor. El comité de selección no le otorgó puntaje (00 puntos) debido a que la declaración jurada que presentó para acreditar talleres en la región Arequipa carecía de la firma y el sello del representante legal. El impugnante alegaba que se trataba de un error involuntario y formal que debió ser solicitado para subsanación conforme al Reglamento.",
  "resolvio": "El Tribunal determinó que la falta de firma en una declaración jurada requerida para obtener puntaje en la evaluación técnica no es un defecto meramente accesorio o formal, sino que invalida el documento al no verificarse la voluntad del postor de asumir el compromiso. Al incidir directamente en el puntaje, afecta el contenido esencial de la oferta y su subsanación posterior vulneraría el principio de igualdad de trato. Por tanto, confirmó la decisión de no otorgarle puntaje. Mejoras a las especificaciones técnicas",
  "recordar": "El Tribunal determinó que la falta de firma en una declaración jurada requerida para obtener puntaje en la evaluación técnica no es un defecto meramente accesorio o formal, sino que invalida el documento al no verificarse la voluntad del postor de asumir el compromiso.",
  "precision": ""
 },
 {
  "caso": 421,
  "seccion": "3.1",
  "resolucion": "Resolución 4912-2026-TCP-S2",
  "cuestionamiento": "El Consorcio Maquinarias del Perú impugnó la evaluación de su propuesta técnica, debido a que el comité le asignó 0 puntos en este factor al considerar que su declaración jurada no precisaba la dirección exacta, RUC, ni teléfono del taller en Tacna.",
  "resolvio": "El Tribunal verificó que las bases integradas establecían expresamente que este factor se acreditaba únicamente mediante Declaración Jurada señalando la disponibilidad de talleres en la localidad, sin exigir el detalle de direcciones o licencias durante la etapa de evaluación de ofertas. Al haber cumplido estrictamente con la presentación de la declaración jurada requerida, el Tribunal concluyó que le correspondía la asignación del puntaje máximo de 20 puntos.",
  "recordar": "Al haber cumplido estrictamente con la presentación de la declaración jurada requerida, el Tribunal concluyó que le correspondía la asignación del puntaje máximo de 20 puntos. 3.1.9. Capacitación al personal de la entidad contratante Qué comprobar Registra materia, duración, emisor y persona capacitada; coteja esos datos con la exigencia discutida.",
  "precision": ""
 },
 {
  "caso": 422,
  "seccion": "3.1",
  "resolucion": "Resolución 5884-2025-TCP-S1",
  "cuestionamiento": "El impugnante reclamó que el comité no le otorgó puntaje a pesar de presentar la Declaración Jurada requerida en las bases. Asimismo, cuestionó que al adjudicatario se le asignó el puntaje máximo (15 puntos) habiendo ofertado solo 12 horas de capacitación.",
  "resolvio": "El Tribunal reestructuró el cuadro de evaluación. Respecto del adjudicatario, determinó que al haber ofertado 12 horas de capacitación le correspondía el tramo intermedio de puntaje y no el máximo, reduciendo su calificación. Respecto del impugnante, verificó si su Declaración Jurada cumplía o no con detallar los compromisos obligatorios exigidos por las bases integradas para asignarle o denegarle el puntaje correspondiente.",
  "recordar": "Respecto del adjudicatario, determinó que al haber ofertado 12 horas de capacitación le correspondía el tramo intermedio de puntaje y no el máximo, reduciendo su calificación.",
  "precision": ""
 },
 {
  "caso": 423,
  "seccion": "3.1",
  "resolucion": "Resolución 6354-2025-TCP-S4",
  "cuestionamiento": "El comité asignó 0 puntos en el factor de capacitación a la empresa PORTLAND STUDIO E.I.R.L. porque en su Declaración Jurada indicó que el capacitador propuesto contaba con \"amplia experiencia\", sin especificar de forma objetiva la cantidad exacta de años de experiencia (las bases exigían mínimo 1 año). El postor alegó que al declarar que se apegaba a las bases se debía dar por cumplido.",
  "resolvio": "El Tribunal declaró infundado el recurso y confirmó los 0 puntos. Remarcó que los factores de evaluación requieren declaraciones objetivas y precisas. La frase \"amplia experiencia\" es una apreciación subjetiva que no permite constatar con certeza el cumplimiento del parámetro de 1 año, y ni el comité ni el Tribunal están facultados para interpretar o adivinar la oferta del postor.",
  "recordar": "Remarcó que los factores de evaluación requieren declaraciones objetivas y precisas.",
  "precision": ""
 },
 {
  "caso": 424,
  "seccion": "3.1",
  "resolucion": "Resolución 6994-2025-TCP-S2",
  "cuestionamiento": "Las bases otorgaban puntaje a quien ofreciera capacitación para 8 participantes. El adjudicatario presentó en su oferta un compromiso de capacitación únicamente para 4 participantes, pero el comité de selección le otorgó el máximo puntaje de 20 puntos.",
  "resolvio": "El Tribunal determinó que el comité actuó de manera irregular al asignarle puntaje. Señaló que los factores de evaluación deben acreditarse respetando estrictamente los mínimos establecidos en las bases, no correspondiendo otorgar puntos si la oferta no cubre el número de participantes exigido.",
  "recordar": "Señaló que los factores de evaluación deben acreditarse respetando estrictamente los mínimos establecidos en las bases, no correspondiendo otorgar puntos si la oferta no cubre el número de participantes exigido.",
  "precision": ""
 },
 {
  "caso": 425,
  "seccion": "3.1",
  "resolucion": "Resolución 7144-2025-TCP-S1",
  "cuestionamiento": "El comité asignó 0 puntos al impugnante en el factor de capacitación porque en la Declaración Jurada presentada no especificó la cantidad de horas lectivas que brindaría. El postor aducía que su DJ se ajustaba al formato general de las bases.",
  "resolvio": "El Tribunal declaró infundado este extremo. Explicó que la metodología de asignación de puntaje estaba estructurada en tramos en función a la cantidad de horas ofertadas (ej. más de 8 horas = 10 puntos). Al haber omitido declarar la cantidad de horas en la DJ, no era posible determinar qué tramo de puntaje le correspondía.",
  "recordar": "Explicó que la metodología de asignación de puntaje estaba estructurada en tramos en función a la cantidad de horas ofertadas (ej. más de 8 horas = 10 puntos).",
  "precision": ""
 },
 {
  "caso": 426,
  "seccion": "3.1",
  "resolucion": "Resolución 7147-2025-TCP-S1",
  "cuestionamiento": "El Comité de Selección le otorgó cero (0) puntos al postor impugnante (United Products S.A.C.) argumentando que en su declaración jurada de capacitación no precisó el perfil profesional exacto ni el nombre del capacitador. El impugnante alegó que las bases no exigían identificar nominativamente al profesional en la propuesta, sino únicamente comprometer la capacitación mediante declaración jurada.",
  "resolvio": "El Tribunal analizó las bases integradas y confirmó que la acreditación de este factor se realizaba únicamente mediante la presentación de una declaración jurada. Las bases exigían que la capacitación estuviese a cargo de un especialista (ingeniero pesquero, zootecnista o biólogo), pero no requerían indicar el nombre ni la carrera exacta dentro de la declaración jurada de la oferta, sino presentarlo al momento de la adjudicación. Al haber ofertado siete (7) horas lectivas (superando el mínimo de 6 horas exigido), correspondía otorgarle los 15 puntos solicitados.",
  "recordar": "Las bases exigían que la capacitación estuviese a cargo de un especialista (ingeniero pesquero, zootecnista o biólogo), pero no requerían indicar el nombre ni la carrera exacta dentro de la declaración jurada de la oferta, sino presentarlo al momento de la adjudicación.",
  "precision": ""
 },
 {
  "caso": 427,
  "seccion": "3.1",
  "resolucion": "Resolución 2991-2026-TCP-S2 · Cuestionamiento 1",
  "cuestionamiento": "Se discutió la asignación de puntaje en la oferta de capacitación sobre buenas prácticas de almacenamiento e inocuidad alimentaria para el personal naval.",
  "resolvio": "El Tribunal resolvió que el otorgamiento de puntaje debe realizarse aplicando de forma estricta las escalas y rangos de horas lectivas establecidos objetivamente en la tabla de evaluación de las bases integradas.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 428,
  "seccion": "3.1",
  "resolucion": "Resolución 2991-2026-TCP-S2 · Cuestionamiento 2",
  "cuestionamiento": "El comité negó el puntaje al impugnante porque su Declaración Jurada no precisó con claridad el perfil del capacitador (no aclaró si era biólogo o ingeniero alimentario, ni si era bachiller o titulado) y tampoco asumió expresamente el compromiso de entregar certificados a los capacitados.",
  "resolvio": "El Tribunal confirmó la asignación de 0 puntos. Resolvió que para acrecer de puntaje facultativo, la Declaración Jurada debe contener los compromisos de forma expresa e indubitable conforme a las bases. Si existen perfiles alternativos u obligaciones accesorias (entregar constancias), el postor debe asumirlas expresamente en su declaración para permitir una evaluación objetiva.",
  "recordar": "Resolvió que para acrecer de puntaje facultativo, la Declaración Jurada debe contener los compromisos de forma expresa e indubitable conforme a las bases.",
  "precision": ""
 },
 {
  "caso": 429,
  "seccion": "3.1",
  "resolucion": "Resolución 4521-2026-TCP-S1",
  "cuestionamiento": "El impugnante reclamó puntaje en este factor sosteniendo que la \"Maestría en Gestión Pública\" de su capacitador era similar a la \"Maestría en Salud Pública\" requerida en las bases.",
  "resolvio": "El Tribunal desestimó la pretensión del impugnante. Determinó que una Maestría en Gestión Pública es de orientación administrativa general y no equivale ni posee vinculación material con el ámbito de la salud pública y nutricional requerida.",
  "recordar": "Determinó que una Maestría en Gestión Pública es de orientación administrativa general y no equivale ni posee vinculación material con el ámbito de la salud pública y nutricional requerida.",
  "precision": ""
 },
 {
  "caso": 430,
  "seccion": "3.1",
  "resolucion": "Resolución 5003-2026-TCP-S1",
  "cuestionamiento": "El comité también usó como fundamento para no admitir la oferta del postor la supuesta falta de detalle del perfil del capacitador.",
  "resolvio": "El Tribunal precisó que las contrataciones públicas se estructuran en etapas preclusivas y diferenciadas: Admisión, Calificación y Evaluación. El perfil del capacitador formaba parte de los factores de evaluación facultativos para la asignación de puntaje y no de las especificaciones técnicas obligatorias de admisión. Evaluar un factor de puntuación para rechazar la admisión de una propuesta vulnera las reglas del procedimiento. Fallo del Tribunal: Dispuso que el comité admita la oferta y proceda a calificarla y evaluarla conforme a ley.",
  "recordar": "El Tribunal precisó que las contrataciones públicas se estructuran en etapas preclusivas y diferenciadas: Admisión, Calificación y Evaluación. Resolución 5431-2026-TCP-S3 Este cuestionamiento y su respuesta se desarrollan en el caso guiado 3 del capítulo 3 de la parte I. Consulta allí la fuente y el efecto final. Consulta el caso guiado correspondiente. Ir al caso 3",
  "precision": ""
 },
 {
  "caso": 431,
  "seccion": "3.1",
  "resolucion": "Resolución 7243-2026-TCP-S6",
  "cuestionamiento": "El comité asignó 0 puntos al impugnante en la evaluación de los ítems 1 y 2 porque su Declaración Jurada de capacitación omitió precisar la cantidad de horas ofertadas. El postor sostenía que adjuntó un cronograma temático detallado con horarios específicos por módulo, lo cual permitía al comité sumar las horas totales mediante un cálculo aritmético.",
  "resolvio": "El Tribunal declaró infundado el recurso y confirmó los 0 puntos. Estableció que en los factores evaluados únicamente mediante Declaración Jurada, la indicación de las horas debe ser expresa y directa en el formato correspondiente. El comité no está obligado ni facultado para revisar documentos Anexos no requeridos ni realizar cálculos o inferencias para suplir la omisión del postor.",
  "recordar": "El comité no está obligado ni facultado para revisar documentos Anexos no requeridos ni realizar cálculos o inferencias para suplir la omisión del postor.",
  "precision": ""
 },
 {
  "caso": 432,
  "seccion": "3.1",
  "resolucion": "Resolución 7374-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó el puntaje otorgado al adjudicatario en el factor de capacitación debido a que las bases exigían ofertar \"más de 20 horas lectivas\" para acceder al puntaje máximo, pero en su oferta técnica registró exactamente \"20 horas\".",
  "resolvio": "El Tribunal aceptó el cuestionamiento y dispuso reevaluar el puntaje del adjudicatario. Se aclaró que la condición lógica \"más de 20 horas\" (>20 h) no se cumple ofertando exactamente 20 horas, por lo que no correspondía otorgarle el tramo de puntaje reservado a ofertas superiores.",
  "recordar": "Se aclaró que la condición lógica \"más de 20 horas\" (>20 h) no se cumple ofertando exactamente 20 horas, por lo que no correspondía otorgarle el tramo de puntaje reservado a ofertas superiores.",
  "precision": ""
 },
 {
  "caso": 433,
  "seccion": "3.1",
  "resolucion": "Resolución 8267-2026-TCP-S1",
  "cuestionamiento": "Múltiples cuestionamientos cruzados entre postores respecto a si sus declaraciones juradas de capacitación contenían todos los datos requeridos. Un postor indicó en su DJ que las materias se dictarían \"como mínimo\" y que el lugar exacto se fijaría \"previa coordinación\".",
  "resolvio": "El Tribunal recordó que, tras la absolución de la Consulta N° 4 incorporada a las bases integradas, se estableció un contenido mínimo y obligatorio que debía incluir la Declaración Jurada (horas, materias, lugar presencial exacto, datos del capacitador, profesión y experiencia). Aquellas ofertas cuyos textos en la DJ quedaron ambiguos o no consignaron de forma cerrada los datos exigidos no acumulan puntaje facultativo.",
  "recordar": "Aquellas ofertas cuyos textos en la DJ quedaron ambiguos o no consignaron de forma cerrada los datos exigidos no acumulan puntaje facultativo. 3.1.10. Mejoras a las especificaciones técnicas y a los términos de referencia Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 434,
  "seccion": "3.1",
  "resolucion": "Resolución 4788-2025-TCP-S6",
  "cuestionamiento": "El impugnante cuestionó que no se le haya otorgado puntaje por la Mejora 1 (\"Autorización de planta de fabricación, montaje y modificación de vehículos otorgada por PRODUCE\"). Para acreditarla, adjuntó una Resolución Directoral emitida por PRODUCE a favor de la empresa Inmetaro E.I.R.L..",
  "resolvio": "El Tribunal examinó la Resolución Directoral N° 133-2025-PRODUCE/DOPIG presentada y verificó que autorizaba explícitamente a la empresa Inmetaro E.I.R.L. a operar una planta para la fabricación y montaje de vehículos de transporte terrestre. Al cumplir objetivamente con lo exigido en las bases integradas, el Tribunal rectificó la evaluación y le asignó los 5 puntos correspondientes a dicha mejora.",
  "recordar": "Al cumplir objetivamente con lo exigido en las bases integradas, el Tribunal rectificó la evaluación y le asignó los 5 puntos correspondientes a dicha mejora.",
  "precision": ""
 },
 {
  "caso": 435,
  "seccion": "3.1",
  "resolucion": "Resolución 7670-2025-TCP-S3",
  "cuestionamiento": "El impugnante cuestionó los 20 puntos asignados al adjudicatario en la mejora referida al \"Acceso web al seguimiento de los envíos\". Argumentó que el adjudicatario presentó una carta indicando \"declaro y pongo de conocimiento\" en lugar de redactar explícitamente \"declaro bajo juramento\", lo que a su criterio restaba validez legal y no configuraba una declaración jurada.",
  "resolvio": "El Tribunal declaró infundado este extremo. Precisó que las bases integradas exigían acreditar la mejora únicamente mediante declaración jurada, pero no establecieron un formato estricto u obligatorio para dicho documento. El escrito presentado por el adjudicatario contenía la manifestación clara de su voluntad de comprometerse a brindar el acceso web (incluyendo la dirección URL de la plataforma), la firma y la fecha. En virtud de los principios de eficacia, simplicidad e informalismo, el Tribunal determinó que no se podía restar validez al documento por formalidades no esenciales, confirmando la asignación del puntaje.",
  "recordar": "Precisó que las bases integradas exigían acreditar la mejora únicamente mediante declaración jurada, pero no establecieron un formato estricto u obligatorio para dicho documento.",
  "precision": ""
 },
 {
  "caso": 436,
  "seccion": "3.1",
  "resolucion": "Resolución 2753-2026-TCP-S3",
  "cuestionamiento": "El impugnante (Peruanita E.I.R.L.) cuestionó la decisión del Comité de Selección de denegarle los 2 puntos correspondientes a la mejora por \"envasado automático\". El Comité justificó su decisión señalando que la frase \"envasado automático\" no figuraba explícitamente dibujada dentro del esquema gráfico o diagrama del flujograma de producción incluido en su Certificado de Inspección Técnico-Productivo. El impugnante argumentó que condicionar el puntaje a una exigencia gráfica no prevista en las bases ni en la norma sanitaria vulneraba los principios de transparencia y predictibilidad.",
  "resolvio": "El Tribunal declaró fundado este extremo. Determinó que no resultaba razonable ni legal exigir que la expresión \"envasado automático\" estuviera dentro del dibujo del diagrama, puesto que la información constaba de manera clara y expresa en la nota explicativa contenida en el mismo certificado expedido por el organismo acreditado. Por ende, otorgó los 2 puntos de mejora al impugnante, recalculó el puntaje y revocó la buena pro.",
  "recordar": "Determinó que no resultaba razonable ni legal exigir que la expresión \"envasado automático\" estuviera dentro del dibujo del diagrama, puesto que la información constaba de manera clara y expresa en la nota explicativa contenida en el mismo certificado expedido por el organismo acreditado.",
  "precision": ""
 },
 {
  "caso": 437,
  "seccion": "3.1",
  "resolucion": "Resolución 3583-2026-TCP-S1",
  "cuestionamiento": "El impugnante pretendió obtener los 5 puntos de mejora por el Sistema de Gestión de Calidad (ISO 9001) adjuntando el certificado del mismo fabricante tercero.",
  "resolvio": "El Tribunal confirmó la asignación de 0 puntos, reiterando la falta de correspondencia directa entre el titular del certificado de calidad y quien formula la oferta.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 438,
  "seccion": "3.1",
  "resolucion": "Resolución 4200-2026-TCP-S1",
  "cuestionamiento": "Se presentaron dos cuestionamientos independientes sobre la acreditación de la Mejora 1 (Camión grúa con capacidad mayor a 10 TN): El impugnante exigía 10 puntos adicionales afirmando que su camión grúa superaba las 10 TN según constancia del MTC. El impugnante cuestionó que se le otorgaran 10 puntos al adjudicatario, debido a que la Tarjeta de Identificación Vehicular SUNARP de su camión indicaba una carga útil de solo 5.290 TN.",
  "resolvio": "Respecto al impugnante: Declaró infundado su reclamo. El Tribunal evidenció contradicciones internas en la oferta del impugnante, pues la constancia MTC decía 15.4 TN, la promesa de alquiler decía 15 TN y el informe de inspección indicaba 36.7 TN. Dicha incongruencia documental impide determinar la capacidad real del equipo. Respecto al adjudicatario: Declaró fundado el cuestionamiento y le retiró los 10 puntos. La Entidad pretendía justificar que la grúa adaptada tenía mayor capacidad, pero el Tribunal remarcó que la Tarjeta de Identificación Vehicular emitida por SUNARP determina la capacidad legal y técnica útil del vehículo en su conjunto (5.290 TN). Al no superar las 10 TN, el adjudicatario perdió el puntaje, recomponiéndose el orden de prelación a favor del impugnante.",
  "recordar": "Dicha incongruencia documental impide determinar la capacidad real del equipo.",
  "precision": ""
 },
 {
  "caso": 439,
  "seccion": "3.1",
  "resolucion": "Resolución 5662-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó retirar los 20 puntos asignados al adjudicatario en la Mejora 1 (resolución de DTM de 3 metros). Afirmó que el informe técnico del adjudicatario presentaba contradicciones al describir la tecnología IRIS (que procesa e interpola múltiples fuentes de datos satelitales/radar con algoritmos de IA) en lugar de una captura directa de 3 metros, además de alegar inconsistencias en la proyección cartográfica.",
  "resolvio": "Con base en el informe técnico del Instituto Geográfico Nacional (IGN), el Tribunal estableció que las bases requerían presentar un informe técnico que especificara la fuente de datos, la resolución y la metodología, sin limitar la oferta a una sola fuente primaria ni prohibir metodologías avanzadas de procesamiento o combinación de datos geoespaciales. Comprobó que el adjudicatario acreditó técnicamente un tamaño de píxel de 3 metros (dentro del rango exigido de 1 a 4 metros). El Tribunal concluyó que las objeciones del impugnante pretendían imponer restricciones no contempladas en las bases integradas, declarando infundado este extremo.",
  "recordar": "Con base en el informe técnico del Instituto Geográfico Nacional (IGN), el Tribunal estableció que las bases requerían presentar un informe técnico que especificara la fuente de datos, la resolución y la metodología, sin limitar la oferta a una sola fuente primaria ni prohibir metodologías avanzadas de procesamiento o combinación de datos geoespaciales.",
  "precision": "Las fuentes describen de manera diferente el rango de resolución espacial de la mejora. El archivo 11 menciona «mayor a 5 metros» y el archivo 20 indica un rango de 1 a 4 metros. No se fija aquí una especificación única comprobada."
 },
 {
  "caso": 440,
  "seccion": "3.1",
  "resolucion": "Resolución 7089-2026-TCP-S3",
  "cuestionamiento": "El impugnante solicitó revocar la buena pro del adjudicatario y restarle 10 puntos en las \"Mejoras a las Especificaciones Técnicas\". Fundamentó que para acreditar el saneamiento ambiental contra polillas y hongos, el adjudicatario presentó el Certificado FUMINDEX N° 000342, el cual se encontraba vencido por más de 3 meses al momento de presentar la oferta (expiró el 5 de febrero de 2026 y la oferta se entregó el 15 de mayo de 2026).",
  "resolvio": "El Tribunal declaró fundado el recurso, retiró los 10 puntos al adjudicatario, revocó la buena pro y se la otorgó al impugnante. El Colegiado remarcó que la exigencia de vigencia en las certificaciones es una condición objetiva e insubsanable. Otorgar puntaje a un documento caducado contraviene los principios de evaluación objetiva e igualdad de trato. Al verificarse que la oferta del impugnante sí incluyó certificados y fichas técnicas vigentes con tratamiento específico para polillas y hongos, se reconfiguró el orden de prelación a su favor.",
  "recordar": "El Colegiado remarcó que la exigencia de vigencia en las certificaciones es una condición objetiva e insubsanable.",
  "precision": ""
 },
 {
  "caso": 441,
  "seccion": "3.1",
  "resolucion": "Resolución 7782-2026-TCP-S5",
  "cuestionamiento": "En el ítem 2, el comité otorgó 10 puntos a la Adjudicataria por ofrecer mejoras referidas a semillas certificadas. Los impugnantes sostuvieron que las bases exigían acreditar dicha mejora expresamente con el \"Informe de inspección de campo de multiplicación de semillas\", lo cual no fue cumplido técnicamente.",
  "resolvio": "El Tribunal examinó los informes presentados en la oferta y determinó que estos no acreditaban objetivamente las categorías de semillas exigidas en las bases para hacerse acreedor al puntaje de mejora. En consecuencia, declaró fundado el reclamo, retiró los 10 puntos a la Adjudicataria y corrigió su puntaje a cero (0) en dicho factor.",
  "recordar": "El Tribunal examinó los informes presentados en la oferta y determinó que estos no acreditaban objetivamente las categorías de semillas exigidas en las bases para hacerse acreedor al puntaje de mejora.",
  "precision": ""
 },
 {
  "caso": 442,
  "seccion": "3.1",
  "resolucion": "Resolución 7948-2026-TCP-S3",
  "cuestionamiento": "El impugnante cuestionó los 5 puntos otorgados al adjudicatario (ROBERLAC S.A.C.) en la Mejora 5 (\"Condición de Procesamiento\"), sosteniendo que su Certificado Técnico Productivo de Planta hacía referencia a una Resolución Directoral de DIGESA y que, con posterioridad a la emisión del certificado, se expidió una nueva resolución sanitaria, lo que supuestamente invalidaba el certificado de planta.",
  "resolvio": "El Tribunal precisó que las bases integradas únicamente exigían la presentación del Certificado Técnico Productivo de Planta para asignar los 5 puntos. No se estableció como regla que el certificado perdiera vigencia de forma automática por la emisión de una resolución sanitaria posterior ni que debiera tramitarse un nuevo certificado con cada renovación sanitaria. Al haberse verificado el cumplimiento estricto de los requisitos exigidos en las bases integradas, se confirmó el puntaje otorgado al adjudicatario y se declaró infundado el recurso.",
  "recordar": "El Tribunal precisó que las bases integradas únicamente exigían la presentación del Certificado Técnico Productivo de Planta para asignar los 5 puntos.",
  "precision": ""
 },
 {
  "caso": 443,
  "seccion": "3.1",
  "resolucion": "Resolución 8638-2026-TCP-S6",
  "cuestionamiento": "El comité de selección le retiró los 10 puntos de este factor al impugnante argumentando dos motivos: i) en 4 de sus 5 informes de inspección de campo emitidos por el SENASA figuraba la denominación \"Categoría Certificada – Generación Adicional\" en lugar de únicamente \"Categoría Certificada\"; y ii) existía discrepancia en la provincia de ubicación del predio entre la primera inspección (Anta) y la segunda inspección (Paucartambo).",
  "resolvio": "Respecto a la categoría: El Tribunal determinó que la \"Generación Adicional\" no constituye una categoría inferior ni distinta, sino una modalidad legal y formalmente autorizada dentro del régimen de certificación de semillas del SENASA (DS N° 024-2005-AG y RJ N° 166-2009-INIA) que cumple exactamente con los mismos parámetros de calidad y pureza. Respecto a la ubicación: Se verificó mediante confirmación oficial del SENASA que la discrepancia constituyó un error material de transcripción en el domicilio del productor durante la primera visita, manteniéndose invariable la identificación real del predio mediante su Código Único de Trazabilidad (CUS) registrado en Paucartambo. En aplicación del principio de verdad material, el Tribunal revocó la decisión del comité, le otorgó los 10 puntos de la mejora al impugnante, revocó la buena pro a la adjudicataria y se la otorgó a favor del impugnante.",
  "recordar": "Respecto a la categoría: El Tribunal determinó que la \"Generación Adicional\" no constituye una categoría inferior ni distinta, sino una modalidad legal y formalmente autorizada dentro del régimen de certificación de semillas del SENASA (DS N° 024-2005-AG y RJ N° 166-2009-INIA) que cumple exactamente con los mismos parámetros de calidad y pureza.",
  "precision": ""
 },
 {
  "caso": 444,
  "seccion": "3.1",
  "resolucion": "Resolución 8729-2026-TCP-S2",
  "cuestionamiento": "El impugnante solicitó la revocatoria de los puntos asignados al adjudicatario en las Mejoras 4 y 5 del factor \"Mejoras a las especificaciones técnicas\" (10 puntos cada una), sosteniendo que la documentación técnica e informes de inspección de planta presentados por dicho postor no acreditaban fehacientemente las condiciones exigidas en las bases integradas para beneficiarse con dicho puntaje.",
  "resolvio": "El Tribunal analizó minuciosamente el expediente de la oferta del adjudicatario y constató que los certificados presentados no demostraban de forma inequívoca el cumplimiento de los parámetros de mejora definidos en las bases integradas. En consecuencia, revocó los 10 puntos de la Mejora 4 y los 10 puntos de la Mejora 5 asignados al adjudicatario (restándole 20 puntos en total). Al recomponer el cuadro de evaluación, el impugnante pasó a ocupar el primer lugar en el orden de prelación, por lo que el Tribunal le otorgó la buena pro del procedimiento de selección.",
  "recordar": "El Tribunal analizó minuciosamente el expediente de la oferta del adjudicatario y constató que los certificados presentados no demostraban de forma inequívoca el cumplimiento de los parámetros de mejora definidos en las bases integradas. 3.1.11. Valores nutricionales Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 445,
  "seccion": "3.1",
  "resolucion": "Resolución 1053-2026-TCP-S6",
  "cuestionamiento": "El impugnante cuestionó la asignación del puntaje máximo al adjudicatario porque en su declaración jurada consignó valores expresados como \"mínimo 13.52 g\" de proteína y \"mínimo 361 Kcal\" de energía. Alegó que emplear la palabra \"mínimo\" introduce indeterminación sobre el valor real del producto y genera una ventaja indebida.",
  "resolvio": "El Tribunal confirmó el puntaje otorgado al adjudicatario. Razonó que en productos elaborados a base de granos agrícolas la composición nutricional puede variar naturalmente entre lotes por clima o cultivo, siendo razonable fijar un umbral mínimo. Además, como los valores mínimos garantizados por el postor (\"mínimo 13.52 g\" y \"mínimo 361 Kcal\") superaban holgadamente el tramo más alto requerido por las bases para obtener el máximo puntaje (13.20 g a más y 355.20 Kcal a más), no existía duda de su derecho a obtener los 15 puntos.",
  "recordar": "Además, como los valores mínimos garantizados por el postor (\"mínimo 13.52 g\" y \"mínimo 361 Kcal\") superaban holgadamente el tramo más alto requerido por las bases para obtener el máximo puntaje (13.20 g a más y 355.20 Kcal a más), no existía duda de su derecho a obtener los 15 puntos.",
  "precision": ""
 },
 {
  "caso": 446,
  "seccion": "3.1",
  "resolucion": "Resolución 4271-2026-TCP-S2 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante alegó que no correspondía otorgar puntaje al adjudicatario en el factor \"Valores nutricionales\" porque en su declaración jurada no precisó un valor exacto o numérico de calorías, sino que copió la frase de las bases: \"Energía (Kcal): Mayor a 350.00 Kcal\".",
  "resolvio": "El Tribunal confirmó los 15 puntos otorgados. Señaló que la expresión \"Mayor a 350.00 Kcal\" ubica objetivamente al producto dentro del tramo que las bases premiaban con el máximo puntaje (mayor de 350.00 Kcal = 15 puntos), sin que las reglas exigieran cifras decimales exactas para acceder a dicho beneficio.",
  "recordar": "Señaló que la expresión \"Mayor a 350.00 Kcal\" ubica objetivamente al producto dentro del tramo que las bases premiaban con el máximo puntaje (mayor de 350.00 Kcal = 15 puntos), sin que las reglas exigieran cifras decimales exactas para acceder a dicho beneficio.",
  "precision": ""
 },
 {
  "caso": 447,
  "seccion": "3.1",
  "resolucion": "Resolución 4271-2026-TCP-S2 · Cuestionamiento 2",
  "cuestionamiento": "Asignación indebida de puntaje técnico por respaldarse en certificados de inspección correspondientes a un producto distinto.",
  "resolvio": "Declaró fundado el recurso en este extremo. Se restó el puntaje técnico al adjudicatario, lo que alteró el orden de prelación, disponiendo otorgar la buena pro al impugnante.",
  "recordar": "Se restó el puntaje técnico al adjudicatario, lo que alteró el orden de prelación, disponiendo otorgar la buena pro al impugnante.",
  "precision": ""
 },
 {
  "caso": 448,
  "seccion": "3.1",
  "resolucion": "Resolución 8116-2026-TCP-S1",
  "cuestionamiento": "El impugnante alegó que a la declaración jurada de valores nutricionales del adjudicatario no le correspondía puntaje porque solo detalló el contenido de proteína ofertado (6.09% en leche y 13.01% en hojuelas), omitiendo listar los demás componentes fisicoquímicos previstos en las especificaciones técnicas.",
  "resolvio": "El Tribunal ratificó el puntaje otorgado. Fundamentó que las bases establecieron con claridad que este factor facultativo evaluaba de manera exclusiva la mejora del parámetro de proteína. Los demás requisitos nutricionales forman parte del requerimiento técnico mínimo (requisito de admisión) y se entienden jurados y aceptados integralmente mediante el Anexo N° 3, sin que fuera necesario repetirlos en la declaración del factor de evaluación.",
  "recordar": "Fundamentó que las bases establecieron con claridad que este factor facultativo evaluaba de manera exclusiva la mejora del parámetro de proteína.",
  "precision": ""
 },
 {
  "caso": 449,
  "seccion": "3.1",
  "resolucion": "Resolución 8725-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó retirar los 10 puntos en \"Valores nutricionales\" al adjudicatario porque en su declaración jurada consignó \"Mínimo 9.52%\" para proteínas y \"Mínimo 356.00 Kcal\" para energía.",
  "resolvio": "El Tribunal retiró los 10 puntos al adjudicatario. Explicó que, a diferencia de casos donde el valor mínimo declarado supera con amplitud el tramo máximo, en la estructura de estas bases el puntaje se asignaba en tramos específicos e inciertos si se usaban formulaciones ambiguas. Consignar la palabra \"Mínimo\" no permitió identificar con certeza el valor exacto ofertado para ubicarlo objetivamente en la escala de puntos.",
  "recordar": "Explicó que, a diferencia de casos donde el valor mínimo declarado supera con amplitud el tramo máximo, en la estructura de estas bases el puntaje se asignaba en tramos específicos e inciertos si se usaban formulaciones ambiguas.",
  "precision": ""
 },
 {
  "caso": 450,
  "seccion": "3.1",
  "resolucion": "Resolución 8893-2026-TCP-S6",
  "cuestionamiento": "El impugnante reclamó la asignación de cero (0) puntos en el factor \"Valores nutricionales - proteína\". Argumentó que presentó una declaración jurada garantizando un aporte de proteína >= 11% (lo que le daría 10 puntos) y que el comité no debió realizar cálculos matemáticos adicionales sobre la mezcla de sus insumos.",
  "resolvio": "El Tribunal confirmó los 0 puntos asignados al impugnante. Sostuvo que los valores nutricionales de un producto alimenticio forman un sistema técnico integral e interrelacionado. Al revisar la Declaración Jurada de Componentes Nacionales del postor, el comité detectó que invirtió las proporciones de los insumos principales (declaró 30% de avena y 21.52% de quinua, cuando las bases exigían 21.52% de avena y 30% de quinua). Al recalcular el aporte real de esa formulación alterada, el contenido proteico real alcanzaba únicamente 9.04%, valor que resulta insuficiente para llegar al umbral de 10.69% requerido para obtener puntaje. Asimismo, su informe de ensayo reveló un nivel de grasa de 1.50 g, por debajo del mínimo obligatorio de 4.64 g. El Tribunal concluyó que no se puede valorar una declaración jurada de manera aislada si los propios documentos de la oferta demuestran que el producto no alcanzará el valor nutricional declarado.",
  "recordar": "Al revisar la Declaración Jurada de Componentes Nacionales del postor, el comité detectó que invirtió las proporciones de los insumos principales (declaró 30% de avena y 21.52% de quinua, cuando las bases exigían 21.52% de avena y 30% de quinua). 3.1.12. Condiciones de procesamiento Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 451,
  "seccion": "3.1",
  "resolucion": "Resolución 7259-2025-TCP-S3",
  "cuestionamiento": "El impugnante alegó que no correspondía otorgar los 15 puntos máximos porque el adjudicatario presentó dos certificados técnico-productivos con porcentajes diferentes (99.36% en Arequipa y 98.72% en Lima).",
  "resolvio": "Declaró infundado el reclamo. El Tribunal confirmó que el comité de selección asignó el puntaje basándose en el certificado con 99.36%, el cual se ubicaba dentro del rango exigido por las bases para obtener el puntaje máximo (15 puntos).",
  "recordar": "El Tribunal confirmó que el comité de selección asignó el puntaje basándose en el certificado con 99.36%, el cual se ubicaba dentro del rango exigido por las bases para obtener el puntaje máximo (15 puntos).",
  "precision": ""
 },
 {
  "caso": 452,
  "seccion": "3.1",
  "resolucion": "Resolución 758-2026-TCP-S1",
  "cuestionamiento": "Se cuestionó la asignación de puntaje sosteniendo que en la resolución técnica no se mencionaba explícitamente el proceso de envasado automático.",
  "resolvio": "Declaró infundado el reclamo. En la parte resolutiva del documento expedido por la autoridad sanitaria constaba expresamente la habilitación de la \"Línea de mezclado y envasado de harinas y hojuelas crudas precocidas\", lo cual respaldaba la mejora.",
  "recordar": "En la parte resolutiva del documento expedido por la autoridad sanitaria constaba expresamente la habilitación de la \"Línea de mezclado y envasado de harinas y hojuelas crudas precocidas\", lo cual respaldaba la mejora.",
  "precision": ""
 },
 {
  "caso": 453,
  "seccion": "3.1",
  "resolucion": "Resolución 4271-2026-TCP-S2",
  "cuestionamiento": "El impugnante objetó los 15 puntos otorgados al adjudicatario en \"Condiciones de procesamiento\", señalando que el Certificado de Inspección de Buenas Prácticas de Manufactura (BPM) acreditaba una línea de producción de hojuelas que incluía el ingrediente \"Soya\", cuando el producto convocado en las bases no llevaba soya.",
  "resolvio": "El Tribunal revocó los 15 puntos asignados. Aclaró que para obtener puntaje en este factor de evaluación, el documento debe certificar las condiciones higiénico-sanitarias y de procesamiento del producto efectivamente solicitado. Al ampararse en una verificación de un producto con un ingrediente distinto (soya) que altera la formulación, el documento no resultó pertinente para el bien convocado. Se descontó el puntaje y se modificó el cuadro de evaluación.",
  "recordar": "Aclaró que para obtener puntaje en este factor de evaluación, el documento debe certificar las condiciones higiénico-sanitarias y de procesamiento del producto efectivamente solicitado.",
  "precision": ""
 },
 {
  "caso": 454,
  "seccion": "3.1",
  "resolucion": "Resolución 8725-2026-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó los 10 puntos en \"Condiciones de procesamiento\", señalando que el certificado de inspección del adjudicatario solo evaluó la fábrica y almacenes, omitiendo la etapa de transporte exigida por las bases.",
  "resolvio": "El Tribunal le retiró los 10 puntos al adjudicatario. Determinó que al no haber sido objeto de inspección el transporte, no se acreditó el cumplimiento integral del parámetro exigido.",
  "recordar": "Determinó que al no haber sido objeto de inspección el transporte, no se acreditó el cumplimiento integral del parámetro exigido. 3.1.13. Porcentajes de componentes Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. Sin cuestionamiento individualizado en las fuentes aportadas para esta materia. 3.1.14. Preferencia de los consumidores beneficiarios Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 455,
  "seccion": "3.1",
  "resolucion": "Resolución 7259-2025-TCP-S3",
  "cuestionamiento": "Se cuestionó el certificado de aceptabilidad presentado por no llevar impreso el símbolo/sello de acreditación del INACAL.",
  "resolvio": "Declaró infundado el cuestionamiento. Se concluyó que las bases solicitaban que el certificado fuera emitido por un laboratorio u organismo acreditado bajo la NTP-ISO 4121, condición que la empresa emisora cumplía formalmente, sin exigir que el sello tuviera que estar impreso físicamente en la hoja.",
  "recordar": "Se concluyó que las bases solicitaban que el certificado fuera emitido por un laboratorio u organismo acreditado bajo la NTP-ISO 4121, condición que la empresa emisora cumplía formalmente, sin exigir que el sello tuviera que estar impreso físicamente en la hoja.",
  "precision": ""
 },
 {
  "caso": 456,
  "seccion": "3.1",
  "resolucion": "Resolución 758-2026-TCP-S1",
  "cuestionamiento": "Se alegó la invalidez del certificado de aceptabilidad porque en el informe de ensayo adjunto figuraba como destinatario una razón social ligeramente variada.",
  "resolvio": "Declaró infundado el punto. El Tribunal determinó que se trató de un error de tipeo accesorio que no impedía identificar la veracidad del ensayo ni la validez del certificado.",
  "recordar": "El Tribunal determinó que se trató de un error de tipeo accesorio que no impedía identificar la veracidad del ensayo ni la validez del certificado.",
  "precision": ""
 },
 {
  "caso": 457,
  "seccion": "3.1",
  "resolucion": "Resolución 3466-2026-TCP-S1",
  "cuestionamiento": "El impugnante (Guemart Once Once E.I.R.L.) solicitó que se retiren los 15 puntos otorgados al adjudicatario (Industrias de Alimentos del Perú S.A.C.) por la prueba de aceptabilidad en Leche Evaporada Entera. Argumentó que la empresa emisora del certificado (CERTECC S.A.C.) contaba con acreditación ante INACAL únicamente para el tipo de ensayo de \"Análisis Sensorial\" (ISO 4121), pero no para realizar la \"Prueba de Aceptabilidad\" del producto específico \"Leche evaporada\".",
  "resolvio": "El Tribunal declaró fundado el recurso de apelación. Determinó que para considerar válido el certificado no basta con que el emisor sea un laboratorio acreditado en análisis sensorial de forma general, sino que se requiere estrictamente que el alcance oficial de la acreditación otorgada por INACAL comprenda el tipo de ensayo (\"Prueba de Aceptabilidad\") y el producto específico (\"Leche evaporada\"). Al no estar incluido dicho producto en el alcance de acreditación de la certificadora, el certificado carecía de validez. En consecuencia, le descontó los 15 puntos al adjudicatario, revocó la buena pro y la otorgó al impugnante.",
  "recordar": "Determinó que para considerar válido el certificado no basta con que el emisor sea un laboratorio acreditado en análisis sensorial de forma general, sino que se requiere estrictamente que el alcance oficial de la acreditación otorgada por INACAL comprenda el tipo de ensayo (\"Prueba de Aceptabilidad\") y el producto específico (\"Leche evaporada\").",
  "precision": ""
 },
 {
  "caso": 458,
  "seccion": "3.1",
  "resolucion": "Resolución 4187-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "El Comité de Selección le asignó 0 puntos al impugnante sosteniendo que su Certificado de Aceptabilidad registraba datos contradictorios: en la casilla de resultados individuales indicaba 95.45% para \"Me gusta mucho\" y 4.55% para \"Me gusta\", mientras que en el resumen de cálculo estadístico señalaba 100% en \"Me gusta mucho\".",
  "resolvio": "El Tribunal declaró fundado este extremo. Explicó que la diferencia obedecía a un criterio de sistematización de la tabla de calificación, en la que se agrupaban las opiniones positivas para determinar el nivel de aceptabilidad global (\"muy buena\"), lo que no generaba duda sobre la percepción favorable del producto. Por tanto, le asignó los 5 puntos correspondientes al impugnante.",
  "recordar": "Explicó que la diferencia obedecía a un criterio de sistematización de la tabla de calificación, en la que se agrupaban las opiniones positivas para determinar el nivel de aceptabilidad global (\"muy buena\"), lo que no generaba duda sobre la percepción favorable del producto.",
  "precision": ""
 },
 {
  "caso": 459,
  "seccion": "3.1",
  "resolucion": "Resolución 4187-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante cuestionó los 5 puntos asignados al adjudicatario alegando que el certificado emitido por ALICER PERÚ S.A.C. carecía de validez, puesto que dicha entidad no estaba acreditada ante INACAL para ejecutar evaluaciones sensoriales bajo la NTP-ISO 4121.",
  "resolvio": "El Tribunal declaró fundado este extremo. Tras verificar los registros de INACAL, constató que ALICER PERÚ S.A.C. únicamente estaba acreditada para inspecciones de características microbiológicas, mas no para evaluaciones sensoriales u organolépticas de aceptabilidad en alimentos. Por ende, le retiró los 5 puntos al adjudicatario, revocó la buena pro y la adjudicó al impugnante.",
  "recordar": "Tras verificar los registros de INACAL, constató que ALICER PERÚ S.A.C. únicamente estaba acreditada para inspecciones de características microbiológicas, mas no para evaluaciones sensoriales u organolépticas de aceptabilidad en alimentos.",
  "precision": ""
 },
 {
  "caso": 460,
  "seccion": "3.1",
  "resolucion": "Resolución 4331-2026-TCP-S1",
  "cuestionamiento": "Se pidió retirar los quince puntos de aceptabilidad de AGROINDUSTRIA PERLA HUASCARÁN alegando que el laboratorio CERTIPEZ no estaba acreditado para la prueba requerida.",
  "resolvio": "La Sala examinó el alcance de la acreditación del laboratorio y concluyó que el análisis sensorial u organoléptico comprendía la prueba de aceptabilidad del producto cuestionado. Mantuvo los quince puntos. La buena pro se revocó por el aumento del puntaje de su competidor en integridad, no por retirar estos puntos de aceptabilidad.",
  "recordar": "La Sala examinó el alcance de la acreditación del laboratorio y concluyó que el análisis sensorial u organoléptico comprendía la prueba de aceptabilidad del producto cuestionado.",
  "precision": ""
 },
 {
  "caso": 461,
  "seccion": "3.1",
  "resolucion": "Resolución 7392-2026-TCP-S1",
  "cuestionamiento": "Un postor cuestionó el puntaje otorgado a otro competidor (Nutrición e Ingeniería Alimentaria S.A.C.) en la prueba de aceptabilidad, alegando que la preparación utilizada en la degustación usó una proporción de insumos diferente a la ración alimenticia exacta fijada en las bases.",
  "resolvio": "El Tribunal declaró INfundado el cuestionamiento. Explicó que las bases integradas establecían que la preparación se efectuaba según las recomendaciones de cada fabricante respetando la mezcla del programa, sin fijar una fórmula obligatoria de ingredientes ni exigir que la prueba de degustación reprodujera de forma idéntica la formulación nutricional final del producto. Confirmó el puntaje otorgado y le adjudicó la buena pro.",
  "recordar": "Explicó que las bases integradas establecían que la preparación se efectuaba según las recomendaciones de cada fabricante respetando la mezcla del programa, sin fijar una fórmula obligatoria de ingredientes ni exigir que la prueba de degustación reprodujera de forma idéntica la formulación nutricional final del producto. 3.1.15. Experiencia adicional del postor en la especialidad Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 462,
  "seccion": "3.1",
  "resolucion": "Resolución 2618-2025-TCE-S6",
  "cuestionamiento": "El comité de selección descartó la 4ª y 7ª experiencia de consultoría presentadas por el impugnante al considerar que eran proyectos de \"saneamiento básico\" realizados en zona rural con componentes de \"pozo séptico\" o \"tanque séptico\" y \"zanja de filtración\". La Entidad alegó que al ser una consultoría urbana, las obras rurales no guardaban la misma complejidad técnica.",
  "resolvio": "El Tribunal estableció que las bases integradas definían como servicios similares las consultorías en \"líneas de agua potable\" y \"aguas residuales\", sin restringir la ubicación a zonas exclusivamente urbanas ni excluir sistemas de tratamiento como pozos o tanques sépticos. Conforme a la normativa y al Acuerdo de Sala Plena N° 002-2023/TCE, las entidades no pueden restringir experiencias por componentes específicos no prohibidos explícitamente en las bases. Fallo del Tribunal: Declaró fundado este extremo, validó las experiencias cuestionadas y le asignó el puntaje total de noventa (90) puntos.",
  "recordar": "El Tribunal estableció que las bases integradas definían como servicios similares las consultorías en \"líneas de agua potable\" y \"aguas residuales\", sin restringir la ubicación a zonas exclusivamente urbanas ni excluir sistemas de tratamiento como pozos o tanques sépticos.",
  "precision": ""
 },
 {
  "caso": 463,
  "seccion": "3.1",
  "resolucion": "Resolución 3441-2026-TCP-S6",
  "cuestionamiento": "El impugnante solicitó descontar del monto total acreditado el importe usado para el requisito de calificación antes de asignar puntaje adicional.",
  "resolvio": "Desestimó el reclamo señalando que la metodología de cálculo planteada por el impugnante no estaba prevista en las bases ni en las bases estándar, por lo que el puntaje debía asignarse sobre el monto total facturado según los rangos establecidos.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 464,
  "seccion": "3.1",
  "resolucion": "Resolución 6601-2026-TCP-S3",
  "cuestionamiento": "El adjudicatario solicitó recortar el puntaje asignado al impugnante en la experiencia adicional del postor (de 30 a 15 puntos), argumentando que al descalificarse una de sus obras, el monto facturado acumulado adicional disminuía.",
  "resolvio": "El Tribunal resolvió que el puntaje del factor de experiencia adicional se otorga de acuerdo al monto efectivamente validado. Al determinarse el nuevo monto acumulado, reajustó el puntaje al tramo que legalmente le correspondía.",
  "recordar": "Al determinarse el nuevo monto acumulado, reajustó el puntaje al tramo que legalmente le correspondía.",
  "precision": ""
 },
 {
  "caso": 465,
  "seccion": "3.1",
  "resolucion": "Resolución 6693-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó la revocación del puntaje otorgado al adjudicatario en experiencia adicional en la especialidad por supuestas deficiencias probatorias.",
  "resolvio": "El Tribunal validó los contratos y conformidades presentados para la evaluación técnica adicional, concluyendo que la calificación del factor se realizó conforme a los parámetros objetivos de las bases integradas.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 466,
  "seccion": "3.1",
  "resolucion": "Resolución 8520-2026-TCP-S6",
  "cuestionamiento": "El comité restó puntaje al postor Arrieta Niño en el factor \"Experiencia adicional del postor\", alegando que primero debía \"descontarse\" del monto facturado acumulado la cantidad que el postor ya había utilizado para cumplir el Requisito de Calificación.",
  "resolvio": "El Tribunal modificó la evaluación y ordenó asignar el puntaje al postor. Criterio sentado: Salvo que las bases integradas dispongan expresamente una regla de deducción o descarte previo, los rangos de monto facturado para otorgar puntaje en el factor de evaluación se miden sobre el total de la experiencia acreditada en la oferta técnica sin restar el monto aplicado al requisito de calificación.",
  "recordar": "Criterio sentado: Salvo que las bases integradas dispongan expresamente una regla de deducción o descarte previo, los rangos de monto facturado para otorgar puntaje en el factor de evaluación se miden sobre el total de la experiencia acreditada en la oferta técnica sin restar el monto aplicado al requisito de calificación.",
  "precision": ""
 },
 {
  "caso": 467,
  "seccion": "3.1",
  "resolucion": "Resolución 8914-2026-TCP-S5",
  "cuestionamiento": "El comité otorgó un puntaje reducido en el factor \"Experiencia Adicional del Postor en la Especialidad\" porque utilizó una fórmula no prevista en las bases para descontar o restar la experiencia que el postor ya había empleado previamente para cumplir el requisito obligatorio de calificación.",
  "resolvio": "El Tribunal declaró ilegal el accionar del comité y otorgó al impugnante el puntaje máximo de 50 puntos. Explicó que no existe ninguna norma en las contrataciones públicas ni regla en las bases que faculte a los evaluadores a descontar o sustraer la experiencia usada en la calificación al momento de evaluar la experiencia adicional.",
  "recordar": "Explicó que no existe ninguna norma en las contrataciones públicas ni regla en las bases que faculte a los evaluadores a descontar o sustraer la experiencia usada en la calificación al momento de evaluar la experiencia adicional. 3.1.16. Experiencia adicional del personal clave Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 468,
  "seccion": "3.1",
  "resolucion": "Resolución 7144-2025-TCP-S1",
  "cuestionamiento": "El comité le otorgó solo 5 de los 10 puntos posibles al impugnante en este factor porque consideró ilegibles o incompletos los nombres de los suscriptores en los certificados de su Especialista de Calidad.",
  "resolvio": "El Tribunal declaró fundado este extremo. Al revisar la documentación, verificó que del cuerpo de los certificados sí se apreciaban con claridad los nombres y apellidos de los emisores. Al haber demostrado que más del 80% del personal clave contaba con la experiencia adicional requerida, le otorgó los 10 puntos máximos en dicho factor.",
  "recordar": "Al revisar la documentación, verificó que del cuerpo de los certificados sí se apreciaban con claridad los nombres y apellidos de los emisores.",
  "precision": ""
 },
 {
  "caso": 469,
  "seccion": "3.1",
  "resolucion": "Resolución 7528-2025-TCP-S1",
  "cuestionamiento": "El comité de selección asignó 0 puntos en la evaluación técnica a la empresa impugnante (WILITOR S.A.C.) en el factor \"Experiencia en la especialidad adicional del personal clave\", al desestimar 3 de las 9 experiencias presentadas para el Residente de Obra. El impugnante sostuvo que, incluso sin considerar esas 3 experiencias, su profesional sumaba más de 48 meses acreditados, superando por más de un año el requisito de calificación (36 meses), por lo que correspondía otorgarle los 25 puntos máximos.",
  "resolvio": "El Tribunal realizó el reccomputo de los tiempos. Comprobó que al descontar los 399 días (13 meses y 9 días) de las 3 experiencias observadas, el Residente de Obra mantenía 48 meses y 18 días de experiencia válida, tiempo que sobrepasaba ampliamente el año adicional exigido sobre el requisito mínimo de calificación. Dado que el especialista en seguridad también acreditaba su tiempo adicional y juntos representaban más del 80% del personal clave, el Tribunal determinó que el comité cometió un error y asignó el puntaje máximo de 25 puntos en dicho factor.",
  "recordar": "Comprobó que al descontar los 399 días (13 meses y 9 días) de las 3 experiencias observadas, el Residente de Obra mantenía 48 meses y 18 días de experiencia válida, tiempo que sobrepasaba ampliamente el año adicional exigido sobre el requisito mínimo de calificación.",
  "precision": ""
 },
 {
  "caso": 470,
  "seccion": "3.1",
  "resolucion": "Resolución 7604-2025-TCP-S5",
  "cuestionamiento": "El comité de selección asignó únicamente 20 de 35 puntos al impugnante en este factor porque descartó la experiencia acreditada para el Especialista en Seguridad y Salud Ocupacional (Ing. Carlos Daniel Alvarado Briceño), sin detallar ni motivar en el acta las razones de dicha descalificación.",
  "resolvio": "El Tribunal determinó que el comité incurrió en una indebida motivación al no explicar la falta de validación. Al evaluar la documentación técnica del expediente, el Tribunal constató que los contratos y constancias presentados sí acreditaban el tiempo de experiencia adicional requerido por las bases. Por ello, declaró fundado el recurso en este extremo, corrigió el puntaje técnico del impugnante de 85 a 35 puntos (máximo posible en el factor) y elevó su puntaje técnico total a 100 puntos.",
  "recordar": "El Tribunal determinó que el comité incurrió en una indebida motivación al no explicar la falta de validación.",
  "precision": ""
 },
 {
  "caso": 471,
  "seccion": "3.1",
  "resolucion": "Resolución 7670-2025-TCP-S3",
  "cuestionamiento": "El postor impugnante sostuvo que el comité de selección le otorgó indebidamente 70 puntos al adjudicatario en el factor de evaluación facultativo \"Experiencia del personal clave\". Alegó que la \"Constancia de Trabajo\" presentada para el cargo de coordinador no acreditaba de manera fehaciente dicha experiencia y que el comité debió requerir contratos u otra documentación complementaria.",
  "resolvio": "El Tribunal declaró infundado el cuestionamiento del impugnante. Explicó que las bases integradas establecían claramente que la experiencia del personal clave podía acreditarse con cualquiera de los siguientes documentos: copia simple de contratos con su conformidad, constancias, certificados o cualquier otro documento fehaciente. Al haber presentado una constancia de trabajo emitida por su empleador que detallaba el nombre del personal, el cargo desempeñado, el periodo exacto (fecha de inicio y fin), el nombre de la organización y la firma del emisor, el adjudicatario cumplió estrictamente con lo exigido en las bases. Por lo tanto, no correspondía exigir documentos adicionales no contemplados en las reglas del proceso.",
  "recordar": "Explicó que las bases integradas establecían claramente que la experiencia del personal clave podía acreditarse con cualquiera de los siguientes documentos: copia simple de contratos con su conformidad, constancias, certificados o cualquier otro documento fehaciente.",
  "precision": ""
 },
 {
  "caso": 472,
  "seccion": "3.1",
  "resolucion": "Resolución 7712-2025-TCP-S6",
  "cuestionamiento": "El comité otorgó el máximo puntaje (35 puntos) al adjudicatario en el factor \"Experiencia adicional del personal clave\" por los certificados de un profesional que laboró como residente en \"atención de transitabilidad por huaycos y desastres\".",
  "resolvio": "El Tribunal descontó los 15 puntos indebidamente asignados al adjudicatario. Explicó que las labores de atención inmediata de emergencias viales por desastres naturales (limpieza de derrumbes/huaycos) no se enmarcan dentro de la tipología de obras o servicios de mantenimiento periódico, rutinario, construcción o rehabilitación de vías exigidas en las bases para otorgar puntaje de evaluación técnica especializada.",
  "recordar": "Explicó que las labores de atención inmediata de emergencias viales por desastres naturales (limpieza de derrumbes/huaycos) no se enmarcan dentro de la tipología de obras o servicios de mantenimiento periódico, rutinario, construcción o rehabilitación de vías exigidas en las bases para otorgar puntaje de evaluación técnica especializada.",
  "precision": ""
 },
 {
  "caso": 473,
  "seccion": "3.1",
  "resolucion": "Resolución 167-2026-TCP-S4",
  "cuestionamiento": "El comité denegó la asignación de puntaje adicional a un postor al calificar sus certificados de trabajo como \"no legibles\" en el área del sello y la firma del emisor.",
  "resolvio": "El Tribunal ordenó asignar el puntaje correspondientemente. Verificó mediante examen del expediente digital que los nombres, cargos y membretes de la empresa emisora sí resultaban perceptibles y verificables en su conjunto, por lo que no correspondía privar del puntaje al postor.",
  "recordar": "Verificó mediante examen del expediente digital que los nombres, cargos y membretes de la empresa emisora sí resultaban perceptibles y verificables en su conjunto, por lo que no correspondía privar del puntaje al postor.",
  "precision": ""
 },
 {
  "caso": 474,
  "seccion": "3.1",
  "resolucion": "Resolución 174-2026-TCP-S5",
  "cuestionamiento": "Un postor reclamó que se le otorguen 10 puntos (máximo puntaje) en lugar de 5 en el factor de experiencia adicional de su Especialista SSOMA, alegando sumar más de 2 años adicionales.",
  "resolvio": "El análisis del caso señala que el Tribunal mantuvo 5 puntos y no concedió los 10 puntos solicitados porque no se acreditó el tiempo adicional del tramo máximo. Sin embargo, consigna «1.12 años (37.4 meses)», equivalencia inconsistente. Se conserva el resultado reportado, pero no el cómputo como dato comprobado.",
  "recordar": "Sin embargo, consigna «1.12 años (37.4 meses)», equivalencia inconsistente.",
  "precision": ""
 },
 {
  "caso": 475,
  "seccion": "3.1",
  "resolucion": "Resolución 450-2026-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "Se pidió restar puntaje al adjudicatario en la experiencia adicional de su personal clave al detectar que acreditó trabajos ejecutados de forma simultánea en dos obras distintas durante las mismas fechas.",
  "resolvio": "El Tribunal declaró fundado el reclamo y restó el puntaje. Reiteró que en la evaluación técnica no se permite el doble cómputo de tiempos traslapados; por ende, al descontar los días duplicados por concomitancia, el profesional no alcanzaba los dos años adicionales requeridos.",
  "recordar": "Reiteró que en la evaluación técnica no se permite el doble cómputo de tiempos traslapados; por ende, al descontar los días duplicados por concomitancia, el profesional no alcanzaba los dos años adicionales requeridos.",
  "precision": ""
 },
 {
  "caso": 476,
  "seccion": "3.1",
  "resolucion": "Resolución 450-2026-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "Otorgamiento de puntaje por certificados de experiencia cuya antigüedad superaba el límite máximo de 25 años fijado en las bases integradas.",
  "resolvio": "Revocó el puntaje asignado, estableciendo que las reglas de antigüedad de la experiencia aplican tanto para los requisitos de calificación como para la asignación de puntaje adicional.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 477,
  "seccion": "3.1",
  "resolucion": "Resolución 1580-2026-TCP-S5",
  "cuestionamiento": "El comité no otorgó puntaje a un certificado que indicaba que el profesional laboraba \"desde el 02 de mayo de 2014 hasta la actualidad\", argumentando que no precisaba el día y mes de culminación.",
  "resolvio": "El Tribunal ordenó otorgar el puntaje máximo (50 puntos). Declaró que cuando un certificado indica \"hasta la actualidad\", la fecha cierta de culminación del periodo computable es la fecha de emisión suscrita en el propio documento, resultando válida para el cálculo del tiempo de experiencia.",
  "recordar": "El Tribunal ordenó otorgar el puntaje máximo (50 puntos).",
  "precision": ""
 },
 {
  "caso": 478,
  "seccion": "3.1",
  "resolucion": "Resolución 1675-2026-TCP-S3",
  "cuestionamiento": "El impugnante cuestionó el puntaje otorgado al personal clave del adjudicatario, argumentando que la experiencia debía contabilizarse únicamente a partir de la obtención del grado de bachiller.",
  "resolvio": "El Tribunal verificó que las bases integradas no establecieron expresamente que la experiencia adicional de dicho personal se computara obligatoriamente desde la obtención del grado académico de bachiller. En aplicación del principio de legalidad e intangibilidad de las bases, no cabe aplicar restricciones no previstas; por ende, confirmó el cómputo de la experiencia adquirida con anterioridad a dicho grado.",
  "recordar": "El Tribunal verificó que las bases integradas no establecieron expresamente que la experiencia adicional de dicho personal se computara obligatoriamente desde la obtención del grado académico de bachiller.",
  "precision": ""
 },
 {
  "caso": 479,
  "seccion": "3.1",
  "resolucion": "Resolución 3041-2026-TCP-S5",
  "cuestionamiento": "Se cuestionó la asignación de puntaje adicional por la experiencia de un Ingeniero Electricista, debido a que el certificado de trabajo presentado respaldaba labores ejecutadas con anterioridad a la fecha de emisión de su título profesional y colegiatura.",
  "resolvio": "El Tribunal retiró el puntaje otorgado en dicho factor. Explicó que la experiencia profesional en ingeniería se computa obligatoriamente a partir de la colegiatura o titulación, por lo que las prestaciones anteriores a dicho hito carecen de validez legal para el cómputo.",
  "recordar": "",
  "precision": ""
 },
 {
  "caso": 480,
  "seccion": "3.1",
  "resolucion": "Resolución 3128-2026-TCP-S4",
  "cuestionamiento": "El impugnante cuestionó que el comité no consideró un certificado de trabajo de su profesional clave (Señor Alex Renzo Bendezú Acero) debido a un error en el cómputo de días (consignaba que laboró del 09/01/2023 al 31/12/2023 figurando 296 días en lugar de 357 días). Sostuvo que se trataba de un error material tipográfico subsanable.",
  "resolvio": "El Tribunal analizó las bases integradas y la normativa sobre la fehaciencia de la documentación. No obstante, al revisar la oferta del adjudicatario por principio de unidad, detectó que el certificado presentado por este último (del 17 de agosto de 2017) contenía información inexacta sobre la fecha de inicio de labores del profesional. Asimismo, al fiscalizar los certificados del profesional del impugnante (certificados del 05/01/2022 y 30/12/2025), se evidenció que las fechas de ejecución no coincidían con la realidad del contrato, configurándose también información inexacta. Fallo del Tribunal: En aplicación de la tutela del interés público, declaró descalificadas las ofertas de ambos postores (tanto del adjudicatario como del impugnante) por presentar documentación con información inexacta sobre la experiencia del personal clave.",
  "recordar": "El Tribunal analizó las bases integradas y la normativa sobre la fehaciencia de la documentación.",
  "precision": ""
 },
 {
  "caso": 481,
  "seccion": "3.1",
  "resolucion": "Resolución 4035-2026-TCP-S6",
  "cuestionamiento": "Se debatió la escala de puntaje otorgable (60 o 40 puntos) en función del porcentaje del equipo profesional (Residente e Ingeniero SSOMA) que supera en al menos dos años el requisito mínimo de calificación.",
  "resolvio": "El Tribunal recalculó los tiempos laborales acreditados de cada profesional del equipo técnico para reubicar la propuesta en el tramo de puntaje exacto que le correspondía conforme a la tabla objetiva de las bases.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 482,
  "seccion": "3.1",
  "resolucion": "Resolución 4403-2026-TCP-S5",
  "cuestionamiento": "Acreditación del tiempo adicional requerido para obtener el máximo puntaje mediante el Anexo N.º 19 y documentos de respaldo.",
  "resolvio": "Determinó que al superar el personal clave el periodo mínimo de experiencia adicional exigido en las bases, correspondía otorgar la totalidad del puntaje en dicho factor.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 483,
  "seccion": "3.1",
  "resolucion": "Resolución 5271-2026-TCP-S2",
  "cuestionamiento": "Se cuestionaron los puntos extra del personal clave por presentar certificados con descripciones genéricas (\"atención de averías\") en lugar de la especialidad exacta exigida (\"redes eléctricas\"), e impugnó la certificación ISO 37001 por provenir de un ente no acreditado ante INACAL.",
  "resolvio": "El Tribunal revocó la puntuación asignada en la experiencia adicional del personal clave al no demostrarse la coincidencia técnica exacta con el objeto de la convocatoria, ordenando reevaluar la asignación de puntos.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": "La fuente plantea también una objeción al certificado de integridad, pero solo desarrolla la respuesta respecto de la experiencia adicional. No se atribuye una decisión sobre ISO 37001 a partir de ese relato."
 },
 {
  "caso": 484,
  "seccion": "3.1",
  "resolucion": "Resolución 7969-2026-TCP-S3",
  "cuestionamiento": "POMALLUCAY reclamó puntaje por experiencia adicional de su ingeniero de seguridad y salud, incluyendo períodos de restricciones sanitarias de 2020.",
  "resolvio": "La Sala encontró insuficiente el sustento de prestación efectiva durante los períodos cuestionados. La posibilidad legal de reactivación de una obra no demostraba que el profesional hubiese trabajado en ella; faltaba prueba en la oferta. No reconoció los setenta puntos solicitados y confirmó la descalificación por no alcanzar el mínimo técnico. Dispuso actuaciones por posible información inexacta, sin imponer en este recurso una sanción definitiva.",
  "recordar": "La Sala encontró insuficiente el sustento de prestación efectiva durante los períodos cuestionados.",
  "precision": ""
 },
 {
  "caso": 485,
  "seccion": "3.1",
  "resolucion": "Resolución 8050-2026-TCP-S1",
  "cuestionamiento": "El comité asignó treinta puntos por experiencia adicional, aunque el relato del caso señala que el impugnante tenía derecho al tramo de sesenta puntos.",
  "resolvio": "El documento aportado informa que la Sala declaró fundada la apelación y reconoció los sesenta puntos correspondientes. El caso de 7837-2026-TCP-S4, agrupado en la fuente, se desarrolla por separado en el apartado 3.1.17 con respaldo en su fallo completo.",
  "recordar": "El caso de 7837-2026-TCP-S4, agrupado en la fuente, se desarrolla por separado en el apartado 3.1.17 con respaldo en su fallo completo.",
  "precision": ""
 },
 {
  "caso": 486,
  "seccion": "3.1",
  "resolucion": "Resolución 8121-2026-TCP-S3",
  "cuestionamiento": "El CONSORCIO GESTOR AMAZONAS (impugnante) cuestionó la asignación de puntaje en el Factor A (\"Experiencia en la especialidad adicional del personal clave\"). Alegó que la base de cálculo debía ser de 10 (por ser 10 los cargos/especialidades enumerados en las bases) y no de 12 profesionales (ya que las especialidades de Estructuras y Arquitectura requerían 2 profesionales cada una). Además, sostuvo que en las especialidades con 2 profesionales, ambos debían superar el año adicional de experiencia para otorgar el punto a dicho cargo.",
  "resolvio": "El Tribunal aclaró que el Factor A evalúa el porcentaje del \"personal clave\" que supera el tiempo de experiencia en la especialidad, lo cual remite directamente a los 12 profesionales individuales fijados expresamente en el cuadro de calificación del personal clave de las bases. Modificar el denominador a 10 o exigir que ambos titulares de una especialidad cumplan simultáneamente el requisito adicional equivaldría a introducir una regla o condición no contemplada en las bases integradas, vulnerando el principio de intangibilidad de las reglas de selección. Dado que el comité evaluó correctamente a los 12 profesionales requeridos y el adjudicatario alcanzó el porcentaje previsto, el Tribunal confirmó el puntaje otorgado al adjudicatario. b) Requisito de Calificación / Factor de Evaluación: Cuestionamiento extemporáneo a la calificación del personal clave (Preclusión Procesal)",
  "recordar": "El Tribunal aclaró que el Factor A evalúa el porcentaje del \"personal clave\" que supera el tiempo de experiencia en la especialidad, lo cual remite directamente a los 12 profesionales individuales fijados expresamente en el cuadro de calificación del personal clave de las bases.",
  "precision": ""
 },
 {
  "caso": 487,
  "seccion": "3.1",
  "resolucion": "Resolución 8343-2026-TCP-S3",
  "cuestionamiento": "El comité de selección le asignó 0 puntos al impugnante en el factor B.1 (Experiencia adicional de 2 coordinadores y 4 docentes) alegando una supuesta inexactitud por traslapes de fechas al comparar los certificados con otros expedientes del SEACE, descalificándolo por no alcanzar el puntaje técnico mínimo.",
  "resolvio": "El Tribunal constató que la calificación y validez de la experiencia del personal clave de dicho postor ya había sido analizada y declarada firme y válida mediante una resolución previa emitida por la Sexta Sala del Tribunal (Resolución N° 07249-2026-TCP-S6). El comité no podía volver a cuestionar de forma indirecta la validez de dichos certificados en la etapa de evaluación técnica, vulnerando el carácter obligatorio y vinculante de los pronunciamientos del Tribunal (artículo 313.3 del Reglamento). Al corroborarse que los profesionales acreditaban más de 5 y 4 años de experiencia adicional respectivamente, el Tribunal le otorgó el puntaje máximo de 40 puntos en el factor B.1 y ordenó realizar la evaluación económica de su oferta.",
  "recordar": "El Tribunal constató que la calificación y validez de la experiencia del personal clave de dicho postor ya había sido analizada y declarada firme y válida mediante una resolución previa emitida por la Sexta Sala del Tribunal (Resolución N° 07249-2026-TCP-S6).",
  "precision": ""
 },
 {
  "caso": 488,
  "seccion": "3.1",
  "resolucion": "Resolución 8557-2026-TCP-S1",
  "cuestionamiento": "El adjudicatario solicitó que, en caso se mantuviera la calificación del impugnante, se le reduzca el puntaje asignado en los factores \"Experiencia adicional del postor en la especialidad\" y \"Experiencia adicional del personal clave\", al cuestionar los mismos certificados presentados en la etapa de calificación.",
  "resolvio": "Al haberse determinado previamente que la experiencia del profesional propuesto por el impugnante era plenamente válida y cumplía con la correspondencia funcional, el Tribunal desestimó el cuestionamiento y mantuvo el puntaje máximo en la evaluación técnica.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 489,
  "seccion": "3.1",
  "resolucion": "Resolución 8841-2026-TCP-S2",
  "cuestionamiento": "El impugnante solicitó quitar los 30 puntos al adjudicatario alegando que las constancias de su personal clave presentaban inexactitudes al contrastarse con cargos de otros proyectos.",
  "resolvio": "El Tribunal mantuvo el puntaje y la buena pro. Manifestó que los cuestionamientos se fundaban en apreciaciones subjetivas sin prueba fehaciente que rompiera la presunción de veracidad del documento presentado.",
  "recordar": "Manifestó que los cuestionamientos se fundaban en apreciaciones subjetivas sin prueba fehaciente que rompiera la presunción de veracidad del documento presentado. Resolución 8050-2026-TCP-S1: la misma controversia se desarrolla una sola vez en el apartado 3.1.17. 3.1.17. Experiencia específica adicional del personal clave Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 490,
  "seccion": "3.1",
  "resolucion": "Resolución 7140-2025-TCP-S1",
  "cuestionamiento": "El comité de selección descalificó al Consorcio Belén al asignarle 0 puntos en la evaluación técnica, argumentando que el postor pretendió acreditar el factor de evaluación \"Experiencia en la especialidad adicional del personal clave\" utilizando los mismos contratos y certificados de trabajo que ya había presentado para cumplir el Requisito de Calificación obligatorio \"Experiencia del personal clave\". El comité y la Entidad sostenían que para el factor de evaluación debían presentarse documentos o prestaciones totalmente diferentes a los de la calificación.",
  "resolvio": "El Tribunal determinó que ni las bases integradas ni las bases estándar exigen que el postor presente documentos distintos para acreditar la calificación y el factor de evaluación. Lo técnicamente correcto es verificar que el tiempo total de experiencia acumulado en los documentos presentados supere el mínimo exigido en la calificación por al menos un (1) año adicional. Al comprobar que el 100% del personal clave propuesto superaba dicho año adicional, el Tribunal otorgó 55 puntos en este factor, elevó la calificación técnica del postor a 90 puntos, revocó su descalificación y dejó sin efecto la declaratoria de desierto.",
  "recordar": "El Tribunal determinó que ni las bases integradas ni las bases estándar exigen que el postor presente documentos distintos para acreditar la calificación y el factor de evaluación.",
  "precision": ""
 },
 {
  "caso": 491,
  "seccion": "3.1",
  "resolucion": "Resolución 174-2026-TCP-S5",
  "cuestionamiento": "Se apeló la asignación de puntaje respecto a la experiencia adicional acreditada para los profesionales clave.",
  "resolvio": "El Tribunal confirmó el puntaje otorgado en el factor específico (5 puntos) y fijó el puntaje técnico final de la oferta en 100 puntos, disponiendo que el comité aplique los criterios de desempate previstos en la normativa para definir la buena pro.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 492,
  "seccion": "3.1",
  "resolucion": "Resolución 1548-2026-TCP-S2",
  "cuestionamiento": "El impugnante cuestionó la denegatoria de puntos en el factor \"Experiencia adicional del personal clave\" para el Residente, Especialista en Seguridad y Especialista Ambiental, afirmando que sus profesionales superaban los 24 meses adicionales requeridos.",
  "resolvio": "El Tribunal declaró infundado el recurso. Verificó que los certificados desestimados correspondían a obras que no cumplían con la subespecialidad exigida en las bases (\"Vías urbanas\"), por lo que al restar dichos periodos, el personal no alcanzaba los 24 meses adicionales exigidos para obtener el puntaje.",
  "recordar": "Verificó que los certificados desestimados correspondían a obras que no cumplían con la subespecialidad exigida en las bases (\"Vías urbanas\"), por lo que al restar dichos periodos, el personal no alcanzaba los 24 meses adicionales exigidos para obtener el puntaje.",
  "precision": ""
 },
 {
  "caso": 493,
  "seccion": "3.1",
  "resolucion": "Resolución 4104-2026-TCP-S1",
  "cuestionamiento": "El impugnante reclamó que el comité le asignó 20 puntos en lugar del máximo de 35 puntos para la Especialista SSOMA, al declarar no válido un certificado de trabajo por discrepancias menores en el nombre de la obra frente al contrato.",
  "resolvio": "El Tribunal comprobó que la variación en la denominación se debía al nombre completo del proyecto escolar, pero se trataba de la misma obra y la misma subespecialidad exigida. Al tratarse de un documento fehaciente, dispuso que le correspondía la asignación del puntaje máximo (35 puntos) en dicho factor.",
  "recordar": "El Tribunal comprobó que la variación en la denominación se debía al nombre completo del proyecto escolar, pero se trataba de la misma obra y la misma subespecialidad exigida.",
  "precision": ""
 },
 {
  "caso": 494,
  "seccion": "3.1",
  "resolucion": "Resolución 5100-2026-TCP-S2",
  "cuestionamiento": "En la evaluación técnica, el comité asignó 0 puntos en este factor al postor N&P Global Construction E.I.R.L., desestimando 4 certificados de trabajo de su Residente de Obra al considerar que contenían información inexacta respecto a periodos de paralización de obra registrados en Infobras y firmas no validadas.",
  "resolvio": "El Tribunal analizó los documentos y determinó que existía prueba oficial objetiva (Infobras) de que la obra estuvo suspendida durante parte del periodo certificado sin labores efectivas, lo que desvirtuó la presunción de veracidad respecto al tiempo certificado. Al descontarse el periodo no trabajado, el profesional no alcanzaba el tiempo adicional exigido para obtener puntaje. En consecuencia, el Tribunal confirmó la asignación de 0 puntos, la descalificación en la etapa de evaluación técnica y la declaratoria de desierto.",
  "recordar": "El Tribunal analizó los documentos y determinó que existía prueba oficial objetiva (Infobras) de que la obra estuvo suspendida durante parte del periodo certificado sin labores efectivas, lo que desvirtuó la presunción de veracidad respecto al tiempo certificado.",
  "precision": ""
 },
 {
  "caso": 495,
  "seccion": "3.1",
  "resolucion": "Resolución 6025-2026-TCP-S5",
  "cuestionamiento": "Cuestionamiento al puntaje de experiencia adicional del personal clave por inconsistencias documentales en los certificados emitidos por consorcios.",
  "resolvio": "El Tribunal restó el puntaje otorgado en este factor al constatarse que las constancias del personal clave carecían de fehaciencia sobre el tiempo real ejecutado.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 496,
  "seccion": "3.1",
  "resolucion": "Resolución 7785-2026-TCP-S2",
  "cuestionamiento": "El comité otorgó solo 20 puntos de 50 al Consorcio R&C en el factor de experiencia adicional del personal clave, al rechazar la experiencia del Residente de Obra (Ing. Elías Ilizarbe Oré) y del Asistente de Obra. La Entidad sostuvo que los contratos de obra privada y actas de recepción presentados no eran suficientes para probar la permanencia continua del profesional.",
  "resolvio": "El Tribunal aclaró que las bases permiten acreditar la experiencia con contratos y actas de recepción. No obstante, al revisar el caso del Residente de Obra, se verificaron suspensiones y paralizaciones de obra registradas que reducían el tiempo computable efectivo, impidiendo que alcanzara el año adicional exigido. Al no acreditarse el año adicional en más del 50% del personal clave, el Tribunal confirmó la asignación de 20 puntos.",
  "recordar": "El Tribunal aclaró que las bases permiten acreditar la experiencia con contratos y actas de recepción.",
  "precision": ""
 },
 {
  "caso": 497,
  "seccion": "3.1",
  "resolucion": "Resolución 7837-2026-TCP-S4",
  "cuestionamiento": "El adjudicatario recibió sesenta puntos de experiencia específica adicional, aunque solo uno de los tres profesionales cumplía el factor y correspondía un tramo de treinta puntos.",
  "resolvio": "La Sala advirtió una aplicación contraria a la tabla de las bases y declaró la nulidad de la evaluación técnica y de la buena pro. Ordenó retrotraer para reevaluar al adjudicatario conforme al tramo aplicable. La decisión fue de nulidad y nueva evaluación, no un otorgamiento directo de la buena pro a otro postor.",
  "recordar": "Ordenó retrotraer para reevaluar al adjudicatario conforme al tramo aplicable.",
  "precision": ""
 },
 {
  "caso": 498,
  "seccion": "3.1",
  "resolucion": "Resolución 8050-2026-TCP-S1",
  "cuestionamiento": "El Consorcio Super San Martín de Porres (impugnante 1) cuestionó que el comité no otorgó puntaje a su Jefe de Supervisión (Ing. Carlos Enrique Cabrera Campos) porque una de las constancias indicaba el cargo de \"supervisor de obra\" y no \"jefe de supervisión\".",
  "resolvio": "Las fuentes coinciden en reconocer la correspondencia funcional entre “supervisor de obra” y “jefe de supervisión” para la experiencia examinada. El documento 30 refiere que se ordenó reevaluar y asignar puntaje; el documento 2 describe una confirmación del puntaje.",
  "recordar": "El documento 30 refiere que se ordenó reevaluar y asignar puntaje; el documento 2 describe una confirmación del puntaje. Alcance del caso. Los relatos disponibles no precisan uniformemente si el puntaje se confirmó o se restituyó. El criterio descrito no permite atribuir un único efecto procedimental.",
  "precision": ""
 },
 {
  "caso": 499,
  "seccion": "3.1",
  "resolucion": "Resolución 8706-2026-TCP-S3",
  "cuestionamiento": "El impugnante exigió 25 puntos adicionales argumentando que la experiencia en la construcción de la piscina olímpica del Estadio de Piura debía validarse dentro de la subespecialidad de \"establecimientos deportivos\".",
  "resolvio": "El Tribunal desestimó la pretensión. Precisó que las características constructivas e ingeniería de una piscina olímpica difieren sustancialmente del requerimiento del proceso (losa deportiva multifuncional con cobertura), por lo que no correspondía otorgar puntaje por subespecialidad.",
  "recordar": "Precisó que las características constructivas e ingeniería de una piscina olímpica difieren sustancialmente del requerimiento del proceso (losa deportiva multifuncional con cobertura), por lo que no correspondía otorgar puntaje por subespecialidad. 3.1.18. Calificaciones adicionales del personal clave Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 500,
  "seccion": "3.1",
  "resolucion": "Resolución 7189-2025-TCP-S4 · Cuestionamiento 1",
  "cuestionamiento": "El comité de selección asignó 0 puntos en la evaluación técnica a la empresa ECO CONSTRUCCIONES TITAN S.A.C. y declaró desierto el proceso. El comité argumentó que la maestría presentada para el Residente de Obra (\"Maestro en Diseño y Construcción de Obras Viales\") no coincidía exactamente con las denominaciones nombradas en las bases (\"Gestión vial\", \"Estructuras\", \"Administración de la Construcción\", \"Gerencia de la Construcción\" o \"Gerencia Pública\").",
  "resolvio": "El Tribunal determinó que el comité de selección incurrió en una grave falta de motivación en el Acta de Evaluación, pues se limitó a señalar \"NO ACREDITA\" sin fundamentar técnicamente las razones por las cuales el grado de maestría presentado no resultaba equivalente o pertinente. Aunque la Entidad pretendió justificar la diferencia durante la apelación, la motivación debe existir en el momento de la emisión del acto administrativo. Por ello, el Tribunal declaró la nulidad de la evaluación técnica contenida en el Acta y la nulidad de la declaratoria de desierto, ordenando al comité realizar una reevaluación debidamente motivada y fundamentada.",
  "recordar": "El Tribunal determinó que el comité de selección incurrió en una grave falta de motivación en el Acta de Evaluación, pues se limitó a señalar \"NO ACREDITA\" sin fundamentar técnicamente las razones por las cuales el grado de maestría presentado no resultaba equivalente o pertinente.",
  "precision": ""
 },
 {
  "caso": 501,
  "seccion": "3.1",
  "resolucion": "Resolución 7189-2025-TCP-S4 · Cuestionamiento 2",
  "cuestionamiento": "El Comité asignó \"0\" puntos al postor alegando que presentó un \"certificado distinto a lo solicitado\". El postor adjuntó dos certificados emitidos por el PMI (AI in Infrastructure y Construction Interface Management). La Entidad sostuvo posteriormente que se trataba de \"constancias de cursos\" y no de \"certificaciones profesionales\", y que carecían de código de validación en la web del PMI.",
  "resolvio": "El Tribunal revisó las bases integradas y constató que estas solicitaban genéricamente \"copia de las certificaciones\" emitidas por instituciones como el PMI, sin restringir el beneficio a credenciales profesionales específicas ni exigir códigos de verificación en línea. La Entidad no puede imponer exigencias no escritas en las bases durante la evaluación. En consecuencia, declaró la nulidad de la evaluación arbitraria y ordenó asignar el puntaje conforme a las reglas integradas.",
  "recordar": "El Tribunal revisó las bases integradas y constató que estas solicitaban genéricamente \"copia de las certificaciones\" emitidas por instituciones como el PMI, sin restringir el beneficio a credenciales profesionales específicas ni exigir códigos de verificación en línea. 3.1.19. Capacitación del personal clave Qué comprobar Registra materia, duración, emisor y persona capacitada; coteja esos datos con la exigencia discutida.",
  "precision": ""
 },
 {
  "caso": 502,
  "seccion": "3.1",
  "resolucion": "Resolución 8706-2026-TCP-S3",
  "cuestionamiento": "Un postor ofertó textualmente la frase \"más de 15 horas\" repetida de las bases, sin precisar una cifra exacta de horas a dictar, por lo que el comité le negó el puntaje.",
  "resolvio": "El Tribunal confirmó la denegatoria de puntaje. Argumentó que la propuesta técnica debe ser precisa para permitir la posterior fiscalización de la ejecución contractual; repetir la fórmula del rango genera indeterminación.",
  "recordar": "Argumentó que la propuesta técnica debe ser precisa para permitir la posterior fiscalización de la ejecución contractual; repetir la fórmula del rango genera indeterminación. 3.1.20. Plazo de prestación del servicio Qué comprobar Compara el plazo ofertado, la unidad de medida y el documento que lo acredita con la regla de las bases.",
  "precision": ""
 },
 {
  "caso": 503,
  "seccion": "3.1",
  "resolucion": "Resolución 7793-2025-TCP-S2",
  "cuestionamiento": "Asignación de 30 puntos al postor en el factor \"Plazo de prestación del servicio\" mediante el Anexo N° 12, donde declaró un plazo numérico de \"10 días\" sin precisar la palabra \"calendario\".",
  "resolvio": "El Tribunal revocó los 30 puntos asignados. Explicó que los factores de evaluación facultativos otorgan puntaje en función de compromisos precisos y no ambiguos. Al omitir calificar si los días eran \"calendario\" o \"hábiles\" en el anexo de puntuación, se generó incertidumbre, sin que el Anexo N° 3 (sometimiento general a las bases) pudiera corregir un formato de puntuación impreciso.",
  "recordar": "Explicó que los factores de evaluación facultativos otorgan puntaje en función de compromisos precisos y no ambiguos.",
  "precision": ""
 },
 {
  "caso": 504,
  "seccion": "3.1",
  "resolucion": "Resolución 5558-2026-TCP-S4",
  "cuestionamiento": "El impugnante solicitó descontar el puntaje del factor plazo al adjudicatario alegando que en su Anexo N° 12 omitió indicar de manera explícita las condiciones para el inicio del cómputo del plazo.",
  "resolvio": "El Tribunal determinó que, al haber indicado de manera clara el número total de días calendario ofertados, la falta de reiteración de la regla de inicio fijada en las bases no restaba certeza ni invalida la declaración del plazo ofertado. Sin embargo, al revocarse la calificación del personal clave, se ordenó recalcular el orden de prelación general.",
  "recordar": "Sin embargo, al revocarse la calificación del personal clave, se ordenó recalcular el orden de prelación general.",
  "precision": ""
 },
 {
  "caso": 505,
  "seccion": "3.1",
  "resolucion": "Resolución 6856-2026-TCP-S6",
  "cuestionamiento": "El comité asignó cero (0) puntos al impugnante en el factor plazo anotando únicamente en el acta la frase \"NO OFERTA CONDICIÓN DE INICIO\", sin explicar las razones jurídicas o técnicas de dicha decisión.",
  "resolvio": "El Tribunal declaró la vulneración del deber de motivación de los actos administrativos, pues el comité no sustentó objetivamente por qué el plazo expresado en días calendario en el Anexo N° 12 no resultaba suficiente para obtener puntaje. Por tanto, revocó la evaluación técnica en dicho factor y ordenó emitir una nueva calificación fundamentada.",
  "recordar": "Por tanto, revocó la evaluación técnica en dicho factor y ordenó emitir una nueva calificación fundamentada.",
  "precision": ""
 },
 {
  "caso": 506,
  "seccion": "3.1",
  "resolucion": "Resolución 8141-2026-TCP-S2",
  "cuestionamiento": "El impugnante fue descalificado por no alcanzar el puntaje técnico mínimo al habérsele otorgado cero (0) puntos en el factor \"Plazo de prestación del servicio\". El postor presentó su Anexo de Mejoras declarando que realizaría la implementación en un plazo \"de 2 a 3 días calendarios\". El impugnante sostuvo que al ofrecer un plazo de 2 a 3 días estaba mejorando el requerimiento base y merecía la puntuación máxima.",
  "resolvio": "El Tribunal declaró infundado el recurso y confirmó la descalificación. Reiteró la doctrina según la cual las propuestas técnicas deben ser ciertas, objetivas e indubitables. Declarar un compromiso a través de un rango (\"de 2 a 3 días\") no permite saber a ciencia cierta cuál es el plazo fijo contractual que asume el postor. Ante esta imprecisión, el comité actuó correctamente al no otorgarle puntaje.",
  "recordar": "Ante esta imprecisión, el comité actuó correctamente al no otorgarle puntaje. Resolución 7895-2026-TCP-S3: la misma controversia se desarrolla una sola vez en el apartado 3.1.1. 3.1.21. Gestión de riesgos Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 507,
  "seccion": "3.1",
  "resolucion": "Resolución 8723-2026-TCP-S1",
  "cuestionamiento": "El Consorcio CRES (impugnante 2) cuestionó los puntajes asignados en los factores de evaluación \"Gestión de riesgos\", \"Gestión de procura\", \"Mejora al requerimiento\" y \"Planificación detallada\", al considerar que el Jurado le descontó puntos de forma arbitraria sin precisar en el Acta qué aspectos u omisiones motivaron dichos descuentos.",
  "resolvio": "El Tribunal advirtió la existencia de un vicio de nulidad por vulneración al principio de debida motivación y transparencia. Las evaluaciones individuales del Jurado no explicaban de manera clara y objetiva qué elementos de la propuesta fueron valorados negativamente y cómo se determinó cada puntaje parcial. Por ello, declaró la nulidad de oficio de la etapa de evaluación de factores de evaluación, retrotrayendo el proceso a dicha etapa para que la Entidad emita una nueva evaluación debidamente motivada y transparente respecto de las ofertas habilitadas (incluyendo la del Consorcio DJ).",
  "recordar": "Las evaluaciones individuales del Jurado no explicaban de manera clara y objetiva qué elementos de la propuesta fueron valorados negativamente y cómo se determinó cada puntaje parcial. 3.1.22. Gestión de procura Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. Sin cuestionamiento individualizado en las fuentes aportadas para esta materia. 3.1.23. Seguridad y salud Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 508,
  "seccion": "3.1",
  "resolucion": "Resolución 473-2026-TCP-S5",
  "cuestionamiento": "El impugnante denunció que se otorgó puntaje indebido al adjudicatario en el factor \"Seguridad y Salud\" por un certificado de gestión de seguridad presentado, debido a que al verificar el código en el portal web de la entidad certificadora (AQC), este no registraba en el sistema.",
  "resolvio": "El Tribunal amparó los cuestionamientos contra la oferta del adjudicatario al constatarse irregularidades e incongruencias que impedían validar la oferta técnica y económica presentadas.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 509,
  "seccion": "3.1",
  "resolucion": "Resolución 8914-2026-TCP-S5",
  "cuestionamiento": "El comité de selección omitió asignar en el cuadro del acta el puntaje de 15 puntos correspondiente al factor \"Seguridad y Salud\" a la oferta del impugnante, pese a que este había adjuntado la certificación solicitada en su propuesta.",
  "resolvio": "El Tribunal revocó la descalificación y dispuso que se otorguen los 15 puntos en Seguridad y Salud. Destacó que la propia Entidad, al responder la apelación, reconoció el error del comité y confirmó que al postor le correspondía la asignación del puntaje máximo en dicho factor.",
  "recordar": "Destacó que la propia Entidad, al responder la apelación, reconoció el error del comité y confirmó que al postor le correspondía la asignación del puntaje máximo en dicho factor. 3.1.24. Planificación detallada Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. Sin cuestionamiento individualizado en las fuentes aportadas para esta materia. 3.1.25. Tecnología y métodos innovadores Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. Sin cuestionamiento individualizado en las fuentes aportadas para esta materia. 3.1.26. Propuesta arquitectónica Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. Sin cuestionamiento individualizado en las fuentes aportadas para esta materia. 3.1.27. Metodología propuesta Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 510,
  "seccion": "3.1",
  "resolucion": "Resolución 1677-2025-TCE-S6 · Cuestionamiento 1",
  "cuestionamiento": "El Consorcio impugnante cuestionó los 30 puntos otorgados al Consorcio adjudicatario en el factor \"Metodología propuesta\". Argumentó que el adjudicatario programó en su Diagrama de Gantt únicamente 215 días para la actividad ID 17 (\"Control técnico, económico, administrativo, fiscalización y supervisión\"), cuando el plazo obligatorio establecido en las bases para la etapa de ejecución de obra era de 225 días. La Entidad defendió la oferta señalando que el plazo total (285 días, incluyendo liquidación) figuraba en otros anexos y que la actividad tenía predecesoras.",
  "resolvio": "El Tribunal estableció que, de acuerdo con el artículo 187.1 del Reglamento, la función de supervisión de obra es directa, continua e ininterrumpida durante todo el plazo de ejecución (225 días). Por tanto, la actividad de control técnico y supervisión debía cubrir de forma gráfica y expresa los 225 días completos en el Diagrama de Gantt. Al haber programado solo 215 días, el adjudicatario incumplió las reglas técnicas obligatorias del servicio, correspondiéndole cero (0) puntos en este factor. Con ello, su puntaje técnico bajó a 70 puntos y quedó descalificado por no alcanzar el mínimo de 80 puntos, revocándosele la buena pro.",
  "recordar": "Con ello, su puntaje técnico bajó a 70 puntos y quedó descalificado por no alcanzar el mínimo de 80 puntos, revocándosele la buena pro.",
  "precision": ""
 },
 {
  "caso": 511,
  "seccion": "3.1",
  "resolucion": "Resolución 1677-2025-TCE-S6 · Cuestionamiento 2",
  "cuestionamiento": "El Comité de Selección le otorgó 0 puntos al Consorcio impugnante alegando que los informes que consignó en su propuesta metodológica \"no estaban acordes con los Términos de Referencia\" (por supuesta omisión de los informes de liquidación). El impugnante sostuvo que no estaba obligado a listar la totalidad de los informes secundarios sino los principales.",
  "resolvio": "El Tribunal verificó que el impugnante sí presentó la estructura requerida y que las bases no exigían detallar cada informe de liquidación de forma exhaustiva para validar la metodología. En consecuencia, revocó la decisión del Comité y le asignó los 30 puntos correspondientes, declarando su oferta técnica calificada con 100 puntos para pasar a la apertura económica.",
  "recordar": "El Tribunal verificó que el impugnante sí presentó la estructura requerida y que las bases no exigían detallar cada informe de liquidación de forma exhaustiva para validar la metodología.",
  "precision": ""
 },
 {
  "caso": 512,
  "seccion": "3.1",
  "resolucion": "Resolución 1700-2025-TCE-S5",
  "cuestionamiento": "El comité asignó 0 puntos en la Metodología Propuesta porque en el Anexo N° 3 (Matriz de Riesgos) el postor copió la información y el CUI de una obra deportiva en Pasco, en lugar del proyecto de agua y saneamiento convocado. El postor sostuvo que era un error material.",
  "resolvio": "El Tribunal ratificó el puntaje de 0. Resolvió que la asignación de riesgos debe ser elaborada a medida de la obra convocada. Colocar datos de un proyecto distinto altera la propuesta técnica y no constituye un error material subsanable.",
  "recordar": "Colocar datos de un proyecto distinto altera la propuesta técnica y no constituye un error material subsanable.",
  "precision": ""
 },
 {
  "caso": 513,
  "seccion": "3.1",
  "resolucion": "Resolución 2618-2025-TCE-S6 · Cuestionamiento 1",
  "cuestionamiento": "El comité de selección le otorgó cero (0) puntos al consorcio impugnante en este factor bajo dos argumentos: Identificación de facilidades: El postor presentó como facilidades dos proyectos previos ejecutados con la Entidad que se encontraban paralizados. El comité sostuvo que no se podían validar facilidades de obras en estado de paralización. Identificación de dificultades: El postor identificó como dificultad la existencia impredecible de \"interferencias urbanas\". El comité sostuvo que dicha dificultad no era válida porque la obra se ejecutaría fuera del casco urbano.",
  "resolvio": "Respecto a las facilidades: El Tribunal verificó que las bases integradas solo exigían presentar un documento sustentatorio de la metodología, sin establecer prohibición alguna de citar obras paralizadas. El comité aplicó una exigencia no prevista en las bases, vulnerando el principio de legalidad y las reglas del proceso. Respecto a las dificultades (interferencias): Al revisar el expediente técnico (planos y memoria descriptiva del alcantarillado), el Tribunal confirmó que la intervención comprendía vías del ámbito urbano (como el Jr. Jaén y Jr. Juan Albacete en San Ignacio), por lo que la eventualidad de interferencias urbanas sí constituía una dificultad real y técnicamente sustentada. Fallo del Tribunal: Declaró fundado este extremo y le otorgó los diez (10) puntos correspondientes al postor impugnante.",
  "recordar": "Respecto a las facilidades: El Tribunal verificó que las bases integradas solo exigían presentar un documento sustentatorio de la metodología, sin establecer prohibición alguna de citar obras paralizadas.",
  "precision": ""
 },
 {
  "caso": 514,
  "seccion": "3.1",
  "resolucion": "Resolución 2618-2025-TCE-S6 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante cuestionó los 10 puntos otorgados al adjudicatario en la metodología propuesta, señalando que su cronograma de actividades estaba incompleto, pues no definió los plazos para las actividades previas a la obra (colocó genéricamente \"según bases integradas\") ni precisó qué personal ejecutaría varias de las tareas.",
  "resolvio": "El Tribunal confirmó que la oferta del adjudicatario no detalló los plazos específicos de las tareas previas ni la asignación individualizada del personal para cada actividad, limitándose a hacer referencias genéricas. Esta omisión generó incertidumbre sobre la programación y vulneró el contenido mínimo exigido por las bases integradas. En consecuencia, el Tribunal le restó los 10 puntos al adjudicatario, revocó la buena pro y se la otorgó al Consorcio impugnante.",
  "recordar": "Esta omisión generó incertidumbre sobre la programación y vulneró el contenido mínimo exigido por las bases integradas.",
  "precision": ""
 },
 {
  "caso": 515,
  "seccion": "3.1",
  "resolucion": "Resolución 3782-2025-TCP-S6",
  "cuestionamiento": "El impugnante cuestionó la propuesta del adjudicatario por dos razones: Personal adicional: En su cronograma y metodología incluyó personal no solicitado en los términos de referencia (inspector de soldadura, técnico de laboratorio ambiental y asistente de metrados). Equipamiento estratégico: En un cuadro de tolerancias topográficas de su propuesta técnica colocó una estación total con precisión de 6”, cuando las bases exigían en el equipamiento estratégico una precisión angular menor a 5”.",
  "resolvio": "Sobre el personal: La inclusión de personal técnico auxiliar adicional dentro de la estrategia de trabajo no contraviene las bases ni invalida la metodología; únicamente refuerza el control de obra y no altera la estructura obligatoria de costos. Sobre el equipo topográfico: El Tribunal verificó que el dato de 6” correspondía a una cita referencial de las normas del Instituto Geográfico Nacional (IGN) dentro de un cuadro de tolerancias de medición de ángulos de red, y no a la especificación técnica de la estación total que el postor se comprometió a ofertar. Fallo del Tribunal: Declaró infundado el reclamo y ratificó el puntaje otorgado al adjudicatario.",
  "recordar": "Sobre el personal: La inclusión de personal técnico auxiliar adicional dentro de la estrategia de trabajo no contraviene las bases ni invalida la metodología; únicamente refuerza el control de obra y no altera la estructura obligatoria de costos.",
  "precision": ""
 },
 {
  "caso": 516,
  "seccion": "3.1",
  "resolucion": "Resolución 4708-2025-TCP-S1",
  "cuestionamiento": "El impugnante cuestionó los 30 puntos otorgados al adjudicatario en la \"Metodología propuesta\", afirmando que su plan no desarrolló de manera específica los Usos BIM, la gestión de información, los roles del equipo BIM ni las normas nacionales del Plan BIM Perú, además de omitir detalles sobre las actividades de supervisión de obra y calidad.",
  "resolvio": "El Tribunal revisó la oferta técnica del adjudicatario y constató que las bases no exigían un modelado o desarrollo BIM complejo para la oferta, sino un planteamiento teórico descriptivo de los procesos. Verificó que el adjudicatario sí incluyó el detalle teórico de los Usos BIM, los roles del equipo (Especialista, Gestor y Modelador BIM) y las actividades de aseguramiento de calidad en los cuadros de su propuesta. Por ello, declaró infundado este extremo del recurso y ratificó los 30 puntos asignados al adjudicatario en dicho factor.",
  "recordar": "El Tribunal revisó la oferta técnica del adjudicatario y constató que las bases no exigían un modelado o desarrollo BIM complejo para la oferta, sino un planteamiento teórico descriptivo de los procesos. 3.1.28. Monitoreo y control Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 517,
  "seccion": "3.1",
  "resolucion": "Resolución 405-2026-TCP-S6",
  "cuestionamiento": "El comité de selección asignó únicamente 10 de los 35 puntos posibles en el factor \"Monitoreo y Control\" a la propuesta del postor impugnante. El comité sustentó su decisión de restar puntaje en aparentes deficiencias e insuficiencias observadas en ocho (8) puntos de su propuesta técnica metodológica (relacionados con el método del valor ganado EVM, uso de software MS Project y tableros de Power BI). El impugnante alegó que el comité actuó de forma arbitraria e impuso exigencias no previstas en las bases.",
  "resolvio": "El Tribunal examinó la oferta del impugnante y las bases integradas, concluyendo que la propuesta cumplía rigurosamente con todos los aspectos exigidos para el factor \"Monitoreo y Control\". Asimismo, precisó que las bases integradas no fijaron parámetros o detalles adicionales para restar puntaje que justificaran la decisión del comité. En aplicación del principio de intangibilidad de las bases, los evaluadores no pueden exigir requisitos de calificación o detalles no normados explícitamente para restar puntuación. En consecuencia, el Tribunal revocó la decisión del comité, le otorgó los 35 puntos máximos en dicho factor al impugnante y le adjudicó la buena pro.",
  "recordar": "El Tribunal examinó la oferta del impugnante y las bases integradas, concluyendo que la propuesta cumplía rigurosamente con todos los aspectos exigidos para el factor \"Monitoreo y Control\".",
  "precision": "Las fuentes difieren en el puntaje inicialmente asignado y en la cantidad descontada, pero coinciden en reconocer el cumplimiento y atribuir el puntaje máximo de 35 puntos. 3.1.29. Plan de ejecución BIM (BEP) Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes. Sin cuestionamiento individualizado en las fuentes aportadas para esta materia. 3.1.30. Certificaciones y obligaciones de consorcios en varios factores Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes."
 },
 {
  "caso": 518,
  "seccion": "3.1",
  "resolucion": "Resolución 7177-2025-TCP-S5",
  "cuestionamiento": "Se pretendió restar puntaje a los certificados ISO 14001, ISO 37001 e ISO 9001 del adjudicatario alegando que su alcance no contenía la descripción literal del servicio específico a contratar.",
  "resolvio": "El Tribunal validó las certificaciones ISO. Concluyó que los certificados abarcan los sistemas de gestión aplicables a la prestación general de servicios de la empresa, sin que sea exigible una coincidencia literal con cada actividad secundaria.",
  "recordar": "Concluyó que los certificados abarcan los sistemas de gestión aplicables a la prestación general de servicios de la empresa, sin que sea exigible una coincidencia literal con cada actividad secundaria.",
  "precision": ""
 },
 {
  "caso": 519,
  "seccion": "3.1",
  "resolucion": "Resolución 7712-2025-TCP-S6",
  "cuestionamiento": "Impugnación sobre la asignación de puntaje por la presentación de certificados del Sistema de Gestión de la Calidad.",
  "resolvio": "El Tribunal dispuso el recalculo del puntaje, exigiendo que las certificaciones cumplan de forma idéntica con el alcance del objeto de la convocatoria.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 520,
  "seccion": "3.1",
  "resolucion": "Resolución 167-2026-TCP-S4",
  "cuestionamiento": "El impugnante pidió retirar los puntos otorgados al adjudicatario en Sostenibilidad Ambiental e Integridad, sosteniendo que la dirección fiscal consignada en sus diplomas ISO no coincidía textualmente con el domicilio de su licencia de SUCAMEC.",
  "resolvio": "El Tribunal confirmó la asignación de 10 puntos por cada factor. Determinó que las bases exigen que las certificaciones ISO estén vigentes y cubran la sede u oficina encargada de la prestación, sin requerir coincidencia literal con registros de otros organismos habilitantes.",
  "recordar": "Determinó que las bases exigen que las certificaciones ISO estén vigentes y cubran la sede u oficina encargada de la prestación, sin requerir coincidencia literal con registros de otros organismos habilitantes.",
  "precision": ""
 },
 {
  "caso": 521,
  "seccion": "3.1",
  "resolucion": "Resolución 351-2026-TCP-S3",
  "cuestionamiento": "Se solicitó retirar puntaje de integridad y calidad por supuesta falta de acreditación reconocida de los emisores de los certificados ISO 37001 e ISO 9001.",
  "resolvio": "No hubo decisión sobre la validez de esas certificaciones ni retiro de puntos por ese motivo. La descalificación por equipamiento hizo innecesario analizar las demás objeciones al adjudicatario. Esta resolución no sustenta una regla de aceptación o rechazo de certificadoras a partir de lo alegado por las partes.",
  "recordar": "No hubo decisión sobre la validez de esas certificaciones ni retiro de puntos por ese motivo.",
  "precision": ""
 },
 {
  "caso": 522,
  "seccion": "3.1",
  "resolucion": "Resolución 614-2026-TCP-S3",
  "cuestionamiento": "Se cuestionaron certificados y códigos QR del adjudicatario para los factores de integridad, sostenibilidad y seguridad y salud.",
  "resolvio": "La Sala no resolvió el fondo de estos factores: después de descalificar al adjudicatario por equipamiento, consideró innecesario examinar los cuestionamientos restantes. Las alegaciones sobre el QR no permiten afirmar que este fallo validó las certificaciones o les retiró puntaje.",
  "recordar": "Las alegaciones sobre el QR no permiten afirmar que este fallo validó las certificaciones o les retiró puntaje.",
  "precision": ""
 },
 {
  "caso": 523,
  "seccion": "3.1",
  "resolucion": "Resolución 2991-2026-TCP-S2",
  "cuestionamiento": "Un postor solicitó que no se le otorgue puntaje en los factores ambientales e integridad a la empresa competidora debido a que presentó certificados ISO expedidos en idioma extranjero (inglés) sin adjuntar la respectiva traducción.",
  "resolvio": "El Tribunal acogió el cuestionamiento. De conformidad con la normativa de contrataciones, todo documento redactado en idioma extranjero debe ser acompañado de su respectiva traducción al castellano; la falta de traducción impide al comité evaluar el documento, por lo que no corresponde la asignación de puntaje facultativo.",
  "recordar": "De conformidad con la normativa de contrataciones, todo documento redactado en idioma extranjero debe ser acompañado de su respectiva traducción al castellano; la falta de traducción impide al comité evaluar el documento, por lo que no corresponde la asignación de puntaje facultativo.",
  "precision": ""
 },
 {
  "caso": 524,
  "seccion": "3.1",
  "resolucion": "Resolución 3917-2026-TCP-S6",
  "cuestionamiento": "El comité de selección asignó cero (0) puntos al impugnante en los factores facultativos \"Integridad en la Contratación Pública\" (ISO 37001) y \"Sistema de Gestión de la Calidad\" (ISO 9001) argumentando que los certificados se encontraban redactados en inglés y español pero carecían de una traducción oficial jurada, por lo que no podía validar su vigencia.",
  "resolvio": "El Tribunal declaró fundado este extremo del recurso. Señaló que la omisión de la traducción oficial de un documento en idioma extranjero es un defecto de carácter formal de naturaleza subsanable. En consecuencia, el comité actuó de manera arbitraria al no otorgar al postor el plazo legal de dos (2) días para subsanar dicha traducción, disponiendo que se le conceda dicho plazo.",
  "recordar": "Señaló que la omisión de la traducción oficial de un documento en idioma extranjero es un defecto de carácter formal de naturaleza subsanable.",
  "precision": ""
 },
 {
  "caso": 525,
  "seccion": "3.1",
  "resolucion": "Resolución 4200-2026-TCP-S1",
  "cuestionamiento": "El impugnante reclamó la asignación de 5 puntos en Sostenibilidad Ambiental y 5 puntos en Integridad. El comité le restó puntaje aduciendo que sus certificados ISO vencían el mismo día fijado para la presentación de ofertas (5 de marzo de 2026) y que no se acreditó su renovación posterior.",
  "resolvio": "El Tribunal declaró fundado este extremo y otorgó los 10 puntos al impugnante. Estableció la regla jurídica de que cuando un certificado indica una fecha de expiración determinada sin especificar hora exacta, el documento mantiene plena validez jurídica hasta las 23:59:59 horas de dicho día. Al haberse registrado la oferta antes de ese límite, los certificados ISO estaban vigentes al momento de la postulación, no existiendo obligación legal de probar renovaciones futuras.",
  "recordar": "Estableció la regla jurídica de que cuando un certificado indica una fecha de expiración determinada sin especificar hora exacta, el documento mantiene plena validez jurídica hasta las 23:59:59 horas de dicho día.",
  "precision": ""
 },
 {
  "caso": 526,
  "seccion": "3.1",
  "resolucion": "Resolución 6485-2026-TCP-S1",
  "cuestionamiento": "Cuestionamiento de la validez y alcance de las certificaciones ambientales y de integridad presentadas para obtener puntaje adicional.",
  "resolvio": "Verificó que los certificados ISO se encontrasen vigentes a la fecha de presentación de ofertas y emitidos por un organismo acreditado (INACAL o acreditador internacional reconocido).",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 527,
  "seccion": "3.1",
  "resolucion": "Resolución 6856-2026-TCP-S6",
  "cuestionamiento": "Se cuestionó la asignación de puntaje en estos factores a postores en consorcio, alegando que sus promesas de consorcio no detallaban obligaciones específicas vinculadas a las certificaciones ISO correspondientes.",
  "resolvio": "El Tribunal confirmó los puntajes asignados, señalando que las bases permitían que las certificaciones ISO fueran aportadas por cualquiera de los consorciados, siempre que dicho integrante asumiera actividades de ejecución del objeto contractual en la promesa formal de consorcio.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 528,
  "seccion": "3.1",
  "resolucion": "Resolución 6900-2026-TCP-S1",
  "cuestionamiento": "El impugnante sostuvo que al adjudicatario no le correspondía puntaje en los factores facultativos de calidad, ambiente y seguridad y salud porque la promesa de consorcio no individualizaba expresamente qué consorciado ejecutaría la práctica certificada.",
  "resolvio": "El Tribunal resolvió que cuando todos los integrantes del consorcio participan directamente en la ejecución de las prestaciones principales, las obligaciones en materia de seguridad, calidad y medio ambiente se consideran inherentes a la ejecución de la obra, no siendo indispensable una mención literal hiperespecífica en la promesa si se adjunta la certificación válida.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 529,
  "seccion": "3.1",
  "resolucion": "Resolución 7969-2026-TCP-S3",
  "cuestionamiento": "Se objetó la legibilidad y la falta de traducción de los certificados ISO 9001, ISO 14001 e ISO 37001 del adjudicatario.",
  "resolvio": "La mayoría consideró legibles los certificados, pero constató la falta de traducción de los documentos en inglés. Ordenó subsanarla en dos días hábiles, conservando los certificados originalmente ofrecidos. Revocó la buena pro y dejó la evaluación supeditada a esa actuación; incumplir la subsanación llevaría a la descalificación. No otorgó directamente la buena pro a RÍO.",
  "recordar": "La mayoría consideró legibles los certificados, pero constató la falta de traducción de los documentos en inglés.",
  "precision": ""
 },
 {
  "caso": 530,
  "seccion": "3.1",
  "resolucion": "Resolución 8010-2026-TCP-S1",
  "cuestionamiento": "Cuestionamiento sobre si la certificación ISO 9001 (Gestión de la Calidad) e ISO 37001 (Integridad / Antisoborno) para asignación de puntaje en consorcios debía ser acreditada por todos los integrantes o solo por uno.",
  "resolvio": "El Tribunal diferenció la regla de asignación de puntaje: Si las bases establecen explícitamente que cada integrante del consorcio debe contar individualmente con la certificación (como se reguló para el ISO 37001), la falta de acreditación de un solo integrante acarrea la asignación de 0 puntos en dicho factor. Si las bases no exigieron la acreditación individual por cada consorciado para el ISO 9001 (Gestión de Calidad), resulta válido otorgar el puntaje siempre que el integrante encargado de la ejecución técnica de las prestaciones cuente con la certificación.",
  "recordar": "Si las bases no exigieron la acreditación individual por cada consorciado para el ISO 9001 (Gestión de Calidad), resulta válido otorgar el puntaje siempre que el integrante encargado de la ejecución técnica de las prestaciones cuente con la certificación.",
  "precision": ""
 },
 {
  "caso": 531,
  "seccion": "3.1",
  "resolucion": "Resolución 8041-2026-TCP-S5",
  "cuestionamiento": "El impugnante solicitó despojar de 50 puntos al Consorcio adjudicatario en los factores de Sostenibilidad Ambiental (ISO 14001), Gestión de la Calidad (ISO 9001) y Seguridad y Salud (ISO 45001). Argumentó que, en su Promesa de Consorcio (Anexo N° 4), las empresas integrantes declararon el compromiso general de \"ejecutar la obra\", pero no incluyeron una cláusula explícita que asignara de manera nominal a las consorciadas certificadas la tarea específica de implementar los planes ISO en la obra.",
  "resolvio": "El Tribunal declaró INfundado el recurso. Determinó que las bases integradas no exigían fórmulas rituales ni pactos nominales específicos en la Promesa de Consorcio respecto de la gestión de los ISO para asignar puntaje facultativo. Verificado que los consorciados que aportaron los certificados asumieron obligaciones directas en la ejecución física de la obra, la asignación de puntaje fue plenamente válida. Por ende, se confirmó la buena pro a favor del adjudicatario.",
  "recordar": "Determinó que las bases integradas no exigían fórmulas rituales ni pactos nominales específicos en la Promesa de Consorcio respecto de la gestión de los ISO para asignar puntaje facultativo.",
  "precision": ""
 },
 {
  "caso": 532,
  "seccion": "3.1",
  "resolucion": "Resolución 8071-2026-TCP-S6",
  "cuestionamiento": "El impugnante solicitó desestimar la propuesta del adjudicatario y retirarle el puntaje en los tres factores ISO (14001, 37001 y 9001). Sostuvo que los certificados emitidos por QRO Certification bajo la acreditadora EGAC (Egyptian Accreditation Council) no estaban homologados ni validados formalmente ante INACAL en el Perú.",
  "resolvio": "El Tribunal declaró infundado el recurso y confirmó la buena pro. Aclaró que la normativa no impone una homologación administrativa previa ante INACAL si las bases no lo exigen. Asimismo, verificó en la plataforma internacional IAF CertSearch que la acreditadora EGAC es miembro firmante activo del Acuerdo de Reconocimiento Multilateral (IAF MLA) y que los certificados figuraban en estado \"Activo\", contando con plena validez técnica y presunción de veracidad.",
  "recordar": "Aclaró que la normativa no impone una homologación administrativa previa ante INACAL si las bases no lo exigen.",
  "precision": ""
 },
 {
  "caso": 533,
  "seccion": "3.1",
  "resolucion": "Resolución 8390-2026-TCP-S3",
  "cuestionamiento": "El comité de selección asignó 0 puntos al impugnante en los factores de sostenibilidad ambiental e integridad debido a que en los certificados ISO 14001 e ISO 37001 presentados figuraba un domicilio legal diferente al domicilio registrado en su ficha del RNP.",
  "resolvio": "El Tribunal analizó la controversia para determinar si la variación de domicilio del establecimiento de la persona jurídica afecta o no la validez técnica de las certificaciones del sistema de gestión evaluado, disponiendo la correcta aplicación de los parámetros de evaluación sin exigir formalismos que carezcan de sustento normativo.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 534,
  "seccion": "3.1",
  "resolucion": "Resolución 8580-2026-TCP-S1",
  "cuestionamiento": "El comité restó puntaje a un consorcio argumentando que los certificados ISO debían ser presentados de forma obligatoria por todos los integrantes del consorcio sin excepción.",
  "resolvio": "El Tribunal precisó que, conforme a las bases estándar, cuando se participa en consorcio, las certificaciones destinadas a evaluar factores facultativos deben ser presentadas por aquel integrante que ejecuta las actividades vinculadas al objeto del contrato o a la materia específica evaluada según la Promesa de Consorcio. Exigir el certificado al 100% de los consorciados sin considerar sus obligaciones operativas desnaturaliza la figura del consorcio.",
  "recordar": "Exigir el certificado al 100% de los consorciados sin considerar sus obligaciones operativas desnaturaliza la figura del consorcio.",
  "precision": ""
 },
 {
  "caso": 535,
  "seccion": "3.1",
  "resolucion": "Resolución 8706-2026-TCP-S3",
  "cuestionamiento": "Se denegó puntaje en los factores ISO a un consorcio porque en su promesa no se estipuló expresamente qué integrante asumiría la obligación de ejecutar la gestión de calidad.",
  "resolvio": "El Tribunal confirmó la denegatoria. Conforme a las bases estándar, cuando un consorcio postula a factores de gestión de calidad o seguridad, la promesa debe precisar qué consorciado asumirá dicha prestación o si ambos cuentan con las certificaciones vigentes aplicables.",
  "recordar": "Conforme a las bases estándar, cuando un consorcio postula a factores de gestión de calidad o seguridad, la promesa debe precisar qué consorciado asumirá dicha prestación o si ambos cuentan con las certificaciones vigentes aplicables.",
  "precision": ""
 },
 {
  "caso": 536,
  "seccion": "3.1",
  "resolucion": "Resolución 8795-2026-TCP-S2",
  "cuestionamiento": "El adjudicatario obtuvo puntaje en los factores ISO 14001, 37001 y 9001. Se demostró que los certificados adjuntados en la oferta técnica física tenían impresa una fecha de vencimiento caducada. El postor pretendió subsanarlo mediante cartas posteriores del certificador.",
  "resolvio": "El Tribunal retiró la totalidad de los puntos otorgados. Dispuso que las propuestas deben evaluarse tal como son presentadas. Adjuntar certificados vencidos no otorga puntaje y no es admisible incorporar aclaraciones posteriores para cambiar el estado del documento.",
  "recordar": "Adjuntar certificados vencidos no otorga puntaje y no es admisible incorporar aclaraciones posteriores para cambiar el estado del documento. Resolución 8186-2026-TCP-S1: la misma controversia se desarrolla una sola vez en el apartado 2.1 y 3.1.6. 3.1.31. Vida útil del bien Qué comprobar Identifica la regla de las bases, el documento cuestionado y el hecho que determinó la respuesta. Registra el resultado de este extremo y las actuaciones pendientes.",
  "precision": ""
 },
 {
  "caso": 537,
  "seccion": "3.1",
  "resolucion": "Resolución 574-2026-TCP-S1",
  "cuestionamiento": "La empresa impugnante no presentó el documento exigido para ser evaluada en el factor facultativo \"Vida Útil del Bien\". Ante ello, interpuso apelación solicitando que se ordene a la Entidad realizar una reevaluación eliminando dicho factor del concurso, o subsidariamente se declare la nulidad del proceso, bajo el argumento de que las bases no fijaron la tasa de interés (i) ni el periodo de cálculo (n), tornando el factor en indeterminado e inaplicable.",
  "resolvio": "El Tribunal declaró improcedente el pedido de nulidad contra las bases integradas por constituir reglas definitivas e inimpugnables en esa vía. Respecto al fondo, aclaró que la fórmula estándar facultaba a los propios postores a estructurar los costos de mantenimiento, operación y reposición dentro de su propuesta para que el comité aplicara la fórmula matemática objetiva. La falta de asignación de puntaje respondió a la decisión voluntaria del impugnante de no presentar el Plan de Costos de Ciclo de Vida, por lo que se declaró infundado el recurso de apelación y se dispuso la ejecución de su garantía.",
  "recordar": "La falta de asignación de puntaje respondió a la decisión voluntaria del impugnante de no presentar el Plan de Costos de Ciclo de Vida, por lo que se declaró infundado el recurso de apelación y se dispuso la ejecución de su garantía.",
  "precision": ""
 },
 {
  "caso": 538,
  "seccion": "3.2",
  "resolucion": "Resolución 3299-2025-TCP-S5",
  "cuestionamiento": "Se impugnó la validez del Anexo N° 6 (Monto de la oferta económica) del postor impugnante alegando dudas sobre la firmeza y vigencia de los precios ofertados.",
  "resolvio": "El Tribunal desestimó el cuestionamiento al constatar que la propuesta económica cumplía estrictamente con los formatos de las bases e indicó que la vigencia del precio se mantiene inalterable durante el procedimiento de selección.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 539,
  "seccion": "3.2",
  "resolucion": "Resolución 3338-2025-TCP-S5",
  "cuestionamiento": "El impugnante cuestionó la admisión de la oferta del adjudicatario señalando que presentó el Anexo N° 6 (precio de la oferta) sin indicar el desagregado de gastos generales fijos y variables, pese a que las bases integradas así lo exigían expresamente para las contrataciones a suma alzada.",
  "resolvio": "El Tribunal explicó que las bases integradas son las reglas definitivas del procedimiento. Al haberse establecido como requisito obligatorio de admisión la presentación del Anexo N° 6 detallando los gastos generales fijos y variables, la omisión de dicho desglose invalida la propuesta en la etapa de admisión. Por ello, declaró la no admisión de la oferta del adjudicatario.",
  "recordar": "El Tribunal explicó que las bases integradas son las reglas definitivas del procedimiento.",
  "precision": ""
 },
 {
  "caso": 540,
  "seccion": "3.2",
  "resolucion": "Resolución 3503-2025-TCP-S6 · Cuestionamiento 1",
  "cuestionamiento": "Errores de tipeo o denominación en la descripción de partidas dentro de la estructura de la oferta económica.",
  "resolvio": "Precisó que las inconsistencias puramente ortográficas o materiales en la descripción de partidas no alteran la oferta económica ni generan causal de no admisión.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 541,
  "seccion": "3.2",
  "resolucion": "Resolución 3503-2025-TCP-S6 · Cuestionamiento 2",
  "cuestionamiento": "Se observó un error de digitación en una partida del Anexo 6: decía “bagua” en lugar de “agua”.",
  "resolvio": "El relato del caso indica que la Sala lo consideró un error material: no cambiaba la identificación de la partida, la unidad, el metrado, el precio unitario ni el subtotal. Revocó la no admisión basada en esa observación. Por su objeto, este extremo se ubica en evaluación económica.",
  "recordar": "El relato del caso indica que la Sala lo consideró un error material: no cambiaba la identificación de la partida, la unidad, el metrado, el precio unitario ni el subtotal.",
  "precision": ""
 },
 {
  "caso": 542,
  "seccion": "3.2",
  "resolucion": "Resolución 6965-2025-TCP-S2",
  "cuestionamiento": "El adjudicatario solicitó que se declare no admitida la oferta del Consorcio impugnante 2 alegando que en la subpartida 01.03.03.02.03 del Anexo N° 6 escribió por error de tipeo la descripción \"FILTRO DE GRAVA Ø 1” A Ø A 1 ½”\" (escribiendo una letra \"A\" repetida de más), mientras que en el presupuesto del expediente técnico la descripción correcta era \"FILTRO DE GRAVA Ø 1” A Ø 1 ½”\". El adjudicatario sostenía que esta falla alteraba el contenido esencial de la oferta y no era subsanable.",
  "resolvio": "El Tribunal determinó que se trataba de un error material manifiesto de tipeo en la transcripción de la descripción de la subpartida, el cual no generaba ninguna ambigüedad sobre el bien ofertado ni alteraba el precio total de la propuesta. En aplicación del principio de eficacia y eficiencia, las entidades deben priorizar los fines públicos por encima de formalidades no esenciales. Por lo tanto, declaró infundado el cuestionamiento del adjudicatario y mantuvo admitida la oferta.",
  "recordar": "El Tribunal determinó que se trataba de un error material manifiesto de tipeo en la transcripción de la descripción de la subpartida, el cual no generaba ninguna ambigüedad sobre el bien ofertado ni alteraba el precio total de la propuesta.",
  "precision": ""
 },
 {
  "caso": 543,
  "seccion": "3.2",
  "resolucion": "Resolución 7160-2025-TCP-S5",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta económica del Consorcio Cantu alegando la presencia de una incongruencia aritmética insubsanable en la tabla del Anexo Nº 6. En el rubro correspondiente al \"Total de Gastos Generales (B)\", el postor indicó la cifra de 20.7201%, valor idéntico al consignado para los \"Gastos Variables (20.7201%)\", omitiendo sumar el porcentaje de los \"Gastos Fijos (1.0771%)\", cuya suma exacta debía ser 21.7972%. La Entidad y el comité sostuvieron que este error en las etiquetas de los porcentajes distorsionaba la propuesta y no era susceptible de corrección en la etapa de admisión.",
  "resolvio": "El Tribunal revisó la oferta económica y constató que el monto total de la oferta en dinero (S/ 556,042.88) era claro, exacto e inamovible, coincidiendo perfectamente con la suma de todos los componentes monetarios. Asimismo, advirtió que en las bases integradas no existía exigencia de establecer obligatoriamente porcentajes en las celdas de gastos fijos y variables del Anexo Nº 6. El Colegiado estableció que se trataba de una imprecisión formal que no alteraba el precio total ofertado y que, conforme al numeral 78.3 del artículo 78 del Reglamento, correspondía a los evaluadores corregir dicho error aritmético/material en la respectiva acta. En consecuencia, declaró fundado EN PARTE el recurso, revocó la no admisión y ordenó admitir la propuesta para continuar con su evaluación.",
  "recordar": "Asimismo, advirtió que en las bases integradas no existía exigencia de establecer obligatoriamente porcentajes en las celdas de gastos fijos y variables del Anexo Nº 6.",
  "precision": ""
 },
 {
  "caso": 544,
  "seccion": "3.2",
  "resolucion": "Resolución 7177-2025-TCP-S5",
  "cuestionamiento": "En un concurso público para la reparación y mantenimiento de transformadores convocado por ítem bajo la modalidad de precios unitarios, se cuestionó que el adjudicatario presentó en su oferta económica (Anexo N° 6) valores que no reflejaban el precio unitario por cada tipo de servicio y transformador referenciado en el requerimiento.",
  "resolvio": "El Tribunal declaró no admitida la oferta del adjudicatario y revocó el otorgamiento de la buena pro. La Sala explicó que cuando el procedimiento se convoca a precios unitarios con pagos parciales según las entregas efectivamente ejecutadas, es obligatorio que los postores coticen estructurando los precios unitarios por unidad de servicio. Omitir dicha estructura o presentar un monto global impide la liquidación de las prestaciones y vicia la admisibilidad de la oferta.",
  "recordar": "La Sala explicó que cuando el procedimiento se convoca a precios unitarios con pagos parciales según las entregas efectivamente ejecutadas, es obligatorio que los postores coticen estructurando los precios unitarios por unidad de servicio.",
  "precision": ""
 },
 {
  "caso": 545,
  "seccion": "3.2",
  "resolucion": "Resolución 7604-2025-TCP-S5",
  "cuestionamiento": "El impugnante cuestionó la admisión de la oferta del adjudicatario alegando que no cumplió con las exigencias formales e integrales fijadas en las bases para la presentación del Anexo N° 6 (Oferta económica y estructura de costos).",
  "resolvio": "El Tribunal verificó que la propuesta económica del adjudicatario no se ajustaba a los requerimientos obligatorios de las bases integradas para la consultoría de obra. En consecuencia, declaró fundado el cuestionamiento, revocó la admisión de la oferta del adjudicatario y la declaró no admitida.",
  "recordar": "El Tribunal verificó que la propuesta económica del adjudicatario no se ajustaba a los requerimientos obligatorios de las bases integradas para la consultoría de obra.",
  "precision": ""
 },
 {
  "caso": 546,
  "seccion": "3.2",
  "resolucion": "Resolución 7714-2025-TCP-S5",
  "cuestionamiento": "La oferta del CONSORCIO VÍAS DE LIMA indicaba gastos generales del 30 % en el Anexo 6 y del 40 % en la estructura de costos, aunque ambos documentos consignaban el mismo importe.",
  "resolvio": "La Sala constató que S/ 259 689,90 respecto del costo directo de S/ 649 224,76 correspondía al 40 %. El porcentaje del anexo era un error material que podía corregirse sin cambiar los importes ni los precios unitarios. En el esquema mixto del procedimiento aplicó la corrección aritmética del artículo 78.3. Revocó la no admisión y la declaratoria de desierto y ordenó continuar la calificación y evaluación; no otorgó directamente la buena pro.",
  "recordar": "La Sala constató que S/ 259 689,90 respecto del costo directo de S/ 649 224,76 correspondía al 40 %.",
  "precision": ""
 },
 {
  "caso": 547,
  "seccion": "3.2",
  "resolucion": "Resolución 8454-2025-TCP-S1",
  "cuestionamiento": "El comité rechazó la oferta económica porque el postor no detalló de forma separada ni desglosó el costo del \"informe inicial\" dentro del Anexo N° 6.",
  "resolvio": "El Tribunal revocó la no admisión, precisando que si las bases integradas no establecieron de manera explícita la obligación de detallar o desglosar dicho informe en la estructura del Anexo N° 6, el comité de selección no puede inventar requisitos no previstos en las reglas del proceso.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 548,
  "seccion": "3.2",
  "resolucion": "Resolución 190-2026-TCP-S3",
  "cuestionamiento": "El comité no admitió la oferta al considerar que el Anexo N° 6 (Oferta Económica) debió consignar el plazo de ejecución desagregado por componentes en un esquema de contratación mixto.",
  "resolvio": "El Tribunal determinó que el Anexo N° 6 tiene por finalidad expresar el monto económico de la propuesta y no comunicar los plazos por etapas, los cuales dependen de la ejecución contractual. Por ende, la exigencia del comité carecía de sustento normativo, revocándose la no admisión de la oferta.",
  "recordar": "Por ende, la exigencia del comité carecía de sustento normativo, revocándose la no admisión de la oferta.",
  "precision": ""
 },
 {
  "caso": 549,
  "seccion": "3.2",
  "resolucion": "Resolución 251-2026-TCP-S6",
  "cuestionamiento": "Cuestionamiento al monto ofertado por el adjudicatario (S/ 1,368,902.65) en una obra con cuantía de S/ 1,440,950.16 convocada bajo el método de \"Oferta económica limitada\".",
  "resolvio": "El Tribunal declaró no admitida la oferta económica del adjudicatario. Al aplicar las reglas del redondeo a dos decimales, el límite mínimo legal del 95% de la cuantía equivalía a S/ 1,368,902.66. Ofertar S/ 1,368,902.65 (un centavo por debajo del límite mínimo imperativo) vulnera el rango legal obligatorio, determinando la exclusión de la oferta.",
  "recordar": "Ofertar S/ 1,368,902.65 (un centavo por debajo del límite mínimo imperativo) vulnera el rango legal obligatorio, determinando la exclusión de la oferta.",
  "precision": ""
 },
 {
  "caso": 550,
  "seccion": "3.2",
  "resolucion": "Resolución 411-2026-TCP-S1",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta del consorcio impugnante alegando que en su Anexo N° 6 (Oferta Económica) no precisó un plazo específico para la etapa de \"liquidación de obra\".",
  "resolvio": "El Tribunal analizó el formato del Anexo N° 6 de las bases estándar aprobadas por el OSCE/MEF y comprobó que en la modalidad de suma alzada no existe la obligación de indicar plazos parciales para la liquidación. Por ende, el comité exigió un dato que no estaba contemplado en las bases, vulnerando el principio de legalidad. Se revocó la no admisión de la oferta impugnante.",
  "recordar": "El Tribunal analizó el formato del Anexo N° 6 de las bases estándar aprobadas por el OSCE/MEF y comprobó que en la modalidad de suma alzada no existe la obligación de indicar plazos parciales para la liquidación.",
  "precision": ""
 },
 {
  "caso": 551,
  "seccion": "3.2",
  "resolucion": "Resolución 473-2026-TCP-S5",
  "cuestionamiento": "El impugnante solicitó la no admisión de la oferta del adjudicatario al advertir que existía una contradicción insubsanable entre el monto global expresado en el Anexo N° 6 (Oferta Económica) y el detalle numérico consignado en las páginas internas de su desglose.",
  "resolvio": "El Tribunal declaró fundado el recurso y dispuso la descalificación/desestimación de la oferta del adjudicatario. Fundamentó que la propuesta económica debe ser clara y cierta; al existir incongruencias en los montos ofertados dentro del mismo Anexo N° 6, no es posible determinar con certeza cuál es el precio real ofrecido, afectando la admisibilidad de la propuesta.",
  "recordar": "Fundamentó que la propuesta económica debe ser clara y cierta; al existir incongruencias en los montos ofertados dentro del mismo Anexo N° 6, no es posible determinar con certeza cuál es el precio real ofrecido, afectando la admisibilidad de la propuesta.",
  "precision": ""
 },
 {
  "caso": 552,
  "seccion": "3.2",
  "resolucion": "Resolución 520-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó que se declare la no admisión de la oferta de la adjudicataria aduciendo que en el Anexo N° 06 (oferta económica) solo indicó un monto total global, omitiendo detallar el precio unitario y el desglose del costo de cada uno de los productos requeridos.",
  "resolvio": "El Tribunal declaró infundado este extremo y confirmó la admisión de la oferta. Precisó que las bases integradas no contemplaron como requisito de admisión la presentación del desglose o estructura de costos unitarios en el Anexo N° 06. Dichos detalles eran exigibles únicamente en la etapa posterior de perfeccionamiento del contrato, por lo que no resultaba legalmente posible descalificar una propuesta por un requisito no previsto para la fase de admisión.",
  "recordar": "Precisó que las bases integradas no contemplaron como requisito de admisión la presentación del desglose o estructura de costos unitarios en el Anexo N° 06.",
  "precision": ""
 },
 {
  "caso": 553,
  "seccion": "3.2",
  "resolucion": "Resolución 908-2026-TCP-S2",
  "cuestionamiento": "El comité de selección declaró no admitida la oferta de ITZO Consultores y Ejecutores E.I.R.L. aduciendo que su oferta económica de S/ 360,000.01 equivalía al 117.40% del valor de la cuantía, superando el límite superior permitido. El postor impugnó demostrando que el comité cometió un error de cálculo, ya que su oferta representaba en realidad el 99.49%.",
  "resolvio": "El Tribunal verificó los cálculos matemáticos entre la cuantía y el monto ofertado, confirmando que la oferta representaba el 99.49%, monto perfectamente ubicado dentro de los márgenes límite autorizados por las bases integradas (95% a 110%). Por ello, revocó la no admisión de la oferta.",
  "recordar": "El Tribunal verificó los cálculos matemáticos entre la cuantía y el monto ofertado, confirmando que la oferta representaba el 99.49%, monto perfectamente ubicado dentro de los márgenes límite autorizados por las bases integradas (95% a 110%).",
  "precision": ""
 },
 {
  "caso": 554,
  "seccion": "3.2",
  "resolucion": "Resolución 1264-2026-TCP-S3",
  "cuestionamiento": "El comité de selección descalificó la propuesta económica de Promotora El Oriente E.I.R.L. bajo el argumento de que su precio ofertado (S/ 580,000.00 sin IGV, al ser beneficiaria de la exoneración tributaria de la Ley Nº 27037) superaba el supuesto límite máximo permitido de S/ 550,000.00 \"sin IGV\", aplicando de forma automática la Décima Disposición Complementaria Final del Reglamento. El impugnante sostuvo que la cuantía no constituía un punto de referencia para limitar precios en servicios generales y que el comité creó un límite implícito y ficticio inexistente en las bases.",
  "resolvio": "El Tribunal aclaró que, en los procedimientos de contratación de servicios donde la cuantía no es punto de referencia para fijar topes a las ofertas, los proveedores exonerados de IGV formulan su propuesta económica sin incluir dicho impuesto frente al valor referencial. El Colegiado determinó que el comité aplicó de manera errónea las reglas de ofertas limitadas (propias de obras o consultorías de obra), ya que no existía norma ni disposición en las bases que autorizara descalificar a un postor de la Amazonía por un tope ficticio sin IGV. Por lo tanto, declaró fundado el recurso de apelación, revocó la descalificación del impugnante y dispuso que el comité efectúe la evaluación económica de su oferta para otorgar la buena pro a quien corresponda.",
  "recordar": "El Colegiado determinó que el comité aplicó de manera errónea las reglas de ofertas limitadas (propias de obras o consultorías de obra), ya que no existía norma ni disposición en las bases que autorizara descalificar a un postor de la Amazonía por un tope ficticio sin IGV.",
  "precision": ""
 },
 {
  "caso": 555,
  "seccion": "3.2",
  "resolucion": "Resolución 1580-2026-TCP-S5",
  "cuestionamiento": "Se cuestionó si un postor cumplía con la presentación de la declaración jurada de exoneración del IGV aplicable a la Amazonía.",
  "resolvio": "Al detectarse omisiones documentales de admisión en la oferta del adjudicatario, este fue descalificado, otorgándose el primer lugar en el orden de prelación al impugnante.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 556,
  "seccion": "3.2",
  "resolucion": "Resolución 3263-2026-TCP-S4",
  "cuestionamiento": "El comité declaró no admitida la oferta del único postor por un presunto incumplimiento de los requisitos del Anexo N° 7 y declaró desierta la convocatoria.",
  "resolvio": "Tras revisar la oferta técnica, el Tribunal constató que el Anexo N° 7 contenía el precio, los ítems y las firmas requeridas. En consecuencia, revocó la no admisión y dejó sin efecto la declaratoria de desierto.",
  "recordar": "Tras revisar la oferta técnica, el Tribunal constató que el Anexo N° 7 contenía el precio, los ítems y las firmas requeridas.",
  "precision": ""
 },
 {
  "caso": 557,
  "seccion": "3.2",
  "resolucion": "Resolución 3512-2026-TCP-S3",
  "cuestionamiento": "Se cuestionó que la tarifa diaria del jefe de supervisión y el importe de la estructura de costos no coincidieran, generando una oferta económica internamente incongruente.",
  "resolvio": "Los relatos del caso indican que corregir el desfase requería alterar una tarifa unitaria o el contenido económico ofertado, y no efectuar solamente una suma. El Tribunal descalificó al adjudicatario. Tras la corrección del puntaje técnico de AMC INGENIEROS, le otorgó la buena pro como oferta válida. La asignación de diez puntos de gestión de calidad se explica separadamente en el apartado 3.1.7.",
  "recordar": "Tras la corrección del puntaje técnico de AMC INGENIEROS, le otorgó la buena pro como oferta válida.",
  "precision": ""
 },
 {
  "caso": 558,
  "seccion": "3.2",
  "resolucion": "Resolución 3515-2026-TCP-S1",
  "cuestionamiento": "Se declaró no admitida una oferta por detectarse una inconsistencia de 50 céntimos entre la suma del subtotal más el IGV (S/ 15,192.00) y el monto expresado en letras (S/ 15,192.50).",
  "resolvio": "Las fuentes reportan que la Sala revocó la exclusión por una diferencia aritmética de S/ 0,50 entre subtotal, IGV y total del Anexo 6. En el esquema mixto examinado, la suma podía rectificarse sin cambiar los precios ofertados. Este caso no se presenta como una autorización general para modificar ofertas a suma alzada.",
  "recordar": "En el esquema mixto examinado, la suma podía rectificarse sin cambiar los precios ofertados.",
  "precision": ""
 },
 {
  "caso": 559,
  "seccion": "3.2",
  "resolucion": "Resolución 5004-2026-TCP-S2",
  "cuestionamiento": "PERURBE sostuvo que las inconsistencias de su estructura de costos eran referenciales y que sus cien puntos técnicos debían prevalecer.",
  "resolvio": "Las fuentes reportan confirmación de la descalificación por inconsistencias del contenido económico y alteración de componentes requeridos. Un alto puntaje técnico no reemplazaba la obligación de presentar una oferta económica coherente. El documento 1 detalla la reducción de cantidades de personal de apoyo; el documento 47 enfatiza las contradicciones del Anexo 6.",
  "recordar": "Un alto puntaje técnico no reemplazaba la obligación de presentar una oferta económica coherente.",
  "precision": ""
 },
 {
  "caso": 560,
  "seccion": "3.2",
  "resolucion": "Resolución 5104-2026-TCP-S1",
  "cuestionamiento": "Un postor presentó el Anexo N° 13 para acogerse al beneficio de la Ley de Amazonía, pero en el Anexo N° 6 colocó únicamente el precio final sin escribir la nota obligatoria \"Mi oferta no incluye IGV\".",
  "resolvio": "El Tribunal confirmó la NO ADMISIÓN de la propuesta. Resolvió que especificar si la oferta incluye o no tributos constituye un elemento esencial del precio ofertado. La omisión genera una contradicción insubsanable sobre la composición de la oferta económica que no puede aclararse con posterioridad.",
  "recordar": "Resolvió que especificar si la oferta incluye o no tributos constituye un elemento esencial del precio ofertado.",
  "precision": ""
 },
 {
  "caso": 561,
  "seccion": "3.2",
  "resolucion": "Resolución 5398-2026-TCP-S6",
  "cuestionamiento": "El Consorcio Angaraes Salud (impugnante 1) cuestionó su no admisión. El comité de selección rechazó su oferta porque en su estructura de costos incluyó un cargo profesional no contemplado en las bases (\"Especialista en Instalaciones Electromecánicas\" en el rubro B.01 de liquidación de la obra principal) y omitió por completo desarrollar los rubros B.01 y B.02 en la estructura de costos del Plan de Contingencia. El impugnante alegó que la estructura de costos no debía revisarse en la admisión sino en la evaluación técnica/económica.",
  "resolvio": "El Tribunal remarcó que en consultorías de obra la estructura de costos forma parte del Anexo Nº 6 y es de presentación obligatoria para la admisión. Los postores están obligados a formular sus propuestas respetando estrictamente los componentes, cargos y partidas fijados en las bases integradas, sin suprimir rubros exigidos ni incorporar cargos no previstos. Por ende, el Tribunal CONFIRMÓ LA NO ADMISIÓN de su oferta y declaró INfundado su recurso de apelación.",
  "recordar": "Los postores están obligados a formular sus propuestas respetando estrictamente los componentes, cargos y partidas fijados en las bases integradas, sin suprimir rubros exigidos ni incorporar cargos no previstos.",
  "precision": ""
 },
 {
  "caso": 562,
  "seccion": "3.2",
  "resolucion": "Resolución 5569-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó descalificar la oferta del adjudicatario argumentando que incluyó el Anexo N° 6 (monto de la oferta económica) dentro del archivo de la propuesta técnica, lo que según su criterio violó el principio de secreto o confidencialidad de la oferta.",
  "resolvio": "El Tribunal verificó que el procedimiento fue convocado bajo la modalidad de precio fijo al 100% del valor referencial. En esta modalidad, todos los postores compiten obligatoriamente con el mismo monto económico preestablecido, por lo que no existe competencia económica ni posibilidad de obtener ventajas secretas. Incurrir en un formalismo para descalificar una oferta cuando el precio no es materia de puja atentaría contra los principios de eficacia y eficiencia. Fallo del Tribunal: Declaró infundado el pedido de descalificación por este extremo.",
  "recordar": "El Tribunal verificó que el procedimiento fue convocado bajo la modalidad de precio fijo al 100% del valor referencial.",
  "precision": ""
 },
 {
  "caso": 563,
  "seccion": "3.2",
  "resolucion": "Resolución 6185-2026-TCP-S1",
  "cuestionamiento": "El comité no admitió la oferta al verificar que la empresa realizaba ventas y entregas de productos medicinales en la Costa y Sierra, concluyendo que faltó a la verdad al declarar \"no tener producción fuera de la Amazonía\" en el Anexo N° 13.",
  "resolvio": "El Tribunal revocó la decisión. Explicó que la condición de \"no tener producción fuera de la Amazonía\" no se exige a las empresas dedicadas a la comercialización. Por ende, tener contratos de distribución en otras regiones del país no le quita la condición de comercializadora ni invalida su declaración.",
  "recordar": "Explicó que la condición de \"no tener producción fuera de la Amazonía\" no se exige a las empresas dedicadas a la comercialización.",
  "precision": ""
 },
 {
  "caso": 564,
  "seccion": "3.2",
  "resolucion": "Resolución 6422-2026-TCP-S3",
  "cuestionamiento": "No admisión de una oferta en consorcio que pretendía acceder a beneficios normativos (como los de la Ley N° 27037) sin que todos sus integrantes cumplieran las condiciones legales.",
  "resolvio": "Se confirmó que los beneficios otorgados a consorcios exigen que todos sus miembros reúnan los requisitos exigidos por la norma especial, salvo contabilidad independiente inscrita.",
  "recordar": "Separa requisitos mínimos, factores de puntaje y evaluación económica.",
  "precision": ""
 },
 {
  "caso": 565,
  "seccion": "3.2",
  "resolucion": "Resolución 7305-2026-TCP-S3",
  "cuestionamiento": "En la compra de \"semilla de avena\", se rechazó la oferta de un postor por no incluir la leyenda \"mi oferta no incluye IGV\" en el cuadro de advertencia del Anexo N° 6.",
  "resolvio": "El Tribunal declaró admitida la oferta. Precisó que la frase de advertencia aplica para exoneraciones personales o subjetivas (como la Ley de Amazonía). Tratándose de bienes exonerados de forma objetiva por la propia Ley del IGV para todo el mercado (semillas agrícolas) y habiéndose fijado el valor del proceso sin IGV, no existe duda de que el precio no contenía dicho impuesto, haciendo innecesaria la leyenda.",
  "recordar": "Precisó que la frase de advertencia aplica para exoneraciones personales o subjetivas (como la Ley de Amazonía).",
  "precision": ""
 },
 {
  "caso": 566,
  "seccion": "3.2",
  "resolucion": "Resolución 8010-2026-TCP-S1 · Cuestionamiento 1",
  "cuestionamiento": "Se solicitó la no admisión de una oferta porque en el Anexo N° 6 (Oferta Económica) el postor suprimió columnas de códigos o ítems al transcribir el presupuesto.",
  "resolvio": "El Tribunal estableció que si la omisión o modificación en el Anexo N° 6 genera incertidumbre sobre qué partidas o prestaciones se están cotizando, el defecto afecta el contenido esencial e impide la admisión. No obstante, si el monto global es claro y las partidas son identificables inequívocamente por su descripción, la falta de códigos secundarios constituye un defecto formal que no anula la propuesta económica.",
  "recordar": "No obstante, si el monto global es claro y las partidas son identificables inequívocamente por su descripción, la falta de códigos secundarios constituye un defecto formal que no anula la propuesta económica.",
  "precision": ""
 },
 {
  "caso": 567,
  "seccion": "3.2",
  "resolucion": "Resolución 8010-2026-TCP-S1 · Cuestionamiento 2",
  "cuestionamiento": "Se argumentó que la oferta del adjudicatario debía ser declarada no admitida por no haber presentado el Anexo N° 13, pese a haber indicado en su oferta económica que se acogía a la exoneración del IGV por la Ley de Amazonía.",
  "resolvio": "El Tribunal resolvió que la omisión del Anexo N° 13 no configura causal de no admisión si las bases integradas no lo establecieron expresamente como un documento obligatorio de admisión. La falta de dicho anexo únicamente acarrea la consecuencia de no otorgar el beneficio tributario en la evaluación económica, evaluando la oferta como no exonerada, pero manteniendo su admisión técnica.",
  "recordar": "La falta de dicho anexo únicamente acarrea la consecuencia de no otorgar el beneficio tributario en la evaluación económica, evaluando la oferta como no exonerada, pero manteniendo su admisión técnica.",
  "precision": ""
 },
 {
  "caso": 568,
  "seccion": "3.2",
  "resolucion": "Resolución 8437-2026-TCP-S3",
  "cuestionamiento": "El comité descalificó la oferta económica del Consorcio Edificación (impugnante) argumentando que ofertó un monto equivalente al 205% del valor referencial (S/ 2'570,378.60 sobre una cuantía de S/ 1'249,825.98), atribuyendo un supuesto incumplimiento de la norma.",
  "resolvio": "El Tribunal aclaró que, según el artículo 166 del Reglamento, en consultoría de obras se aplica el método de oferta económica limitada donde la única restricción normativa es no ofertar menos del 90% del valor referencial, no existiendo un límite máximo superior prohibitivo en la norma. Por ende, la descalificación fue arbitraria. El Tribunal revocó la descalificación económica y declaró válida la oferta.",
  "recordar": "El Tribunal aclaró que, según el artículo 166 del Reglamento, en consultoría de obras se aplica el método de oferta económica limitada donde la única restricción normativa es no ofertar menos del 90% del valor referencial, no existiendo un límite máximo superior prohibitivo en la norma.",
  "precision": ""
 },
 {
  "caso": 569,
  "seccion": "3.2",
  "resolucion": "Resolución 8519-2026-TCP-S3",
  "cuestionamiento": "Se solicitó descalificar a ALIMENTOS AYNI PERÚ porque su estructura de costos no separaba el IGV ni el flete del producto.",
  "resolvio": "Según el relato del caso, la Sala desestimó el recurso y mantuvo la adjudicación: las reglas examinadas permitían consolidar el transporte en el costo del insumo y el Anexo 6 expresaba un precio que cubría las prestaciones y tributos. Este resultado corresponde al formato y a las bases descritas en la fuente, no a una dispensa general de obligaciones tributarias.",
  "recordar": "Este resultado corresponde al formato y a las bases descritas en la fuente, no a una dispensa general de obligaciones tributarias.",
  "precision": ""
 },
 {
  "caso": 570,
  "seccion": "3.2",
  "resolucion": "Resolución 8974-2026-TCP-S1",
  "cuestionamiento": "Un competidor cuestionó la oferta del ganador indicando que calculó mal el IGV al poner S/ 198,293.65 en lugar de S/ 198,293.66, lo que generó un centavo de diferencia en el total.",
  "resolvio": "El Tribunal confirmó que se cometió un error de redondeo tributario. Sin embargo, aclaró que la solución no es descalificar la propuesta, sino realizar la corrección aritmética del monto total (fijándolo en S/ 1,299,925.08) sin modificar los precios unitarios ofertados, lo que reacomodó el orden de prelación.",
  "recordar": "Sin embargo, aclaró que la solución no es descalificar la propuesta, sino realizar la corrección aritmética del monto total (fijándolo en S/ 1,299,925.08) sin modificar los precios unitarios ofertados, lo que reacomodó el orden de prelación. Rechazo de ofertas",
  "precision": ""
 },
 {
  "caso": 571,
  "seccion": "4.1",
  "resolucion": "Resolución 1555-2026-TCP-S1",
  "cuestionamiento": "Un competidor exigió rechazar las ofertas económicas del primer y segundo lugar alegando que ofertaron montos que no cubrían el costo laboral mínimo en el servicio de vigilancia.",
  "resolvio": "El Tribunal declaró infundado el recurso. Precisó que en la modalidad de suma alzada el comité evaluador no fiscaliza la estructura interna de costos ni descalifica ofertas por análisis de costos laborales, correspondiendo dicha verificación al momento de la ejecución del contrato.",
  "recordar": "Precisó que en la modalidad de suma alzada el comité evaluador no fiscaliza la estructura interna de costos ni descalifica ofertas por análisis de costos laborales, correspondiendo dicha verificación al momento de la ejecución del contrato.",
  "precision": ""
 },
 {
  "caso": 572,
  "seccion": "4.1",
  "resolucion": "Resolución 3910-2026-TCP-S6",
  "cuestionamiento": "Tras pedir la estructura detallada de costos para analizar una oferta con precio bajo, el comité rechazó la propuesta porque la suma de los decimales de la hoja explicativa difería por centésimas respecto al precio global.",
  "resolvio": "El Tribunal revocó el rechazo de la oferta. Fijó el criterio de que el desglose explicativo de costos para precios bajos no reemplaza ni altera la propuesta económica del Anexo N° 6. Si el precio total global expresado en el Anexo N° 6 es firme y válido, pequeñas diferencias en los decimales de la hoja de cálculo no autorizan a rechazar la propuesta.",
  "recordar": "Fijó el criterio de que el desglose explicativo de costos para precios bajos no reemplaza ni altera la propuesta económica del Anexo N° 6. Resolución 5518-2026-TCP-S4 Este cuestionamiento y su respuesta se desarrollan en el caso guiado 4 del capítulo 4 de la parte I. Consulta allí la fuente y el efecto final. Consulta el caso guiado correspondiente. Ir al caso 4",
  "precision": ""
 },
 {
  "caso": 573,
  "seccion": "4.1",
  "resolucion": "Resolución 8242-2026-TCP-S2",
  "cuestionamiento": "CONSTRUCTORA E INVERSIONES ED & BB cuestionó el rechazo de su precio por debajo de la cuantía y sostuvo que la entidad había exigido una justificación excesiva.",
  "resolvio": "Según el documento aportado, la Sala confirmó el rechazo después de verificar que se había requerido sustento de costos. El detalle omitía partidas exigidas, como el suministro e instalación de cortinas roller, lo que evidenciaba riesgo de incumplimiento. La razón reportada fue la insuficiencia concreta del costeo tras la revisión, no la sola diferencia de precio.",
  "recordar": "El detalle omitía partidas exigidas, como el suministro e instalación de cortinas roller, lo que evidenciaba riesgo de incumplimiento. Asignación de puntajes de bonificación",
  "precision": ""
 },
 {
  "caso": 574,
  "seccion": "5.1",
  "resolucion": "Resolución 6965-2025-TCP-S2",
  "cuestionamiento": "El comité de selección negó la bonificación del 10% al Consorcio impugnante 2 argumentando que el postor presentó su solicitud sin colocar expresamente el título o encabezado \"Anexo Nº 09\", además de no adjuntar copia del RNP.",
  "resolvio": "El Tribunal estableció que la omisión del título \"Anexo Nº 09\" es una formalidad no esencial. Del análisis integral del documento presentado se evidenciaba de forma expresa e inequívoca la voluntad del postor de solicitar la bonificación del 10% por ejecutar obras fuera de Lima y Callao y que sus integrantes pertenecían a la provincia o provincias colindantes. Al comprobarse el cumplimiento de los requisitos sustanciales, el Tribunal declaró fundado este extremo, asignó la bonificación del 10% al Consorcio impugnante 2 y ordenó reordenar la tabla de prelación.",
  "recordar": "Del análisis integral del documento presentado se evidenciaba de forma expresa e inequívoca la voluntad del postor de solicitar la bonificación del 10% por ejecutar obras fuera de Lima y Callao y que sus integrantes pertenecían a la provincia o provincias colindantes.",
  "precision": ""
 },
 {
  "caso": 575,
  "seccion": "5.1",
  "resolucion": "Resolución 7528-2025-TCP-S1",
  "cuestionamiento": "El impugnante solicitó recalcular la evaluación económica del Consorcio adjudicatario al no ser la más baja y corregir el orden de prelación otorgándole el primer lugar.",
  "resolvio": "Tras corregir el puntaje técnico a 100 puntos y aplicar la bonificación del 10% sobre el puntaje total por la ejecución de obras fuera de Lima y Callao, el impugnante alcanzó un puntaje final de 110.00 puntos frente a los 108.35 del adjudicatario. En consecuencia, el Tribunal revocó la buena pro otorgada al Consorcio Los Laureles y se la adjudicó a la empresa WILITOR S.A.C..",
  "recordar": "Tras corregir el puntaje técnico a 100 puntos y aplicar la bonificación del 10% sobre el puntaje total por la ejecución de obras fuera de Lima y Callao, el impugnante alcanzó un puntaje final de 110.00 puntos frente a los 108.35 del adjudicatario.",
  "precision": ""
 },
 {
  "caso": 576,
  "seccion": "5.1",
  "resolucion": "Resolución 908-2026-TCP-S2",
  "cuestionamiento": "El impugnante acusó al adjudicatario de presentar información inexacta en su Anexo N° 9 (Solicitud de Bonificación del 10% por obras fuera de Lima y Callao), solicitando la descalificación de su oferta por atentar contra el principio de presunción de veracidad.",
  "resolvio": "El Tribunal verificó que el comité no le otorgó la bonificación del 10% al adjudicatario por no cumplir los requisitos previstos en las bases. El Colegiado dejó sentado que la denegación o desestimación de una solicitud por no cumplir con las bases no convierte al documento en información inexacta ni vulnera la presunción de veracidad, sino que únicamente lleva a rechazar el beneficio solicitado.",
  "recordar": "El Colegiado dejó sentado que la denegación o desestimación de una solicitud por no cumplir con las bases no convierte al documento en información inexacta ni vulnera la presunción de veracidad, sino que únicamente lleva a rechazar el beneficio solicitado.",
  "precision": ""
 },
 {
  "caso": 577,
  "seccion": "5.1",
  "resolucion": "Resolución 3041-2026-TCP-S5",
  "cuestionamiento": "Un postor cuestionó la asignación de la bonificación del 10% sobre el puntaje total otorgada por colindancia geográfica al adjudicatario.",
  "resolvio": "El Tribunal analizó la procedencia del beneficio conforme al artículo 75 del Reglamento y determinó que en los supuestos donde la deducción o mantenimiento de dicha bonificación no altera el primer lugar en el orden de prelación ni el resultado del concurso, se confirma la validez del otorgamiento de la buena pro.",
  "recordar": "Verifica la condición, la solicitud y el cálculo de la bonificación.",
  "precision": ""
 },
 {
  "caso": 578,
  "seccion": "5.2",
  "resolucion": "Resolución 11-2026-TCP-S5",
  "cuestionamiento": "El comité de selección otorgó una bonificación del 5% sobre el puntaje total al Consorcio adjudicatario por contar con la condición de micro y pequeña empresa (MYPE). El Consorcio impugnante apeló argumentando que las bases integradas —que constituyen las reglas definitivas y obligatorias del procedimiento— no contemplaron en ningún extremo la presentación de anexos ni el otorgamiento de la bonificación del 5% por MYPE, reconociendo únicamente la bonificación por obras fuera de Lima y Callao (10%) y la exoneración del IGV.",
  "resolvio": "El Tribunal determinó que el comité de selección no puede aplicar bonificaciones de oficio ni por analogía si no están expresamente reguladas en las bases integradas del procedimiento. Las bases obligan estrictamente tanto a los postores como a la entidad. Al verificar que las bases aprobadas no incorporaron el formato ni la regla de la bonificación del 5% MYPE, el Tribunal declaró fundado el recurso, retiró la bonificación al adjudicatario, reconfiguró el orden de prelación ubicándolo en segundo lugar y le otorgó la buena pro al Consorcio impugnante.",
  "recordar": "El Tribunal determinó que el comité de selección no puede aplicar bonificaciones de oficio ni por analogía si no están expresamente reguladas en las bases integradas del procedimiento.",
  "precision": ""
 },
 {
  "caso": 579,
  "seccion": "5.2",
  "resolucion": "Resolución 1051-2026-TCP-S4",
  "cuestionamiento": "En el marco de un procedimiento de Licitación Pública para la adquisición de bienes, el Comité de Selección le otorgó al postor adjudicatario (FACOIMPEC E.I.R.L.) un puntaje adicional equivalente a una bonificación del 5% por contar con la condición de Micro y Pequeña Empresa (REMYPE). El postor impugnante (Negocios Innovaciones e Ingeniería S.A.) cuestionó dicho puntaje sosteniendo que la bonificación MYPE no correspondía ser aplicada en una licitación pública regular. La propia Entidad reconoció que cometió un error material al asignar dicha bonificación.",
  "resolvio": "El Tribunal declaró fundado el recurso de apelación. Explicó que, de acuerdo con la normativa aplicable, la bonificación del 5% por condición de MYPE aplica de forma exclusiva a los procedimientos de selección bajo modalidad abreviada, y no a las licitaciones públicas de esquema estándar. En consecuencia, el Tribunal retiró el puntaje otorgado por bonificación, recompuso la evaluación técnica y económica, revocó la buena pro y se la otorgó al impugnante al ocupar el primer lugar del orden de prelación.",
  "recordar": "En consecuencia, el Tribunal retiró el puntaje otorgado por bonificación, recompuso la evaluación técnica y económica, revocó la buena pro y se la otorgó al impugnante al ocupar el primer lugar del orden de prelación.",
  "precision": ""
 },
 {
  "caso": 580,
  "seccion": "5.2",
  "resolucion": "Resolución 5338-2026-TCP-S1",
  "cuestionamiento": "El impugnante solicitó que se le otorgara la bonificación del 5% MYPE tras haber presentado el Anexo N.° 18 y acreditado la condición MYPE de todos sus consorciados. La Entidad alegó que, según el artículo 81 del Reglamento, la condición MYPE únicamente se aplica en situaciones de empate técnico y no como puntaje en la evaluación si no hay empate.",
  "resolvio": "El Tribunal aclaró la confusión conceptual de la Entidad: el artículo 81 del Reglamento regula los criterios para resolver empates, mientras que las bases integradas preveían una bonificación del 5% sobre el puntaje total asignable en la etapa de evaluación de ofertas a favor de los postores MYPE que presentaran el Anexo N.° 18. Al haberse acreditado que el impugnante cumplió con presentar el anexo y la constancia activa en el REMYPE, el Tribunal declaró fundado este extremo, otorgó el 5% MYPE y le adjudicó la buena pro.",
  "recordar": "El Tribunal aclaró la confusión conceptual de la Entidad: el artículo 81 del Reglamento regula los criterios para resolver empates, mientras que las bases integradas preveían una bonificación del 5% sobre el puntaje total asignable en la etapa de evaluación de ofertas a favor de los postores MYPE que presentaran el Anexo N.° 18.",
  "precision": ""
 },
 {
  "caso": 581,
  "seccion": "5.2",
  "resolucion": "Resolución 7210-2026-TCP-S5",
  "cuestionamiento": "El impugnante cuestionó la bonificación del 5% otorgada al Consorcio adjudicatario, señalando que este no adjuntó en su oferta el Anexo N.° 18 (Solicitud de bonificación). La Entidad argumentó que no era necesario el anexo físico porque el postor declaró ser MYPE en su Anexo N.° 1 y ello fue verificado en el portal del REMYPE.",
  "resolvio": "El Tribunal determinó que las bases integradas condicionaban expresamente el otorgamiento de la bonificación a la presentación efectiva del Anexo N.° 18. La sola declaración en el Anexo N.° 1 o la existencia del registro en el REMYPE no reemplazan la manifestación de voluntad formal requerida mediante el Anexo N.° 18. En consecuencia, el Tribunal declaró fundado el cuestionamiento, revocó el 5% al adjudicatario (reduciendo su puntaje a 100) y ordenó al comité evaluar la oferta del impugnante para establecer un nuevo orden de prelación.",
  "recordar": "El Tribunal determinó que las bases integradas condicionaban expresamente el otorgamiento de la bonificación a la presentación efectiva del Anexo N.° 18.",
  "precision": ""
 },
 {
  "caso": 582,
  "seccion": "5.2",
  "resolucion": "Resolución 7529-2026-TCP-S6",
  "cuestionamiento": "El postor ubicado en segundo lugar (LC Biocorp S.A.C.) declaró en su Anexo N.° 1 (datos del postor) y en su Anexo N.° 16 contar con la condición MYPE y solicitó la bonificación del 5%. Sin embargo, el impugnante probó que, mediante Resolución Directoral del MTPE emitida previo a la presentación de ofertas, dicho postor fue dado de baja del REMYPE.",
  "resolvio": "El Tribunal confirmó que a la fecha de presentación de ofertas la empresa ya no contaba con la condición MYPE activa. Por ende, la declaración jurada en el Anexo N.° 1 contuvo información inexacta que quebrantó el principio de presunción de veracidad. El Tribunal declaró no admitida la oferta de LC Biocorp S.A.C., retiró la bonificación y ordenó abrir expediente sancionador en su contra.",
  "recordar": "Por ende, la declaración jurada en el Anexo N.° 1 contuvo información inexacta que quebrantó el principio de presunción de veracidad.",
  "precision": ""
 },
 {
  "caso": 583,
  "seccion": "5.2",
  "resolucion": "Resolución 7782-2026-TCP-S5",
  "cuestionamiento": "El impugnante 2 solicitó que el Tribunal le asignara directamente el 5% MYPE. Él adjuntó en su oferta el Anexo N.° 16, pero este presentaba errores formales de llenado, por lo que el comité no le otorgó el puntaje.",
  "resolvio": "El Tribunal dictaminó que la solicitud de bonificación MYPE (Anexo N.° 16) es un documento facultativo que no altera el contenido esencial de la oferta técnica ni económica, teniendo carácter subsanable. No obstante, al no ser un documento perfecto en su presentación original, el Tribunal declaró infundado el otorgamiento directo en esa instancia y ordenó al comité otorgar un plazo de subsanación al postor para que corrija su Anexo N.° 16.",
  "recordar": "El Tribunal dictaminó que la solicitud de bonificación MYPE (Anexo N.° 16) es un documento facultativo que no altera el contenido esencial de la oferta técnica ni económica, teniendo carácter subsanable.",
  "precision": ""
 },
 {
  "caso": 584,
  "seccion": "5.2",
  "resolucion": "Resolución 8439-2026-TCP-S5 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante cuestionó el 5% MYPE otorgado a la empresa Komatzu (2.º lugar), aduciendo que solo presentó una solicitud de trámite antigua (2014) y que no adjuntó una constancia de acreditación vigente en la oferta.",
  "resolvio": "El Tribunal precisó que las bases integradas no exigían adjuntar certificados físicos del REMYPE, sino únicamente presentar el Anexo N.° 16, quedando la verificación de la condición MYPE a cargo de la Entidad mediante consulta en el portal web oficial del Ministerio de Trabajo. Al constatar en el portal del REMYPE que Komatzu figura con estado \"Acreditado\" como microempresa desde 2014 sin baja, el Tribunal declaró infundado el cuestionamiento y ratificó la bonificación del 5%.",
  "recordar": "El Tribunal precisó que las bases integradas no exigían adjuntar certificados físicos del REMYPE, sino únicamente presentar el Anexo N.° 16, quedando la verificación de la condición MYPE a cargo de la Entidad mediante consulta en el portal web oficial del Ministerio de Trabajo.",
  "precision": ""
 },
 {
  "caso": 585,
  "seccion": "5.2",
  "resolucion": "Resolución 8439-2026-TCP-S5 · Cuestionamiento 2",
  "cuestionamiento": "El impugnante también pidió retirar el 5% MYPE otorgado al adjudicatario alegando falta de acreditación.",
  "resolvio": "El Tribunal verificó que el adjudicatario presentó en su oferta el Anexo N.° 16 debidamente suscrito y que figuraba con registro MYPE activo en el REMYPE. Por tanto, declaró infundado el reclamo y ratificó la buena pro a favor del adjudicatario.",
  "recordar": "El Tribunal verificó que el adjudicatario presentó en su oferta el Anexo N.° 16 debidamente suscrito y que figuraba con registro MYPE activo en el REMYPE. Resolución 8509-2026-TCP-S2 Este cuestionamiento y su respuesta se desarrollan en el caso guiado 5 del capítulo 5 de la parte I. Consulta allí la fuente y el efecto final. Consulta el caso guiado correspondiente. Ir al caso 5 Etapa de negociación",
  "precision": ""
 },
 {
  "caso": 586,
  "seccion": "6.4",
  "resolucion": "Resolución 8117-2026-TCP-S1",
  "cuestionamiento": "El postor redujo su oferta de S/ 1 800 000 a S/ 1 730 000 durante la negociación, pero la entidad declaró desierto el procedimiento porque no podía financiar los S/ 205 000 adicionales a la cuantía de S/ 1 525 000.",
  "resolvio": "El relato del caso indica que la Sala declaró infundado el recurso y mantuvo la declaratoria de desierto. La reducción no eliminaba la necesidad de contar con disponibilidad presupuestaria para la diferencia restante. El caso permite distinguir aceptar una rebaja de precio y obtener el respaldo financiero necesario para contratar.",
  "recordar": "La reducción no eliminaba la necesidad de contar con disponibilidad presupuestaria para la diferencia restante.",
  "precision": "La fuente identifica al impugnante con denominaciones que no son uniformes. Se utiliza “postor” para no atribuirle una identidad consorcial no confirmada en la resolución. Otorgamiento de la buena pro"
 },
 {
  "caso": 587,
  "seccion": "7.1",
  "resolucion": "Resolución 4708-2025-TCP-S1",
  "cuestionamiento": "Se discutía cómo continuar la adjudicación después de restituir la calificación de BADALSA, cuya oferta económica aún no había sido evaluada.",
  "resolvio": "Debido a que la propuesta económica de BADALSA no había sido evaluada por el comité de selección al momento de descalificarlo, el Tribunal dispuso que el comité proceda a evaluar su oferta económica y continúe con las actuaciones correspondientes para otorgar la buena pro a quien corresponda.",
  "recordar": "Identifica las actuaciones pendientes antes de atribuir una adjudicación.",
  "precision": ""
 },
 {
  "caso": 588,
  "seccion": "7.1",
  "resolucion": "Resolución 5604-2025-TCP-S4",
  "cuestionamiento": "Durante la reevaluación de ofertas ordenada por el Tribunal en un recurso anterior, el comité de selección pretendió volver a revisar la admisión de la propuesta del postor S & G Servicios Generales E.I.R.L., declarándola no admitida por un supuesto error material en el Anexo N° 10.",
  "resolvio": "El Tribunal enfatizó que las resoluciones emitidas por el Tribunal son de obligatorio cumplimiento para las Entidades y no pueden ser cuestionadas, reevaluadas ni desobedecidas por el comité de selección. Como en la resolución anterior la oferta ya había sido declarada expresamente admitida, el comité solo debía proceder a calificarla. Se dejó sin efecto el acto del comité y se ordenó continuar con el procedimiento.",
  "recordar": "Como en la resolución anterior la oferta ya había sido declarada expresamente admitida, el comité solo debía proceder a calificarla.",
  "precision": ""
 },
 {
  "caso": 589,
  "seccion": "7.1",
  "resolucion": "Resolución 167-2026-TCP-S4",
  "cuestionamiento": "El impugnante apeló el puntaje técnico otorgado a su oferta en el servicio de seguridad y vigilancia, solicitando el incremento de puntos y la descalificación del ganador.",
  "resolvio": "Tras revisar los documentos de evaluación técnica, el Tribunal reasignó al impugnante un puntaje de 90 puntos técnicos y revocó la buena pro otorgada, ordenando al comité llevar a cabo la evaluación económica de dicha propuesta.",
  "recordar": "Identifica las actuaciones pendientes antes de atribuir una adjudicación.",
  "precision": ""
 },
 {
  "caso": 590,
  "seccion": "7.1",
  "resolucion": "Resolución 3512-2026-TCP-S3",
  "cuestionamiento": "Se discutía a quién correspondía la buena pro tras corregir el puntaje técnico del impugnante y examinar la consistencia de la oferta económica del adjudicatario.",
  "resolvio": "Tras otorgar los 10 puntos al impugnante y descalificar al adjudicatario, el Tribunal reconfiguró el orden de prelación y le otorgó la buena pro a AMC INGENIEROS S.A.C.. Asimismo, ordenó a la Entidad realizar las acciones de fiscalización posterior sobre la documentación presentada por el adjudicatario descalificado en un plazo no mayor a 20 días hábiles.",
  "recordar": "Asimismo, ordenó a la Entidad realizar las acciones de fiscalización posterior sobre la documentación presentada por el adjudicatario descalificado en un plazo no mayor a 20 días hábiles.",
  "precision": ""
 },
 {
  "caso": 591,
  "seccion": "7.1",
  "resolucion": "Resolución 5662-2026-TCP-S1",
  "cuestionamiento": "Se solicitó modificar el resultado del procedimiento por cuestionamientos a la garantía comercial y a la mejora del modelo digital del terreno.",
  "resolvio": "Al desestimarse todos los cuestionamientos del impugnante contra su propia oferta y contra la del ganador, se declaró infundado el recurso de apelación y se confirmó la buena pro a favor de GEOSERVICE PERU S.A.C..",
  "recordar": "Identifica las actuaciones pendientes antes de atribuir una adjudicación.",
  "precision": ""
 },
 {
  "caso": 592,
  "seccion": "7.2",
  "resolucion": "Resolución 8974-2026-TCP-S1",
  "cuestionamiento": "Ante un empate de 100 puntos en el puntaje total, un postor solicitó que se le adjudique la buena pro al contar con la constancia del Registro de Empresas Promocionales para Personas con Discapacidad (REPPCD).",
  "resolvio": "El Tribunal declaró fundado el recurso y le otorgó la buena pro. Comprobó que al adjuntar la constancia vigente expedida por el Ministerio de Trabajo y la planilla del mes anterior, el postor acreditó el cumplimiento del criterio de desempate regulado en el artículo 81 del Reglamento.",
  "recordar": "Comprobó que al adjuntar la constancia vigente expedida por el Ministerio de Trabajo y la planilla del mes anterior, el postor acreditó el cumplimiento del criterio de desempate regulado en el artículo 81 del Reglamento. Resolución 8986-2026-TCP-S1 Este cuestionamiento y su respuesta se desarrollan en el caso guiado 7 del capítulo 7 de la parte I. Consulta allí la fuente y el efecto final. Consulta el caso guiado correspondiente. Ir al caso 7 Precisión de la fuente. Desde la página 98 la numeración de fundamentos se reinicia. Las referencias de estas fichas se apoyan también en el punto controvertido y en las páginas para evitar ambigüedad.",
  "precision": ""
 },
 {
  "caso": 593,
  "seccion": "7.3",
  "resolucion": "Resolución 2162-2024-TCE-S6",
  "cuestionamiento": "La Entidad retiró la buena pro al postor alegando que la tarjeta de la camioneta 4x4 consignaba el \"año modelo\" 2019 y no el \"año de fabricación\", concluyendo que no demostraba tener una antigüedad máxima de 5 años.",
  "resolvio": "El Tribunal declaró fundado el recurso y ordenó la firma del contrato. Reiteró que, conforme al Decreto Supremo N° 019-2018-MTC, la antigüedad vehicular se mide a partir del año modelo consignado en la tarjeta oficial, cumpliendo el equipo con el requisito.",
  "recordar": "Reiteró que, conforme al Decreto Supremo N° 019-2018-MTC, la antigüedad vehicular se mide a partir del año modelo consignado en la tarjeta oficial, cumpliendo el equipo con el requisito.",
  "precision": ""
 },
 {
  "caso": 594,
  "seccion": "7.3",
  "resolucion": "Resolución 928-2026-TCP-S4",
  "cuestionamiento": "La Entidad (FONAFE) declaró la pérdida automática de la buena pro al adjudicatario debido a que no acreditó el Título Técnico requerido para la persona propuesta como Recepcionista (solo registraba grado de bachiller). El adjudicatario alegó que, ante la renuncia de dicha trabajadora por motivos personales, presentó en la etapa de subsanación a un nuevo profesional equivalente para reemplazarla, lo cual consideró válido.",
  "resolvio": "El Tribunal determinó que en la etapa de perfeccionamiento del contrato no es jurídicamente admisible reemplazar o sustituir al personal clave previamente evaluado en la oferta técnica para intentar cumplir un requisito incumplido. Sustituir profesionales en esta fase altera la propuesta adjudicada y vulnera el principio de igualdad de trato. Al confirmarse que la profesional originalmente ofertada no cumplía con el perfil técnico exigido, el Tribunal declaró infundado el recurso y validó la pérdida de la buena pro por causa imputable al postor.",
  "recordar": "El Tribunal determinó que en la etapa de perfeccionamiento del contrato no es jurídicamente admisible reemplazar o sustituir al personal clave previamente evaluado en la oferta técnica para intentar cumplir un requisito incumplido.",
  "precision": ""
 },
 {
  "caso": 595,
  "seccion": "7.3",
  "resolucion": "Resolución 1263-2026-TCP-S1",
  "cuestionamiento": "La empresa SUPPLIER & SERVICE CORPORATION S.A.C. impugnó la pérdida de la buena pro dictada por la SUNAT. La Entidad le retiró la buena pro argumentando que no presentó la Licencia de Funcionamiento del local ofertado (predio de 20 m² en Tambopata) dentro del plazo de subsanación otorgado durante el perfeccionamiento del contrato.",
  "resolvio": "El Tribunal revisó el listado del numeral 2.3 del Capítulo II de las Bases Integradas (\"Requisitos para perfeccionar el contrato\") y constató que la Licencia de Funcionamiento de la infraestructura no estaba contemplada entre los documentos exigibles para la firma del contrato. En aplicación del Principio de Transparencia y Facilidad de Uso, la Entidad no puede despojar de la buena pro a un postor exigiendo documentos que no fueron fijados claramente en el listado de requisitos de perfeccionamiento. En consecuencia, declaró fundado el recurso, revocó la pérdida de la buena pro y ordenó suscribir el contrato.",
  "recordar": "El Tribunal revisó el listado del numeral 2.3 del Capítulo II de las Bases Integradas (\"Requisitos para perfeccionar el contrato\") y constató que la Licencia de Funcionamiento de la infraestructura no estaba contemplada entre los documentos exigibles para la firma del contrato.",
  "precision": ""
 },
 {
  "caso": 596,
  "seccion": "7.3",
  "resolucion": "Resolución 7983-2026-TCP-S1",
  "cuestionamiento": "La empresa GATT PERU S.R.L. impugnó la pérdida de la buena pro declarada por la Municipalidad de La Victoria. En su oferta técnica, declaró bajo juramento que el taller para los mantenimientos estaba ubicado en el distrito de Ate (Localidad 1), lo que le sirvió para obtener el puntaje máximo de 15 puntos en este factor de evaluación. Sin embargo, al momento de presentar los documentos para la firma del contrato, pretendió acreditar un taller ubicado en Villa El Salvador y, tras las fiscalizaciones, la empresa propietaria del taller de Ate (De Soto Motors S.A.) negó haberle otorgado autorización o mantener vínculo con ella.",
  "resolvio": "El Tribunal estableció que el taller declarado en la oferta para la obtención de puntaje constituye una condición evaluada y vinculante. El postor no puede modificar intempestivamente la localización o el establecimiento puntuado durante la firma del contrato, pues ello alteraría la propuesta evaluada y vulneraría el principio de igualdad de trato frente a los demás competidores. Al no acreditar la disponibilidad del taller de Ate que sustento sus 15 puntos, el Tribunal declaró infundado el recurso y confirmó la pérdida de la buena pro.",
  "recordar": "El Tribunal estableció que el taller declarado en la oferta para la obtención de puntaje constituye una condición evaluada y vinculante.",
  "precision": ""
 },
 {
  "caso": 597,
  "seccion": "A.1",
  "resolucion": "Resolución 3299-2025-TCP-S5",
  "cuestionamiento": "El adjudicatario cuestionó la admisión del impugnante señalando que en su Anexo Nº 6 (precio de la oferta) no se había indicado la fecha exacta de la determinación del presupuesto o la vigencia de precios establecida en la absolución de consultas.",
  "resolvio": "El Tribunal desestimó el cuestionamiento. Determinó que este aspecto referente a la admisión de la oferta ya había sido analizado y cerrado mediante pronunciamientos y resoluciones previas del propio Tribunal en el mismo procedimiento, por lo que, en respeto al principio de seguridad jurídica y firmeza de los actos administrativos, no correspondía reabrir el debate sobre la admisión documental del Anexo Nº 6.",
  "recordar": "Determinó que este aspecto referente a la admisión de la oferta ya había sido analizado y cerrado mediante pronunciamientos y resoluciones previas del propio Tribunal en el mismo procedimiento, por lo que, en respeto al principio de seguridad jurídica y firmeza de los actos administrativos, no correspondía reabrir el debate sobre la admisión documental del Anexo Nº 6.",
  "precision": ""
 },
 {
  "caso": 598,
  "seccion": "A.1",
  "resolucion": "Resolución 6144-2025-TCP-S3",
  "cuestionamiento": "El impugnante pretendía que se declare la nulidad del proceso argumentando que las bases integradas debieron incorporar al menos tres factores de evaluación facultativos en lugar de dos.",
  "resolvio": "El Tribunal declaró improcedente esta pretensión, recordando que las bases integradas constituyen reglas definitivas e inimpugnables a través del recurso de apelación contra la buena pro. Asimismo, el impugnante no cuestionó la no admisión de su propia oferta, por lo que carecía de legitimidad e interés para obrar.",
  "recordar": "Asimismo, el impugnante no cuestionó la no admisión de su propia oferta, por lo que carecía de legitimidad e interés para obrar.",
  "precision": ""
 },
 {
  "caso": 599,
  "seccion": "A.1",
  "resolucion": "Resolución 6274-2025-TCP-S1",
  "cuestionamiento": "Recurso de apelación interpuesto contra la descalificación de la oferta y el otorgamiento de la buena pro en un procedimiento de selección abreviado.",
  "resolvio": "El Tribunal declaró IMPROCEDENTE el recurso por extemporaneidad. Precisó que el recurso fue presentado vencido el plazo legal de ocho (8) días hábiles contados desde la notificación en el SEACE, lo que impidió un pronunciamiento sobre el fondo del asunto.",
  "recordar": "Precisó que el recurso fue presentado vencido el plazo legal de ocho (8) días hábiles contados desde la notificación en el SEACE, lo que impidió un pronunciamiento sobre el fondo del asunto.",
  "precision": ""
 },
 {
  "caso": 600,
  "seccion": "A.1",
  "resolucion": "Resolución 8454-2025-TCP-S1",
  "cuestionamiento": "Un postor pidió anular el proceso en su apelación porque las bases asignaron 35 puntos a la experiencia adicional del personal clave en lugar del máximo de 20 puntos establecido en la base estándar.",
  "resolvio": "El Tribunal declaró improcedente la pretensión. Aclaró que las bases integradas son definitivas e inimpugnables en la etapa de apelación, no pudiendo revisarse vicios de redacción de las bases mediante un recurso de impugnación contra el otorgamiento de la buena pro.",
  "recordar": "Aclaró que las bases integradas son definitivas e inimpugnables en la etapa de apelación, no pudiendo revisarse vicios de redacción de las bases mediante un recurso de impugnación contra el otorgamiento de la buena pro.",
  "precision": ""
 },
 {
  "caso": 601,
  "seccion": "A.1",
  "resolucion": "Resolución 1564-2026-TCP-S6",
  "cuestionamiento": "El postor impugnante pretendió cuestionar la calificación de la experiencia del adjudicatario a pesar de que la descalificación de su propia oferta había sido confirmada y alcanzado firmeza en resoluciones anteriores emitida por el mismo Tribunal.",
  "resolvio": "El Tribunal declaró improcedente el recurso de apelación debido a que, al haber quedado firme la descalificación del impugnante, este carecía de legitimidad e interés para obrar, pues no existía la posibilidad legal de que obtuviera la buena pro.",
  "recordar": "Distingue el pronunciamiento de fondo de los efectos procesales.",
  "precision": ""
 },
 {
  "caso": 602,
  "seccion": "A.1",
  "resolucion": "Resolución 2621-2026-TCP-S5",
  "cuestionamiento": "Después de anularse una resolución municipal de nulidad y restituirse la buena pro, un postor pretendió cuestionar nuevamente la evaluación técnica fuera del plazo de apelación.",
  "resolvio": "El documento 12 reporta improcedencia por presentación extemporánea. El documento 16 explica el antecedente de nulidad y la preclusión de la evaluación. La ficha distingue el antecedente sobre defensa del adjudicatario de la decisión posterior sobre el plazo para recurrir.",
  "recordar": "El documento 12 reporta improcedencia por presentación extemporánea.",
  "precision": "El fallo completo no integra los PDF aportados; no se presenta el antecedente de otra resolución como una nueva decisión de fondo de este expediente."
 },
 {
  "caso": 603,
  "seccion": "A.1",
  "resolucion": "Resolución 3043-2026-TCP-S2",
  "cuestionamiento": "Un postor que fue descalificado del procedimiento interpuso un recurso de apelación cuestionando las bases integradas y la oferta del adjudicatario, pero sin lograr revertir las causales que motivaron su propia descalificación.",
  "resolvio": "El Tribunal declaró improcedente el recurso por falta de legitimidad e interés para obrar. Determinó que, en la normativa de contrataciones del Estado, para que un participante pueda cuestionar la adjudicación de la buena pro o las ofertas de sus competidores, necesariamente debe revertir primero su condición de descalificado y recobrar la condición de postor hábil; de lo contrario, carece de derecho a discutir las etapas posteriores de la evaluación.",
  "recordar": "Determinó que, en la normativa de contrataciones del Estado, para que un participante pueda cuestionar la adjudicación de la buena pro o las ofertas de sus competidores, necesariamente debe revertir primero su condición de descalificado y recobrar la condición de postor hábil; de lo contrario, carece de derecho a discutir las etapas posteriores de la evaluación.",
  "precision": ""
 },
 {
  "caso": 604,
  "seccion": "A.1",
  "resolucion": "Resolución 5492-2026-TCP-S6",
  "cuestionamiento": "Recurso de apelación interpuesto contra la evaluación de la oferta del adjudicatario en un Concurso Público Abreviado de Servicios.",
  "resolvio": "El Tribunal declaró IMPROCEDENTE el recurso por falta de competencia. Determinó que al ser el valor referencial del procedimiento de selección inferior a 50 UIT, la competencia para resolver la apelación le correspondía al Titular de la Entidad y no al Tribunal.",
  "recordar": "Determinó que al ser el valor referencial del procedimiento de selección inferior a 50 UIT, la competencia para resolver la apelación le correspondía al Titular de la Entidad y no al Tribunal.",
  "precision": ""
 },
 {
  "caso": 605,
  "seccion": "A.1",
  "resolucion": "Resolución 7092-2026-TCP-S1",
  "cuestionamiento": "El impugnante formuló cuestionamientos sobre vicios en la etapa de evaluación de ofertas y aplicación de las bases estándar.",
  "resolvio": "El Tribunal declaró improcedente el recurso de apelación debido al incumplimiento de los requisitos de procedibilidad/legitimidad procesal estipulados en el artículo 308 del Reglamento. Únicamente dispuso remitir los antecedentes a la Entidad como cuestión de interés público.",
  "recordar": "Únicamente dispuso remitir los antecedentes a la Entidad como cuestión de interés público.",
  "precision": ""
 },
 {
  "caso": 606,
  "seccion": "A.1",
  "resolucion": "Resolución 7765-2026-TCP-S5",
  "cuestionamiento": "El postor Transla Corporation E.I.R.L. interpuso recurso de apelación contra la descalificación de su oferta en un proceso para la contratación de servicios.",
  "resolvio": "El Tribunal no emitió pronunciamiento de fondo sobre los requisitos de calificación ni de admisión debido a que el valor de la cuantía del procedimiento ascendía a S/ 228,459.00, monto que resultaba inferior a 50 UIT (S/ 275,000.00 para el año 2026). Conforme a la Ley General de Contrataciones Públicas, los recursos de apelación en procesos cuya cuantía sea menor a 50 UIT deben ser conocidos y resueltos por el Titular de la Entidad Contratante y no por el Tribunal. Por tanto, se declaró improcedente el recurso por incompetencia del Tribunal.",
  "recordar": "Conforme a la Ley General de Contrataciones Públicas, los recursos de apelación en procesos cuya cuantía sea menor a 50 UIT deben ser conocidos y resueltos por el Titular de la Entidad Contratante y no por el Tribunal.",
  "precision": ""
 },
 {
  "caso": 607,
  "seccion": "A.1",
  "resolucion": "Resolución 8100-2026-TCP-S1",
  "cuestionamiento": "Un participante cuestionó deficiencias en los Términos de Referencia de las bases integradas.",
  "resolvio": "Declaró improcedente el cuestionamiento por haber operado la figura de la preclusión, dado que las observaciones a las bases deben formularse en la etapa correspondiente y no reabrirse en vía de apelación.",
  "recordar": "Distingue el pronunciamiento de fondo de los efectos procesales.",
  "precision": ""
 },
 {
  "caso": 608,
  "seccion": "A.1",
  "resolucion": "Resolución 8121-2026-TCP-S3 · Cuestionamiento 1",
  "cuestionamiento": "El impugnante pretendió descontar puntaje al adjudicatario argumentando un supuesto traslape de 118 días en dos certificados de experiencia de uno de sus especialistas.",
  "resolvio": "El Tribunal declaró IMPROCEDENTE el cuestionamiento. Explicó que operó el principio de preclusión, toda vez que los documentos obraban en la oferta desde el inicio del proceso y no fueron cuestionados en los dos recursos de apelación anteriores tramitados sobre la misma licitación, habiéndose agotado la oportunidad procesal para controvertirlos.",
  "recordar": "Explicó que operó el principio de preclusión, toda vez que los documentos obraban en la oferta desde el inicio del proceso y no fueron cuestionados en los dos recursos de apelación anteriores tramitados sobre la misma licitación, habiéndose agotado la oportunidad procesal para controvertirlos.",
  "precision": ""
 },
 {
  "caso": 609,
  "seccion": "A.1",
  "resolucion": "Resolución 8121-2026-TCP-S3 · Cuestionamiento 2",
  "cuestionamiento": "Al absolver el recurso de apelación, el adjudicatario cuestionó la experiencia del Coordinador BIM propuesto por el impugnante sobre la base de un Informe de Hito de Control de la Contraloría/OCI, solicitando la descalificación de la oferta de dicho impugnante.",
  "resolvio": "El Tribunal declaró improcedente dicho cuestionamiento por haber precluido la oportunidad procesal para formularlo. Se verificó que el adjudicatario contó con etapas e impugnaciones previas en las que pudo objetar la experiencia de dicho profesional y no lo hizo. En el procedimiento administrativo rige el principio de preclusión y seguridad jurídica, impidiendo reabrir discusiones sobre documentos que ya eran de conocimiento de las partes en etapas anteriores.",
  "recordar": "Se verificó que el adjudicatario contó con etapas e impugnaciones previas en las que pudo objetar la experiencia de dicho profesional y no lo hizo.",
  "precision": ""
 },
 {
  "caso": 610,
  "seccion": "A.1",
  "resolucion": "Resolución 8140-2026-TCP-S2",
  "cuestionamiento": "El impugnante solicitó restar puntaje al adjudicatario en el factor Sostenibilidad Social aduciendo que su certificado de responsabilidad social SA 8000 no contaba con trazabilidad ni acreditación ante la entidad matriz SAAS.",
  "resolvio": "El Tribunal declaró improcedente/infundado el cuestionamiento. Estableció que el impugnante no formuló ninguna impugnación contra la evaluación técnica del adjudicatario dentro del plazo legal de ocho (8) días hábiles posteriores a la publicación del acta, por lo que dicho acto adquirió la condición de acto administrativo consentido, no siendo susceptible de revisión posterior.",
  "recordar": "Estableció que el impugnante no formuló ninguna impugnación contra la evaluación técnica del adjudicatario dentro del plazo legal de ocho (8) días hábiles posteriores a la publicación del acta, por lo que dicho acto adquirió la condición de acto administrativo consentido, no siendo susceptible de revisión posterior.",
  "precision": ""
 },
 {
  "caso": 611,
  "seccion": "A.2",
  "resolucion": "Resolución 6794-2026-TCP-S4",
  "cuestionamiento": "El consorcio impugnante (ganador de la buena pro) apeló la Resolución de Gerencia Municipal N° 113-2026-MPSM/GM con la cual la Entidad anuló de oficio el otorgamiento de la buena pro por presunta información inexacta en un certificado de trabajo. Alegó que la Entidad declaró la nulidad sin haberle corrido traslado previo del vicio detectado en la verificación posterior, impidiéndole ejercer su derecho de defensa.",
  "resolvio": "El Tribunal declaró fundado el recurso y nula la Resolución de Gerencia Municipal N° 113-2026-MPSM/GM. Fundamentó que la potestad de nulidad de oficio de las entidades públicas exige garantizar el debido procedimiento. Al omitirse la notificación previa al postor adjudicado para que presente sus descargos en un plazo no menor a 5 días hábiles, se incurrió en una vulneración insubsanable del derecho de defensa. Se dispuso retrotraer el trámite municipal para que la Entidad le otorgue el traslado de ley antes de resolver.",
  "recordar": "Fundamentó que la potestad de nulidad de oficio de las entidades públicas exige garantizar el debido procedimiento.",
  "precision": ""
 },
 {
  "caso": 612,
  "seccion": "A.2",
  "resolucion": "Resolución 8029-2026-TCP-S2",
  "cuestionamiento": "La entidad no publicó en el SEACE los documentos e informes de subsanación de la oferta del adjudicatario.",
  "resolvio": "El relato del caso describe una nulidad de oficio por afectación de transparencia y derecho de defensa. Se conserva como cuestión procesal; no se le atribuye una decisión de fondo sobre la validez técnica de la oferta.",
  "recordar": "Se conserva como cuestión procesal; no se le atribuye una decisión de fondo sobre la validez técnica de la oferta.",
  "precision": ""
 },
 {
  "caso": 613,
  "seccion": "A.2",
  "resolucion": "Resolución 8430-2026-TCP-S3",
  "cuestionamiento": "El comité revisó la estructura de costos y la oferta económica durante la admisión.",
  "resolvio": "La fuente reporta nulidad de oficio por alterar la secuencia de las etapas. La ficha se refiere al vicio procedimental y no permite afirmar que el Tribunal aceptó o rechazó definitivamente el precio ofertado.",
  "recordar": "La ficha se refiere al vicio procedimental y no permite afirmar que el Tribunal aceptó o rechazó definitivamente el precio ofertado.",
  "precision": ""
 },
 {
  "caso": 614,
  "seccion": "A.2",
  "resolucion": "Resolución 8742-2026-TCP-S2",
  "cuestionamiento": "Se aplicó el procedimiento de rechazo de ofertas por debajo de la cuantía durante la admisión.",
  "resolvio": "El relato del caso describe nulidad de oficio: ese examen debía efectuarse en la evaluación económica. La nulidad no equivale a declarar que la oferta era económicamente viable.",
  "recordar": "La nulidad no equivale a declarar que la oferta era económicamente viable. Resolución 2621-2026-TCP-S5: la misma controversia se desarrolla una sola vez en el apartado A.1.",
  "precision": ""
 },
 {
  "caso": 615,
  "seccion": "A.3",
  "resolucion": "Resolución 8454-2026-TCP-S4",
  "cuestionamiento": "Se cuestionaron la experiencia del personal clave, la oferta económica y el BEP del adjudicatario; durante el recurso, el impugnante solicitó desistirse.",
  "resolvio": "Durante la tramitación del recurso, el Consorcio impugnante presentó un escrito con firma legalizada notarialmente manifestando su voluntad expresa de desistirse del recurso de apelación. El Tribunal evaluó el pedido conforme al Reglamento y verificó el cumplimiento de las tres condiciones legales: (i) escrito con formalidad notarial, (ii) presentado antes de declarar el expediente listo para resolver, y (iii) la materia en debate correspondía a intereses exclusivamente particulares, por lo que su aceptación no afectaba el interés público. En consecuencia, la Sala resolvió Aceptar el desistimiento, dar por concluido el procedimiento administrativo sin pronunciarse sobre el fondo de las materias impugnadas (dejando firmes los actos del procedimiento de selección) y disponer la ejecución de la garantía de apelación.",
  "recordar": "El Tribunal evaluó el pedido conforme al Reglamento y verificó el cumplimiento de las tres condiciones legales: (i) escrito con formalidad notarial, (ii) presentado antes de declarar el expediente listo para resolver, y (iii) la materia en debate correspondía a intereses exclusivamente particulares, por lo que su aceptación no afectaba el interés público.",
  "precision": ""
 },
 {
  "caso": 616,
  "seccion": "A.3",
  "resolucion": "Resolución 8563-2026-TCP-S6",
  "cuestionamiento": "El impugnante interpuso recurso de apelación cuestionando la asignación de puntajes en Sostenibilidad Social, Ambiental y Gestión de Calidad, pero posteriormente presentó una carta de desistimiento antes de la emisión del fallo.",
  "resolvio": "El Tribunal, en estricta aplicación del TUO de la LPAG y el Reglamento, dio por aceptado el desistimiento del procedimiento formulado voluntariamente por el postor y dio por concluido el expediente.",
  "recordar": "Distingue el pronunciamiento de fondo de los efectos procesales.",
  "precision": ""
 },
 {
  "caso": 617,
  "seccion": "A.4",
  "resolucion": "Resolución 5067-2025-TCP-S2",
  "cuestionamiento": "Se inició procedimiento sancionador contra los integrantes del Consorcio TM-CHOTA (T Y C Pizarro Ingenieros E.I.R.L. y Arled S.A.C.) por haber presentado, durante el trámite de firma de contrato, un Contrato de Consorcio con certificación notarial de firmas presuntamente falsa atribuida al Notario de Lima Jorge Luis Gonzales Loli.",
  "resolvio": "El Notario Gonzales Loli confirmó de forma categórica que las firmas y sellos notariales del documento no pertenecían a su despacho. El Tribunal recordó que en la infracción administrativa el verbo rector es \"presentar\" el documento falso, siendo los consorciados solidariamente responsables de la actuación de su representante. Aplicando el principio de retroactividad benigna sobre la graduación del plazo sancionador previsto en la Ley Nº 32069, el Tribunal resolvió SANCIONAR a ambas empresas con 25 meses de inhabilitación temporal para contratar con el Estado y derivó copia de lo actuado al Ministerio Público.",
  "recordar": "El Tribunal recordó que en la infracción administrativa el verbo rector es \"presentar\" el documento falso, siendo los consorciados solidariamente responsables de la actuación de su representante.",
  "precision": ""
 },
 {
  "caso": 618,
  "seccion": "A.4",
  "resolucion": "Resolución 7044-2025-TCP-S4",
  "cuestionamiento": "Procedimiento administrativo sancionador iniciado contra un persona por supuestamente haber contratado con el Estado (vía locación de servicios) encontrándose impedido por laborar en la misma Entidad.",
  "resolvio": "El Tribunal declaró que CARECE DE COMPETENCIA para pronunciarse o sancionar. Verificó que en la vía judicial civil/laboral se emitió una sentencia firme que declaró la existencia de una relación laboral desnaturalizada a plazo indeterminado, reconociendo al denunciado como trabajador sujeto al régimen laboral desde el inicio de sus actividades.",
  "recordar": "Verificó que en la vía judicial civil/laboral se emitió una sentencia firme que declaró la existencia de una relación laboral desnaturalizada a plazo indeterminado, reconociendo al denunciado como trabajador sujeto al régimen laboral desde el inicio de sus actividades.",
  "precision": ""
 },
 {
  "caso": 619,
  "seccion": "A.4",
  "resolucion": "Resolución 7327-2025-TCP-S3",
  "cuestionamiento": "Se inició un procedimiento administrativo sancionador contra un proveedor por la presunta presentación de un diploma de Bachiller en Ingeniería falso/inexacto para acreditar la formación académica requerida en una contratación de servicios.",
  "resolvio": "El Tribunal precisó que para configurar la infracción de presentación de documentos falsos o inexactos se requieren dos elementos indispensables: 1) la acreditación fehaciente de la presentación efectiva del documento ante la Entidad, y 2) la verificación de su falsedad o inexactitud. Tras requerir las pruebas, la Entidad no pudo remitir el cargo de recepción, correo de envío ni expediente en el que conste que el proveedor presentó efectivamente dicho diploma dentro de su cotización. En aplicación del principio de tipicidad y presunción de licitud, al no haberse probado la presentación material del documento, se declaró NO HA LUGAR la sanción.",
  "recordar": "El Tribunal precisó que para configurar la infracción de presentación de documentos falsos o inexactos se requieren dos elementos indispensables: 1) la acreditación fehaciente de la presentación efectiva del documento ante la Entidad, y 2) la verificación de su falsedad o inexactitud.",
  "precision": ""
 },
 {
  "caso": 620,
  "seccion": "A.4",
  "resolucion": "Resolución 2747-2026-TCP-S1",
  "cuestionamiento": "En el marco de un procedimiento sancionador (vía reconsideración), la empresa sancionada pretendía revocar la inhabilitación impuesta por haber presentado una promesa/contrato de consorcio con legalización notarial de firma que resultó ser falsa, presentando una declaración jurada posterior del notario pretendiendo validar el acto.",
  "resolvio": "El Tribunal declaró infundado el recurso y confirmó la sanción. Señaló que cuando la administración constata de manera fehaciente (mediante informes notariales originales o pericias) la adulteración o falsedad de la certificación notarial de un documento en la oferta, la presunción de veracidad se quiebra de forma irreversible, no siendo idóneas las declaraciones juradas extemporáneas para revertir el hecho consumado.",
  "recordar": "Señaló que cuando la administración constata de manera fehaciente (mediante informes notariales originales o pericias) la adulteración o falsedad de la certificación notarial de un documento en la oferta, la presunción de veracidad se quiebra de forma irreversible, no siendo idóneas las declaraciones juradas extemporáneas para revertir el hecho consumado.",
  "precision": ""
 },
 {
  "caso": 621,
  "seccion": "A.5",
  "resolucion": "Pronunciamiento OECE 533-2025 · Cuestionamiento 1",
  "cuestionamiento": "Un participante cuestionó las respuestas del comité sobre las especificaciones técnicas de las tuberías y exigencias normativas (NTP ISO 21138 SN4).",
  "resolvio": "El OECE precisó que el pliego absolutorio no puede alterar de forma injustificada las especificaciones técnicas fijadas en el expediente técnico. No obstante, aclaró que los postores quedan facultados para acreditar la equivalencia técnica de otras normas internacionales equivalentes durante la etapa de evaluación de ofertas.",
  "recordar": "No obstante, aclaró que los postores quedan facultados para acreditar la equivalencia técnica de otras normas internacionales equivalentes durante la etapa de evaluación de ofertas.",
  "precision": ""
 },
 {
  "caso": 622,
  "seccion": "A.5",
  "resolucion": "Pronunciamiento OECE 533-2025 · Cuestionamiento 2",
  "cuestionamiento": "Revisión de las reglas de verificación de los títulos profesionales del personal clave.",
  "resolvio": "Dispuso de oficio que la verificación del grado o título profesional la realizan directamente los evaluadores en el registro público en línea de SUNEDU. La presentación de la copia simple del diploma solo es obligatoria para títulos otorgados en el extranjero que no figuren en dicho registro público.",
  "recordar": "La presentación de la copia simple del diploma solo es obligatoria para títulos otorgados en el extranjero que no figuren en dicho registro público.",
  "precision": ""
 }
];
