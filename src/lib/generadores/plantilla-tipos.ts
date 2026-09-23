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

/**
 * Con qué se marca cada elemento de una lista: viñetas, literales
 * a) b) c) o números. Vive aquí, con el modelo, porque hay listas del
 * propio formato que exigen una marca concreta.
 */
export type MarcadorLista = 'vineta' | 'literal' | 'numero';

/** Bloque de texto que se reproduce TAL CUAL. */
export interface BloqueFijo {
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  clase: 'fijo';
  texto: string;
  /** Norma que obliga a este texto, si la plantilla la cita. */
  fundamento?: string;
  /**
   * El texto es una enumeración: cada renglón, una viñeta.
   *
   * Observación de César (agosto de 2026) sobre los requisitos del
   * proveedor: "debe ser adecuado conforme al texto modelo (en A-LexIA no
   * está ordenado), está todo el texto junto". Son siete requisitos y
   * salían como un párrafo corrido.
   *
   * Se marca aquí y no se parte en siete bloques para que la auditoría
   * siga cotejando un solo texto contra el Word.
   */
  /**
   * Cómo se llama su interruptor, cuando el bloque va condicionado.
   *
   * Un texto fijo no tiene nombre, así que el interruptor tomaba el del
   * apartado entero: en "Forma y requisitos de pago" salían dos
   * interruptores llamados los dos "Forma y requisitos de pago", uno
   * para el pago anticipado y otro para el aviso de las accesorias. No
   * va al documento: es solo el rótulo de la pantalla.
   */
  etiqueta?: string;
  lista?: boolean;

  /**
   * Con qué se marca cada renglón de esa lista. Por defecto, viñetas.
   *
   * Hay enumeraciones del formato que NO admiten viñeta: las causales
   * de resolución del contrato menor se citan más abajo por su letra
   * —"en los supuestos previstos en los literales a), c), d)..."—, de
   * modo que si salen con viñeta la remisión se queda sin referente.
   * Observación 16 de César (setiembre de 2026).
   */
  marcador?: MarcadorLista;
}

/** Título de sección o subsección. */
export interface BloqueTitulo {
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  clase: 'titulo';
  texto: string;
  /** 1 = sección principal, 2 = subsección, 3 = sub-subsección. */
  nivel: 1 | 2 | 3;
}

/**
 * Muestra el bloque solo si una opción se resolvió de cierta manera.
 *
 * Hay apartados que el formato pide únicamente cuando se eligió una de
 * las alternativas: si se permite subcontratar, hay que decir qué
 * prestaciones NO pueden subcontratarse; si se prohíbe, esa pregunta no
 * existe. Hasta ahora la plantilla solo sabía condicionar secciones
 * enteras con un interruptor, y eso obligaba a preguntar dos veces lo
 * mismo. Petición de César del 19/08/2026.
 */
export interface VisibleSi {
  /**
   * Interruptor del que depende, si es uno de los "de corresponder".
   *
   * Un bloque suelto puede depender de lo mismo que una sección: si la
   * contratación no tiene prestaciones accesorias, su tabla de plazos
   * no pinta nada aunque viva dentro de la sección del plazo principal.
   */
  condicion?: string;
  /** Id del bloque de opción del que depende, si depende de una. */
  opcion?: string;
  /** Valor —o valores— que lo hacen aparecer. */
  valor?: string | string[];
}

/** Dato puntual que aporta el usuario. */
export interface BloqueCampo {
  clase: 'campo';
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  id: string;
  etiqueta: string;
  /** La instrucción entre corchetes, tal como la escribió César. */
  ayuda: string;
  /**
   * Cómo construir el contenido. Va al modelo, NO a la pantalla.
   *
   * `instruccion` es lo que el formato oficial pide y es lo que lee el
   * área usuaria. El método es la forma de decidirlo —cuándo corresponde,
   * qué comprobar, qué no inventar— y son las observaciones de César de
   * setiembre de 2026. Al principio se concatenaban las dos y el
   * formulario mostraba un párrafo de quince líneas de instrucciones
   * dirigidas a la IA. Separados, cada uno va donde sirve.
   */
  metodo?: string;
  tipo: 'texto' | 'texto_largo' | 'numero' | 'moneda' | 'fecha' | 'dias' | 'opciones';
  /**
   * Las opciones, cuando el tipo es `opciones`.
   *
   * Lo que se guarda es el TEXTO elegido, no un código, para que el
   * párrafo lo sustituya tal cual y el documento salga redactado.
   *
   * Nace de la observación 11 de César (setiembre de 2026): el inicio
   * del cómputo del plazo estaba escrito como un cajón de sastre
   * —«de la notificación de la orden de servicio o suscripción del
   * contrato o del cumplimiento de la condición (...), según
   * corresponda»— y él pide que el área usuaria elija el que aplica.
   * Lo mismo pide para el medio de presentación de los entregables y
   * para el de la forma de pago.
   */
  opciones?: Array<{ valor: string; texto: string }>;
  /** Añade «Otro» al final, que abre un campo libre. */
  permiteOtro?: boolean;
  obligatorio: boolean;
  /**
   * Muestra la ayuda como advertencia, en rojo.
   *
   * Para las instrucciones que no son un consejo sino una condición: si
   * se pasan por alto, el requerimiento queda mal. Petición de César del
   * 18/08/2026 sobre la documentación para la suscripción del contrato.
   */
  advertencia?: boolean;
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
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  id: string;
  etiqueta: string;
  instruccion: string;
  /**
   * Cómo construir el contenido. Va al modelo, NO a la pantalla.
   *
   * `instruccion` es lo que el formato oficial pide y es lo que lee el
   * área usuaria. El método es la forma de decidirlo —cuándo corresponde,
   * qué comprobar, qué no inventar— y son las observaciones de César de
   * setiembre de 2026. Al principio se concatenaban las dos y el
   * formulario mostraba un párrafo de quince líneas de instrucciones
   * dirigidas a la IA. Separados, cada uno va donde sirve.
   */
  metodo?: string;
  /** Muestra la instrucción como advertencia, en rojo. Ver `BloqueCampo`. */
  advertencia?: boolean;
  ejemplo?: string;
  /**
   * Texto institucional de partida, que el documento usa tal cual si
   * nadie lo toca.
   *
   * No es lo mismo que `ejemplo` —que es una referencia de forma y no
   * se escribe— ni que un bloque `fijo`, que es invariable. Esto es la
   * redacción que el formato ya trae y que SÍ se puede adaptar.
   *
   * Nace de dos observaciones de César que parecían opuestas: en
   * agosto, que las condiciones de la garantía «ya están establecidas
   * por lo que no hay necesidad de redactar» —de ahí que fueran texto
   * fijo—; en setiembre, que A-LexIA debe «adecuar el texto
   * predeterminado de alcance y condiciones al caso concreto». Con
   * esto se cumplen las dos: el texto está desde el principio y
   * además se puede ajustar.
   */
  predeterminado?: string;
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
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  clase: 'parrafo';
  texto: string;
  campos: BloqueCampo[];
  fundamento?: string;
}

/** Alternativas excluyentes; el usuario elige una. */
export interface BloqueOpcion {
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  clase: 'opcion';
  id: string;
  etiqueta: string;
  instruccion: string;
  opciones: Array<{ valor: string; texto: string }>;
}

/** Tabla con columnas fijas y filas que aporta el usuario. */
export interface BloqueTabla {
  clase: 'tabla';
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  id: string;
  etiqueta: string;
  instruccion?: string;
  /** Muestra la instrucción como advertencia, en rojo. Ver `BloqueCampo`. */
  advertencia?: boolean;
  columnas: string[];
  /**
   * Cómo construir el contenido. Va al modelo, NO a la pantalla.
   *
   * `instruccion` es lo que el formato oficial pide y es lo que lee el
   * área usuaria. El método es la forma de decidirlo —cuándo corresponde,
   * qué comprobar, qué no inventar— y son las observaciones de César de
   * setiembre de 2026. Al principio se concatenaban las dos y el
   * formulario mostraba un párrafo de quince líneas de instrucciones
   * dirigidas a la IA. Separados, cada uno va donde sirve.
   */
  metodo?: string;
  /** Instrucción por columna, cuando la plantilla la trae. */
  ayudaColumnas?: string[];
  /** Filas mínimas a completar. */
  minimo?: number;
  /**
   * El cuadro se puede repetir, cada vez con su propio título.
   *
   * Observación de César (agosto de 2026) sobre las características
   * técnicas: "debe permitir ingresar cuadros independientes y en cada
   * cuadro debe permitir poner un título, para poner el nombre de cada
   * bien y en el cuadro poner sus características". Su formato lo hace
   * así —"Bien N.° 01: XYZ" con su cuadro, "Bien N.° 02: ABC" con el
   * suyo— y A-LexIA tenía un único cuadro para todos los bienes.
   *
   * `etiquetaTitulo` es lo que se le pide al usuario en cada uno: "Bien
   * N.° 01", "Ítem", "Servicio"…
   */
  repetible?: { etiquetaTitulo: string };
  /**
   * El cuadro acompaña a un texto y solo sale si se llena.
   *
   * Observación de César (agosto de 2026) sobre el envase: "debe añadir
   * una opción adicional para insertar cuadro en caso el área usuaria lo
   * amerite, el cuadro de redacción actual no debe eliminarse". Su
   * formato trae ahí un cuadro —"Aspecto a precisar | Descripción"— y
   * A-LexIA solo tenía el campo de texto.
   *
   * Un cuadro opcional normal deja escrito "No aplica: envase" cuando
   * queda vacío, y aquí eso sobra: el apartado ya está resuelto con el
   * texto de al lado. Si no se llena, no existe.
   */
  complementaria?: boolean;
  /**
   * Filas que el formato ya trae escritas y el usuario solo completa.
   *
   * Observación de César (agosto de 2026) sobre el plazo de entrega:
   * "adicional a lo que ya está establecido en A-LexIA, debe agregar los
   * cuadros según el sistema de entrega". Esos cuadros no están vacíos
   * en el formato: para llave en mano trae tres filas —entrega de los
   * bienes, instalación, puesta en funcionamiento—, cada una con su
   * inicio del cómputo redactado, y solo deja el plazo por rellenar.
   *
   * Si la entidad no toca nada, el documento sale con estas filas. En
   * cuanto edita una, se guarda lo suyo y estas dejan de aplicar.
   */
  filasIniciales?: string[][];
}

/** Advertencia normativa que la plantilla incrusta entre corchetes. */
export interface BloqueNota {
  /** Ver `VisibleSi`. */
  visibleSi?: VisibleSi;
  clase: 'nota';
  texto: string;
  /**
   * Cómo se llama su interruptor, cuando el bloque va condicionado.
   *
   * Un texto fijo no tiene nombre, así que el interruptor tomaba el del
   * apartado entero: en "Forma y requisitos de pago" salían dos
   * interruptores llamados los dos "Forma y requisitos de pago", uno
   * para el pago anticipado y otro para el aviso de las accesorias. No
   * va al documento: es solo el rótulo de la pantalla.
   */
  etiqueta?: string;
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
  /**
   * El interruptor nace encendido.
   *
   * `condicion` traduce los «de corresponder» del formato, que por
   * definición empiezan apagados. Pero hay apartados donde la regla
   * es la contraria: en las ACTIVIDADES lo normal es que las haya y
   * la excepción es que no —un servicio de seguridad y vigilancia o
   * un traslado de valores no se describen por actividades—. Ahí el
   * área usuaria necesita el interruptor para APAGARLO, no para
   * descubrir que el apartado existe.
   *
   * Observación 5 de César (setiembre de 2026).
   */
  condicionPorDefecto?: boolean;
  bloques: Bloque[];
  subsecciones?: Seccion[];
  /**
   * La entidad puede cambiarle el título.
   *
   * Observación de César (agosto de 2026): "las opciones remarcadas
   * deben estar predeterminadas con los textos actuales, dichos textos
   * deben permitir cambiar su texto". Lo dice de las prestaciones
   * accesorias, donde el formato propone tres —mantenimiento, soporte y
   * capacitación— pero hay más: monitoreo y seguimiento, asistencia
   * técnica especializada…
   *
   * Va apartado por apartado y no en general, porque el título de un
   * numeral del formato oficial no se toca: es lo que la norma manda que
   * diga.
   */
  renombrable?: boolean;
  /**
   * El numeral se rotula con letra, no con el número que le tocaría.
   *
   * En REQUISITOS DE CALIFICACIÓN el formato oficial no escribe
   * "10.1.1. Capacidad legal" sino "A. Capacidad legal", y la serie de
   * letras SIGUE de un grupo al otro: la capacidad legal cuelga de los
   * obligatorios y la experiencia del postor de los adicionales, y aun
   * así son A y B. Comprobado en el .docx de César: los dos párrafos
   * comparten la misma lista de Word (numId 19, formato upperLetter).
   *
   * Observación de César del 13/09/2026 sobre Servicios – Comparación de
   * precios: "a. Capacidad legal … b. Experiencia del postor en la
   * especialidad".
   *
   * La serie corre por apartado de primer nivel, que es como la lleva el
   * documento.
   */
  numeralLiteral?: boolean;
  /**
   * El rótulo exacto del numeral, cuando el formato lo trae escrito.
   *
   * En Servicios de Consultoría en General los requisitos adicionales
   * están rotulados "B.3." y "B.4." en el propio .docx —no los numera
   * Word, están tecleados— aunque cuelguen del 10.2 y la serie de
   * letras vaya por la C. Es un desliz del formato oficial, pero es lo
   * que el documento dice, y el requerimiento tiene que salir como su
   * formato. Observación de César del 16/09/2026.
   */
  numeralPropio?: string;
  /**
   * El numeral entero solo aplica a una alternativa ya elegida.
   *
   * Consultoría de obras trae seis tablas —"para el caso de solo
   * formulación", "para el caso de solo diseño"…— y solo una
   * corresponde. Hasta ahora eso solo podía expresarse bloque a bloque,
   * y el título quedaba a la vista con el apartado vacío debajo.
   * Observación de César del 16/09/2026.
   */
  visibleSi?: { condicion?: string; opcion?: string; valor?: string | string[] };
}

/** Tope normativo que el generador verifica al armar el documento. */
export interface Validacion {
  id: string;
  descripcion: string;
  /** Artículo o directiva que lo impone. */
  fundamento: string;
  /**
   * Multiplicador sobre la cuantía, cuando el tope se expresa así.
   *
   * No es el mismo en todas las plantillas: bienes y servicios admiten
   * hasta TRES veces la cuantía, pero consultoría en general se limita a
   * UNA vez. Fijarlo en el código haría que el aviso fuese correcto en
   * unas plantillas y falso en otras.
   */
  factor?: number;
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
