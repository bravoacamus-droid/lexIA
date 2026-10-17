/**
 * Las fuentes que cita una observación y su orden.
 *
 * Aparte de `biblioteca.ts` porque la pantalla también las usa, y aquella
 * trae consigo la búsqueda y el modelo, que no van al navegador.
 */

export type TipoDeFuente =
  | 'ley'
  | 'reglamento'
  | 'bases_estandar'
  | 'resolucion_tce'
  | 'acuerdo_sala_plena'
  | 'opinion'
  | 'pronunciamiento'
  | 'directiva';

/** El orden de César. Una fuente inferior no deja sin efecto a una superior. */
export const JERARQUIA: TipoDeFuente[] = [
  'ley',
  'reglamento',
  'bases_estandar',
  'resolucion_tce',
  'acuerdo_sala_plena',
  'opinion',
  'pronunciamiento',
  'directiva',
];

export const NOMBRE_DE_FUENTE: Record<TipoDeFuente, string> = {
  ley: 'Ley',
  reglamento: 'Reglamento',
  bases_estandar: 'Bases estándar',
  resolucion_tce: 'Resolución del Tribunal',
  acuerdo_sala_plena: 'Acuerdo de Sala Plena',
  opinion: 'Opinión del OECE',
  pronunciamiento: 'Pronunciamiento del OECE',
  directiva: 'Directiva',
};

/** Una fuente de la biblioteca citada en una observación. */
export interface FuenteCitada {
  tipo: TipoDeFuente;
  /** «Resolución N° 5325-2026-TCP-S6», «numeral 55.3 del artículo 55 del Reglamento…». */
  numero: string;
  /** El documento de la biblioteca, para poder abrirlo. */
  documentId: string;
  /** Qué establece, aplicado al problema. */
  criterio: string;
}

export function ordenar(fuentes: FuenteCitada[]): FuenteCitada[] {
  return [...fuentes].sort((a, b) => JERARQUIA.indexOf(a.tipo) - JERARQUIA.indexOf(b.tipo));
}
