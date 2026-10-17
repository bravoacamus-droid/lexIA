/**
 * La evaluación de bases: lo que se guarda y se muestra.
 */
import type { Aviso } from '@/lib/normativa/citas';
import type { FuenteCitada } from './fuentes';

export type { FuenteCitada };

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
  /**
   * «B.», «g)», «g), h), i) y j)» — el literal de las bases dentro del
   * numeral. Vacío si el numeral no se desagrega. Lo pide la columna
   * «Literal» del formato de consultas (documento 14 de César). Las
   * evaluaciones anteriores al 16/10/2026 no lo traen.
   */
  literal?: string;
  /**
   * La página de las bases donde está lo observado: la impresa en la hoja
   * si las bases la llevan, si no la del archivo PDF. Vacía si las bases
   * vinieron en Word.
   */
  pagina?: string;
  /** La página del archivo PDF, para abrirlo ahí. */
  paginaArchivo?: number;
  /** Lo que dicen las bases, copiado de ellas. */
  enLasBases: string;
  /** Lo que dice la bases estándar en ese sitio, cuando aplica. */
  enElEstandar?: string;
  /** Por qué es un problema. */
  analisis: string;
  /**
   * La norma que se vulnera o que lo sustenta, en el orden de César: Ley,
   * Reglamento, bases estándar, resoluciones del Tribunal, Sala Plena,
   * opiniones y pronunciamientos del OECE.
   */
  norma: string;
  /**
   * Lo que la biblioteca de A-LexIA trae para esta observación, cada
   * fuente con su criterio (`biblioteca.ts`). Solo documentos que están
   * en la biblioteca: el número sale de su fila, no del modelo.
   */
  fuentes?: FuenteCitada[];
  /** Para el proveedor: qué formular y qué pedir. */
  paraElProveedor: { tipo: 'consulta' | 'observacion'; solicitud: string };
  /** Para quien elabora o revisa las bases: qué corregir antes de publicar. */
  paraLaEntidad: string;
  /**
   * Del cotejo con el estándar, de la revisión del capítulo, o de un
   * control propio (las obras como servicios similares, `similares-obras.ts`).
   */
  origen: 'cotejo' | 'revision' | 'control';
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
  /**
   * De dónde sale la columna «Página»: del número impreso en las hojas,
   * de la página del archivo, o de ninguna (un Word).
   */
  paginacion?: 'impresa' | 'archivo' | 'sin_paginas';
  /** Páginas escaneadas que se leyeron transcribiendo la imagen. */
  transcritas?: number[];
  /** Páginas escaneadas que no se pudieron leer: lo que digan no se revisó. */
  ilegibles?: number[];
}
