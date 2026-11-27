/**
 * Tipos y constantes de la subida a la biblioteca que también usa el
 * navegador (sin el SDK de IA de fichas.ts).
 */
import type { NormativeDocType } from '@/lib/supabase/types';

/** Los tipos que se pueden subir desde el panel, en el orden del selector. */
export const TIPOS_SUBIBLES: NormativeDocType[] = [
  'ley',
  'reglamento',
  'directiva',
  'lineamiento',
  'bases_estandar',
  'opinion',
  'pronunciamiento',
  'resolucion_tce',
  'acuerdo_sala_plena',
  'informe_vicio_nulidad',
  'dictamen',
  'resolucion',
  'guia',
  'manual_seace',
  'comunicado',
  'preguntas_frecuentes',
  'nota_tecnica',
  'codigo_etica',
  'tupa',
  'directiva_entidad',
];

export const LEYES = ['ley_32069', 'ley_30225'] as const;
export type LeyAplicable = (typeof LEYES)[number];

export interface FichaPropuesta {
  tipo: NormativeDocType | null;
  numero: string;
  titulo: string;
  /** YYYY-MM-DD, o vacío. */
  fecha: string;
  ley: LeyAplicable;
  /** De dónde salió cada dato, para que el usuario sepa qué revisar. */
  origen: 'reglas' | 'modelo' | 'nada';
}
