/**
 * El acta de evaluación, con la comparación entre postores.
 *
 * POR QUÉ EXISTE
 *
 * Es la última pieza que pidió César: "también se te ha mandado un
 * modelo de acta. En este modelo de acta debería salir ese resultado
 * como una comparación: si hay 2, 3 o más postores, su evaluación en
 * cada una de estas etapas".
 *
 * CÓMO SIGUE EL MODELO
 *
 * Apartado por apartado, con sus títulos y sus párrafos literales, el
 * «Acta de Evaluación - OK.docx»:
 *
 *   I–IV     datos, instalación, quorum y postores;
 *   por etapa, TRES apartados de primer nivel: el desarrollo, la
 *            SUBSANACIÓN —con su «Declaración sobre la exigencia de
 *            subsanación» y su «Matriz de trazabilidad»— y el RESULTADO
 *            CONSOLIDADO. La versión anterior los colgaba como
 *            subtítulos de la etapa, y el modelo no lo hace;
 *   después, la evaluación económica, la verificación de montos, el
 *            consolidado, la buena pro y el acuerdo con el cuadro de
 *            firmas;
 *   y en hoja apaisada, los ANEXOS N.° 01, 02 y 03: una fila por postor y
 *            una columna por requisito. Son la comparación que pidió
 *            César, y los párrafos del modelo remiten a ellos; antes el
 *            acta los citaba sin traerlos.
 *
 * Los anexos 04 a 06, los económicos, no se generan: necesitan los montos
 * ofertados, que el comité consigna a mano.
 *
 * QUÉ SE DEJA EN BLANCO Y POR QUÉ
 *
 * Lo que el sistema no puede saber —la fecha, los miembros del comité,
 * el número de acta, los montos— va con los huecos del modelo, en rojo,
 * para que el comité los complete. Rellenarlos con algo inventado sería
 * peor: es un documento que se firma. Y cuando una etapa quedó en
 * revisión humana, el acta lo dice con esas palabras en lugar de
 * inclinarse por un resultado.
 */
import {
  ETIQUETA_RESULTADO,
  NOMBRE_ETAPA,
  type Etapa,
  type FichaRequisito,
  type Resultado,
  type ResultadoPostor,
} from './etapas';
import type { ExigenciaBases, LecturaBases } from './motor';
import type { CeldaCuadro, Pieza } from '../documentos/piezas';
import { aRomano } from '../documentos/numeracion';
import { piezasAMarkdown } from '../documentos/markdown';
import { FORMATO_ACTA, piezasADocx } from '../documentos/word';

const HUECO = '[●]';
/** Quién evalúa, como lo escribe el modelo. */
const EVALUADOR = '[Comité / OEC / DEC / Oficial de Compra, según corresponda]';
/**
 * Por dónde se subsana. El modelo dice «SEACE»; el numeral 78.1 del
 * Reglamento, en la redacción del Decreto Supremo N.° 001-2026-EF, dice
 * que la subsanación «se realiza a través de la Pladicop», y es lo que
 * dice la carta de subsanación. Está entre las preguntas para César.
 */
const MEDIO = 'Pladicop';
const SI = '☒ Sí   ☐ No';
const NO = '☐ Sí   ☒ No';
const NI = '☐ Sí   ☐ No';

export interface DatosActa {
  bases: LecturaBases;
  postores: ResultadoPostor[];
  /** Lo que sepa quien genera el acta; todo opcional. */
  sesion?: {
    numeroActa?: string;
    ciudad?: string;
    fecha?: string;
    hora?: string;
    modalidad?: string;
    comite?: Array<{ nombre: string; cargo: string; condicion?: string }>;
  };
}

const etapaDe = (p: ResultadoPostor, e: Etapa) => p.etapas.find((x) => x.etapa === e);

/** Cómo quedó un postor en una etapa, dicho para el acta. */
function resultadoEnActa(p: ResultadoPostor, e: Etapa): string {
  const etapa = etapaDe(p, e);
  if (!etapa) return HUECO;
  if (etapa.omitida) return 'No evaluado';
  return ETIQUETA_RESULTADO[e][etapa.resultado];
}

/** Lo que dice cada casilla de un anexo, con las palabras del modelo. */
const CASILLA: Record<Resultado, string> = {
  cumple: 'Cumple',
  no_cumple: 'No cumple',
  subsanable: 'Observado',
  revision_humana: 'Por revisar',
};

/** Palabras con las que decidir si dos textos hablan de lo mismo. */
function significativas(t: string): Set<string> {
  return new Set(
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z0-9]{4,}/g) ?? [],
  );
}

/**
 * La ficha de un postor que corresponde a un requisito de las bases.
 *
 * El motor nombra el requisito como lo leyó en la oferta y las bases como
 * lo leyó en las bases, y no siempre coinciden letra por letra. Se busca
 * primero por su id y, si no, por las palabras que comparten.
 */
function fichaPara(fichas: FichaRequisito[], exigencia: ExigenciaBases): FichaRequisito | undefined {
  const porId = fichas.find((f) => f.id && f.id === exigencia.id);
  if (porId) return porId;
  const clave = significativas(exigencia.requisito);
  let mejor: FichaRequisito | undefined;
  let puntos = 0;
  for (const f of fichas) {
    const p = [...significativas(f.requisito)].filter((w) => clave.has(w)).length;
    if (p > puntos) {
      puntos = p;
      mejor = f;
    }
  }
  return puntos >= 2 ? mejor : undefined;
}

/** Cómo nombra el ACTA cada etapa, que no es como las nombra el motor. */
const ETAPA_EN_ACTA: Record<Etapa, string> = {
  admision: 'ADMISIÓN',
  calificacion: 'CALIFICACIÓN',
  evaluacion: 'EVALUACIÓN TÉCNICA',
};

/** Los títulos del desarrollo de cada etapa, como en el modelo. */
const TITULO_ETAPA: Record<Etapa, string> = {
  admision: 'DETALLE DE LAS OFERTAS EN LA ETAPA DE ADMISIÓN',
  calificacion: 'EVALUACIÓN DE LOS REQUISITOS DE CALIFICACIÓN',
  evaluacion: 'EVALUACIÓN DE LOS FACTORES DE EVALUACIÓN TÉCNICA',
};

/** Los párrafos con que el modelo abre cada etapa, literales. */
const INTRODUCCION: Record<Etapa, string[]> = {
  admision: [
    'Acto seguido, se procede a la descarga, apertura y revisión de las ofertas presentadas por los postores, verificándose la documentación exigida para su admisión, de conformidad con las Bases Integradas, el requerimiento y la normativa aplicable.',
    'Como resultado de dicha revisión, se determina el cumplimiento de los documentos de presentación obligatoria y demás exigencias establecidas para la admisión de las ofertas, conforme a la evaluación realizada en el “Anexo N.° 01 – Requisitos de Admisión”.',
  ],
  calificacion: [
    'Acto seguido, se procedió con la calificación de las ofertas admitidas, verificándose la documentación presentada por cada postor para acreditar el cumplimiento de los requisitos de calificación establecidos en el Capítulo III de la Sección Específica de las Bases Integradas.',
    'La evaluación de las condiciones mínimas exigidas fue efectuada de acuerdo al detalle establecido en el “Anexo N.° 02 – Requisitos de Calificación”, considerando los requisitos de calificación establecidas en las bases integradas y/o bases definitivas, según corresponda.',
  ],
  evaluacion: [
    'Acto seguido, se procede con la evaluación técnica de las ofertas que cumplieron los requisitos de calificación, aplicando los factores de evaluación, criterios de acreditación, puntajes y metodología de asignación establecidos en el Capítulo IV de la Sección Específica de las Bases Integradas y/o Bases Definitivas.',
    'La evaluación de las condiciones establecidas para cada factor fue efectuada de acuerdo a los detalles establecidos en el “Anexo N.° 03 – Factores de Evaluación Técnica”, que fueron establecidas en las Bases Integradas y/o Bases Definitivas, según corresponda.',
  ],
};

/** Qué deja constar el evaluador cuando no hubo que subsanar nada. */
const SIN_SUBSANACION: Record<Etapa, string> = {
  admision: `El ${EVALUADOR} deja constancia de que no se requirió subsanación de las ofertas, al no haberse identificado omisiones o defectos susceptibles de subsanación, de acuerdo con las Bases Integradas y la normativa aplicable.`,
  calificacion: `El ${EVALUADOR} deja constancia de que no se requirió subsanación durante la etapa de calificación, al no haberse identificado documentación o información susceptible de subsanación conforme a las Bases Integradas y la normativa aplicable.`,
  evaluacion: `El ${EVALUADOR} deja constancia de que no se requirió subsanación durante la etapa de evaluación técnica, al no haberse identificado documentación o información susceptible de subsanación conforme a las Bases Integradas y la normativa aplicable.`,
};

const gris = (texto: string, columnas?: number): CeldaCuadro => ({ texto, gris: true, columnas });
const crema = (texto: string, columnas?: number): CeldaCuadro => ({ texto, crema: true, columnas });
const llana = (texto: string, columnas?: number): CeldaCuadro => ({ texto, columnas });

/** Lo que tuvo que subsanar un postor en una etapa, requisito a requisito. */
function observados(p: ResultadoPostor, e: Etapa): Array<{ requisito: string; motivo: string }> {
  const et = etapaDe(p, e);
  if (!et || et.omitida) return [];
  const conFicha = et.fichas
    .filter((f) => f.resultado === 'subsanable')
    .map((f) => ({ requisito: f.requisito, motivo: f.hallazgo }));
  if (conFicha.length > 0) return conFicha;
  return (et.subsanaciones ?? []).map((s) => ({ requisito: s, motivo: '' }));
}

export function piezasDelActa({ bases, postores, sesion }: DatosActa): Pieza[] {
  const proc = bases.procedimiento;
  const s = sesion ?? {};
  const piezas: Pieza[] = [];

  let n = 0;
  /** Un apartado de primer nivel: «I.», «II.»… */
  const apartado = (texto: string) => {
    n++;
    piezas.push({ clase: 'titulo', nivel: 1, numero: `${aRomano(n)}.`, texto });
    return n;
  };
  /** Sus hijas llevan numeración legal: «5.1.», «5.2.». */
  const subapartado = (padre: number, m: number, texto: string) =>
    piezas.push({ clase: 'titulo', nivel: 2, numero: `${padre}.${m}.`, texto });
  const parrafo = (texto: string, alineacion?: 'centro') =>
    piezas.push({ clase: 'parrafo', texto, alineacion });

  piezas.push(
    {
      clase: 'titulo',
      rol: 'encabezado',
      nivel: 0,
      texto: `ACTA N.° ${s.numeroActa ?? `${HUECO}-[AÑO]-[SIGLAS]`}`,
    },
    { clase: 'titulo', rol: 'subtitulo', nivel: 0, texto: 'ACTA DE EVALUACIÓN DE OFERTAS' },
  );

  // ── I. Datos del procedimiento ──
  apartado('DATOS DEL PROCEDIMIENTO');
  piezas.push({
    clase: 'tabla',
    columnas: ['Campo', 'Información'],
    conContenido: 5,
    filas: [
      ['Entidad', proc.entidad ?? '[Nombre de la Entidad]'],
      ['Procedimiento de selección', proc.numero ?? '[Tipo y N.° de procedimiento]'],
      ['Objeto de contratación', proc.objeto ?? '[Bien / Servicio / Obra / Consultoría]'],
      ['Denominación de la contratación', proc.denominacion ?? HUECO],
      // La cuantía va SIEMPRE en blanco. Las bases no la publican —«no
      // se da a conocer a los proveedores», numeral 53.4 del artículo 53
      // del Reglamento—, así que lo que el motor lee de ellas es esa
      // frase y no la cifra. Observación de César (setiembre de 2026):
      // «este campo debe dejarse en blanco para ser completado
      // manualmente».
      ['Cuantía', HUECO],
    ],
  });

  // ── II. Instalación ──
  apartado('INSTALACIÓN DE LA SESIÓN');
  parrafo(
    `En ${s.ciudad ?? '[ciudad]'}, siendo las ${s.hora ?? '[hora]'} horas del ${
      s.fecha ?? '[día] de [mes] de [año]'
    }, se reunieron ${s.modalidad ?? '[de manera presencial / virtual / mixta]'} los integrantes del ` +
      '[Comité / Jurado / Oficial de Compra], designados mediante [documento de designación, número y fecha], ' +
      'encargados de la preparación, conducción y realización del procedimiento de selección indicado.',
  );

  // ── III. Quorum ── El modelo lo trae siempre; sin datos, con sus huecos.
  apartado('SOBRE EL QUORUM Y LOS MIEMBROS PARTICIPANTES DE LA SESIÓN');
  parrafo(
    'El quorum necesario que exige la normativa de contrataciones del Estado, se logró con la presencia de los siguientes miembros:',
  );
  const comite =
    s.comite && s.comite.length > 0
      ? s.comite.map((m, i) => [String(i + 1), m.nombre, m.cargo, m.condicion ?? HUECO])
      : [1, 2, 3].map((i) => [
          String(i),
          HUECO,
          '[Presidente / Integrante / Oficial de Compra]',
          '[Profesional con conocimiento técnico / Comprador público / otros]',
        ]);
  piezas.push({
    clase: 'tabla',
    columnas: ['N.°', 'Nombres y apellidos', 'Cargo', 'Condición'],
    filas: comite,
    conContenido: comite.length,
  });
  parrafo(
    'Se deja constancia de la participación de los integrantes antes indicados para el desarrollo de las actuaciones correspondientes a la presente sesión.',
  );

  // ── IV. Postores ──
  apartado('DETALLE DE LOS POSTORES');
  parrafo(
    'En el día y horario señalado en el cronograma del SEACE, los siguientes postores presentaron su oferta a través del SEACE:',
  );
  piezas.push({
    clase: 'tabla',
    columnas: ['N.°', 'Nombre o razón social del postor', 'Integrantes del consorcio', 'Porcentaje de participación'],
    conContenido: postores.length,
    filas: postores.map((x, i) => [
      String(i + 1),
      x.postor,
      x.consorcio?.map((c) => c.nombre).join('\n') ?? 'No aplica',
      x.consorcio?.map((c) => c.participacion ?? HUECO).join('\n') ?? 'No aplica',
    ]),
  });

  // ── Por etapa: desarrollo, subsanación y resultado consolidado ──
  for (const etapa of ['admision', 'calificacion', 'evaluacion'] as Etapa[]) {
    apartado(TITULO_ETAPA[etapa]);
    for (const t of INTRODUCCION[etapa]) parrafo(t);

    const exigencias =
      etapa === 'admision' ? bases.admision : etapa === 'calificacion' ? bases.calificacion : bases.factores;
    if (etapa === 'calificacion' && exigencias.length > 0) {
      parrafo('Los siguientes requisitos de calificación fueron evaluados:');
      piezas.push({
        clase: 'tabla',
        columnas: ['Código', 'Requisito de calificación', 'Condición mínima exigida según bases'],
        conContenido: exigencias.length,
        filas: exigencias.map((e, i) => [
          String.fromCharCode(65 + i),
          e.requisito,
          e.reglaBases || e.documento || HUECO,
        ]),
      });
    }
    if (etapa === 'evaluacion' && exigencias.length > 0) {
      parrafo('**Factores de evaluación técnica establecidos en las bases**');
      piezas.push({
        clase: 'tabla',
        columnas: ['Código', 'Factor de evaluación técnica', 'Documento(s) para acreditar'],
        conContenido: exigencias.length,
        filas: exigencias.map((e, i) => [String.fromCharCode(65 + i), e.requisito, e.documento ?? HUECO]),
      });
    }

    // El análisis de cada postor, que es lo que sostiene el resultado. No
    // está en el modelo como tal —allí lo llevan los anexos en una
    // casilla—, pero sin él el acta no dice por qué.
    for (const x of postores) {
      const et = etapaDe(x, etapa);
      if (!et) continue;
      parrafo(`**${x.postor}** — ${resultadoEnActa(x, etapa)}`);
      if (et.omitida) {
        parrafo(`*${et.motivoOmision ?? 'No evaluado.'}*`);
        continue;
      }
      if (et.fichas.length > 0) {
        piezas.push({
          clase: 'tabla',
          columnas:
            etapa === 'evaluacion' ? ['Factor', 'Análisis', 'Puntaje'] : ['Requisito', 'Análisis', 'Resultado'],
          conContenido: et.fichas.length,
          filas: et.fichas.map((f) =>
            etapa === 'evaluacion'
              ? [f.requisito, f.hallazgo, `${f.puntaje ?? 0} / ${f.puntajeMaximo ?? HUECO}`]
              : [f.requisito, f.hallazgo, CASILLA[f.resultado]],
          ),
        });
      }
      if (et.fundamento) parrafo(`*${et.fundamento}*`);
    }

    // Subsanación de la etapa, con las dos partes del modelo.
    const num = apartado(`SUBSANACIÓN DE LA OFERTA EN LA ETAPA DE ${ETAPA_EN_ACTA[etapa]}`);
    subapartado(num, 1, 'Declaración sobre la exigencia de subsanación');
    const conSubsanacion = postores.filter((x) => observados(x, etapa).length > 0);
    if (conSubsanacion.length === 0) {
      parrafo('**No se requirió subsanación**');
      parrafo(SIN_SUBSANACION[etapa]);
    } else {
      parrafo('**Se requirió y evaluó la subsanación**');
      parrafo(
        `El ${EVALUADOR} requirió la subsanación de la oferta presentada por ${
          conSubsanacion.length === 1 ? 'el siguiente postor' : 'los siguientes postores'
        }:`,
      );
      for (const x of conSubsanacion) {
        piezas.push({
          clase: 'cuadro',
          proporciones: [2552, 4961],
          filas: [
            [gris('Nombre o razón social del postor'), crema(x.postor)],
            [gris('Ítem(s) / Lote(s)'), crema('[Indicar el número de ítem/ítem único/lotes]')],
            [gris('Datos'), gris('Registro')],
            [llana('Documento de requerimiento'), llana('[Tipo y N.° de documento]')],
            [llana('Fecha de notificación'), llana('[DD/MM/AAAA]')],
            // Dos días hábiles: el numeral 78.4 del artículo 78 del
            // Reglamento. No es un dato de la Entidad sino de la norma.
            [llana('Plazo otorgado'), llana('02 (dos) días hábiles')],
            [llana('Medio de notificación'), llana(MEDIO)],
          ],
        });
      }

      subapartado(num, 2, 'Matriz de trazabilidad de la subsanación');
      for (const x of conSubsanacion) {
        const obs = observados(x, etapa);
        piezas.push({
          clase: 'cuadro',
          proporciones: [462, 1522, 5849],
          filas: [
            [gris('Nombre o razón social del postor', 2), crema(x.postor)],
            [gris('Ítem(s) / Lote(s)', 2), crema('[Indicar el número de ítem/ítem único/lotes]')],
            [gris('N.º'), gris('Aspecto'), gris('Registro')],
            [
              llana('1'),
              llana('Observación'),
              llana(
                obs
                  .map((o) =>
                    `Documento o requisito observado: ${o.requisito}${o.motivo ? `\nMotivo: ${o.motivo}` : '\nMotivo: [●]'}`,
                  )
                  .join('\n'),
              ),
            ],
            [
              llana('2'),
              llana('Requerimiento'),
              llana('Documento N.º [●]\nFecha de notificación: [●]\nPlazo otorgado: 02 (dos) días hábiles'),
            ],
            [
              llana('3'),
              llana('Subsanación presentada'),
              llana(`Documento N.º [●]\nFecha y hora de presentación: [●]\nMedio: ${MEDIO}`),
            ],
            [
              llana('4'),
              llana('Verificación y resultado'),
              llana(
                'Oportunidad: ☐ Dentro del plazo   ☐ Fuera del plazo\nResultado: ☐ Subsanó conforme   ☐ No subsanó conforme',
              ),
            ],
            [
              llana('5'),
              llana('Resultado de la subsanación'),
              llana(
                'Sustento: [Consignar de manera breve y objetiva la razón que sustenta el resultado, indicando la disposición normativa aplicable.]',
              ),
            ],
          ],
        });
      }
    }

    // Resultado consolidado de la etapa: la comparación que pidió César.
    apartado(
      `RESULTADO CONSOLIDADO DE LA ETAPA DE ${ETAPA_EN_ACTA[etapa]}${etapa === 'evaluacion' ? '' : ' DE OFERTAS'}`,
    );
    if (etapa === 'evaluacion') {
      parrafo(
        'Concluida la evaluación individual de las ofertas en la etapa de evaluación técnica y, de corresponder, la evaluación de las subsanaciones, se obtiene el siguiente resultado:',
      );
      const minimo = bases.puntajeTecnicoMinimo;
      piezas.push({
        clase: 'tabla',
        columnas: [
          'N.°',
          'Postor / Consorcio',
          'Ítem(s) / Lote(s)',
          'Puntaje técnico',
          'Puntaje mínimo',
          'Resultado ¿Accede a evaluación económica?',
        ],
        conContenido: postores.length,
        filas: postores.map((x, i) => {
          const et = etapaDe(x, 'evaluacion');
          const puntaje = et?.omitida ? 'No evaluado' : String(et?.puntaje ?? 0);
          const accede = et?.omitida
            ? NO
            : minimo == null
              ? NI
              : (et?.puntaje ?? 0) >= minimo
                ? SI
                : NO;
          return [String(i + 1), x.postor, '[Ítem / Lote]', puntaje, minimo == null ? HUECO : String(minimo), accede];
        }),
      });
    } else {
      parrafo(
        etapa === 'admision'
          ? 'Concluida la evaluación individual de las ofertas admitidas, no admitidas y, de corresponder, la evaluación de las subsanaciones, se obtiene el siguiente resultado:'
          : 'Concluida la evaluación individual de las ofertas calificadas, descalificadas y, de corresponder, la evaluación de las subsanaciones, se obtiene el siguiente resultado:',
      );
      piezas.push({
        clase: 'tabla',
        columnas: [
          'N.°',
          'Postor / Consorcio',
          'Ítem(s) / Lote(s)',
          etapa === 'admision' ? 'Resultado de la admisión' : 'Resultado de calificación',
        ],
        conContenido: postores.length,
        filas: postores.map((x, i) => [String(i + 1), x.postor, '[Ítem / Lote]', resultadoEnActa(x, etapa)]),
      });
    }
  }

  // ── Económica ── El comité la hace a mano: los montos no los conoce el sistema.
  const accedenEco = postores.filter((x) => {
    const et = etapaDe(x, 'evaluacion');
    return et && !et.omitida;
  });
  apartado('EVALUACIÓN ECONÓMICA DE LAS OFERTAS');
  parrafo(
    'Acto seguido, se procede con la evaluación económica de las ofertas que cumplieron las condiciones establecidas para acceder a esta etapa. Previo a la asignación de puntaje económica, se realiza la verificación del cumplimiento de la oferta económica.',
  );
  if (bases.evaluacionEconomica) {
    piezas.push({
      clase: 'nota',
      texto:
        `Según las Bases Integradas, la evaluación económica otorga hasta ${
          bases.evaluacionEconomica.puntajeMaximo ?? HUECO
        } puntos. ${bases.evaluacionEconomica.formula ?? ''} El comité consigna los montos ofertados y aplica la fórmula de las Bases.`.trim(),
    });
  }
  piezas.push({
    clase: 'cuadro',
    proporciones: [677, 3717, 1276, 1417, 1320],
    filas: [
      [gris('Ítem / Lote:', 2), crema('[Indicar el número de ítem/ítem único/lotes]', 3)],
      [
        gris('N.º'),
        gris('Nombre o razón social del postor'),
        gris('Monto ofertado sin IGV (S/)'),
        gris('Monto ofertado con IGV (S/)'),
        gris('¿Documento observado?'),
      ],
      ...(accedenEco.length > 0 ? accedenEco : [{ postor: '[Razón social / Consorcio]' } as ResultadoPostor]).map(
        (x, i) => [
          llana(String(i + 1).padStart(2, '0')),
          llana(x.postor),
          llana('[Indicar el monto]'),
          llana('[Indicar el monto]'),
          llana(NI),
        ],
      ),
    ],
  });

  // ── Verificación de montos por debajo de la cuantía ──
  const ver = apartado(
    'VERIFICACIÓN DE LOS MONTOS QUE SE ENCUENTRAN SUSTANCIALMENTE POR DEBAJO LA CUANTÍA Y/O LA POSIBILIDAD DE SOLICITAR SUBSANACIÓN',
  );
  subapartado(
    ver,
    1,
    'Declaración sobre la exigencia de un monto sustancialmente por debajo de la cuantía y/o subsanación',
  );
  piezas.push({ clase: 'nota', texto: '[Seleccione y consigne únicamente el supuesto que corresponda:]' });
  parrafo('**No se requirió justificación y/o subsanación**');
  parrafo(
    `El ${EVALUADOR} deja constancia de que no se requirió [justificación / subsanación] durante la etapa de evaluación económica, al no haberse identificado documentación o información susceptible de justificación y/o subsanación conforme a las Bases y la normativa aplicable.`,
  );
  parrafo('**Se requirió y evaluó la subsanación**');
  parrafo(
    `El ${EVALUADOR} requirió la [justificación / subsanación] de la oferta económica presentada por el siguiente postor: ${HUECO}`,
  );
  subapartado(ver, 2, 'Resultado de la evaluación económica');
  parrafo('Concluida la evaluación individual de la evaluación económica, se obtiene el siguiente resultado:');
  piezas.push({
    clase: 'tabla',
    columnas: ['N.º', 'Nombre o razón social del postor', 'Ítem(s) / Lote(s)', '¿Oferta económica rechazada?'],
    conContenido: accedenEco.length,
    filas: accedenEco.map((x, i) => [String(i + 1), x.postor, '[Ítem / Lote]', NI]),
  });

  // ── Resultado consolidado general ──
  apartado('RESULTADO CONSOLIDADO DE LA EVALUACIÓN DE OFERTAS');
  parrafo(
    'Concluida la evaluación individual de las ofertas en las etapas de admisión, calificadas, evaluación técnica y económica, se obtiene el siguiente resultado:',
  );
  piezas.push({
    clase: 'tabla',
    columnas: [
      'N.°',
      'Nombre o razón social del postor',
      'Resultado de la Admisión',
      'Resultado de la Calificación',
      'Puntaje técnico',
      'Puntaje total obtenido + bonificación',
      'Orden de prelación según puntaje técnico',
    ],
    conContenido: postores.length,
    filas: postores.map((x, i) => [
      String(i + 1),
      x.postor,
      resultadoEnActa(x, 'admision'),
      resultadoEnActa(x, 'calificacion'),
      etapaDe(x, 'evaluacion')?.omitida ? 'No evaluado' : String(x.puntajeTecnico ?? 0),
      '[Indicar puntaje obtenido]',
      x.prelacion ? String(x.prelacion) : '—',
    ]),
  });

  // ── Buena pro ──
  apartado('OTORGAMIENTO DE LA BUENA PRO');
  const ganador = postores.find((x) => x.prelacion === 1);
  const empatados = postores.filter((x) => x.prelacion === 1);
  if (!ganador) {
    parrafo(
      'Ningún postor alcanzó la etapa de evaluación técnica con puntaje, por lo que no corresponde otorgar la buena pro en este acto.',
    );
  } else if (empatados.length > 1) {
    parrafo(
      `Se ha producido un empate en el primer lugar entre ${empatados.map((x) => x.postor).join(' y ')}, ` +
        `con ${ganador.puntajeTecnico} puntos. El desempate se resuelve conforme a las reglas de las Bases ` +
        'Integradas y del Reglamento; no se otorga automáticamente.',
    );
  } else {
    parrafo(
      'De acuerdo con los resultados de la admisión, calificación y evaluación de ofertas se otorga la buena pro del presente procedimiento de selección, al siguiente postor:',
    );
    parrafo(
      `El primer lugar del orden de prelación corresponde a **${ganador.postor}**, con ${ganador.puntajeTecnico} puntos técnicos.`,
    );
    piezas.push({
      clase: 'tabla',
      columnas: [
        'N.º',
        'Nombre o razón social del postor',
        'Ítem(s) / Lote(s)',
        'Monto adjudicado (S/)',
        'Oferta > al valor referencial',
      ],
      conContenido: 1,
      filas: [['1', ganador.postor, '[Ítem / Lote]', '[Indicar el monto]', NI]],
    });
  }

  // Lo que el comité tiene que mirar sí o sí. No está en el modelo: es
  // lo que el análisis no pudo decidir, y callarlo sería decidirlo.
  const dudas = postores.flatMap((x) =>
    x.etapas.flatMap((e) =>
      e.fichas
        .filter((f) => f.resultado === 'revision_humana')
        .map((f) => [x.postor, NOMBRE_ETAPA[e.etapa], f.requisito, f.hallazgo] as string[]),
    ),
  );
  if (dudas.length > 0) {
    apartado('PUNTOS QUE REQUIEREN PRONUNCIAMIENTO DEL COMITÉ');
    parrafo(
      'El análisis no alcanzó una conclusión suficientemente segura en los siguientes extremos, por conflicto de criterios, insuficiencia probatoria o incertidumbre jurídica:',
    );
    piezas.push({
      clase: 'tabla',
      columnas: ['Postor', 'Etapa', 'Requisito', 'Motivo'],
      filas: dudas,
      conContenido: dudas.length,
    });
  }

  if (bases.advertencias.length > 0) {
    apartado('ADVERTENCIAS SOBRE LAS BASES');
    piezas.push({ clase: 'lista', marca: 'vineta', elementos: bases.advertencias });
  }

  apartado('ACUERDO ADOPTADO');
  parrafo(
    'El comité da por aprobado los resultados de la admisión, calificación y evaluación de las ofertas y otorgamiento de la buena pro. El acuerdo adoptado fue por [Unanimidad o Mayoría, según corresponda.]',
  );
  parrafo(
    'No habiendo otro asunto que tratar, se da por finalizado el presente acto en la fecha enunciada al inicio, firmando los presentes en señal de conformidad.',
  );
  piezas.push({
    clase: 'firmas',
    personas: (s.comite ?? []).map((m) => ({ nombre: m.nombre, cargo: m.cargo })),
  });

  // ── Anexos, en hoja apaisada: la comparación entre postores ──
  piezas.push({ clase: 'seccion', orientacion: 'horizontal' });
  const anexo = (numero: number, titulo: string, etapa: Etapa, exigencias: ExigenciaBases[]) => {
    parrafo(`**Anexo N.° ${String(numero).padStart(2, '0')} – ${titulo}**`, 'centro');
    if (exigencias.length === 0) {
      parrafo('*Las bases leídas no enumeran requisitos para esta etapa.*', 'centro');
      return;
    }
    const esTecnica = etapa === 'evaluacion';
    const columnas = 2 + exigencias.length + (esTecnica ? 2 : 1);
    piezas.push({
      clase: 'cuadro',
      tamano: 14,
      proporciones: [
        400,
        2400,
        ...exigencias.map(() => Math.max(900, Math.round(9000 / exigencias.length))),
        ...(esTecnica ? [1000, 1300] : [1300]),
      ],
      filas: [
        [gris('Ítem(s) / Lote(s)', 2), crema('[Indicar el número de ítem/ítem único/lotes]', columnas - 2)],
        [gris('Descripción', 2), crema(proc.denominacion ?? HUECO, columnas - 2)],
        ...(esTecnica
          ? [[gris('Puntaje técnico mínimo', 2), crema(bases.puntajeTecnicoMinimo == null ? HUECO : String(bases.puntajeTecnicoMinimo), columnas - 2)]]
          : []),
        [
          gris('N.°'),
          gris('Nombre o razón social del postor'),
          ...exigencias.map((e, i) =>
            gris(
              esTecnica
                ? `${String.fromCharCode(65 + i)}. ${e.requisito}${e.puntajeMaximo != null ? ` (${e.puntajeMaximo} pts.)` : ''}`
                : etapa === 'calificacion'
                  ? `${String.fromCharCode(65 + i)}. ${e.requisito}`
                  : e.requisito,
            ),
          ),
          ...(esTecnica
            ? [gris('Puntaje técnico'), gris('¿Accede a evaluación económica?')]
            : [gris(etapa === 'admision' ? 'Resultado de la admisión' : 'Resultado de la calificación')]),
        ],
        ...postores.map((x, i) => {
          const et = etapaDe(x, etapa);
          const casillas = exigencias.map((e) => {
            if (!et || et.omitida) return llana('No evaluado');
            const f = fichaPara(et.fichas, e);
            if (!f) return llana('—');
            return llana(esTecnica ? `${f.puntaje ?? 0}` : CASILLA[f.resultado]);
          });
          const minimo = bases.puntajeTecnicoMinimo;
          return [
            llana(String(i + 1)),
            llana(x.postor),
            ...casillas,
            ...(esTecnica
              ? [
                  llana(et?.omitida || !et ? 'No evaluado' : String(et.puntaje ?? 0)),
                  llana(!et || et.omitida ? NO : minimo == null ? NI : (et.puntaje ?? 0) >= minimo ? SI : NO),
                ]
              : [llana(resultadoEnActa(x, etapa))]),
          ];
        }),
      ],
    });
  };
  anexo(1, 'Requisitos de Admisión', 'admision', bases.admision);
  anexo(2, 'Requisitos de Calificación', 'calificacion', bases.calificacion);
  anexo(3, 'Factores de Evaluación Técnica', 'evaluacion', bases.factores);
  parrafo(
    '*Cumple: se verifica la presentación y conformidad del documento o requisito. No cumple: no se presenta o no satisface la exigencia establecida. Observado: presenta una omisión o defecto susceptible de subsanación. Por revisar: el análisis no alcanzó una conclusión segura y lo decide el comité. —: el requisito no se identificó en el análisis de esa oferta.*',
  );

  return piezas;
}

/** El acta en Markdown: la copia que se guarda con la evaluación. */
export function construirActa(datos: DatosActa): string {
  return piezasAMarkdown(piezasDelActa(datos));
}

/** El acta en Word, con el formato del modelo de César. */
export function actaADocx(datos: DatosActa): Promise<Buffer> {
  return piezasADocx(piezasDelActa(datos), FORMATO_ACTA);
}
