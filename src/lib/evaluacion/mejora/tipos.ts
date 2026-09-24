/**
 * La versión mejorada del requerimiento: lo que se guarda y se muestra.
 */
import type { Aviso } from '@/lib/normativa/citas';

/**
 * Qué se hace con un hallazgo de la auditoría, una vez comprobado contra
 * la biblioteca.
 *
 *   · aplicar      — la corrección procede y A-LexIA la redacta.
 *   · descartar    — la norma no respalda el hallazgo: el requerimiento
 *                    dice lo que las bases estándar o el Reglamento
 *                    piden. El auditor se equivocó y no se toca nada.
 *   · decide_area  — procede, pero lo que hay que poner (años, plazos,
 *                    cantidades) solo lo puede decidir el área usuaria:
 *                    el texto va con un hueco en rojo.
 */
export type Veredicto = 'aplicar' | 'descartar' | 'decide_area';

export interface Mejora {
  hallazgoId: string;
  veredicto: Veredicto;
  /** Por qué, con la norma del sustento. */
  motivo: string;
  /** El tramo del documento que se cambia, copiado literal. */
  textoOriginal: string;
  /** Ese tramo ya corregido. */
  textoMejorado: string;
  /** Lo que el área usuaria tiene que decidir, en «decide_area». */
  decisionPendiente?: string;
  /**
   * El tramo original está tal cual en el documento. Si no, la mejora se
   * muestra y va al cuadro, pero no se puede marcar en el Word.
   */
  anclado: boolean;
  /** Citas del motivo o del texto que no respalda el sustento. */
  avisos: Aviso[];
  /** Si entra en la versión mejorada. Lo decide el usuario. */
  incluir: boolean;
  /**
   * Solo cuando el requerimiento se subió en Word: si el cambio se pudo
   * marcar con control de cambios, o por qué hay que llevarlo a mano.
   */
  enWord?: { marcable: boolean; motivo?: string };
}

export interface MejoraDelRequerimiento {
  generadoEn: string;
  /** De dónde salió el texto: del Word se puede hacer control de cambios. */
  origen: 'docx' | 'pdf';
  mejoras: Mejora[];
}

export const TEXTO_VEREDICTO: Record<Veredicto, string> = {
  aplicar: 'Se corrige',
  decide_area: 'Lo decide el área usuaria',
  descartar: 'No procede',
};
