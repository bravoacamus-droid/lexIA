/**
 * La carta con la que se notifica al postor lo que debe subsanar.
 *
 * POR QUÉ EXISTE
 *
 * El acta dice qué está observado, pero el acta no se le notifica al
 * postor: lo que se le notifica es una comunicación del evaluador
 * pidiéndole que subsane, y sin ella la observación no produce efecto
 * —el plazo del artículo 78.4 corre "desde el día siguiente de la
 * notificación al postor"—. Observación de César (setiembre de 2026):
 * «a partir de dicha observación u observaciones debe haber una opción
 * que genere una carta dirigida del evaluador (presidente del comité,
 * la DEC, Oficial de Compra, según corresponda) hacia el postor que es
 * materia de observación, a fin de que este documento sea notificado
 * para su subsanación. En dicha carta debe contener el plazo de
 * subsanación, el objeto de la observación, el medio de subsanación y
 * entre otros de acuerdo a lo regulado en la Ley 32069».
 *
 * UNA CARTA POR POSTOR, NO UNA POR OBSERVACIÓN
 *
 * Porque el plazo es uno solo y corre por oferta: dos días hábiles desde
 * la notificación, prorrogables por dos más a solicitud del postor
 * (artículo 78.4 del Reglamento). Mandar una carta por documento
 * observado abriría varios plazos sobre la misma oferta y sería el
 * postor quien tuviera que averiguar cuál rige.
 *
 * LO QUE NO HACE
 *
 * No inventa el número de la carta, ni la fecha, ni quién firma: eso lo
 * pone la Entidad. Van como huecos, igual que en el acta.
 */
import { NOMBRE_ETAPA, type Etapa, type ResultadoPostor } from './etapas';
import type { LecturaBases } from './motor';

const HUECO = '[●]';

/** Quién firma la carta, según quién conduzca el procedimiento. */
export type FirmanteCarta =
  | 'presidente del comité de selección'
  | 'Dependencia Encargada de las Contrataciones'
  | 'oficial de compra';

export interface DatosCarta {
  bases: LecturaBases;
  postor: ResultadoPostor;
  /** Lo que sepa quien la genera; todo opcional. */
  emision?: {
    numeroCarta?: string;
    ciudad?: string;
    fecha?: string;
    firmante?: FirmanteCarta;
    nombreFirmante?: string;
    /** Por dónde se notifica y se recibe la subsanación. */
    medio?: string;
  };
}

/**
 * Lo que hay que subsanar, etapa por etapa.
 *
 * Cada requisito observado da UNA fila, con dos cosas distintas: qué se
 * le encontró y qué tiene que presentar. Venían por separado —la ficha
 * dice lo primero y `subsanaciones` lo segundo— y listarlas sueltas
 * repetía el mismo defecto dos veces con otras palabras, que en una
 * carta que se notifica queda como si fueran dos observaciones.
 */
interface Observado {
  etapa: Etapa;
  requisito: string;
  hallazgo: string;
  quePresentar: string;
}

/** Palabras con las que decidir si dos textos hablan de lo mismo. */
function significativas(t: string): Set<string> {
  return new Set(
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z]{5,}/g) ?? [],
  );
}

function loObservado(p: ResultadoPostor): Observado[] {
  const fuera: Observado[] = [];
  for (const e of p.etapas) {
    if (e.omitida) continue;
    const sueltas = [...(e.subsanaciones ?? [])];

    for (const f of e.fichas) {
      if (f.resultado !== 'subsanable') continue;
      // De las subsanaciones pendientes, la que más palabras comparte
      // con este requisito es la que le corresponde.
      const clave = significativas(`${f.requisito} ${f.hallazgo ?? ''}`);
      let mejor = -1;
      let mejorPuntos = 0;
      sueltas.forEach((s, i) => {
        const puntos = [...significativas(s)].filter((w) => clave.has(w)).length;
        if (puntos > mejorPuntos) {
          mejorPuntos = puntos;
          mejor = i;
        }
      });
      const quePresentar = mejorPuntos >= 2 ? sueltas.splice(mejor, 1)[0] : '';
      fuera.push({
        etapa: e.etapa,
        requisito: f.requisito,
        hallazgo: (f.hallazgo ?? '').trim(),
        quePresentar: quePresentar.trim(),
      });
    }

    // Lo que se pidió sin quedar atado a una ficha se lista igual: es
    // preferible una fila de más que dejar de pedir algo.
    for (const s of sueltas) {
      fuera.push({ etapa: e.etapa, requisito: 'Subsanación requerida', hallazgo: '', quePresentar: s.trim() });
    }
  }
  return fuera;
}

/** ¿Hay algo que notificar? Si no, no se genera carta. */
export function tieneQueSubsanar(p: ResultadoPostor): boolean {
  return loObservado(p).length > 0;
}

export function construirCartaSubsanacion({ bases, postor, emision }: DatosCarta): string {
  const pendientes = loObservado(postor);
  const proc = bases.procedimiento ?? ({} as LecturaBases['procedimiento']);
  const firmante = emision?.firmante ?? 'presidente del comité de selección';
  const medio =
    emision?.medio ??
    'la Plataforma Digital para las Contrataciones Públicas (Pladicop), conforme al numeral 78.1 del artículo 78 del Reglamento';

  const p: string[] = [];
  p.push(`# CARTA N.° ${emision?.numeroCarta ?? `${HUECO}-[AÑO]-[SIGLAS]`}`, '');
  p.push(`${emision?.ciudad ?? HUECO}, ${emision?.fecha ?? HUECO}`, '');

  p.push('Señores');
  p.push(`**${postor.postor}**`);
  p.push('Presente.-', '');

  p.push(`**Asunto:** Requerimiento de subsanación de la oferta`);
  p.push(
    `**Referencia:** ${proc.numero ?? HUECO} — ${proc.denominacion ?? HUECO}`,
    '',
  );
  p.push('De mi consideración:', '');

  p.push(
    `Me dirijo a usted en mi calidad de ${firmante} del procedimiento de selección de la referencia, ` +
      'para comunicarle que, de la revisión de la oferta presentada por su representada, se han advertido ' +
      'las omisiones o defectos que se detallan a continuación, los cuales resultan subsanables conforme ' +
      'al numeral 78.1 del artículo 78 del Reglamento de la Ley N.° 32069, por no alterar el contenido ' +
      'esencial de la oferta.',
    '',
  );

  p.push('## OBJETO DE LA SUBSANACIÓN', '');
  p.push('| N.° | Etapa | Requisito observado | Qué se advirtió | Qué debe presentar |');
  p.push('| --- | --- | --- | --- | --- |');
  pendientes.forEach((o, i) => {
    const limpio = (t: string) => (t || HUECO).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
    p.push(
      `| ${i + 1} | ${NOMBRE_ETAPA[o.etapa]} | ${limpio(o.requisito)} | ${limpio(o.hallazgo)} | ${limpio(o.quePresentar)} |`,
    );
  });
  p.push('');

  p.push('## PLAZO', '');
  p.push(
    'Su representada cuenta con un plazo de **dos (2) días hábiles**, contados desde el día siguiente de ' +
      'la notificación de la presente carta, para efectuar la subsanación. Dentro de dicho plazo puede ' +
      'solicitar una **ampliación de dos (2) días hábiles adicionales**; la solicitud se resuelve en un plazo ' +
      'no mayor de dos (2) días hábiles de recibida y, de no hacerlo, se considera autorizada. Durante ' +
      'ese período la oferta continúa vigente para todo efecto, a condición de la efectiva subsanación ' +
      '(numeral 78.4 del artículo 78 del Reglamento).',
    '',
  );

  p.push('## MEDIO DE SUBSANACIÓN', '');
  p.push(
    `La subsanación se presenta a través de ${medio}. La subsanación es preclusiva a cada etapa: lo que ` +
      'no se subsane dentro del plazo y por el medio señalados no puede presentarse después.',
    '',
  );

  p.push('## CONSECUENCIA DE NO SUBSANAR', '');
  p.push(
    'De no efectuarse la subsanación dentro del plazo otorgado, la oferta será tenida por no admitida o ' +
      'descalificada, según la etapa en que se encuentre, dejándose constancia de ello en el acta ' +
      'correspondiente.',
    '',
  );

  p.push('Atentamente,', '');
  p.push(`${emision?.nombreFirmante ?? HUECO}`);
  p.push(`${firmante.charAt(0).toUpperCase()}${firmante.slice(1)}`);
  p.push(`${proc.entidad ?? HUECO}`);

  return p.join('\n');
}
