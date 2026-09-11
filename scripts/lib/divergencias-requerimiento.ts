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
  /** Id de la plantilla. */
  plantilla: string;
  /** Arranque del fragmento, tal como lo imprime el auditor. */
  fragmento: string;
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
  {
    plantilla: 'ps-consultoria-obras',
    fragmento: 'La entidad contratante otorgará',
    motivo: 'Obs. 13: adelanto directo unificado con el modelo de los demás formatos.',
  },
  {
    plantilla: 'ps-consultoria-obras',
    fragmento: 'adelantos directos por el',
    motivo: 'Obs. 13: adelanto directo unificado con el modelo de los demás formatos.',
  },
  {
    plantilla: 'ps-consultoria-obras',
    fragmento: 'El contratista debe solicitar los adelantos dentro de los',
    motivo: 'Obs. 13: adelanto directo unificado con el modelo de los demás formatos.',
  },
  {
    plantilla: 'ps-consultoria-obras',
    fragmento:
      'días siguientes de perfeccionamiento del contrato, adjuntando a su solicitud la garantía por adelantos acompañada del comprobante de pago correspondiente.',
    motivo: 'Obs. 13: adelanto directo unificado con el modelo de los demás formatos.',
  },
  {
    plantilla: 'ps-consultoria-obras',
    fragmento:
      'días calendario siguientes a la presentación de la solicitud, siempre que esta cumpla con los requisitos establecidos en el contrato y en la normativa vigente.',
    motivo: 'Obs. 13: adelanto directo unificado con el modelo de los demás formatos.',
  },
  {
    plantilla: 'ps-consultoria-obras',
    fragmento: 'La Entidad otorgará el adelanto dentro de los',
    motivo: 'Obs. 13: adelanto directo unificado con el modelo de los demás formatos.',
  },
];
