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
 * La estructura sale de su "Acta de Evaluación - OK.docx" y respeta su
 * orden y sus títulos: datos del procedimiento, detalle de los postores,
 * y por cada etapa el desarrollo, las subsanaciones y el resultado
 * consolidado; después la evaluación económica, el resultado consolidado
 * general, el otorgamiento de la buena pro y el acuerdo.
 *
 * QUÉ SE DEJA EN BLANCO Y POR QUÉ
 *
 * Lo que el sistema no puede saber: la fecha y hora de la sesión, los
 * miembros del comité, el número de acta. Van con los corchetes de su
 * plantilla —[●]— para que el comité los complete. Rellenarlos con algo
 * inventado sería peor que dejarlos vacíos: es un documento que se
 * firma.
 *
 * Y lo que el sistema no debe decidir: cuando una etapa quedó en
 * revisión humana, el acta lo dice con esas palabras en lugar de
 * inclinarse por un resultado.
 */
import {
  ETIQUETA_RESULTADO,
  NOMBRE_ETAPA,
  type Etapa,
  type ResultadoPostor,
} from './etapas';
import type { LecturaBases } from './motor';

const HUECO = '[●]';

/** Escapa las barras verticales para que no rompan la tabla markdown. */
const celda = (v: unknown): string => {
  const t = String(v ?? '').trim();
  return (t || HUECO).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
};

const tabla = (cabeceras: string[], filas: string[][]): string => {
  const cab = `| ${cabeceras.join(' | ')} |`;
  const sep = `| ${cabeceras.map(() => '---').join(' | ')} |`;
  const cuerpo = filas.map((f) => `| ${f.map(celda).join(' | ')} |`).join('\n');
  return `${cab}\n${sep}\n${cuerpo}`;
};

const etapaDe = (p: ResultadoPostor, e: Etapa) => p.etapas.find((x) => x.etapa === e);

/** Cómo quedó un postor en una etapa, dicho para el acta. */
function resultadoEnActa(p: ResultadoPostor, e: Etapa): string {
  const etapa = etapaDe(p, e);
  if (!etapa) return HUECO;
  if (etapa.omitida) return 'No evaluado';
  return ETIQUETA_RESULTADO[e][etapa.resultado];
}

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

export function construirActa({ bases, postores, sesion }: DatosActa): string {
  const p = bases.procedimiento;
  const s = sesion ?? {};
  const partes: string[] = [];

  partes.push(`# ACTA N.° ${s.numeroActa ?? HUECO}`);
  partes.push('## ACTA DE EVALUACIÓN DE OFERTAS');

  // ── Datos del procedimiento ──
  partes.push('### DATOS DEL PROCEDIMIENTO');
  partes.push(
    tabla(
      ['Campo', 'Información'],
      [
        ['Entidad', p.entidad ?? HUECO],
        ['Procedimiento de selección', p.numero ?? HUECO],
        ['Objeto de contratación', p.objeto ?? HUECO],
        ['Denominación de la contratación', p.denominacion ?? HUECO],
        ['Cuantía', p.cuantia ?? HUECO],
      ],
    ),
  );

  // ── Instalación y quorum ──
  partes.push('### INSTALACIÓN DE LA SESIÓN');
  partes.push(
    `En ${s.ciudad ?? HUECO}, siendo las ${s.hora ?? HUECO} horas del ${s.fecha ?? HUECO}, se reunieron ` +
      `${s.modalidad ?? '[de manera presencial / virtual / mixta]'} los integrantes del [Comité / Jurado / Oficial de Compra], ` +
      'designados mediante [documento de designación, número y fecha], encargados de la preparación, conducción y ' +
      'realización del procedimiento de selección indicado.',
  );

  if (s.comite && s.comite.length > 0) {
    partes.push('### SOBRE EL QUORUM Y LOS MIEMBROS PARTICIPANTES DE LA SESIÓN');
    partes.push(
      tabla(
        ['N.°', 'Nombres y apellidos', 'Cargo', 'Condición'],
        s.comite.map((m, i) => [String(i + 1), m.nombre, m.cargo, m.condicion ?? HUECO]),
      ),
    );
  }

  // ── Postores ──
  partes.push('### DETALLE DE LOS POSTORES');
  partes.push(
    'En el día y horario señalado en el cronograma del SEACE, los siguientes postores presentaron su oferta:',
  );
  partes.push(
    tabla(
      ['N.°', 'Nombre o razón social del postor', 'Integrantes del consorcio', 'Porcentaje de participación'],
      postores.map((x, i) => [
        String(i + 1).padStart(2, '0'),
        x.postor,
        x.consorcio?.map((c) => c.nombre).join('; ') ?? 'No aplica',
        x.consorcio?.map((c) => c.participacion ?? HUECO).join('; ') ?? 'No aplica',
      ]),
    ),
  );

  // ── Una sección por etapa ──
  for (const etapa of ['admision', 'calificacion', 'evaluacion'] as Etapa[]) {
    partes.push(`### ${textoEncabezado(etapa)}`);
    partes.push(introduccion(etapa));

    // Qué se exigió.
    const exigencias =
      etapa === 'admision' ? bases.admision : etapa === 'calificacion' ? bases.calificacion : bases.factores;
    if (exigencias.length > 0) {
      partes.push(
        tabla(
          etapa === 'evaluacion'
            ? ['Código', 'Factor de evaluación técnica', 'Documento(s) para acreditar', 'Puntaje máximo']
            : ['N.°', 'Requisito', 'Documento(s) para acreditar'],
          exigencias.map((e, i) =>
            etapa === 'evaluacion'
              ? [String.fromCharCode(65 + i), e.requisito, e.documento ?? HUECO, String(e.puntajeMaximo ?? HUECO)]
              : [String(i + 1), e.requisito, e.documento ?? HUECO],
          ),
        ),
      );
    }

    // El detalle por postor y requisito, que es lo que sostiene el acta.
    for (const x of postores) {
      const et = etapaDe(x, etapa);
      if (!et) continue;
      partes.push(`**${x.postor}** — ${resultadoEnActa(x, etapa)}`);
      if (et.omitida) {
        partes.push(`_${et.motivoOmision ?? 'No evaluado.'}_`);
        continue;
      }
      if (et.fichas.length > 0) {
        partes.push(
          tabla(
            etapa === 'evaluacion'
              ? ['Factor', 'Análisis', 'Puntaje']
              : ['Requisito', 'Análisis', 'Resultado'],
            et.fichas.map((f) =>
              etapa === 'evaluacion'
                ? [f.requisito, f.hallazgo, `${f.puntaje ?? 0} / ${f.puntajeMaximo ?? HUECO}`]
                : [f.requisito, f.hallazgo, ETIQUETA_RESULTADO[etapa][f.resultado]],
            ),
          ),
        );
      }
      if (et.fundamento) partes.push(`_${et.fundamento}_`);
    }

    // Subsanaciones de la etapa.
    partes.push(`#### SUBSANACIÓN DE LA OFERTA EN LA ETAPA DE ${NOMBRE_ETAPA[etapa].toUpperCase()}`);
    const conSubsanacion = postores.filter((x) => (etapaDe(x, etapa)?.subsanaciones.length ?? 0) > 0);
    if (conSubsanacion.length === 0) {
      partes.push(
        'El [Comité / OEC / DEC / Oficial de Compra] deja constancia de que no se requirió subsanación en esta ' +
          'etapa, al no haberse identificado omisiones o defectos susceptibles de subsanación.',
      );
    } else {
      partes.push(
        tabla(
          ['Postor', 'Qué debe subsanar'],
          conSubsanacion.map((x) => [x.postor, etapaDe(x, etapa)!.subsanaciones.join('; ')]),
        ),
      );
    }

    // Resultado consolidado de la etapa: la comparación que pidió César.
    partes.push(`#### RESULTADO CONSOLIDADO DE LA ETAPA DE ${NOMBRE_ETAPA[etapa].toUpperCase()}`);
    partes.push(
      tabla(
        etapa === 'evaluacion'
          ? ['N.°', 'Postor / Consorcio', 'Puntaje técnico', 'Puntaje mínimo', '¿Accede a evaluación económica?']
          : ['N.°', 'Postor / Consorcio', 'Resultado'],
        postores.map((x, i) => {
          const numero = String(i + 1).padStart(2, '0');
          if (etapa !== 'evaluacion') return [numero, x.postor, resultadoEnActa(x, etapa)];
          const et = etapaDe(x, 'evaluacion');
          const puntaje = et?.omitida ? 'No evaluado' : String(et?.puntaje ?? 0);
          const minimo = bases.puntajeTecnicoMinimo;
          const accede = et?.omitida
            ? 'No'
            : minimo == null
              ? HUECO
              : (et?.puntaje ?? 0) >= minimo
                ? 'Sí'
                : 'No';
          return [numero, x.postor, puntaje, minimo == null ? HUECO : String(minimo), accede];
        }),
      ),
    );
  }

  // ── Económica ──
  partes.push('### EVALUACIÓN ECONÓMICA DE LAS OFERTAS');
  if (bases.evaluacionEconomica) {
    partes.push(
      `Conforme a las Bases Integradas, la evaluación económica otorga hasta ` +
        `${bases.evaluacionEconomica.puntajeMaximo ?? HUECO} puntos. ` +
        `${bases.evaluacionEconomica.formula ?? ''}`.trim(),
    );
  }
  partes.push(
    '_La oferta económica de cada postor se verifica y puntúa en esta etapa. LexIA no asigna puntaje ' +
      'económico automáticamente: el comité consigna los montos ofertados y aplica la fórmula de las Bases._',
  );
  partes.push(
    tabla(
      ['N.°', 'Postor / Consorcio', 'Monto ofertado (S/)', 'Puntaje económico'],
      postores
        .filter((x) => !etapaDe(x, 'evaluacion')?.omitida)
        .map((x, i) => [String(i + 1).padStart(2, '0'), x.postor, HUECO, HUECO]),
    ),
  );

  // ── Resultado consolidado general ──
  partes.push('### RESULTADO CONSOLIDADO DE LA EVALUACIÓN DE OFERTAS');
  partes.push(
    tabla(
      [
        'N.°',
        'Postor',
        'Resultado de la admisión',
        'Resultado de la calificación',
        'Puntaje técnico',
        'Orden de prelación',
      ],
      postores.map((x, i) => [
        String(i + 1).padStart(2, '0'),
        x.postor,
        resultadoEnActa(x, 'admision'),
        resultadoEnActa(x, 'calificacion'),
        etapaDe(x, 'evaluacion')?.omitida ? 'No evaluado' : String(x.puntajeTecnico ?? 0),
        x.prelacion ? String(x.prelacion) : '—',
      ]),
    ),
  );

  // ── Buena pro ──
  partes.push('### OTORGAMIENTO DE LA BUENA PRO');
  const ganador = postores.find((x) => x.prelacion === 1);
  const empatados = postores.filter((x) => x.prelacion === 1);
  if (!ganador) {
    partes.push(
      'Ningún postor alcanzó la etapa de evaluación técnica con puntaje, por lo que no corresponde otorgar la ' +
        'buena pro en este acto.',
    );
  } else if (empatados.length > 1) {
    partes.push(
      `Se ha producido un empate en el primer lugar entre ${empatados.map((x) => x.postor).join(' y ')}, ` +
        `con ${ganador.puntajeTecnico} puntos. El desempate se resuelve conforme a las reglas de las Bases ` +
        'Integradas y del Reglamento; no se otorga automáticamente.',
    );
  } else {
    partes.push(
      'De acuerdo con los resultados de la admisión, calificación y evaluación de ofertas, el primer lugar del ' +
        `orden de prelación corresponde a **${ganador.postor}**, con ${ganador.puntajeTecnico} puntos técnicos.`,
    );
    partes.push(
      tabla(
        ['N.º', 'Postor', 'Monto adjudicado (S/)', 'Oferta mayor al valor referencial'],
        [['01', ganador.postor, HUECO, HUECO]],
      ),
    );
  }

  // Lo que el comité tiene que mirar sí o sí.
  const dudas = postores.flatMap((x) =>
    x.etapas.flatMap((e) =>
      e.fichas
        .filter((f) => f.resultado === 'revision_humana')
        .map((f) => [x.postor, NOMBRE_ETAPA[e.etapa], f.requisito, f.hallazgo] as string[]),
    ),
  );
  if (dudas.length > 0) {
    partes.push('### PUNTOS QUE REQUIEREN PRONUNCIAMIENTO DEL COMITÉ');
    partes.push(
      'El análisis no alcanzó una conclusión suficientemente segura en los siguientes extremos, por conflicto ' +
        'de criterios, insuficiencia probatoria o incertidumbre jurídica:',
    );
    partes.push(tabla(['Postor', 'Etapa', 'Requisito', 'Motivo'], dudas));
  }

  if (bases.advertencias.length > 0) {
    partes.push('### ADVERTENCIAS SOBRE LAS BASES');
    partes.push(bases.advertencias.map((a) => `- ${a}`).join('\n'));
  }

  partes.push('### ACUERDO ADOPTADO');
  partes.push(
    'El comité da por aprobados los resultados de la admisión, calificación y evaluación de las ofertas y el ' +
      'otorgamiento de la buena pro. El acuerdo adoptado fue por [Unanimidad o Mayoría, según corresponda].',
  );
  partes.push(
    'No habiendo otro asunto que tratar, se da por finalizado el presente acto en la fecha enunciada al inicio, ' +
      'firmando los presentes en señal de conformidad.',
  );

  return partes.join('\n\n');
}

function textoEncabezado(etapa: Etapa): string {
  if (etapa === 'admision') return 'DETALLE DE LAS OFERTAS EN LA ETAPA DE ADMISIÓN';
  if (etapa === 'calificacion') return 'EVALUACIÓN DE LOS REQUISITOS DE CALIFICACIÓN';
  return 'EVALUACIÓN DE LOS FACTORES DE EVALUACIÓN TÉCNICA';
}

function introduccion(etapa: Etapa): string {
  if (etapa === 'admision') {
    return (
      'Se procede a la descarga, apertura y revisión de las ofertas presentadas, verificándose la documentación ' +
      'exigida para su admisión, de conformidad con las Bases Integradas, el requerimiento y la normativa aplicable.'
    );
  }
  if (etapa === 'calificacion') {
    return (
      'Se procede con la calificación de las ofertas admitidas, verificándose la documentación presentada por ' +
      'cada postor para acreditar los requisitos de calificación establecidos en el Capítulo III de la Sección ' +
      'Específica de las Bases Integradas.'
    );
  }
  return (
    'Se procede con la evaluación técnica de las ofertas que cumplieron los requisitos de calificación, aplicando ' +
    'los factores de evaluación, criterios de acreditación, puntajes y metodología establecidos en el Capítulo IV ' +
    'de la Sección Específica de las Bases Integradas.'
  );
}
