/**
 * Soporte por chat: los tickets que el usuario abre desde el botón
 * «Ayuda» y que el equipo (los perfiles con is_admin) atiende desde
 * /admin/soporte. Tablas y reglas en supabase/migrations/0075_soporte.sql.
 */

export type CategoriaDeTicket = 'error' | 'consulta' | 'sugerencia' | 'cuenta';
export type EstadoDeTicket = 'abierto' | 'respondido' | 'resuelto';
export type PrioridadDeTicket = 'normal' | 'alta';

export const CATEGORIAS: Record<
  CategoriaDeTicket,
  { etiqueta: string; corta: string; descripcion: string; saludo: string }
> = {
  error: {
    etiqueta: 'Reportar un error',
    corta: 'Error',
    descripcion: 'Algo no funciona o muestra un resultado equivocado.',
    saludo:
      'Cuéntanos qué intentabas hacer y qué pasó. Si puedes, adjunta una captura: ya incluimos la página en la que estás.',
  },
  consulta: {
    etiqueta: 'Tengo una consulta',
    corta: 'Consulta',
    descripcion: 'Una duda sobre cómo usar A-LexIA.',
    saludo: 'Escribe tu pregunta con el mayor detalle posible y te respondemos por aquí.',
  },
  cuenta: {
    etiqueta: 'Mi cuenta o mi plan',
    corta: 'Cuenta o plan',
    descripcion: 'Acceso, perfil, consumo, planes y pagos.',
    saludo: 'Cuéntanos qué necesitas sobre tu cuenta o tu plan.',
  },
  sugerencia: {
    etiqueta: 'Enviar una sugerencia',
    corta: 'Sugerencia',
    descripcion: 'Una idea para mejorar la plataforma.',
    saludo: 'Nos encanta leerlas. ¿Qué te gustaría que A-LexIA hiciera mejor?',
  },
};

export const ESTADOS: Record<EstadoDeTicket, { etiqueta: string; paraEquipo: string }> = {
  abierto: { etiqueta: 'En revisión', paraEquipo: 'Por responder' },
  respondido: { etiqueta: 'Respondido', paraEquipo: 'Esperando al usuario' },
  resuelto: { etiqueta: 'Resuelto', paraEquipo: 'Resuelto' },
};

/** Un ticket tal como lo ven el widget y la bandeja. */
export interface TicketResumen {
  id: string;
  numero: number;
  asunto: string;
  categoria: CategoriaDeTicket;
  prioridad: PrioridadDeTicket;
  estado: EstadoDeTicket;
  ultimo_mensaje: string | null;
  ultimo_mensaje_at: string;
  created_at: string;
  /** Hay mensajes que quien consulta todavía no leyó. */
  sin_leer: boolean;
  iniciado_por_equipo: boolean;
  calificacion: number | null;
}

export interface MensajeDeTicket {
  id: string;
  de_equipo: boolean;
  /** Es de quien está mirando la conversación. */
  propio: boolean;
  cuerpo: string;
  created_at: string;
  adjunto: { nombre: string; url: string; esImagen: boolean } | null;
}

/** Lo que el equipo ve de quien escribe. */
export interface UsuarioDeSoporte {
  id: string;
  nombre: string | null;
  email: string | null;
  perfil: 'entity' | 'provider' | 'consultant' | null;
  organizacion: string | null;
  cargo: string | null;
  plan: string | null;
  registrado: string | null;
  tickets: number;
}

export interface TicketDetalle extends TicketResumen {
  pagina: string | null;
  contexto: Record<string, unknown>;
  nota_interna?: string | null;
  mensajes: MensajeDeTicket[];
  /** Quién la marcó resuelta (lo anota la base). */
  resuelto_por: 'usuario' | 'equipo' | null;
  usuario?: UsuarioDeSoporte;
  otros?: Array<Pick<TicketResumen, 'id' | 'numero' | 'asunto' | 'estado' | 'ultimo_mensaje_at'>>;
}

export const LIMITE_DE_MENSAJE = 5000;
export const LIMITE_DE_ADJUNTO = 8 * 1024 * 1024;
export const TIPOS_DE_ADJUNTO = ['image/png', 'image/jpeg', 'application/pdf'] as const;

/** WhatsApp de atención de A-LexIA (César, 29/09/2026). */
export const WHATSAPP_NUMERO = '51968610606';
export const WHATSAPP_VISIBLE = '+51 968 610 606';

export function enlaceDeWhatsApp(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

/** El asunto sale de la primera línea del mensaje: el usuario no llena un formulario. */
export function asuntoDesde(texto: string, categoria: CategoriaDeTicket): string {
  const linea = texto
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (!linea) return CATEGORIAS[categoria].etiqueta;
  return linea.length > 90 ? `${linea.slice(0, 87).trimEnd()}…` : linea;
}
