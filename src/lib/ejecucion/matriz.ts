/**
 * La matriz: actuación + tipo de contratación + perfil emisor + lo que
 * ya hay en el expediente = lo mínimo que hace falta.
 *
 * Es la sección 9 del documento de César. No la decide el modelo: la
 * decide la norma, y la norma no cambia de una consulta a otra. Cada
 * requisito dice qué documento lo acredita, en qué nivel está
 * (1 indispensable, 2 según el caso, 3 complementario), POR QUÉ se pide
 * —regla 8 del prompt rector— y en qué artículo se apoya. Todos los
 * artículos se comprobaron contra el texto consolidado de la Ley N.°
 * 32069 y su Reglamento de la biblioteca (Editora Perú, actualizado al
 * 04-02-2026, con las modificaciones del D.S. N.° 001-2026-EF).
 *
 * La solicitud es condicional, no masiva: una reducción de servicios no
 * pide cuaderno de obra ni opinión del supervisor; una ampliación de
 * obra sí. Eso lo hacen las condiciones `aplica`.
 */
import type { Actuacion, ClaseDocumental, Perfil, TipoContratacion } from './catalogo';
import type { CampoFicha, Nivel, PasoDeLaCadena, TipoDeDocumento } from './tipos';

export interface Contexto {
  perfil: Perfil;
  tipo: TipoContratacion | null;
  /** «diseño y construcción», «solo construcción»… tal como vino. */
  sistemaEntrega: string | null;
  /** El contrato tiene supervisión de terceros (obras). */
  supervisado: boolean | null;
  regimen: 'ley_32069' | 'ley_30225' | 'por_determinar';
  /** Respuestas a las preguntas decisivas, por su id. */
  respuestas: Record<string, string>;
}

export interface ReglaRequisito {
  id: string;
  texto: string;
  nivel: Nivel | ((c: Contexto) => Nivel);
  /** Cualquiera de estas clases lo acredita (también si viene dentro de otro). */
  acreditaCon: ClaseDocumental[];
  /**
   * Si estos datos ya están en la ficha, el documento no hace falta: el
   * contrato se pide «cuando no se conoce el objeto, monto o plazo».
   */
  bastanLosDatos?: CampoFicha[];
  /** Lo acredita un hecho probado, no una clase de documento. */
  porHecho?: boolean;
  porQue: string;
  base?: string;
  aplica?: (c: Contexto) => boolean;
}

export interface ReglaCondicion {
  id: string;
  texto: string;
  base: string;
  aplica?: (c: Contexto) => boolean;
}

export interface Organo {
  organo: string;
  base: string;
  verificar: string;
}

export interface DefinicionDeActuacion {
  requisitos: ReglaRequisito[];
  condiciones: ReglaCondicion[];
  /** Los artículos que se le dan al modelo como sustento. */
  articulos: (c: Contexto) => { ley: number[]; reglamento: number[] };
  organo: (c: Contexto) => Organo;
  cadena: (c: Contexto) => PasoDeLaCadena[];
  explicacion: (c: Contexto) => string;
  /** La figura no corresponde para este tipo de contrato (⚫). */
  noCorresponde?: (c: Contexto) => { razon: string; alternativa: Actuacion | null } | null;
}

// ── Atajos ───────────────────────────────────────────────────────────

const ENTIDAD_DECIDE: Perfil[] = ['dec', 'asesoria_juridica', 'aga', 'titular'];
const esObra = (c: Contexto) => c.tipo === 'obra';
const esConsultoriaObra = (c: Contexto) => c.tipo === 'consultoria_obra';
const esObraOConsultoria = (c: Contexto) => esObra(c) || esConsultoriaObra(c);
const esBienesOServicios = (c: Contexto) => c.tipo === 'bienes' || c.tipo === 'servicios';
const desdeLaEntidad = (c: Contexto) => ENTIDAD_DECIDE.includes(c.perfil);
const decide = (c: Contexto) => c.perfil === 'aga' || c.perfil === 'titular';
const esDisenoYConstruccion = (c: Contexto) => /dise[ñn]o/i.test(c.sistemaEntrega ?? '');
const supervisado = (c: Contexto) => esObra(c) || (esConsultoriaObra(c) && c.supervisado === true);
// Sin `\b`: en JavaScript la «í» no es letra para `\b`, y «Sí» no casaba.
const si = (c: Contexto, id: string) => /^s[ií](?![a-záéíóúñ])/i.test((c.respuestas[id] ?? '').trim());

const LEY = 'de la Ley';
const REG = 'del Reglamento';
const art = (n: string, articulo: number, de: string) => `numeral ${n} del artículo ${articulo} ${de}`;

/** El contrato: se pide solo si no se conocen objeto, monto y plazo. */
const CONTRATO: ReglaRequisito = {
  id: 'contrato',
  texto: 'Contrato (objeto, monto y plazo)',
  nivel: 1,
  acreditaCon: ['contrato', 'orden', 'adenda'],
  bastanLosDatos: ['objeto', 'monto_original', 'plazo_dias'],
  porQue: 'Sin el objeto, el monto y el plazo del contrato no se puede calcular ni comprobar ningún límite.',
};

const DELEGACION: ReglaRequisito = {
  id: 'delegacion',
  texto: 'Resolución de delegación de facultades de quien suscribe',
  nivel: 1,
  acreditaCon: ['delegacion'],
  porQue: 'Quien firma actúa por delegación: sin la resolución que la otorga no se puede verificar la competencia.',
  base: art('105.4', 105, REG),
  aplica: (c) => si(c, 'delegacion'),
};

const CONTROL: ReglaRequisito = {
  id: 'control',
  texto: 'Documento del órgano de control (requerimiento, pliego de hechos u observaciones)',
  nivel: 1,
  acreditaCon: ['documento_control'],
  porQue: 'La defensa responde a lo que el órgano de control observa: sin ese documento no se sabe qué se debe sustentar.',
  aplica: (c) => c.perfil === 'defensa',
};

/** El informe formal del Área Usuaria, que es antecedente de la DEC en adelante. */
const INFORME_AREA_USUARIA = (base: string, porQue: string): ReglaRequisito => ({
  id: 'informe_area_usuaria',
  texto: 'Informe técnico del Área Usuaria (versión oficialmente emitida)',
  // La autoridad no decide sin él; la DEC y Asesoría Jurídica pueden
  // adelantar un borrador condicionado mientras llega.
  nivel: (c) => (decide(c) ? 1 : 2),
  acreditaCon: ['informe_area_usuaria'],
  porQue,
  base,
  aplica: desdeLaEntidad,
});

const INFORME_DEC: ReglaRequisito = {
  id: 'informe_dec',
  texto: 'Informe de la DEC (versión oficialmente emitida)',
  nivel: (c) => (decide(c) ? 1 : 2),
  acreditaCon: ['informe_dec'],
  porQue: 'La autoridad decide sobre el análisis contractual, económico y procedimental de la DEC.',
  aplica: (c) => decide(c) || c.perfil === 'asesoria_juridica',
};

const INFORME_LEGAL_CONDICIONAL: ReglaRequisito = {
  id: 'informe_legal',
  texto: 'Informe de Asesoría Jurídica',
  nivel: 3,
  acreditaCon: ['informe_legal'],
  porQue: 'Solo si la complejidad jurídica, la competencia o las normas internas de la Entidad lo exigen.',
  aplica: decide,
};

const PRESUPUESTO = (nivel: (c: Contexto) => Nivel, base?: string): ReglaRequisito => ({
  id: 'presupuesto',
  texto: 'Certificación o previsión de crédito presupuestario',
  nivel,
  acreditaCon: ['certificacion_presupuestal'],
  porQue: base
    ? 'La norma condiciona la aprobación a contar con el crédito presupuestario.'
    : 'Sin crédito presupuestario no se puede comprometer el gasto de la nueva contratación.',
  base,
});

const SUPERVISOR_OPINA = (base: string, nivel: Nivel = 2): ReglaRequisito => ({
  id: 'informe_supervisor',
  texto: 'Informe u opinión del supervisor',
  nivel,
  acreditaCon: ['informe_supervisor'],
  porQue: 'En obras y consultorías de obra supervisadas, la norma exige la opinión técnica del supervisor.',
  base,
  aplica: (c) => supervisado(c) && c.perfil !== 'supervisor',
});

// ── Las actuaciones ──────────────────────────────────────────────────

const AMPLIACION: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'solicitud',
      texto: 'Solicitud de ampliación de plazo del contratista',
      nivel: 1,
      acreditaCon: ['solicitud_contratista'],
      porQue: 'La ampliación solo procede a solicitud sustentada del contratista, y su fecha decide si se presentó a tiempo.',
      base: 'numerales 142.1 y 142.3 del artículo 142 del Reglamento',
      aplica: (c) => c.perfil !== 'contratista',
    },
    {
      id: 'cronograma',
      texto: 'Programa de ejecución de obra vigente',
      nivel: 1,
      acreditaCon: ['cronograma', 'expediente_tecnico', 'plan_trabajo'],
      porQue: 'La causal tiene que modificar la ruta crítica del programa de ejecución vigente: sin él no se puede comprobar.',
      base: 'numeral 198.1 del artículo 198 del Reglamento',
      aplica: esObra,
    },
    {
      id: 'cronograma',
      texto: 'Términos de referencia o cronograma con los plazos de las prestaciones',
      nivel: 2,
      acreditaCon: ['tdr', 'cronograma', 'plan_trabajo', 'bases'],
      porQue: 'Para saber qué prestaciones y entregables se vieron afectados por el hecho y en cuántos días.',
      base: 'numeral 142.2 del artículo 142 del Reglamento',
      aplica: (c) => !esObra(c),
    },
    {
      id: 'acredita_hecho',
      texto: 'Documento que acredite el hecho que impidió cumplir el plazo',
      nivel: 2,
      acreditaCon: [],
      porHecho: true,
      porQue: 'Sin prueba del hecho, la causal solo está declarada y el diagnóstico es preliminar.',
    },
    {
      id: 'cuaderno',
      texto: 'Asientos del cuaderno de incidencias sobre el inicio y el fin de la causal',
      nivel: 2,
      acreditaCon: ['cuaderno_obra'],
      porQue: 'La solicitud se sustenta con las anotaciones del inicio y el fin de la causal.',
      base: art('200.1', 200, REG),
      aplica: esObra,
    },
    SUPERVISOR_OPINA('literal b) del numeral 200.1 del artículo 200 del Reglamento'),
    INFORME_AREA_USUARIA(
      art('142.4', 142, REG),
      'La evaluación considera el análisis técnico del Área Usuaria sobre la justificación del retraso.',
    ),
    INFORME_DEC,
    INFORME_LEGAL_CONDICIONAL,
    {
      id: 'actas_suspension',
      texto: 'Actas de suspensión o de reinicio, si existen',
      nivel: 3,
      acreditaCon: ['acta_suspension', 'acta_reinicio'],
      porQue: 'Un plazo suspendido cambia el cómputo; si no hubo suspensión, no hacen falta.',
    },
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    {
      id: 'causal',
      texto: 'La causal invocada es una de las previstas: prestación adicional aprobada que afecta el plazo, o atrasos o paralizaciones no imputables al contratista',
      base: 'numeral 142.2 del artículo 142 del Reglamento',
      aplica: esBienesOServicios,
    },
    {
      id: 'causal',
      texto: 'La causal es una de las previstas —atrasos o paralizaciones no atribuibles al contratista, adicional de obra o mayores metrados— y modifica la ruta crítica del programa de ejecución vigente',
      base: 'numeral 198.1 del artículo 198 del Reglamento',
      aplica: esObra,
    },
    {
      id: 'causal',
      texto: 'La causal es una de las previstas para consultorías de obra: adicional aprobado que afecta el plazo, atrasos o paralizaciones no imputables al contratista, o modificaciones del contrato supervisado',
      base: 'numeral 198.2 del artículo 198 del Reglamento',
      aplica: esConsultoriaObra,
    },
    {
      id: 'no_imputable',
      texto: 'El atraso o la paralización no es imputable al contratista',
      base: 'literal b) del numeral 142.2 del artículo 142 del Reglamento',
      aplica: (c) => !esObraOConsultoria(c),
    },
    {
      id: 'no_imputable',
      texto: 'El atraso o la paralización no es imputable al contratista',
      base: 'numerales 198.1 y 198.2 del artículo 198 del Reglamento',
      aplica: esObraOConsultoria,
    },
    {
      id: 'oportunidad',
      texto: 'La solicitud se presentó dentro de los diez días hábiles siguientes a la aprobación del adicional o de finalizado el hecho generador (más la prórroga de hasta diez días hábiles, si se pidió); si no, se tiene por no presentada',
      base: 'numeral 142.3 del artículo 142 del Reglamento',
      aplica: (c) => !esObraOConsultoria(c),
    },
    {
      id: 'oportunidad',
      texto: 'La solicitud se presentó dentro de los diez días hábiles siguientes a la aprobación del adicional o de finalizado el hecho generador (más la prórroga de hasta diez días hábiles, si se pidió); si no, se tiene por no presentada',
      base: 'literal a) del numeral 199.1 del artículo 199 del Reglamento',
      aplica: esConsultoriaObra,
    },
    {
      id: 'oportunidad',
      texto: 'La solicitud se presentó dentro de los diez días hábiles siguientes a la aprobación del adicional o de finalizado el hecho generador (más la prórroga de hasta diez días hábiles, si se pidió); si no, se tiene por no presentada',
      base: 'literal a) del numeral 200.1 del artículo 200 del Reglamento',
      aplica: esObra,
    },
    {
      id: 'cuantificacion',
      texto: 'La solicitud cuantifica los días y los sustenta con el inicio y el fin de la causal',
      base: 'literal a) del numeral 200.1 del artículo 200 del Reglamento',
      aplica: esObra,
    },
    {
      id: 'cuantificacion',
      texto: 'La solicitud está sustentada: precisa el hecho, su inicio y su fin, y los días que pide',
      base: 'numeral 142.1 del artículo 142 del Reglamento («previa solicitud sustentada del contratista»)',
      aplica: (c) => !esObra(c),
    },
  ],
  articulos: (c) => ({
    ley: [63],
    reglamento: esObra(c)
      ? [105, 107, 188, 198, 200, 201]
      : esConsultoriaObra(c)
        ? [105, 107, 198, 199]
        : [105, 107, 142],
  }),
  organo: (c) => ({
    organo: 'Autoridad de la gestión administrativa',
    base: esObra(c)
      ? 'numeral 63.1 del artículo 63 de la Ley y literal d) del numeral 200.1 del artículo 200 del Reglamento'
      : esConsultoriaObra(c)
        ? 'numeral 63.1 del artículo 63 de la Ley y literal b) del numeral 199.1 del artículo 199 del Reglamento'
        : 'numeral 63.1 del artículo 63 de la Ley y numerales 142.1 y 142.5 del artículo 142 del Reglamento',
    verificar:
      'Si quien firma no es la autoridad de la gestión administrativa, debe actuar por delegación o por las normas de gestión interna (numeral 105.4 del artículo 105 del Reglamento).',
  }),
  cadena: (c) =>
    esObra(c)
      ? [
          { perfil: 'contratista', documento: 'Solicitud de ampliación de plazo con el programa actualizado', base: art('200.1', 200, REG) },
          { perfil: 'supervisor', documento: 'Opinión técnica del supervisor (cinco días hábiles)', base: 'literal b) del numeral 200.1 del Reglamento', condicion: 'Si la obra tiene supervisión; si no se pronuncia, la Entidad resuelve sin ella' },
          { perfil: 'area_usuaria', documento: 'Informe técnico del Área Usuaria', condicion: 'Cuando la Entidad requiera su análisis técnico' },
          { perfil: 'dec', documento: 'Informe de la DEC' },
          { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Solo si la complejidad jurídica o las normas internas lo exigen' },
          { perfil: 'aga', documento: 'Resolución que se pronuncia sobre la ampliación (diez días hábiles, notificada por la Pladicop)', base: 'literal d) del numeral 200.1 del Reglamento' },
        ]
      : [
          { perfil: 'contratista', documento: 'Solicitud de ampliación de plazo sustentada', base: esConsultoriaObra(c) ? 'literal a) del numeral 199.1 del Reglamento' : art('142.3', 142, REG) },
          { perfil: 'area_usuaria', documento: 'Informe técnico del Área Usuaria sobre la justificación del retraso', base: esConsultoriaObra(c) ? undefined : art('142.4', 142, REG), condicion: esConsultoriaObra(c) ? 'Cuando la Entidad requiera su análisis técnico' : undefined },
          { perfil: 'dec', documento: 'Informe de la DEC' },
          { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Solo si la complejidad jurídica o las normas internas lo exigen' },
          { perfil: 'aga', documento: 'Resolución que se pronuncia sobre la ampliación (doce días hábiles, notificada por la Pladicop)', base: esConsultoriaObra(c) ? 'literal b) del numeral 199.1 del Reglamento' : art('142.5', 142, REG) },
        ],
  explicacion: (c) =>
    `La ampliación nace de la solicitud del contratista y la decide la autoridad de la gestión administrativa${esObra(c) ? ', con la opinión previa del supervisor si la obra tiene supervisión' : ', con el análisis técnico del Área Usuaria y la evaluación de la DEC'}. La intervención de Asesoría Jurídica queda condicionada a la complejidad jurídica, la competencia o la exigencia normativa aplicable. No se suscribe adenda: basta con publicar la aprobación en la Pladicop.`,
};

const ADICIONAL: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'tdr',
      texto: 'Términos de referencia, especificaciones técnicas o expediente técnico',
      nivel: 2,
      acreditaCon: ['tdr', 'expediente_tecnico', 'bases'],
      porQue: 'El costo del adicional se determina sobre las especificaciones y las condiciones y precios pactados.',
      base: art('141.2', 141, REG),
    },
    INFORME_AREA_USUARIA(
      art('141.1', 141, REG),
      'El adicional requiere previo sustento técnico de que es indispensable para la finalidad pública del contrato.',
    ),
    {
      id: 'costo',
      texto: 'Estructura de costos o presupuesto del adicional',
      nivel: 2,
      acreditaCon: ['estructura_costos'],
      porQue: 'Sin el monto del adicional no se puede calcular el porcentaje ni saber quién es competente.',
      base: 'numeral 141.2 del artículo 141 y artículo 196 del Reglamento',
    },
    PRESUPUESTO((c) => (decide(c) ? 1 : 2), art('141.1', 141, REG)),
    {
      id: 'anotacion',
      texto: 'Anotación de la necesidad del adicional en el cuaderno de incidencias',
      nivel: 1,
      acreditaCon: ['cuaderno_obra'],
      porQue: 'En obras, el procedimiento empieza con la anotación de la necesidad del adicional.',
      base: 'literal a) del numeral 194.2 del artículo 194 del Reglamento',
      aplica: esObra,
    },
    SUPERVISOR_OPINA('literal b) del numeral 194.2 del artículo 194 del Reglamento', 1),
    {
      id: 'expediente_adicional',
      texto: 'Expediente técnico del adicional de obra',
      nivel: 1,
      acreditaCon: ['expediente_tecnico'],
      porQue: 'La resolución se pronuncia sobre el expediente técnico del adicional revisado por la supervisión.',
      base: 'literales d) y e) del numeral 194.2 del artículo 194 del Reglamento',
      aplica: (c) => esObra(c) && desdeLaEntidad(c),
    },
    {
      id: 'legal',
      texto: 'Informe de Asesoría Jurídica (sustento legal)',
      nivel: 1,
      acreditaCon: ['informe_legal'],
      porQue: 'En bienes y servicios el adicional requiere previo sustento técnico y legal.',
      base: art('141.1', 141, REG),
      aplica: (c) => decide(c) && esBienesOServicios(c),
    },
    INFORME_DEC,
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    {
      id: 'indispensable',
      texto: 'La prestación adicional es indispensable para alcanzar la finalidad pública del contrato',
      base: 'numeral 64.1 del artículo 64 de la Ley y numeral 141.1 del artículo 141 del Reglamento',
    },
    {
      id: 'limite',
      texto: 'El monto de los adicionales, sumados los ya aprobados, no supera el límite aplicable',
      base: 'numerales 64.1 a 64.3 del artículo 64 de la Ley',
    },
    {
      id: 'presupuesto',
      texto: 'Se cuenta con la previsión o certificación de crédito presupuestario',
      base: art('141.1', 141, REG),
    },
    {
      id: 'previo',
      texto: 'La aprobación es previa a la ejecución: está prohibida la aprobación en vía de regularización (salvo los adicionales de emergencia en obra)',
      base: 'numeral 141.3 del artículo 141 y numerales 194.3 y 194.4 del artículo 194 del Reglamento',
    },
    {
      id: 'causa_obra',
      texto: 'El adicional de obra se debe a deficiencias del expediente técnico o a causas no previsibles que no son responsabilidad del contratista',
      base: 'numeral 194.1 del artículo 194 del Reglamento',
      aplica: (c) => esObra(c) && !esDisenoYConstruccion(c),
    },
    {
      id: 'deficiencias_dyc',
      texto: 'En diseño y construcción, no se pagan adicionales por deficiencias u omisiones del expediente técnico aprobado',
      base: 'literal b) del numeral 195.1 del artículo 195 del Reglamento',
      aplica: (c) => esObra(c) && esDisenoYConstruccion(c),
    },
  ],
  articulos: (c) => ({
    ley: [63, 64],
    reglamento: esObra(c)
      ? esDisenoYConstruccion(c)
        ? [193, 195, 196, 197]
        : [194, 196, 197]
      : esConsultoriaObra(c)
        ? [193, 196]
        : [141],
  }),
  organo: (c) =>
    esObra(c)
      ? {
          organo: esDisenoYConstruccion(c)
            ? 'Autoridad de la gestión administrativa hasta el 20 % del componente obra; el Titular hasta el 40 %; el Titular con autorización previa de la Contraloría hasta el 50 %'
            : 'Autoridad de la gestión administrativa hasta el 15 %; el Titular de la Entidad por encima del 15 % y hasta el 30 %; el Titular con autorización previa de la Contraloría por encima del 30 % y hasta el 50 %',
          base: esDisenoYConstruccion(c)
            ? 'literal b) del numeral 195.1 del artículo 195 del Reglamento'
            : 'numerales 64.2 y 64.3 del artículo 64 de la Ley y numeral 194.1 del artículo 194 del Reglamento',
          verificar: 'El órgano depende del porcentaje acumulado, restando los presupuestos deductivos vinculados.',
        }
      : {
          organo: 'Autoridad de la gestión administrativa',
          base: 'numeral 64.1 del artículo 64 de la Ley y numeral 141.1 del artículo 141 del Reglamento',
          verificar: 'Hasta el 25 % del monto del contrato original. Si firma otro funcionario, debe actuar por delegación (numeral 105.4 del artículo 105 del Reglamento).',
        },
  cadena: (c) =>
    esObra(c)
      ? [
          { perfil: 'contratista', documento: 'Anotación de la necesidad en el cuaderno de incidencias', base: 'literal a) del numeral 194.2 del Reglamento', condicion: 'La anota el residente o la supervisión' },
          { perfil: 'supervisor', documento: 'Informe técnico del supervisor sobre la necesidad (cinco días)', base: 'literal b) del numeral 194.2 del Reglamento' },
          { perfil: 'contratista', documento: 'Expediente técnico del adicional (quince días)', base: 'literal d) del numeral 194.2 del Reglamento', condicion: 'Lo elabora quien señalen las bases: la Entidad, el contratista o el supervisor' },
          { perfil: 'supervisor', documento: 'Pronunciamiento del supervisor sobre el expediente del adicional (diez días)', base: 'literal e) del numeral 194.2 del Reglamento' },
          { perfil: 'area_usuaria', documento: 'Informe técnico del Área Usuaria' },
          { perfil: 'dec', documento: 'Informe de la DEC: monto, porcentaje acumulado y órgano competente' },
          { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Cuando la complejidad jurídica o el porcentaje lo exijan' },
          { perfil: 'aga', documento: 'Resolución que aprueba o deniega el adicional (doce días hábiles)', base: 'literal f) del numeral 194.2 del Reglamento', condicion: 'La emite el Titular si el porcentaje supera el 15 %; por encima del 30 %, previa autorización de la Contraloría' },
        ]
      : [
          { perfil: 'area_usuaria', documento: 'Informe técnico que sustenta que el adicional es indispensable', base: art('141.1', 141, REG) },
          { perfil: 'dec', documento: 'Informe de la DEC: costo del adicional, porcentaje y presupuesto', base: art('141.2', 141, REG) },
          { perfil: 'asesoria_juridica', documento: 'Informe legal (sustento legal previo)', base: art('141.1', 141, REG) },
          { perfil: 'aga', documento: 'Resolución que aprueba el adicional, publicada en la Pladicop', base: 'numerales 141.1 y 141.3 del Reglamento' },
        ],
  explicacion: (c) =>
    esObra(c)
      ? 'El adicional de obra sigue un procedimiento reglado: anotación, informe del supervisor, expediente técnico del adicional y resolución. El órgano que resuelve depende del porcentaje acumulado. No se suscribe adenda.'
      : 'En bienes y servicios el adicional exige sustento técnico y legal previos, crédito presupuestario y resolución de la autoridad de la gestión administrativa publicada en la Pladicop. No se suscribe adenda y no cabe aprobarlo en vía de regularización.',
};

const REDUCCION: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'tdr',
      texto: 'Términos de referencia o especificaciones técnicas',
      nivel: 2,
      acreditaCon: ['tdr', 'expediente_tecnico', 'bases'],
      porQue: 'Para identificar la prestación que se reduce y comprobar que es divisible.',
    },
    INFORME_AREA_USUARIA(
      art('109.1', 109, REG),
      'La reducción exige que el Área Usuaria sustente los cuatro supuestos del numeral 109.1.',
    ),
    {
      id: 'no_ejecutada',
      texto: 'Detalle de la prestación no ejecutada y su cuantificación',
      nivel: 1,
      acreditaCon: [],
      porHecho: true,
      porQue: 'Solo se reduce lo que no se ha ejecutado y es cuantificable y divisible.',
      base: 'literal b) del numeral 109.1 del artículo 109 del Reglamento',
    },
    {
      id: 'estado_ejecucion',
      texto: 'Conformidad o estado de ejecución del contrato',
      nivel: 2,
      acreditaCon: ['conformidad', 'valorizacion', 'acta_recepcion', 'informe_area_usuaria'],
      porQue: 'La reducción debe aprobarse antes de la conformidad final o del acta de recepción de la obra.',
      base: 'literal c) del numeral 109.1 del artículo 109 del Reglamento',
    },
    SUPERVISOR_OPINA('literal d) del numeral 109.1 del artículo 109 del Reglamento'),
    INFORME_DEC,
    INFORME_LEGAL_CONDICIONAL,
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'finalidad', texto: 'La falta de ejecución de las prestaciones no impide alcanzar la finalidad del contrato', base: 'literal a) del numeral 109.1 del artículo 109 del Reglamento' },
    { id: 'no_ejecutadas', texto: 'Las prestaciones por reducir no se han ejecutado y son cuantificables y divisibles', base: 'literal b) del numeral 109.1 del artículo 109 del Reglamento' },
    { id: 'oportunidad', texto: 'Se aprueba antes de la conformidad final o de la suscripción del acta de recepción de la obra', base: 'literal c) del numeral 109.1 del artículo 109 del Reglamento' },
    { id: 'supervisor', texto: 'Se cuenta con la opinión del supervisor', base: 'literal d) del numeral 109.1 del artículo 109 del Reglamento', aplica: supervisado },
    { id: 'limite', texto: 'La reducción no supera el 25 % del monto del contrato original', base: 'numeral 64.1 del artículo 64 de la Ley y numeral 109.1 del artículo 109 del Reglamento' },
    { id: 'plazo', texto: 'La resolución determina si la reducción implica reducir el plazo de ejecución', base: 'numeral 109.2 del artículo 109 del Reglamento' },
  ],
  articulos: () => ({ ley: [63, 64], reglamento: [109] }),
  organo: () => ({
    organo: 'Autoridad de la gestión administrativa, mediante resolución',
    base: 'numeral 64.1 del artículo 64 de la Ley y numeral 109.1 del artículo 109 del Reglamento',
    verificar: 'Si firma otro funcionario, debe actuar por delegación (numeral 105.4 del artículo 105 del Reglamento).',
  }),
  cadena: (c) => [
    { perfil: 'area_usuaria', documento: 'Informe técnico que sustenta los supuestos a) a d) del numeral 109.1', base: art('109.1', 109, REG) },
    ...(supervisado(c) ? [{ perfil: 'supervisor' as const, documento: 'Opinión del supervisor', base: 'literal d) del numeral 109.1 del Reglamento' }] : []),
    { perfil: 'dec', documento: 'Informe de la DEC: monto, porcentaje y efecto en el plazo' },
    { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Solo si la complejidad jurídica o las normas internas lo exigen' },
    { perfil: 'aga', documento: 'Resolución que ordena la reducción, publicada en la Pladicop', base: 'numerales 109.1 a 109.3 del Reglamento' },
  ],
  explicacion: (c) =>
    `La reducción la ordena la autoridad de la gestión administrativa mediante resolución, sobre el sustento del Área Usuaria${supervisado(c) ? ' y la opinión del supervisor' : ''}. No se suscribe adenda: basta con publicar la resolución en la Pladicop.`,
};

const OTRA_MODIFICACION: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'acredita_hecho',
      texto: 'Documento que acredite el hecho sobreviniente o el motivo de la modificación',
      nivel: 2,
      acreditaCon: [],
      porHecho: true,
      porQue: 'La modificación debe derivar de un hecho posterior a la suscripción del contrato.',
      base: art('110.1', 110, REG),
    },
    INFORME_AREA_USUARIA(
      art('110.2', 110, REG),
      'El sustento técnico lo emite el Área Usuaria en coordinación con la DEC.',
    ),
    {
      id: 'legal',
      texto: 'Informe de Asesoría Jurídica (sustento legal)',
      nivel: (c) => (decide(c) ? 1 : 3),
      acreditaCon: ['informe_legal'],
      porQue: 'La Entidad registra en la Pladicop el sustento técnico y legal junto con la adenda.',
      base: art('110.2', 110, REG),
      aplica: desdeLaEntidad,
    },
    PRESUPUESTO(() => 2, art('110.3', 110, REG)),
    SUPERVISOR_OPINA(art('110.4', 110, REG)),
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'subsidiaria', texto: 'No resultan aplicables los adicionales, las reducciones ni las ampliaciones de plazo', base: art('110.1', 110, REG) },
    { id: 'sobreviniente', texto: 'Deriva de hechos sobrevinientes a la suscripción del contrato', base: 'literal i) del numeral 110.1 del artículo 110 del Reglamento' },
    { id: 'no_imputable', texto: 'No es imputable a ninguna de las partes (o, si lo es sin dolo, lo autoriza previamente la autoridad de la gestión administrativa y la parte responsable asume los costos)', base: 'numerales 110.1 y 110.5 del artículo 110 del Reglamento' },
    { id: 'finalidad', texto: 'Permite alcanzar la finalidad del contrato de manera oportuna y eficiente', base: 'literal iii) del numeral 110.1 del artículo 110 del Reglamento' },
    { id: 'esenciales', texto: 'No cambia los elementos esenciales del objeto contractual', base: 'literal iv) del numeral 110.1 del artículo 110 del Reglamento' },
    { id: 'monto', texto: 'Si modifica el monto, cuenta con la autorización previa de la autoridad de la gestión administrativa y con crédito presupuestario', base: art('110.3', 110, REG) },
  ],
  articulos: (c) => ({
    ley: [63, 65],
    reglamento: [
      105, 108, 110, 112,
      ...(esBienesOServicios(c) || c.tipo === null ? [143] : []),
      ...(esObraOConsultoria(c) || c.tipo === null ? [189] : []),
      89,
    ],
  }),
  organo: () => ({
    organo: 'Funcionario facultado para suscribir el contrato y sus adendas; autorización previa de la autoridad de la gestión administrativa si cambia el monto',
    base: 'numeral 105.4 del artículo 105 y numeral 110.3 del artículo 110 del Reglamento',
    verificar: 'Según las normas de gestión interna de la Entidad o la delegación vigente.',
  }),
  cadena: (c) => [
    { perfil: 'area_usuaria', documento: 'Sustento técnico, en coordinación con la DEC', base: art('110.2', 110, REG) },
    ...(esObraOConsultoria(c) ? [{ perfil: 'supervisor' as const, documento: 'Opinión favorable del supervisor sobre el impacto en el cronograma', base: art('110.4', 110, REG), condicion: 'Si el contrato está sujeto a supervisión de terceros' }] : []),
    { perfil: 'dec', documento: 'Informe de la DEC' },
    { perfil: 'asesoria_juridica', documento: 'Sustento legal', base: art('110.2', 110, REG) },
    { perfil: 'aga', documento: 'Autorización previa', condicion: 'Solo si la modificación cambia el monto contractual', base: art('110.3', 110, REG) },
    { perfil: 'dec', documento: 'Adenda suscrita por las partes y registrada en la Pladicop', base: art('110.1', 110, REG) },
  ],
  explicacion: () =>
    'La modificación por hecho sobreviniente es residual: solo cabe si no encaja en un adicional, una reducción o una ampliación de plazo, y se formaliza con adenda y con el sustento técnico y legal registrados en la Pladicop. Otras modificaciones tienen su propio artículo: mejoras en bienes y servicios (143), sustitución de personal clave en obras y consultorías de obra (189), subcontratación (108) o cesión (112).',
};

const COMPLEMENTARIO: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'conformidad',
      texto: 'Conformidad del contrato original',
      nivel: 1,
      acreditaCon: ['conformidad'],
      porQue: 'La necesidad la sustenta el Área Usuaria que otorgó la conformidad, y la fecha de culminación fija el plazo de tres meses.',
      base: art('146.3', 146, REG),
    },
    INFORME_AREA_USUARIA(art('146.3', 146, REG), 'La necesidad de la contratación complementaria la sustenta el Área Usuaria.'),
    {
      id: 'convocatoria',
      texto: 'Convocatoria del procedimiento de selección para la misma contratación',
      nivel: 2,
      acreditaCon: ['bases'],
      porQue: 'Es condición, salvo que el contrato complementario agote la necesidad de la Entidad.',
      base: 'literal iv) del numeral 146.1 del artículo 146 del Reglamento',
    },
    PRESUPUESTO(() => 2),
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'plazo', texto: 'Se realiza dentro de los tres meses posteriores a la culminación del plazo de ejecución (o hasta quince días antes, con inicio posterior a esa culminación)', base: 'numerales 146.1 y 146.4 del artículo 146 del Reglamento' },
    { id: 'unica', texto: 'Es por única vez y con el mismo contratista', base: art('146.1', 146, REG) },
    { id: 'limite', texto: 'El monto no supera el 30 % del contrato original', base: 'literal i) del numeral 146.1 del artículo 146 del Reglamento' },
    { id: 'mismo', texto: 'Es el mismo bien o servicio en general', base: 'literal ii) del numeral 146.1 del artículo 146 del Reglamento' },
    { id: 'condiciones', texto: 'El contratista preserva las mismas condiciones que dieron lugar a la contratación', base: 'literal iii) del numeral 146.1 del artículo 146 del Reglamento' },
    { id: 'convocado', texto: 'Se convocó el procedimiento de selección, salvo que el complementario agote la necesidad', base: 'literal iv) del numeral 146.1 del artículo 146 del Reglamento' },
  ],
  articulos: () => ({ ley: [], reglamento: [146] }),
  organo: () => ({
    organo: 'Funcionario facultado para contratar según las normas de gestión interna',
    base: 'artículo 146 del Reglamento',
    verificar: 'El artículo 146 no reserva la decisión a un órgano: verificar las normas de gestión interna o la delegación vigente.',
  }),
  cadena: () => [
    { perfil: 'area_usuaria', documento: 'Informe que sustenta la necesidad de la contratación complementaria', base: art('146.3', 146, REG) },
    { perfil: 'dec', documento: 'Informe de la DEC: plazo, porcentaje, condiciones y convocatoria' },
    { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Solo si la complejidad jurídica o las normas internas lo exigen' },
    { perfil: 'aga', documento: 'Autorización y suscripción del contrato complementario', condicion: 'Según las normas de gestión interna' },
  ],
  explicacion: () =>
    'La contratación complementaria es para bienes y servicios en general, por única vez, con el mismo contratista, dentro de los tres meses posteriores a la culminación y hasta el 30 % del contrato original. La sustenta el Área Usuaria que dio la conformidad.',
  noCorresponde: (c) =>
    esObraOConsultoria(c)
      ? {
          razon:
            'La contratación complementaria del artículo 146 del Reglamento es para bienes y servicios en general; en obras y consultorías de obra solo cabe para el gerente de proyecto (numeral 146.2).',
          alternativa: 'adicional',
        }
      : null,
};

const SUSPENSION: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'acredita_hecho',
      texto: 'Documento que acredite el evento que interrumpe la ejecución',
      nivel: 1,
      acreditaCon: [],
      porHecho: true,
      porQue: 'La suspensión procede ante eventos no atribuibles a las partes: hay que acreditar el evento.',
      base: art('107.1', 107, REG),
    },
    {
      id: 'acta_suspension',
      texto: 'Acta de suspensión',
      nivel: 1,
      acreditaCon: ['acta_suspension'],
      porQue: 'Para analizar el reinicio hay que conocer los términos en que se acordó la suspensión.',
      base: 'numerales 107.2 del artículo 107 y 202.2 del artículo 202 del Reglamento',
      aplica: (c) => /reinicio/i.test(c.respuestas.suspension_o_reinicio ?? ''),
    },
    {
      id: 'cronograma',
      texto: 'Cronograma o programa de ejecución vigente',
      nivel: 2,
      acreditaCon: ['cronograma', 'plan_trabajo', 'expediente_tecnico'],
      porQue: 'Reiniciado el plazo, la Entidad comunica las nuevas fechas del programa de ejecución.',
      base: art('202.2', 202, REG),
      aplica: esObra,
    },
    INFORME_AREA_USUARIA(art('107.1', 107, REG), 'El Área Usuaria acredita técnicamente el evento y su efecto en la ejecución.'),
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'evento', texto: 'Se produjo un evento no atribuible a las partes que interrumpe la ejecución de las prestaciones (o, si es imputable a la Entidad, hay autorización previa de la autoridad de la gestión administrativa)', base: 'numerales 107.1 y 107.5 del artículo 107 del Reglamento' },
    { id: 'acuerdo', texto: 'Las partes acuerdan por escrito la suspensión hasta la culminación del evento', base: art('107.1', 107, REG) },
    { id: 'gastos', texto: 'No se reconocen mayores gastos generales ni costos directos, salvo los necesarios para viabilizar la suspensión', base: 'numeral 107.1 del artículo 107 y numeral 202.1 del artículo 202 del Reglamento' },
    { id: 'vinculados', texto: 'Se suspenden también los contratos directamente vinculados, cuando corresponda', base: art('107.3', 107, REG) },
    { id: 'reinicio', texto: 'Culminado el evento, se suscribe el acta con la fecha de reinicio (o la fija la Entidad si no hay acuerdo)', base: art('107.2', 107, REG) },
    { id: 'falta_pago', texto: 'En obras, la falta de pago de dos valorizaciones consecutivas suspende el plazo, previo requerimiento del contratista', base: art('202.3', 202, REG), aplica: esObra },
  ],
  articulos: (c) => ({ ley: [], reglamento: esObra(c) ? [105, 107, 202] : [105, 107] }),
  organo: () => ({
    organo: 'Acuerdo escrito de las partes, suscrito por el funcionario facultado; autorización previa de la autoridad de la gestión administrativa si la causa es imputable a la Entidad',
    base: 'numerales 107.1 y 107.5 del artículo 107 y numeral 105.4 del artículo 105 del Reglamento',
    verificar: 'Quién suscribe el acta según las normas de gestión interna.',
  }),
  cadena: (c) => [
    { perfil: 'area_usuaria', documento: 'Informe técnico que acredita el evento y su efecto' },
    ...(esObra(c) ? [{ perfil: 'supervisor' as const, documento: 'Informe del supervisor', condicion: 'Si la obra tiene supervisión' }] : []),
    { perfil: 'dec', documento: 'Informe de la DEC' },
    { perfil: 'aga', documento: 'Autorización previa', condicion: 'Solo si la causa es imputable a la Entidad', base: art('107.5', 107, REG) },
    { perfil: 'dec', documento: 'Acta de suspensión suscrita por las partes', base: art('107.1', 107, REG) },
  ],
  explicacion: () =>
    'La suspensión se acuerda por escrito entre las partes y no reconoce mayores gastos, salvo los necesarios para viabilizarla. Al terminar el evento se suscribe el acta de reinicio.',
};

const RESOLUCION: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'acredita_hecho',
      texto: 'Documento que acredite el incumplimiento o la causal invocada',
      nivel: 1,
      acreditaCon: [],
      porHecho: true,
      porQue: 'La parte que resuelve debe acreditar la causal: sin prueba, la resolución no se sostiene en una controversia.',
      base: 'numeral 68.1 del artículo 68 de la Ley y numeral 122.3 del artículo 122 del Reglamento',
    },
    {
      id: 'apercibimiento',
      texto: 'Carta de apercibimiento notificada y su fecha de notificación',
      nivel: 1,
      acreditaCon: ['carta_entidad', 'solicitud_contratista'],
      porQue: 'En la causal de incumplimiento, la resolución exige un requerimiento previo bajo apercibimiento y que venza su plazo.',
      base: art('122.1', 122, REG),
      aplica: (c) => /resoluci/i.test(c.respuestas.etapa_resolucion ?? ''),
    },
    INFORME_AREA_USUARIA(
      'numerales 122.1 y 122.2 del artículo 122 del Reglamento',
      'El Área Usuaria verifica el incumplimiento y, si se invoca, que ya no puede revertirse.',
    ),
    {
      id: 'penalidades',
      texto: 'Cálculo de las penalidades acumuladas',
      nivel: 2,
      acreditaCon: ['informe_dec', 'valorizacion', 'pago'],
      porQue: 'Si se llegó a la penalidad máxima, no hace falta apercibimiento previo.',
      base: art('122.2', 122, REG),
      aplica: (c) => c.perfil !== 'contratista',
    },
    {
      id: 'garantias',
      texto: 'Garantías otorgadas por el contratista',
      nivel: 3,
      acreditaCon: ['garantia'],
      porQue: 'Si la Entidad es la perjudicada, ejecuta las garantías.',
      base: art('123.1', 123, REG),
      aplica: (c) => c.perfil !== 'contratista',
    },
    {
      id: 'conformidad_pago',
      texto: 'Conformidad o documento que acredite la obligación incumplida por la Entidad',
      nivel: 1,
      acreditaCon: ['conformidad', 'acta_recepcion', 'valorizacion', 'otra_acta'],
      porQue: 'Si el contratista resuelve por falta de pago, debe acreditar que la prestación tenía conformidad y el pago estaba vencido.',
      base: 'numeral 67.3 del artículo 67 de la Ley',
      aplica: (c) => c.perfil === 'contratista' && /pago/i.test(c.respuestas.obligacion_incumplida ?? ''),
    },
    INFORME_LEGAL_CONDICIONAL,
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'causal', texto: 'Se configura una de las causales del numeral 68.1 de la Ley (caso fortuito o fuerza mayor, incumplimiento atribuible, hecho sobreviniente, cláusula anticorrupción, documentación falsa o terminación anticipada)', base: 'numeral 68.1 del artículo 68 de la Ley' },
    { id: 'apercibimiento', texto: 'En la causal de incumplimiento, se requirió el cumplimiento bajo apercibimiento con un plazo no menor del 10 % ni mayor del 15 % del plazo (tres días si es menor de treinta; quince días en obras de más de sesenta), salvo penalidad máxima o incumplimiento irreversible', base: 'numerales 122.1 y 122.2 del artículo 122 del Reglamento' },
    { id: 'vencido', texto: 'Venció el plazo otorgado sin que la otra parte cumpla', base: 'literal b) del numeral 122.1 del artículo 122 del Reglamento' },
    { id: 'parcial', texto: 'Si es parcial, la parte resuelta es cuantificable, separable e independiente y se precisa con claridad', base: art('122.5', 122, REG) },
    { id: 'efectos', texto: 'Se prevén los efectos: garantías, indemnización acreditada y, en obras, la constatación física e inventario', base: 'artículo 123 del Reglamento' },
  ],
  articulos: (c) => ({ ley: [67, 68], reglamento: esObra(c) ? [105, 119, 122, 123, 144] : [105, 119, 122, 123, 144] }),
  organo: (c) =>
    c.perfil === 'contratista'
      ? {
          organo: 'El contratista, como parte perjudicada, por su representante legal o común',
          base: 'numeral 68.1 del artículo 68 de la Ley y artículo 122 del Reglamento',
          verificar: 'Las facultades de quien firma por el contratista.',
        }
      : {
          organo: 'Funcionario facultado para suscribir el contrato, salvo reserva a la autoridad de la gestión administrativa o al Titular',
          base: 'numeral 105.4 del artículo 105 del Reglamento',
          verificar: 'Las normas de gestión interna o la delegación vigente.',
        },
  cadena: (c) =>
    c.perfil === 'contratista'
      ? [
          { perfil: 'contratista', documento: 'Carta de requerimiento bajo apercibimiento de resolver', base: art('122.1', 122, REG) },
          { perfil: 'contratista', documento: 'Carta de resolución, vencido el plazo sin cumplimiento', base: 'literal b) del numeral 122.1 del Reglamento' },
        ]
      : [
          { perfil: 'area_usuaria', documento: 'Informe que verifica el incumplimiento' },
          { perfil: 'dec', documento: 'Informe de la DEC: penalidades, plazo de apercibimiento y efectos' },
          { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Recomendable: la resolución suele terminar en controversia' },
          { perfil: 'aga', documento: 'Carta de apercibimiento', base: art('122.1', 122, REG), condicion: 'Si la causal es el incumplimiento y no aplica una excepción del numeral 122.2' },
          { perfil: 'aga', documento: 'Carta notificando la resolución del contrato por la Pladicop', base: 'literal b) del numeral 122.1 y numeral 105.1 del Reglamento' },
        ],
  explicacion: (c) =>
    c.perfil === 'contratista'
      ? 'El contratista resuelve en dos tiempos: primero requiere el cumplimiento bajo apercibimiento y, vencido el plazo sin cumplimiento, comunica la resolución total o parcial. Todo se notifica por la Pladicop.'
      : 'La resolución por incumplimiento se tramita en dos tiempos: apercibimiento con plazo razonable y, vencido sin cumplimiento, la comunicación de la resolución. Asesoría Jurídica es recomendable: la resolución suele terminar en una controversia.',
};

const PENALIDAD: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'fechas',
      texto: 'Cronograma o fechas de entrega pactadas',
      nivel: 1,
      acreditaCon: ['cronograma', 'tdr', 'plan_trabajo', 'contrato', 'orden'],
      porQue: 'Los días de atraso se cuentan contra el plazo pactado del contrato o del entregable.',
      base: art('120.2', 120, REG),
    },
    {
      id: 'entrega',
      texto: 'Documento que acredite la fecha real de entrega o de ejecución (guía, acta, conformidad)',
      nivel: 1,
      acreditaCon: ['conformidad', 'acta_recepcion', 'otra_acta', 'solicitud_contratista'],
      porQue: 'Sin la fecha real de cumplimiento no hay días de atraso que calcular.',
      base: art('120.1', 120, REG),
    },
    {
      id: 'ampliaciones',
      texto: 'Ampliaciones de plazo aprobadas',
      nivel: 2,
      acreditaCon: ['resolucion'],
      porQue: 'El retraso se justifica con la ampliación de plazo aprobada.',
      base: art('120.4', 120, REG),
    },
    {
      id: 'justificacion',
      texto: 'Documentos que sustenten que el atraso no es imputable al contratista',
      nivel: (c) => (c.perfil === 'contratista' ? 1 : 3),
      acreditaCon: [],
      porHecho: true,
      porQue: 'El retraso es justificado si el contratista acredita objetivamente que no le es imputable.',
      base: art('120.4', 120, REG),
    },
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'retraso', texto: 'Hay un retraso injustificado e imputable al contratista', base: art('120.1', 120, REG) },
    { id: 'formula', texto: 'La penalidad diaria se calcula con la fórmula 0.10 × monto / (F × plazo) sobre el monto y plazo vigentes del contrato o del entregable', base: 'numerales 120.1 y 120.2 del artículo 120 del Reglamento' },
    { id: 'tope', texto: 'La suma de penalidades no supera el 10 % del monto vigente', base: art('119.2', 119, REG) },
    { id: 'conformidad', texto: 'No se imputan al contratista los días en que la Entidad excedió su plazo para dar la conformidad, ni se penaliza lo subsanado a tiempo', base: 'numerales 144.4 y 144.6 del artículo 144 del Reglamento' },
  ],
  articulos: () => ({ ley: [], reglamento: [119, 120, 144] }),
  organo: () => ({
    organo: 'La Entidad la aplica automáticamente y la deduce de los pagos o de la liquidación',
    base: 'numeral 120.1 del artículo 120 y numeral 119.3 del artículo 119 del Reglamento',
    verificar: 'Qué órgano calcula y descuenta la penalidad según las normas de gestión interna.',
  }),
  cadena: (c) =>
    c.perfil === 'contratista'
      ? [{ perfil: 'contratista', documento: 'Descargo o solicitud de inaplicación de la penalidad', base: art('120.4', 120, REG) }]
      : [
          { perfil: 'area_usuaria', documento: 'Informe con las fechas de entrega y la conformidad' },
          { perfil: 'dec', documento: 'Informe de cálculo de la penalidad' },
          { perfil: 'dec', documento: 'Deducción del pago o de la liquidación', base: art('119.3', 119, REG) },
        ],
  explicacion: (c) =>
    c.perfil === 'contratista'
      ? 'El contratista puede sostener que el retraso está justificado —por una ampliación aprobada o acreditando que no le es imputable— o que se calculó mal.'
      : 'La penalidad por mora se aplica automáticamente con la fórmula del artículo 120, con tope del 10 % del monto vigente, y se deduce de los pagos.',
};

const RECONOCIMIENTO: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'conformidad',
      texto: 'Conformidad de la prestación',
      nivel: 1,
      acreditaCon: ['conformidad', 'acta_recepcion'],
      porQue: 'El pago corre desde la conformidad del Área Usuaria.',
      base: 'numeral 67.3 del artículo 67 de la Ley y artículo 144 del Reglamento',
      aplica: (c) => !/sin contrato|fuera/i.test(c.respuestas.origen_obligacion ?? ''),
    },
    {
      id: 'valorizacion',
      texto: 'Valorización aprobada',
      nivel: 1,
      acreditaCon: ['valorizacion'],
      porQue: 'En obras, el pago se hace sobre la valorización.',
      base: 'numeral 67.3 del artículo 67 de la Ley',
      aplica: esObra,
    },
    {
      id: 'comprobante',
      texto: 'Comprobante de pago emitido',
      nivel: 2,
      acreditaCon: ['pago'],
      porQue: 'Acredita el monto exigible y su fecha.',
    },
    {
      id: 'acredita_hecho',
      texto: 'Documentos que acrediten la prestación efectivamente ejecutada',
      nivel: 1,
      acreditaCon: [],
      porHecho: true,
      porQue: 'Sin contrato o fuera de él, lo único que sostiene el reconocimiento es la prueba de la prestación recibida.',
      aplica: (c) => /sin contrato|fuera/i.test(c.respuestas.origen_obligacion ?? ''),
    },
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'conformidad', texto: 'La prestación cuenta con la conformidad del Área Usuaria', base: 'artículo 144 del Reglamento' },
    { id: 'plazo_pago', texto: 'El pago se realiza en un plazo máximo de diez días hábiles desde la conformidad, prorrogable por cinco días hábiles con justificación', base: 'numeral 67.3 del artículo 67 de la Ley' },
    { id: 'intereses', texto: 'Si hay retraso injustificado, la Entidad reconoce los intereses legales y repite contra los responsables', base: 'numeral 67.5 del artículo 67 de la Ley' },
  ],
  articulos: () => ({ ley: [67, 76], reglamento: [124, 144, 145] }),
  organo: () => ({
    organo: 'Autoridad de la gestión administrativa',
    base: 'numeral 67.4 del artículo 67 de la Ley',
    verificar: 'El incumplimiento o la demora injustificada del pago con conformidad es falta grave de la autoridad de la gestión administrativa.',
  }),
  cadena: (c) =>
    c.perfil === 'contratista'
      ? [{ perfil: 'contratista', documento: 'Carta de requerimiento de pago (con intereses, si corresponden)', base: 'numerales 67.3 y 67.5 del artículo 67 de la Ley' }]
      : [
          { perfil: 'area_usuaria', documento: 'Conformidad de la prestación', base: 'artículo 144 del Reglamento' },
          { perfil: 'dec', documento: 'Informe de la DEC: monto exigible, plazo e intereses' },
          { perfil: 'aga', documento: 'Disposición del pago', base: 'numeral 67.3 del artículo 67 de la Ley' },
        ],
  explicacion: () =>
    'El pago de una prestación con conformidad no necesita un acto nuevo: corre el plazo de diez días hábiles de la Ley. Si la obligación nace sin contrato o fuera de él, ya no es un pago contractual y su base legal es otra.',
};

const LIQUIDACION: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'recepcion',
      texto: 'Acta de recepción de la obra (o conformidad de la última prestación, o resolución consentida)',
      nivel: 1,
      acreditaCon: ['acta_recepcion', 'conformidad', 'resolucion'],
      porQue: 'El plazo para presentar la liquidación corre desde ese acto.',
      base: art('215.1', 215, REG),
    },
    {
      id: 'liquidacion',
      texto: 'Liquidación presentada por el contratista',
      nivel: 1,
      acreditaCon: ['liquidacion'],
      porQue: 'La Entidad se pronuncia sobre la liquidación que se le presenta.',
      base: art('215.3', 215, REG),
      aplica: (c) => c.perfil !== 'contratista',
    },
    {
      id: 'valorizaciones',
      texto: 'Valorizaciones, adicionales, deductivos y ampliaciones aprobados',
      nivel: 2,
      acreditaCon: ['valorizacion', 'resolucion', 'adenda'],
      porQue: 'La liquidación se sustenta con los cálculos de todo lo ejecutado y aprobado.',
      base: art('215.1', 215, REG),
    },
    SUPERVISOR_OPINA(art('215.7', 215, REG)),
    {
      id: 'declaratoria',
      texto: 'Planos post construcción y minuta de declaratoria de fábrica o memoria descriptiva valorizada',
      nivel: 2,
      acreditaCon: [],
      porHecho: true,
      porQue: 'Su entrega es condición para pagar el monto de la liquidación a favor del contratista.',
      base: art('214.1', 214, REG),
      aplica: esObra,
    },
    DELEGACION,
    CONTROL,
  ],
  condiciones: [
    { id: 'oportunidad', texto: 'La liquidación se presenta y se contesta dentro de los plazos del cuadro del numeral 215.6', base: 'numerales 215.1 y 215.6 del artículo 215 del Reglamento' },
    { id: 'consentimiento', texto: 'Si quien la recibe no se pronuncia en plazo, la liquidación queda consentida o aprobada', base: art('215.3', 215, REG) },
    { id: 'observaciones', texto: 'Las observaciones se subsanan en plazo; si no, queda consentida con ellas', base: art('215.4', 215, REG) },
    { id: 'controversias', texto: 'No incluye lo sometido a un medio de solución de controversias', base: art('215.7', 215, REG) },
    { id: 'efectos', texto: 'Consentida, se hace el pago final, se devuelve la garantía de fiel cumplimiento y se cierra el expediente', base: art('215.5', 215, REG) },
  ],
  articulos: (c) => ({ ley: [67], reglamento: esObra(c) ? [212, 213, 214, 215] : [215] }),
  organo: () => ({
    organo: 'La Entidad, por el órgano que las normas de gestión interna señalen para pronunciarse sobre la liquidación',
    base: 'artículo 215 del Reglamento',
    verificar: 'El artículo 215 no reserva el pronunciamiento a un órgano determinado.',
  }),
  cadena: (c) =>
    c.perfil === 'contratista'
      ? [{ perfil: 'contratista', documento: 'Liquidación sustentada con los cálculos y la documentación', base: art('215.1', 215, REG) }]
      : [
          { perfil: 'supervisor', documento: 'Cálculos propios del supervisor', base: art('215.7', 215, REG), condicion: 'Si el contrato tiene supervisión' },
          { perfil: 'dec', documento: 'Informe de la DEC sobre la liquidación' },
          { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Si hay observaciones o controversias' },
          { perfil: 'aga', documento: 'Pronunciamiento sobre la liquidación (conformidad u observaciones)', base: art('215.3', 215, REG) },
        ],
  explicacion: () =>
    'La liquidación es propia de obras y consultorías de obra. Los plazos para presentarla y pronunciarse están en el cuadro del numeral 215.6 del Reglamento; si no hay pronunciamiento en plazo, queda consentida.',
  noCorresponde: (c) =>
    esBienesOServicios(c)
      ? {
          razon:
            'En bienes y servicios no hay liquidación: el contrato rige hasta el pago final (literal a) del numeral 106.2 del artículo 106 del Reglamento). Lo que corresponde es la conformidad (artículo 144) y el pago (artículo 67 de la Ley).',
          alternativa: 'reconocimiento_pago',
        }
      : null,
};

const GENERAL: DefinicionDeActuacion = {
  requisitos: [
    CONTRATO,
    {
      id: 'tdr',
      texto: 'Términos de referencia, especificaciones técnicas o expediente técnico',
      nivel: 2,
      acreditaCon: ['tdr', 'expediente_tecnico', 'bases'],
      porQue: 'Para contrastar lo ocurrido con las obligaciones pactadas.',
    },
    {
      id: 'acredita_hecho',
      texto: 'Documentos que acrediten los hechos del caso',
      nivel: 2,
      acreditaCon: [],
      porHecho: true,
      porQue: 'Lo que no está acreditado solo puede analizarse como declarado.',
    },
    DELEGACION,
    CONTROL,
  ],
  condiciones: [],
  articulos: (c) => ({
    ley: [63, 64, 67, 68],
    reglamento: esObra(c)
      ? [105, 106, 107, 109, 110, 119, 120, 122, 194, 198, 200, 215]
      : esConsultoriaObra(c)
        ? [105, 106, 107, 109, 110, 119, 120, 122, 193, 198, 199, 215]
        : [105, 106, 107, 109, 110, 119, 120, 122, 141, 142, 144, 146],
  }),
  organo: () => ({
    organo: 'Depende de la figura que corresponda',
    base: 'numeral 63.1 del artículo 63 de la Ley y numeral 105.4 del artículo 105 del Reglamento',
    verificar: 'Se determina con la figura identificada.',
  }),
  cadena: () => [],
  explicacion: () =>
    'El diagnóstico identifica la figura que corresponde y, con ella, la cadena documental y el órgano competente.',
};

export const MATRIZ: Record<Actuacion, DefinicionDeActuacion> = {
  diagnostico: GENERAL,
  adicional: ADICIONAL,
  reduccion: REDUCCION,
  ampliacion_plazo: AMPLIACION,
  otra_modificacion: OTRA_MODIFICACION,
  complementario: COMPLEMENTARIO,
  suspension: SUSPENSION,
  resolucion: RESOLUCION,
  penalidad: PENALIDAD,
  reconocimiento_pago: RECONOCIMIENTO,
  liquidacion: LIQUIDACION,
  otro_informe: GENERAL,
};

export function nivelDe(r: ReglaRequisito, c: Contexto): Nivel {
  return typeof r.nivel === 'function' ? r.nivel(c) : r.nivel;
}

/** Los requisitos que aplican al caso, sin repetir id. */
export function requisitosAplicables(actuacion: Actuacion, c: Contexto): ReglaRequisito[] {
  const vistos = new Set<string>();
  return MATRIZ[actuacion].requisitos.filter((r) => {
    if (r.aplica && !r.aplica(c)) return false;
    if (vistos.has(r.id)) return false;
    vistos.add(r.id);
    return true;
  });
}

export function condicionesAplicables(actuacion: Actuacion, c: Contexto): ReglaCondicion[] {
  return MATRIZ[actuacion].condiciones.filter((r) => !r.aplica || r.aplica(c));
}

// ── El documento que corresponde al perfil ──────────────────────────

const NOMBRE_ACTUACION: Record<Actuacion, string> = {
  diagnostico: 'la situación del contrato',
  adicional: 'la prestación adicional',
  reduccion: 'la reducción de prestaciones',
  ampliacion_plazo: 'la ampliación de plazo',
  otra_modificacion: 'la modificación contractual',
  complementario: 'la contratación complementaria',
  suspension: 'la suspensión del plazo de ejecución',
  resolucion: 'la resolución del contrato',
  penalidad: 'la penalidad',
  reconocimiento_pago: 'el pago de la obligación',
  liquidacion: 'la liquidación del contrato',
  otro_informe: 'el caso',
};

export function documentoRecomendado(
  perfil: Perfil,
  actuacion: Actuacion,
  c: Contexto,
): { tipo: TipoDeDocumento; titulo: string } {
  const sobre = NOMBRE_ACTUACION[actuacion];
  if (actuacion === 'diagnostico') return { tipo: 'informe_diagnostico', titulo: 'Informe de diagnóstico contractual' };
  switch (perfil) {
    case 'area_usuaria':
      return { tipo: 'informe_tecnico', titulo: `Informe técnico sobre ${sobre}` };
    case 'dec':
      if (actuacion === 'suspension') return { tipo: 'acta', titulo: 'Acta de suspensión del plazo de ejecución' };
      if (actuacion === 'otra_modificacion') return { tipo: 'informe_dec', titulo: 'Informe de la DEC sobre la modificación contractual' };
      return { tipo: 'informe_dec', titulo: `Informe de la DEC sobre ${sobre}` };
    case 'asesoria_juridica':
      return { tipo: 'informe_legal', titulo: `Informe legal sobre ${sobre}` };
    case 'aga':
    case 'titular':
      if (actuacion === 'resolucion')
        return /resoluci/i.test(c.respuestas.etapa_resolucion ?? '')
          ? { tipo: 'carta', titulo: 'Carta de resolución del contrato' }
          : { tipo: 'carta', titulo: 'Carta de requerimiento bajo apercibimiento de resolución' };
      if (actuacion === 'suspension') return { tipo: 'acta', titulo: 'Acta de suspensión del plazo de ejecución' };
      if (actuacion === 'otra_modificacion') return { tipo: 'adenda', titulo: 'Adenda al contrato' };
      if (actuacion === 'penalidad' || actuacion === 'reconocimiento_pago' || actuacion === 'liquidacion')
        return { tipo: 'resolucion', titulo: `Resolución sobre ${sobre}` };
      return { tipo: 'resolucion', titulo: `Resolución que se pronuncia sobre ${sobre}` };
    case 'supervisor':
      return { tipo: 'informe_supervisor', titulo: `Informe del supervisor sobre ${sobre}` };
    case 'defensa':
      return { tipo: 'descargo', titulo: `Descargo ante el órgano de control sobre ${sobre}` };
    case 'contratista':
      switch (actuacion) {
        case 'ampliacion_plazo':
          return { tipo: 'carta', titulo: 'Carta de solicitud de ampliación de plazo' };
        case 'resolucion':
          return /resoluci/i.test(c.respuestas.etapa_resolucion ?? '')
            ? { tipo: 'carta', titulo: 'Carta de resolución del contrato' }
            : { tipo: 'carta', titulo: 'Carta de requerimiento bajo apercibimiento de resolución' };
        case 'penalidad':
          return { tipo: 'carta', titulo: 'Carta de descargo sobre la penalidad' };
        case 'reconocimiento_pago':
          return { tipo: 'carta', titulo: 'Carta de requerimiento de pago' };
        case 'liquidacion':
          return { tipo: 'carta', titulo: 'Carta de presentación de la liquidación' };
        case 'suspension':
          return { tipo: 'carta', titulo: 'Carta de solicitud de suspensión del plazo de ejecución' };
        default:
          return { tipo: 'carta', titulo: `Carta sobre ${sobre}` };
      }
  }
}
