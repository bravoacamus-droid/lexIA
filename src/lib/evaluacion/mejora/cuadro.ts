/**
 * El cuadro de cambios: «Dice / Debe decir».
 *
 * Es la forma en que en la contratación pública se propone corregir un
 * texto —la fe de erratas, la absolución que modifica las bases—, y es
 * lo que el área usuaria puede llevar a su expediente. Acompaña al Word
 * con control de cambios y, cuando el requerimiento se evaluó desde un
 * PDF, es lo único que se puede entregar: sobre un PDF no se marcan
 * cambios.
 *
 * Cuatro partes, en el orden en que se trabajan:
 *
 *   I.   Los cambios que se proponen, con su sustento.
 *   II.  Lo que decide el área usuaria: los huecos en rojo.
 *   III. Lo que el auditor marcó y la norma no respalda.
 *   IV.  Los cambios que no se pudieron marcar en el Word y hay que
 *        llevar a mano.
 */
import type { Pieza, CeldaCuadro } from '@/lib/documentos/piezas';
import { FORMATO_DOCUMENTO, piezasADocx } from '@/lib/documentos/word';
import { aRomano } from '@/lib/documentos/numeracion';
import type { HallazgoAuditado } from './redactor';
import type { Mejora } from './tipos';
import { numerarHallazgos } from './orden';

export { numerarHallazgos };

/** El comentario que va al margen del Word para un cambio. */
export function comentarioDelCambio(numero: number, h: HallazgoAuditado, m: Mejora): string {
  const avisos = m.avisos.length
    ? `\nCita por verificar: ${m.avisos.map((a) => a.cita).join('; ')}.`
    : '';
  const decide = m.decisionPendiente ? `\nDecide el área usuaria: ${m.decisionPendiente}` : '';
  return `Observación N.° ${numero}: ${h.titulo}\n${m.motivo}${decide}${avisos}`;
}

export interface DatosDelCuadro {
  objeto: string;
  documento: string;
  fecha: Date;
  origen: 'docx' | 'pdf';
  hallazgos: HallazgoAuditado[];
  mejoras: Mejora[];
  /** Los que no se pudieron marcar en el Word, con su motivo. */
  noMarcados?: Array<{ id: string; motivo: string }>;
}

const celda = (texto: string, extra: Partial<CeldaCuadro> = {}): CeldaCuadro => ({ texto, ...extra });

export function piezasDelCuadro(d: DatosDelCuadro): Pieza[] {
  const porId = new Map(d.mejoras.map((m) => [m.hallazgoId, m]));
  const numerados = numerarHallazgos(d.hallazgos)
    .map(({ numero, hallazgo }) => ({ numero, h: hallazgo, m: porId.get(hallazgo.id) }))
    .filter((x): x is { numero: number; h: HallazgoAuditado; m: Mejora } => Boolean(x.m));

  const propuestos = numerados.filter((x) => x.m.veredicto !== 'descartar' && x.m.incluir && x.m.textoMejorado);
  const aDecidir = numerados.filter((x) => x.m.veredicto === 'decide_area' && x.m.incluir);
  const descartados = numerados.filter((x) => x.m.veredicto === 'descartar');
  const noMarcados = new Map((d.noMarcados ?? []).map((n) => [n.id, n.motivo]));
  const aMano = propuestos.filter((x) => noMarcados.has(x.h.id) || (d.origen === 'docx' && !x.m.anclado));

  const cuenta = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;
  const fecha = d.fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Apaisado de principio a fin: el «Dice / Debe decir» lleva cinco
  // columnas de texto, y en vertical cada fila ocupaba media hoja.
  const piezas: Pieza[] = [
    { clase: 'seccion', orientacion: 'horizontal' },
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: 'CUADRO DE CAMBIOS AL REQUERIMIENTO' },
    { clase: 'titulo', rol: 'subtitulo', nivel: 0, texto: d.objeto || 'Requerimiento evaluado' },
    {
      clase: 'datos',
      filas: [
        { etiqueta: 'Documento evaluado', valor: d.documento },
        { etiqueta: 'Fecha', valor: fecha },
        {
          etiqueta: 'Resultado',
          valor: `${cuenta(numerados.length, 'observación', 'observaciones')}: ${cuenta(
            numerados.filter((x) => x.m.veredicto === 'aplicar').length,
            'se corrige',
            'se corrigen',
          )}, ${cuenta(aDecidir.length + numerados.filter((x) => x.m.veredicto === 'decide_area' && !x.m.incluir).length, 'la decide', 'las decide')} el área usuaria y ${cuenta(
            descartados.length,
            'no procede',
            'no proceden',
          )}.`,
        },
      ],
    },
    {
      clase: 'parrafo',
      texto:
        'Cada observación de la evaluación del requerimiento se comprobó contra la normativa de la Biblioteca de A-LexIA antes de proponer un cambio. Los cambios se presentan en la forma «Dice / Debe decir» y se limitan a lo que cada observación exige; lo que depende de una decisión del área usuaria figura entre corchetes, en rojo. La incorporación de los cambios corresponde al área usuaria.',
    },
  ];

  let apartado = 0;
  const titulo = (texto: string) => {
    apartado += 1;
    piezas.push({ clase: 'titulo', nivel: 1, numero: `${aRomano(apartado)}.`, texto });
  };

  if (propuestos.length > 0) {
    titulo('CAMBIOS QUE SE PROPONEN');
    piezas.push({
      clase: 'cuadro',
      proporciones: [4, 15, 24, 24, 33],
      partible: true,
      repetirCabecera: true,
      filas: [
        [
          celda('N.°', { gris: true }),
          celda('Observación', { gris: true }),
          celda('Dice', { gris: true }),
          celda('Debe decir', { gris: true }),
          celda('Sustento', { gris: true }),
        ],
        ...propuestos.map((x) => [
          celda(String(x.numero)),
          celda(`${x.h.titulo}${x.h.ubicacion ? ` (${x.h.ubicacion})` : ''}`),
          celda(x.m.textoOriginal),
          celda(x.m.textoMejorado),
          celda(
            `${x.m.motivo}${x.m.avisos.length ? ` Cita por verificar: ${x.m.avisos.map((a) => a.cita).join('; ')}.` : ''}`,
          ),
        ]),
      ],
    });
  }

  if (aDecidir.length > 0) {
    titulo('DECISIONES QUE CORRESPONDEN AL ÁREA USUARIA');
    piezas.push({
      clase: 'parrafo',
      texto:
        'Los siguientes cambios dejan un espacio entre corchetes que el área usuaria debe completar, con el sustento correspondiente en el expediente de contratación:',
    });
    piezas.push({
      clase: 'lista',
      marca: 'ninguno',
      elementos: aDecidir.map((x) => `**Observación N.° ${x.numero}.** ${x.m.decisionPendiente || x.h.titulo}`),
    });
  }

  if (descartados.length > 0) {
    titulo('OBSERVACIONES QUE NO PROCEDEN');
    piezas.push({
      clase: 'parrafo',
      texto:
        'La evaluación marcó los siguientes aspectos, pero la normativa no respalda cambiarlos: el requerimiento se mantiene como está.',
    });
    piezas.push({
      clase: 'cuadro',
      proporciones: [5, 30, 65],
      partible: true,
      repetirCabecera: true,
      filas: [
        [celda('N.°', { gris: true }), celda('Observación', { gris: true }), celda('Por qué no procede', { gris: true })],
        ...descartados.map((x) => [celda(String(x.numero)), celda(x.h.titulo), celda(x.m.motivo)]),
      ],
    });
  }

  if (aMano.length > 0) {
    titulo('CAMBIOS QUE DEBEN INCORPORARSE MANUALMENTE');
    piezas.push({
      clase: 'parrafo',
      texto:
        'Estos cambios no pudieron marcarse con control de cambios en el Word del requerimiento; su texto figura en el apartado I:',
    });
    piezas.push({
      clase: 'lista',
      marca: 'ninguno',
      elementos: aMano.map(
        (x) =>
          `**Observación N.° ${x.numero}.** ${noMarcados.get(x.h.id) ?? 'el pasaje no se encontró tal cual en el documento'}.`,
      ),
    });
  }

  return piezas;
}

export async function cuadroADocx(d: DatosDelCuadro): Promise<Buffer> {
  return piezasADocx(piezasDelCuadro(d), FORMATO_DOCUMENTO);
}
