/**
 * Los documentos como estructura, no como texto.
 *
 * POR QUÉ
 *
 * El requerimiento, el acta de evaluación y la carta de subsanación se
 * armaban como un `string` de Markdown y el Word se reconstruía de ahí.
 * Lo único que llegaba a Word era lo que el Markdown sabe expresar: una
 * tabla es una tabla y ya, sin anchos, sin celdas combinadas, sin saber
 * si era el cuadro de características del Bien N.° 02, la matriz de
 * trazabilidad de una subsanación o una advertencia que se retira antes
 * de firmar.
 *
 * Es exactamente lo que César viene señalando: «los formatos que están
 * en el Software aún no están de acuerdo a la estructura alcanzada».
 *
 * Quien arma un documento emite estas piezas; `word.ts` las compone con
 * las medidas de los modelos de César, y `markdown.ts` saca de ellas el
 * texto para la vista previa y la copia guardada. Una sola fuente: el
 * Markdown y el Word no pueden decir cosas distintas.
 *
 * Cada pieza guarda lo que hace falta para componer la página, no para
 * pintarla: el nivel de un título y su numeral, no su tamaño de letra.
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
  /**
   * Justificado si no se dice otra cosa. La fecha de una carta va a la
   * derecha y el título de un anexo, centrado.
   */
  alineacion?: 'derecha' | 'centro' | 'izquierda';
  /**
   * Sin espacio detrás. El membrete de una carta —«Señores:», el nombre,
   * «Presente.-»— va en renglones seguidos, no en párrafos sueltos.
   */
  pegado?: boolean;
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

/** Una celda de un cuadro con forma propia. */
export interface CeldaCuadro {
  texto: string;
  /** Etiqueta o cabecera: fondo gris azulado y negrita, como en el modelo. */
  gris?: boolean;
  /**
   * El dato de una ficha de cabecera: el fondo crema (EEECE1) con el que
   * el modelo del acta distingue «[Nombre o razón social del postor]» de
   * su etiqueta.
   */
  crema?: boolean;
  negrita?: boolean;
  /** Cuántas columnas ocupa. */
  columnas?: number;
}

/**
 * Un cuadro que no es «cabecera y filas».
 *
 * El acta de César tiene cuadros que empiezan como ficha —«Nombre o razón
 * social del postor | [●]»— y siguen como tabla —«N.º | Aspecto |
 * Registro»—, con celdas que ocupan dos columnas. Una `PiezaTabla` no
 * puede decir eso.
 */
export interface PiezaCuadro {
  clase: 'cuadro';
  /**
   * Letra propia, en medios puntos. Los anexos del acta, con una columna
   * por requisito, van en Arial 7 en el modelo.
   */
  tamano?: number;
  /** Proporciones de las columnas; se reparten sobre el ancho disponible. */
  proporciones: number[];
  filas: CeldaCuadro[][];
  /**
   * Las filas pueden seguir en la página siguiente. En la ficha del acta
   * no —una fila es un dato y no se parte—, pero en un cuadro de textos
   * largos, como el «Dice / Debe decir», una fila que no cabe entera en
   * lo que queda de hoja saltaba a la siguiente y dejaba media en blanco.
   */
  partible?: boolean;
  /** La primera fila, la de los rótulos, se repite arriba de cada hoja. */
  repetirCabecera?: boolean;
}

/**
 * El cuadro de firmas con que cierra un acta: una fila en blanco para
 * firmar y debajo el nombre y el cargo de cada uno.
 */
export interface PiezaFirmas {
  clase: 'firmas';
  personas: Array<{ nombre?: string; cargo?: string }>;
}

/** La firma de una carta: la línea, el nombre, el cargo y la entidad. */
export interface PiezaFirma {
  clase: 'firma';
  nombre: string;
  cargo?: string;
  entidad?: string;
}

/**
 * A partir de aquí, otra hoja: los anexos del acta van apaisados, como en
 * el modelo, porque llevan una columna por requisito.
 */
export interface PiezaSeccion {
  clase: 'seccion';
  orientacion: 'horizontal' | 'vertical';
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
  | PiezaCuadro
  | PiezaFirmas
  | PiezaFirma
  | PiezaSeccion
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
