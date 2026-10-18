/**
 * Catálogo de planes de A-LexIA (documento «PLANES DE A-LEXIA» de César,
 * 17/10/2026). Lo usan la página pública y la aplicación, para que las
 * dos digan lo mismo.
 *
 * Qué herramienta habilita cada plan y cuánto cuesta en créditos vive en
 * `creditos.ts`; aquí solo lo que se le muestra al cliente.
 */

export type IdDePlan = 'prueba' | 'consulta' | 'profesional' | 'especialista' | 'equipos' | 'organizaciones';

export interface PlanDeCatalogo {
  id: IdDePlan;
  nombre: string;
  /** Rótulo corto sobre el nombre: «Prepara y revisa». */
  tipo: string;
  precioMensual: number;
  creditosMes: number;
  usuarios: number;
  descripcion: string;
  caracteristicas: string[];
  recomendado?: boolean;
  empresas?: boolean;
  /** «Desde S/ 799»: Organizaciones se cotiza. */
  desde?: boolean;
  prueba?: boolean;
}

export const PLANES: PlanDeCatalogo[] = [
  {
    id: 'prueba',
    nombre: 'Prueba A-LexIA',
    tipo: 'Conoce el producto',
    precioMensual: 0,
    creditosMes: 0,
    usuarios: 1,
    descripcion: 'Explora la consulta por texto y su respaldo.',
    caracteristicas: ['20 preguntas por texto', '30 días o hasta agotar las preguntas', 'Una sola prueba por usuario'],
    prueba: true,
  },
  {
    id: 'consulta',
    nombre: 'Consulta',
    tipo: 'Dudas y tareas ocasionales',
    precioMensual: 49,
    creditosMes: 200,
    usuarios: 1,
    descripcion: 'Orientación y tareas puntuales de contratos menores.',
    caracteristicas: [
      'Texto y búsqueda avanzada',
      'Hasta 3 operaciones combinadas de requerimientos de contratos menores',
      'Sin consulta por voz',
    ],
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    tipo: 'Prepara y revisa',
    precioMensual: 99,
    creditosMes: 500,
    usuarios: 1,
    descripcion: 'Requerimientos, bases y revisión preventiva de ofertas.',
    caracteristicas: [
      'Todo Consulta y requerimientos de procedimientos de selección',
      'Bases y formulación de consultas/observaciones',
      'Hasta 3 análisis: máximo 2 ofertas por análisis',
      'Sin consulta por voz',
    ],
    recomendado: true,
  },
  {
    id: 'especialista',
    nombre: 'Especialista',
    tipo: 'Trabajo especializado',
    precioMensual: 199,
    creditosMes: 1000,
    usuarios: 1,
    descripcion: 'Ejecución contractual y revisión de varias ofertas.',
    caracteristicas: [
      'Todo Profesional',
      'Consulta por voz',
      'Documentos contractuales y absoluciones',
      'Varias ofertas según capacidad implementada',
    ],
  },
  {
    id: 'equipos',
    nombre: 'Equipos',
    tipo: 'Empresas y firmas',
    precioMensual: 399,
    creditosMes: 2000,
    usuarios: 5,
    descripcion: 'Un equipo pequeño con cuentas individuales.',
    caracteristicas: [
      'Todas las funciones de Especialista',
      'Hasta 5 usuarios',
      'Bolsa mensual compartida',
      'Ampliaciones según necesidad',
    ],
    empresas: true,
  },
  {
    id: 'organizaciones',
    nombre: 'Organizaciones',
    tipo: 'Alcance a medida',
    precioMensual: 799,
    creditosMes: 4000,
    usuarios: 10,
    descripcion: 'Capacidad ajustada a usuarios y volumen de trabajo.',
    caracteristicas: [
      'Todas las funciones de Especialista',
      'Paquete base: hasta 10 usuarios',
      'Desde 4.000 créditos compartidos',
      'Cotización según alcance',
    ],
    empresas: true,
    desde: true,
  },
];

export const RECARGAS = [
  { creditos: 100, precio: 29 },
  { creditos: 300, precio: 79 },
  { creditos: 1000, precio: 249 },
];

/** El plan anual se paga por adelantado: 11 mensualidades por 12 meses. */
export const precioAnual = (p: PlanDeCatalogo) => p.precioMensual * 11;

export function planDelCatalogo(id: string): PlanDeCatalogo {
  return PLANES.find((p) => p.id === id) ?? PLANES[0];
}

/** Contacto comercial (WhatsApp de A-LexIA, el de la propuesta de César). */
export const WHATSAPP_COMERCIAL = '51968610606';
export const enlaceWhatsApp = (texto: string) =>
  `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(texto)}`;
