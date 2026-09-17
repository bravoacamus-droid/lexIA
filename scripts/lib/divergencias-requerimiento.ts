/**
 * Los sitios donde una plantilla se aparta del .docx A PROPÓSITO.
 *
 * El auditor coteja palabra por palabra contra el formato de origen, y
 * esa es su razón de ser: que un texto correcto para un formato no se
 * cuele en otro donde César lo escribió distinto. Pero sus propias
 * observaciones piden, a veces, apartarse del .docx —parametrizar una
 * frase que allí está cerrada, o unificar un apartado que en un formato
 * quedó distinto—. Sin un registro, cada observación dejaría el auditor
 * en rojo y a la tercera nadie lo miraría.
 *
 * Aquí se anota cada una con su motivo. Lo que no esté en esta lista y
 * no coincida con el .docx sigue siendo un fallo.
 */
export type DivergenciaDeclarada = {
  /** Id de la plantilla, o '*' si vale para todas. */
  plantilla: string;
  /** Arranque del fragmento, tal como lo imprime el auditor. */
  fragmento?: string;
  /**
   * Id del apartado entero. Alternativa a `fragmento` para cuando la
   * observación reemplaza un artículo completo: declarar sus catorce
   * párrafos uno a uno, y en quince formatos, no dejaría ver nada.
   */
  seccion?: string;
  /** Por qué se aparta. Con la observación que lo pidió. */
  motivo: string;
};

export const DIVERGENCIAS_DECLARADAS: DivergenciaDeclarada[] = [
  // ── Observación 12 (setiembre de 2026): el medio de presentación de
  // los entregables pasa a ser un selector con un campo al lado. En el
  // .docx la frase está cerrada; aquí se parte en dos tramos.
  {
    plantilla: 'uit-tdr',
    fragmento: '), en los plazos y fechas establecidas en los Términos de Referencia.',
    motivo: 'Obs. 12: el canal de entrega se elige y el correo/enlace se escribe aparte.',
  },
  {
    plantilla: 'uit-eett',
    fragmento: '), en los plazos y fechas establecidas en las EETT.',
    motivo: 'Obs. 12: el canal de entrega se elige y el correo/enlace se escribe aparte.',
  },
  {
    plantilla: 'ps-servicios-general',
    fragmento: '), en los plazos y fechas establecidas en los Términos de Referencia.',
    motivo: 'Obs. 12: el canal de entrega se elige y el correo/enlace se escribe aparte.',
  },
  {
    plantilla: 'ps-bienes-general',
    fragmento: '), en los plazos y fechas establecidas en las EETT.',
    motivo: 'Obs. 12: el canal de entrega se elige y el correo/enlace se escribe aparte.',
  },

  // ── Observación 13 (setiembre de 2026): el adelanto directo se unifica
  // en los tres párrafos del modelo. Consultoría de obras traía en su
  // .docx un régimen propio —diez días calendario y una relación de
  // documentos, art. 178 del Reglamento— que la estructura unificada
  // sustituye por un plazo que fija la Entidad. PENDIENTE DE CONFIRMAR
  // CON CÉSAR: es el único formato donde unificar quita texto oficial.
  // ── Observación 15 (setiembre de 2026): el área usuaria debe poder
  // decir qué prestaciones no se subcontratan. César acotó el alcance
  // el 16/09/2026: vale para bienes, servicios y consultoría de obras,
  // "quedando exceptuado solo ejecución de obras, el cual debe mantener
  // el texto que indica en el formato de requerimiento". Por eso los dos
  // formatos de obras ya no la llevan, ni siquiera bajo interruptor.

  // ── Observación 17 (setiembre de 2026): "este artículo debe ser
  // reemplazado por el siguiente texto". Es redacción de César, no de
  // los .docx, así que ninguno de sus párrafos está en el original. En
  // los tres formatos de contrato menor sustituye al artículo que ya
  // tenían; en los doce restantes se añade apagado.
  {
    plantilla: '*',
    seccion: 'confidencialidad',
    motivo: 'Obs. 17: artículo de confidencialidad reemplazado por el texto de César.',
  },

  // ── Observación 20 (setiembre de 2026): el recuadro donde se escribía
  // a mano la dependencia y su dirección "debe suprimirse, en su
  // reemplazo activar pestañas de elección", con un campo para el
  // correo o el enlace. La frase cambia respecto del .docx.
  {
    plantilla: '*',
    fragmento:
      'Salvo los documentos de conformidad, el contratista debe presentar la documentación restante a través de',
    motivo: 'Obs. 20: el canal de presentación se elige y el correo/enlace se escribe aparte.',
  },

  // ── Observación 20: el pago anticipado pasa a estar en todos los
  // formatos, bajo su interruptor y apagado. Seis de sus .docx no lo
  // traen, así que su documento por defecto no cambia.
  {
    plantilla: '*',
    fragmento:
      'De manera excepcional, se permitirá que el pago se realice de forma total o parcial al inicio de la vigencia contractual',
    motivo: 'Obs. 20: pago anticipado disponible en todos los formatos, apagado por defecto.',
  },
  {
    plantilla: '*',
    fragmento: 'Para la procedencia del pago anticipado, se aplicarán las siguientes reglas:',
    motivo: 'Obs. 20: pago anticipado disponible en todos los formatos, apagado por defecto.',
  },
  {
    plantilla: '*',
    fragmento: 'El contratista deberá entregar previamente una garantía conforme lo señalado',
    motivo: 'Obs. 20: pago anticipado disponible en todos los formatos, apagado por defecto.',
  },
  {
    plantilla: '*',
    fragmento:
      'En este supuesto, el área usuaria emitirá una primera conformidad para efectos estrictamente administrativos de pago',
    motivo: 'Obs. 20: pago anticipado disponible en todos los formatos, apagado por defecto.',
  },
  {
    plantilla: 'ps-bienes-comparacion-precios',
    fragmento:
      'La entidad contratante otorgará',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-bienes-comparacion-precios',
    fragmento:
      'adelantos directos por el',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-bienes-comparacion-precios',
    fragmento:
      'del monto del contrato original.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-bienes-comparacion-precios',
    fragmento:
      'El contratista debe solicitar los adelantos dentro de los',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-bienes-comparacion-precios',
    fragmento:
      'días siguientes de perfeccionamiento del contrato, adjuntando a su solicitud la garantía por adelantos acompañada del comprobante de pago correspondiente.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-bienes-comparacion-precios',
    fragmento:
      'La Entidad otorgará el adelanto dentro de los',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-bienes-comparacion-precios',
    fragmento:
      'días calendario siguientes a la presentación de la solicitud, siempre que esta cumpla con los requisitos establecidos en el contrato y en la normativa vigente.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-servicios-comparacion-precios',
    fragmento:
      'La entidad contratante otorgará',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-servicios-comparacion-precios',
    fragmento:
      'adelantos directos por el',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-servicios-comparacion-precios',
    fragmento:
      'del monto del contrato original.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-servicios-comparacion-precios',
    fragmento:
      'El contratista debe solicitar los adelantos dentro de los',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-servicios-comparacion-precios',
    fragmento:
      'días siguientes de perfeccionamiento del contrato, adjuntando a su solicitud la garantía por adelantos acompañada del comprobante de pago correspondiente.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-servicios-comparacion-precios',
    fragmento:
      'La Entidad otorgará el adelanto dentro de los',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'ps-servicios-comparacion-precios',
    fragmento:
      'días calendario siguientes a la presentación de la solicitud, siempre que esta cumpla con los requisitos establecidos en el contrato y en la normativa vigente.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'uit-locadores',
    fragmento:
      'La entidad contratante otorgará',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'uit-locadores',
    fragmento:
      'adelantos directos por el',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'uit-locadores',
    fragmento:
      'del monto del contrato original.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'uit-locadores',
    fragmento:
      'El contratista debe solicitar los adelantos dentro de los',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'uit-locadores',
    fragmento:
      'días siguientes de perfeccionamiento del contrato, adjuntando a su solicitud la garantía por adelantos acompañada del comprobante de pago correspondiente.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'uit-locadores',
    fragmento:
      'La Entidad otorgará el adelanto dentro de los',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
  {
    plantilla: 'uit-locadores',
    fragmento:
      'días calendario siguientes a la presentación de la solicitud, siempre que esta cumpla con los requisitos establecidos en el contrato y en la normativa vigente.',
    motivo:
      'César, al absolver las preguntas pendientes (16/09/2026): el adelanto directo va en TODOS los formatos de bienes y servicios, menores y de procedimiento de selección. Estos tres no lo traen en su .docx.',
  },
];