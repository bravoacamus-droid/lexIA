/**
 * Modelo de datos de las plantillas de requerimiento que entregó César
 * (agosto 2026, carpeta "ESTRUCTURA DE REQUERIMIENTO").
 *
 * POR QUÉ LAS PLANTILLAS SON DATOS Y NO TEXTO DE PROMPT
 *
 * Hasta ahora el generador describía la estructura dentro del prompt y
 * le pedía al modelo que redactara el documento entero. Con estas
 * plantillas eso no sirve: buena parte del contenido NO PUEDE VARIAR.
 * Los párrafos de acreditación de experiencia, las cláusulas
 * antisoborno, la fórmula de penalidad por mora y los topes normativos
 * están redactados palabra por palabra porque así deben aparecer ante el
 * OECE. Si el modelo los reescribe, salen distintos en cada generación y
 * dejan de ser válidos.
 *
 * Medido sobre los 16 documentos: 1,662 instrucciones entre corchetes,
 * 1,430 obligaciones, 539 condicionales, 302 citas a norma, 279 ejemplos
 * redactados y 202 prohibiciones. Eso no es una guía de estilo: es un
 * formulario con reglas.
 *
 * Aquí cada bloque declara QUÉ ES, y el ensamblador decide qué hacer:
 * copiar literal, pedirle el dato al usuario, o pedirle al modelo que
 * redacte solo esa parte tomando el ejemplo de César como referencia.
 */

/** Bloque de texto que se reproduce TAL CUAL. */
export interface BloqueFijo {
  clase: 'fijo';
  texto: string;
  /** Norma que obliga a este texto, si la plantilla la cita. */
  fundamento?: string;
}

/** Título de sección o subsección. */
export interface BloqueTitulo {
  clase: 'titulo';
  texto: string;
  /** 1 = sección principal, 2 = subsección, 3 = sub-subsección. */
  nivel: 1 | 2 | 3;
}

/** Dato puntual que aporta el usuario. */
export interface BloqueCampo {
  clase: 'campo';
  id: string;
  etiqueta: string;
  /** La instrucción entre corchetes, tal como la escribió César. */
  ayuda: string;
  tipo: 'texto' | 'texto_largo' | 'numero' | 'moneda' | 'fecha' | 'dias';
  obligatorio: boolean;
  /** Tope normativo a verificar. Ver `validaciones`. */
  validacion?: string;
}

/**
 * Texto que redacta el modelo para el caso concreto.
 *
 * `ejemplo` es la redacción modelo de la plantilla: marca el registro y
 * el nivel de detalle esperado, y va al prompt como referencia. Sin él
 * el modelo produce generalidades donde César espera "melamina de alta
 * densidad de 18 mm" y "tapacantos de PVC de 2 mm".
 */
export interface BloqueRedactado {
  clase: 'redactado';
  id: string;
  etiqueta: string;
  instruccion: string;
  ejemplo?: string;
  /** Extensión orientativa de la redacción. */
  extension?: 'parrafo' | 'varios_parrafos' | 'lista';
}

/**
 * Párrafo invariable con un dato incrustado.
 *
 * Varios párrafos de la plantilla son texto obligatorio EXCEPTO por una
 * cifra en medio: "El postor debe acreditar un monto facturado acumulado
 * equivalente a [consignar el monto…], por la venta de bienes iguales o
 * similares…". Separarlo en campo + texto fijo rompe la redacción; que lo
 * escriba el modelo rompe el texto obligatorio. Aquí el párrafo va
 * completo con marcadores `{{id}}` que el ensamblador sustituye.
 */
export interface BloqueParrafo {
  clase: 'parrafo';
  texto: string;
  campos: BloqueCampo[];
  fundamento?: string;
}

/** Alternativas excluyentes; el usuario elige una. */
export interface BloqueOpcion {
  clase: 'opcion';
  id: string;
  etiqueta: string;
  instruccion: string;
  opciones: Array<{ valor: string; texto: string }>;
}

/** Tabla con columnas fijas y filas que aporta el usuario. */
export interface BloqueTabla {
  clase: 'tabla';
  id: string;
  etiqueta: string;
  instruccion?: string;
  columnas: string[];
  /** Instrucción por columna, cuando la plantilla la trae. */
  ayudaColumnas?: string[];
  /** Filas mínimas a completar. */
  minimo?: number;
}

/** Advertencia normativa que la plantilla incrusta entre corchetes. */
export interface BloqueNota {
  clase: 'nota';
  texto: string;
}

export type Bloque =
  | BloqueFijo
  | BloqueTitulo
  | BloqueCampo
  | BloqueParrafo
  | BloqueRedactado
  | BloqueOpcion
  | BloqueTabla
  | BloqueNota;

/**
 * Sección del documento.
 *
 * `condicion` traduce los 539 "de corresponder" de las plantillas: la
 * sección se incluye solo si esa condición se cumple. Sin esto, el
 * documento arrastra apartados vacíos —"Transporte", "Seguros",
 * "Visitas y muestras"— que la plantilla dice omitir cuando no aplican.
 */
export interface Seccion {
  id: string;
  titulo: string;
  /** Identificador de la condición; null = siempre se incluye. */
  condicion?: string;
  bloques: Bloque[];
  subsecciones?: Seccion[];
}

/** Tope normativo que el generador verifica al armar el documento. */
export interface Validacion {
  id: string;
  descripcion: string;
  /** Artículo o directiva que lo impone. */
  fundamento: string;
}

export interface PlantillaRequerimiento {
  id: string;
  /** Familia: menores a 8 UIT o procedimiento de selección. */
  familia: 'menor_8_uit' | 'procedimiento_seleccion';
  objeto: 'bienes' | 'servicios' | 'consultoria_general' | 'consultoria_obras' | 'obras';
  /** Título que encabeza el documento generado. */
  encabezado: string;
  subtitulo: string;
  /** Documento original del que proviene, para poder auditarla. */
  origen: string;
  secciones: Seccion[];
  validaciones: Validacion[];
}
