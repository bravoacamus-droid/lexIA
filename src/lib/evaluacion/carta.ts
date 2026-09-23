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
import { NOMBRE_ETAPA, type ResultadoPostor } from './etapas';
import type { LecturaBases } from './motor';
import { loObservado, tieneQueSubsanar } from './observados';
import type { Pieza } from '../documentos/piezas';
import { piezasAMarkdown } from '../documentos/markdown';
import { FORMATO_CARTA, piezasADocx } from '../documentos/word';

const HUECO = '[●]';

export { tieneQueSubsanar };

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
 * La carta, pieza a pieza, con la forma de las cartas de César.
 *
 * Se miró su «CARTA DE MODIFICACIÓN DE CONTRATO»: el número en negrita,
 * la ciudad y la fecha a la derecha, el destinatario con su nombre en
 * negrita y «Presente.-», ASUNTO y REFERENCIA, «De mi consideración:»,
 * los apartados numerados en negrita, «Atentamente,» y la firma centrada
 * bajo su línea. Lo que la Entidad completa va en rojo, como en el
 * modelo.
 */
export function piezasDeLaCarta({ bases, postor, emision }: DatosCarta): Pieza[] {
  const pendientes = loObservado(postor);
  const proc = bases.procedimiento ?? ({} as LecturaBases['procedimiento']);
  const firmante = emision?.firmante ?? 'presidente del comité de selección';
  const medio =
    emision?.medio ??
    'la Plataforma Digital para las Contrataciones Públicas (Pladicop), conforme al numeral 78.1 del artículo 78 del Reglamento';

  const piezas: Pieza[] = [];
  const parrafo = (texto: string, alineacion?: 'derecha' | 'izquierda', pegado?: boolean) =>
    piezas.push({ clase: 'parrafo', texto, alineacion, pegado });
  let n = 0;
  const apartado = (texto: string) =>
    piezas.push({ clase: 'titulo', nivel: 1, numero: `${++n}.`, texto });

  parrafo(`**CARTA N.° ${emision?.numeroCarta ?? `${HUECO}-[AÑO]-[SIGLAS]`}**`, 'izquierda');
  parrafo(`${emision?.ciudad ?? '[Ciudad]'}, ${emision?.fecha ?? '[día] de [mes] de [año]'}`, 'derecha');

  parrafo('Señores:', 'izquierda', true);
  parrafo(`**${postor.postor}**`, 'izquierda', true);
  parrafo('**Presente.-**', 'izquierda');

  piezas.push({ clase: 'campo', etiqueta: 'ASUNTO', valor: 'Requerimiento de subsanación de la oferta' });
  piezas.push({
    clase: 'campo',
    etiqueta: 'REFERENCIA',
    valor: `${proc.numero ?? '[Tipo y N.° de procedimiento]'} — ${proc.denominacion ?? HUECO}`,
  });
  parrafo('De mi consideración:', 'izquierda');

  parrafo(
    `Me dirijo a usted en mi calidad de ${firmante} del procedimiento de selección de la referencia, ` +
      'para comunicarle que, de la revisión de la oferta presentada por su representada, se han advertido ' +
      'las omisiones o defectos que se detallan a continuación, los cuales resultan subsanables conforme ' +
      'al numeral 78.1 del artículo 78 del Reglamento de la Ley N.° 32069, por no alterar el contenido ' +
      'esencial de la oferta.',
  );

  apartado('Objeto de la subsanación');
  piezas.push({
    clase: 'tabla',
    columnas: ['N.°', 'Etapa', 'Requisito observado', 'Qué se advirtió', 'Qué debe presentar'],
    conContenido: pendientes.length,
    filas: pendientes.map((o, i) => [
      String(i + 1),
      NOMBRE_ETAPA[o.etapa],
      o.requisito || HUECO,
      o.hallazgo || HUECO,
      o.quePresentar || HUECO,
    ]),
  });

  apartado('Plazo');
  parrafo(
    'Su representada cuenta con un plazo de **dos (2) días hábiles**, contados desde el día siguiente de ' +
      'la notificación de la presente carta, para efectuar la subsanación. Dentro de dicho plazo puede ' +
      'solicitar una **ampliación de dos (2) días hábiles adicionales**; la solicitud se resuelve en un plazo ' +
      'no mayor de dos (2) días hábiles de recibida y, de no hacerlo, se considera autorizada. Durante ' +
      'ese período la oferta continúa vigente para todo efecto, a condición de la efectiva subsanación ' +
      '(numeral 78.4 del artículo 78 del Reglamento).',
  );

  apartado('Medio de subsanación');
  parrafo(
    `La subsanación se presenta a través de ${medio}. La subsanación es preclusiva a cada etapa: lo que ` +
      'no se subsane dentro del plazo y por el medio señalados no puede presentarse después.',
  );

  apartado('Consecuencia de no subsanar');
  parrafo(
    'De no efectuarse la subsanación dentro del plazo otorgado, la oferta será tenida por no admitida o ' +
      'descalificada, según la etapa en que se encuentre, dejándose constancia de ello en el acta ' +
      'correspondiente.',
  );

  parrafo('Sin otro particular, hago propicia la oportunidad para expresarle los sentimientos de mi especial consideración.');
  parrafo('Atentamente,', 'izquierda');
  piezas.push({
    clase: 'firma',
    nombre: emision?.nombreFirmante ?? '[Nombres y apellidos]',
    cargo: `${firmante.charAt(0).toUpperCase()}${firmante.slice(1)}`,
    entidad: proc.entidad ?? '[Nombre de la Entidad]',
  });
  return piezas;
}

/** La carta en Markdown, para leerla o guardarla. */
export function construirCartaSubsanacion(datos: DatosCarta): string {
  return piezasAMarkdown(piezasDeLaCarta(datos));
}

/** La carta en Word, con el formato de las cartas de César. */
export function cartaADocx(datos: DatosCarta): Promise<Buffer> {
  return piezasADocx(piezasDeLaCarta(datos), FORMATO_CARTA);
}
