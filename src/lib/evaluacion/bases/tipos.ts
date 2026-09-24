/**
 * La evaluación de bases: lo que se guarda y se muestra.
 */
import type { Aviso } from '@/lib/normativa/citas';

/**
 * Lo que dice César que hay que detectar: «omisiones, modificaciones
 * indebidas, exigencias no previstas por la normativa, restricciones
 * injustificadas u otras inconsistencias».
 */
export type TipoHallazgoBases =
  | 'modificacion_indebida'
  | 'omision'
  | 'exigencia_no_prevista'
  | 'restriccion_injustificada'
  | 'inconsistencia';

export const TEXTO_TIPO: Record<TipoHallazgoBases, string> = {
  modificacion_indebida: 'Modificación indebida',
  omision: 'Omisión',
  exigencia_no_prevista: 'Exigencia no prevista',
  restriccion_injustificada: 'Restricción injustificada',
  inconsistencia: 'Inconsistencia',
};

export type Severidad = 'critico' | 'alto' | 'medio' | 'bajo';

export interface HallazgoBases {
  id: string;
  tipo: TipoHallazgoBases;
  severidad: Severidad;
  titulo: string;
  /** La sección de las bases, como la pide el pliego de consultas. */
  seccion: 'General' | 'Específica';
  /** «Capítulo III — Requerimiento». */
  capitulo: string;
  /** «3.2», «2.2.1.1», o vacío si no se identifica. */
  numeral: string;
  /** Lo que dicen las bases, copiado de ellas. */
  enLasBases: string;
  /** Lo que dice la bases estándar en ese sitio, cuando aplica. */
  enElEstandar?: string;
  /** Por qué es un problema. */
  analisis: string;
  /** La norma que se vulnera o que lo sustenta. */
  norma: string;
  /** Para el proveedor: qué formular y qué pedir. */
  paraElProveedor: { tipo: 'consulta' | 'observacion'; solicitud: string };
  /** Para quien elabora o revisa las bases: qué corregir antes de publicar. */
  paraLaEntidad: string;
  /** Del cotejo con el estándar o de la revisión del capítulo. */
  origen: 'cotejo' | 'revision';
  avisos: Aviso[];
}

export interface CotejoResumen {
  /** Textos fijos de la Sección General comparados. */
  textos: number;
  modificados: number;
  faltan: number;
}

export interface ResultadoBases {
  generadoEn: string;
  origen: 'docx' | 'pdf';
  estandar: { id: string; titulo: string; parecido: number };
  /** Las siguientes más parecidas, por si hay que corregir la elección. */
  alternativas: Array<{ id: string; titulo: string; parecido: number }>;
  seccionGeneral: CotejoResumen;
  /** Los capítulos de la sección específica que se revisaron. */
  capitulosRevisados: string[];
  hallazgos: HallazgoBases[];
  resumen: string;
}
