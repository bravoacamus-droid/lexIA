/**
 * El requerimiento como estructura, no como texto.
 *
 * POR QUÉ
 *
 * Las dieciséis plantillas están descritas con todo su detalle —qué es
 * un cuadro, cuál se repite por bien, cuál trae filas ya escritas, qué
 * es una nota que hay que retirar antes de remitir el expediente— y el
 * ensamblador lo convertía todo en un `string` de Markdown. El Word se
 * reconstruía de ahí, así que la única forma que llegaba a Word era la
 * que el Markdown sabe expresar: una tabla es una tabla y ya, sin
 * anchos, sin celdas combinadas y sin saber si era el cuadro de
 * características del Bien N.° 02 o una advertencia normativa.
 *
 * Es exactamente lo que César viene señalando: «los formatos que están
 * en el Software aún no están de acuerdo a la estructura alcanzada».
 *
 * Estas piezas son lo que el ensamblador emite **además** del Markdown.
 * El Markdown sigue haciendo falta —la vista previa en pantalla y la
 * descarga en `.md` viven de él—, pero el Word ya no sale de ahí: sale
 * de aquí, igual que el pliego de consultas sale de sus tramos.
 *
 * Cada pieza guarda lo que hace falta para componer la página, no para
 * pintarla: el nivel de un título y su numeral, no su tamaño de letra.
 * Quien decide cómo se ve es `documento.ts`.
 */

/** Con qué se marca cada elemento de una lista. Igual que en la plantilla. */
export type MarcaDePieza = 'vineta' | 'literal' | 'numero' | 'ninguno';

/** Un título del formato, con su numeración jerárquica. */
export interface PiezaTitulo {
  clase: 'titulo';
  /**
   * El encabezado y el subtítulo del documento no son apartados: van
   * centrados arriba y no se numeran.
   */
  rol?: 'encabezado' | 'subtitulo';
  /** 1 es el apartado; 2 su hija; 3 la hija de esta… */
  nivel: number;
  /**
   * El numeral ya escrito como en el formato —«IV.», «4.1», «A.»—.
   * Vacío en los títulos sueltos de un apartado. Ver `rotuloDeNumeral`.
   */
  numero?: string;
  texto: string;
}

/** Un párrafo corrido. Puede llevar **negritas** y *cursivas*. */
export interface PiezaParrafo {
  clase: 'parrafo';
  texto: string;
}

/**
 * «**Plazo de entrega:** 30 días calendario».
 *
 * Va aparte del párrafo porque en el formato oficial la etiqueta y su
 * valor son una unidad: la etiqueta siempre en negrita, y el valor
 * detrás, en la misma línea.
 */
export interface PiezaCampo {
  clase: 'campo';
  etiqueta: string;
  valor: string;
  /** Cuando el dato falta y el documento lleva su hueco. */
  pendiente?: boolean;
}

/**
 * Una advertencia normativa que la plantilla incrusta.
 *
 * No es parte del requerimiento: es una instrucción para quien lo
 * redacta, y tiene que distinguirse a simple vista para poder retirarla
 * antes de remitir el expediente.
 */
export interface PiezaNota {
  clase: 'nota';
  texto: string;
}

/** Una enumeración del formato, con su encabezado si lo tiene. */
export interface PiezaLista {
  clase: 'lista';
  /** «Se considera información confidencial, sin carácter limitativo:» */
  encabezado?: string;
  marca: MarcaDePieza;
  elementos: string[];
}

/** Un cuadro del formato. */
export interface PiezaTabla {
  clase: 'tabla';
  /** El título de un cuadro repetible: «Bien N.° 02: Monitor». */
  titulo?: string;
  columnas: string[];
  filas: string[][];
  /**
   * Cuántas filas llevan algo escrito. Las vacías se emiten igual
   * cuando el formato exige el cuadro, pero conviene saberlo para
   * marcarlas.
   */
  conContenido: number;
}

/**
 * El cuadro de datos que abre el requerimiento: órgano, actividad del
 * POI, número de CMN y denominación. Dos columnas, la etiqueta en
 * negrita sobre fondo gris azulado, y sin número.
 */
export interface PiezaDatos {
  clase: 'datos';
  filas: Array<{ etiqueta: string; valor: string; pendiente?: boolean }>;
}

/** Un hueco que el área usuaria todavía no ha resuelto. */
export interface PiezaPendiente {
  clase: 'pendiente';
  etiqueta: string;
}

export type Pieza =
  | PiezaTitulo
  | PiezaParrafo
  | PiezaCampo
  | PiezaNota
  | PiezaLista
  | PiezaTabla
  | PiezaDatos
  | PiezaPendiente;

/**
 * La marca que el usuario o el modelo hayan puesto delante de un
 * elemento: «- », «3. », «b) ». La pone el documento, no el texto.
 */
const MARCA_ESCRITA = /^(?:[-*•]|\d+[.)]|[a-z]{1,2}\))\s+/i;

/** Los renglones de un texto, sin la marca que traigan. */
export function elementosDeLista(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(MARCA_ESCRITA, ''));
}

/**
 * Un texto libre —lo que escribe el área usuaria, lo que redacta el
 * modelo, el texto de una opción— convertido en piezas.
 *
 * Cada renglón es un párrafo, como lo era en el Word que salía del
 * Markdown. Los renglones seguidos que empiezan por una marca de lista
 * se juntan en una lista, con la marca que traían: «- » es viñeta,
 * «1. » número, «a) » literal.
 */
export function textoAPiezas(texto: string): Pieza[] {
  const piezas: Pieza[] = [];
  let lista: PiezaLista | null = null;

  for (const bruto of texto.split('\n')) {
    const linea = bruto.trim();
    if (!linea) {
      lista = null;
      continue;
    }
    const marca: MarcaDePieza | null = /^[-*•]\s+/.test(linea)
      ? 'vineta'
      : /^\d+[.)]\s+/.test(linea)
        ? 'numero'
        : /^[a-z]{1,2}\)\s+/i.test(linea)
          ? 'literal'
          : null;

    if (marca === null) {
      lista = null;
      piezas.push({ clase: 'parrafo', texto: linea });
      continue;
    }
    if (!lista || lista.marca !== marca) {
      lista = { clase: 'lista', marca, elementos: [] };
      piezas.push(lista);
    }
    lista.elementos.push(linea.replace(MARCA_ESCRITA, ''));
  }
  return piezas;
}
