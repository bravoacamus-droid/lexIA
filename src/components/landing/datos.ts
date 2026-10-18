/**
 * Textos de la página pública, copiados de la propuesta de César (app.js de
 * su prototipo, octubre 2026). Los planes NO están aquí: salen de
 * `@/lib/billing/catalogo` para que la página y la aplicación digan lo mismo.
 */

export type Modulo = 'consultar' | 'generar' | 'evaluar';
export type Perfil = 'proveedor' | 'entidad' | 'consultor';

export interface Herramienta {
  titulo: string;
  texto: string;
  /** Número del folleto `funcion-N.webp` que abre la flecha. */
  material: number;
}

export const MODULOS: Record<
  Modulo,
  { etiqueta: string; icono: 'chat' | 'file' | 'check'; titulo: string; texto: string; herramientas: Herramienta[] }
> = {
  consultar: {
    etiqueta: 'Consultar',
    icono: 'chat',
    titulo: 'Aclara tu caso. Encuentra respaldo.',
    texto:
      'Cuando una duda detiene el expediente o tu participación, explica la situación y consulta las fuentes disponibles.',
    herramientas: [
      { titulo: 'Pregunta a A-LexIA', texto: 'Describe tu caso por texto y profundiza con preguntas.', material: 1 },
      { titulo: 'Habla con A-LexIA', texto: 'Explica la situación por voz, como en una llamada.', material: 2 },
      { titulo: 'Búsqueda avanzada', texto: 'Localiza fuentes relacionadas por temas y palabras clave.', material: 3 },
    ],
  },
  generar: {
    etiqueta: 'Generar',
    icono: 'file',
    titulo: 'De tu necesidad a un proyecto claro.',
    texto:
      'Organiza antecedentes, condiciones y sustento para preparar un documento adaptado a tu caso y a tu rol.',
    herramientas: [
      { titulo: 'Genera requerimientos', texto: 'Bienes, servicios, consultoría y ejecución de obras.', material: 4 },
      { titulo: 'Redacta documentos contractuales', texto: 'Proyectos de informes, cartas y resoluciones.', material: 5 },
    ],
  },
  evaluar: {
    etiqueta: 'Evaluar',
    icono: 'check',
    titulo: 'Revisa antes de dar el siguiente paso.',
    texto:
      'Contrasta condiciones y documentos, identifica posibles inconsistencias y organiza hallazgos para su revisión.',
    herramientas: [
      { titulo: 'Evalúa requerimientos', texto: 'Detecta posibles vacíos, contradicciones y restricciones.', material: 6 },
      { titulo: 'Evalúa bases', texto: 'Prepara mejoras, consultas y observaciones.', material: 7 },
      { titulo: 'Evalúa ofertas', texto: 'Contrasta documentos con las bases definitivas.', material: 8 },
      { titulo: 'Formula y absuelve', texto: 'Proyectos según la intervención del proveedor o evaluador.', material: 9 },
    ],
  },
};

export const PERFILES: Record<Perfil, { etiqueta: string; titulo: string; texto: string; puntos: string[] }> = {
  proveedor: {
    etiqueta: 'Soy proveedor',
    titulo: 'Tu oferta merece una revisión a tiempo.',
    texto:
      '¿Detectaste una condición cuando el plazo para observar ya terminó? ¿Te preocupa una omisión en la oferta que preparaste?',
    puntos: [
      'Revisa bases y formula consultas u observaciones.',
      'Contrasta tu oferta antes de presentarla.',
      'Prepara proyectos de solicitudes contractuales.',
    ],
  },
  entidad: {
    etiqueta: 'Trabajo en una entidad',
    titulo: 'Que la carga documental no frene tu trabajo.',
    texto:
      'Áreas usuarias, DEC, evaluadores, asesoría jurídica y autoridades tienen tareas distintas. A-LexIA apoya su elaboración y revisión según el rol.',
    puntos: [
      'Elabora y perfecciona requerimientos.',
      'Prepara absoluciones y revisa ofertas.',
      'Ordena antecedentes para documentos contractuales.',
    ],
  },
  consultor: {
    etiqueta: 'Soy consultor',
    titulo: 'Más tiempo para tu criterio especializado.',
    texto:
      'Cada cliente necesita un análisis particular. A-LexIA ayuda a buscar respaldo, preparar proyectos y revisar documentación.',
    puntos: [
      'Localiza fuentes para el caso de tu cliente.',
      'Apoya elaboración y revisión documental.',
      'Identifica posibles errores y puntos de controversia.',
    ],
  },
};

/** Folletos `funcion-1..9.webp`, en el orden de las herramientas. */
export const MATERIALES: { modulo: Modulo; titulo: string }[] = [
  { modulo: 'consultar', titulo: 'Consulta por texto' },
  { modulo: 'consultar', titulo: 'Consulta por voz' },
  { modulo: 'consultar', titulo: 'Búsqueda avanzada' },
  { modulo: 'generar', titulo: 'Generación de requerimientos' },
  { modulo: 'generar', titulo: 'Documentos contractuales' },
  { modulo: 'evaluar', titulo: 'Evaluación de requerimientos' },
  { modulo: 'evaluar', titulo: 'Evaluación de bases' },
  { modulo: 'evaluar', titulo: 'Evaluación de ofertas' },
  { modulo: 'evaluar', titulo: 'Consultas y observaciones' },
];

export interface Video {
  id: string;
  modulo: Modulo;
  titulo: string;
  descripcion: string;
  segundos: number;
}

export const VIDEOS: Video[] = [
  {
    id: 'consulta',
    modulo: 'consultar',
    titulo: 'Resuelve una duda y revisa su sustento',
    descripcion: 'Consulta por texto: un ejemplo sobre condiciones de un requerimiento.',
    segundos: 30,
  },
  {
    id: 'bases-carga',
    modulo: 'evaluar',
    titulo: 'Carga tus bases para iniciar la revisión',
    descripcion: 'Identifica el procedimiento y adjunta el documento que deseas evaluar.',
    segundos: 17,
  },
  {
    id: 'bases-hallazgos',
    modulo: 'evaluar',
    titulo: 'Revisa los hallazgos de tus bases',
    descripcion: 'Explora las condiciones detectadas, su explicación y propuestas de mejora.',
    segundos: 30,
  },
];

export const DEMOS: Record<Modulo, [string, string][]> = {
  consultar: [
    ['Describe tu caso', 'Indica tu rol, los hechos y la duda concreta. Si ya tienes un criterio, pide contrastarlo.'],
    ['Profundiza en la orientación', 'Completa la información y realiza preguntas de seguimiento.'],
    ['Revisa el respaldo', 'Comprueba que las fuentes y los hechos correspondan a tu situación.'],
  ],
  generar: [
    ['Explica la necesidad', 'Describe qué necesitas contratar o qué documento contractual quieres preparar.'],
    ['Aporta antecedentes', 'Comparte los documentos pertinentes y señala qué información falta.'],
    ['Revisa el proyecto', 'Completa datos y valida el contenido y el sustento antes de utilizarlo.'],
  ],
  evaluar: [
    [
      'Aporta documentos pertinentes',
      'En ofertas: bases definitivas, oferta completa y subsanaciones cuando corresponda.',
    ],
    [
      'Organiza la revisión',
      'Separa admisión, calificación y evaluación. Relaciona cada requisito con la evidencia.',
    ],
    ['Valida los hallazgos', 'Revisa inconsistencias, posibles omisiones y sustento antes de concluir.'],
  ],
};

/** Filas del «Comparar funcionalidades»: herramienta, Consulta, Profesional, Especialista. */
export const COMPARACION: [string, string, string, string][] = [
  ['Texto y búsqueda avanzada', '✓', '✓', '✓'],
  ['Consulta por voz', '—', '—', '✓'],
  ['Contratos menores', '3 operaciones combinadas/mes', '✓', '✓'],
  ['Requerimientos de selección', '—', '✓', '✓'],
  ['Bases y formulación de observaciones', '—', '✓', '✓'],
  ['Ofertas', '—', '3 análisis/mes; hasta 2 ofertas/análisis', 'Varias según capacidad'],
  ['Documentos contractuales y absoluciones', '—', '—', '✓'],
];

/** Tarifas ilustrativas del simulador de consumo de créditos. */
export const CONSUMO: { etiqueta: string; tarifa: number; inicial: number }[] = [
  { etiqueta: 'Preguntas por texto', tarifa: 1, inicial: 20 },
  { etiqueta: 'Búsquedas', tarifa: 2, inicial: 0 },
  { etiqueta: 'Requerimientos (estimación alta)', tarifa: 40, inicial: 0 },
  { etiqueta: 'Evaluación de bases/requerimientos', tarifa: 24, inicial: 0 },
];

export const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Qué incluye Prueba A-LexIA?',
    respuesta:
      'Hasta 20 preguntas por texto, disponibles durante 30 días o hasta agotarlas, lo que ocurra primero. Es una prueba de una sola vez; no una bolsa gratuita renovada cada mes.',
  },
  {
    pregunta: '¿A-LexIA reemplaza al especialista?',
    respuesta:
      'Apoya la comprensión, la elaboración de proyectos y la revisión documental. El profesional responsable valida los hechos, documentos, fuentes y resultados antes de utilizarlos.',
  },
  {
    pregunta: '¿Qué fuentes respaldan las respuestas?',
    respuesta:
      'La Biblioteca Normativa incluye, según las fuentes disponibles, la Ley N.° 32069, su Reglamento, el TUO de la Ley N.° 27444, opiniones y pronunciamientos del OECE, resoluciones del TCP, acuerdos de Sala Plena, directivas y documentos de la DGA, Perú Compras y otras autoridades.',
  },
  {
    pregunta: '¿Todos los planes tienen consulta por voz?',
    respuesta:
      'No. La consulta por voz se incluye desde Especialista, además de Equipos y Organizaciones, y consume créditos de la bolsa del plan.',
  },
  {
    pregunta: '¿Puedo analizar cualquier número de páginas?',
    respuesta:
      'El volumen admitido depende de la capacidad implementada y de los créditos disponibles. Antes de una tarea variable debe informarse el consumo estimado. No se ofrece procesamiento ilimitado.',
  },
  {
    pregunta: '¿Cómo se paga el plan anual?',
    respuesta:
      'Se paga completo por adelantado, por un importe equivalente a 11 mensualidades. El acceso dura 12 meses y los créditos se renuevan mensualmente.',
  },
];

/** Quita tildes y mayúsculas: «Evaluación» y «evaluacion» deben coincidir en el buscador. */
export const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Montos como en la propuesta: «1,000», «44.92». */
export const montoEnSoles = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 2 });
