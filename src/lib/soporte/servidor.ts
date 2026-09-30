import { createClient as createAdmin, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import {
  LIMITE_DE_ADJUNTO,
  TIPOS_DE_ADJUNTO,
  type MensajeDeTicket,
  type TicketDetalle,
  type TicketResumen,
  type UsuarioDeSoporte,
} from './tipos';

/**
 * Lo que comparten las rutas de /api/soporte y /api/admin/soporte.
 *
 * Tickets y mensajes se leen y escriben con el cliente del usuario: la
 * RLS decide qué ve cada uno. El cliente de servicio solo se usa para lo
 * que la RLS no cubre: subir y firmar adjuntos en la carpeta del dueño
 * del ticket (el equipo no puede escribir en la carpeta de otro) y leer
 * los datos del usuario que el equipo necesita para atenderlo.
 */

export function clienteDeServicio(): SupabaseClient {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function esAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  return (data as { is_admin?: boolean } | null)?.is_admin === true;
}

export const COLUMNAS_DE_TICKET =
  'id, numero, user_id, asunto, categoria, prioridad, estado, ultimo_mensaje, ultimo_mensaje_at, created_at, iniciado_por_equipo, calificacion, leido_usuario_at, leido_equipo_at, pagina, contexto, nota_interna, resuelto_por';

export interface FilaDeTicket {
  id: string;
  numero: number;
  user_id: string;
  asunto: string;
  categoria: TicketResumen['categoria'];
  prioridad: TicketResumen['prioridad'];
  estado: TicketResumen['estado'];
  ultimo_mensaje: string | null;
  ultimo_mensaje_at: string;
  created_at: string;
  iniciado_por_equipo: boolean;
  calificacion: number | null;
  leido_usuario_at: string;
  leido_equipo_at: string;
  pagina: string | null;
  contexto: Record<string, unknown> | null;
  nota_interna: string | null;
  resuelto_por: string | null;
}

/**
 * ¿Hay algo que quien mira no leyó? Para el dueño cuenta su marca de
 * lectura; para el equipo, la del equipo. Cada lado actualiza la suya al
 * escribir (disparador) y al abrir la conversación.
 */
export function comoResumen(t: FilaDeTicket, vistaDeEquipo: boolean): TicketResumen {
  const leido = vistaDeEquipo ? t.leido_equipo_at : t.leido_usuario_at;
  return {
    id: t.id,
    numero: t.numero,
    asunto: t.asunto,
    categoria: t.categoria,
    prioridad: t.prioridad,
    estado: t.estado,
    ultimo_mensaje: t.ultimo_mensaje,
    ultimo_mensaje_at: t.ultimo_mensaje_at,
    created_at: t.created_at,
    sin_leer: !!t.ultimo_mensaje && new Date(t.ultimo_mensaje_at) > new Date(leido),
    iniciado_por_equipo: t.iniciado_por_equipo,
    calificacion: t.calificacion,
  };
}

interface FilaDeMensaje {
  id: string;
  autor_id: string;
  de_equipo: boolean;
  cuerpo: string;
  created_at: string;
  adjunto_ruta: string | null;
  adjunto_nombre: string | null;
}

/**
 * El ticket con sus mensajes, o null si quien pregunta no puede verlo
 * (la RLS lo filtra). Marca como leído lo que ahora tiene delante.
 */
export async function leerTicket(
  supabase: SupabaseClient,
  id: string,
  yo: { id: string; admin: boolean },
): Promise<TicketDetalle | null> {
  const { data: fila } = await supabase.from('soporte_tickets').select(COLUMNAS_DE_TICKET).eq('id', id).maybeSingle();
  if (!fila) return null;
  const t = fila as FilaDeTicket;
  // El equipo atiende tickets ajenos; en el propio, un administrador es un usuario más.
  const vistaDeEquipo = yo.admin && t.user_id !== yo.id;

  const { data: filas } = await supabase
    .from('soporte_mensajes')
    .select('id, autor_id, de_equipo, cuerpo, created_at, adjunto_ruta, adjunto_nombre')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });
  const mensajes = await conAdjuntosFirmados((filas || []) as FilaDeMensaje[], yo.id);

  const resumen = comoResumen(t, vistaDeEquipo);
  if (resumen.sin_leer) {
    await supabase
      .from('soporte_tickets')
      .update(vistaDeEquipo ? { leido_equipo_at: new Date().toISOString() } : { leido_usuario_at: new Date().toISOString() })
      .eq('id', id);
  }

  const detalle: TicketDetalle = {
    ...resumen,
    sin_leer: false,
    pagina: t.pagina,
    contexto: t.contexto || {},
    mensajes,
    resuelto_por: t.estado !== 'resuelto' || !t.resuelto_por ? null : t.resuelto_por === t.user_id ? 'usuario' : 'equipo',
  };

  if (vistaDeEquipo) {
    const servicio = clienteDeServicio();
    detalle.nota_interna = t.nota_interna;
    const [usuarios, otros] = await Promise.all([
      datosDeUsuarios(servicio, [t.user_id]),
      supabase
        .from('soporte_tickets')
        .select('id, numero, asunto, estado, ultimo_mensaje_at')
        .eq('user_id', t.user_id)
        .neq('id', t.id)
        .order('ultimo_mensaje_at', { ascending: false })
        .limit(10),
    ]);
    detalle.usuario = usuarios.get(t.user_id);
    detalle.otros = (otros.data || []) as TicketDetalle['otros'];
  }
  return detalle;
}

async function conAdjuntosFirmados(filas: FilaDeMensaje[], yo: string): Promise<MensajeDeTicket[]> {
  const rutas = filas.map((f) => f.adjunto_ruta).filter((r): r is string => !!r);
  const firmadas = new Map<string, string>();
  if (rutas.length > 0) {
    const { data } = await clienteDeServicio().storage.from('uploads').createSignedUrls(rutas, 60 * 60);
    for (const d of data || []) if (d.path && d.signedUrl) firmadas.set(d.path, d.signedUrl);
  }
  return filas.map((f) => ({
    id: f.id,
    de_equipo: f.de_equipo,
    propio: f.autor_id === yo,
    cuerpo: f.cuerpo,
    created_at: f.created_at,
    adjunto:
      f.adjunto_ruta && firmadas.has(f.adjunto_ruta)
        ? {
            nombre: f.adjunto_nombre || 'Archivo adjunto',
            url: firmadas.get(f.adjunto_ruta)!,
            esImagen: /\.(png|jpe?g)$/i.test(f.adjunto_ruta),
          }
        : null,
  }));
}

/** Nombre, correo, perfil y plan de cada usuario, para la bandeja del equipo. */
export async function datosDeUsuarios(
  servicio: SupabaseClient,
  ids: string[],
): Promise<Map<string, UsuarioDeSoporte>> {
  const unicos = Array.from(new Set(ids));
  const mapa = new Map<string, UsuarioDeSoporte>();
  if (unicos.length === 0) return mapa;

  const [perfiles, suscripciones, tickets, correos] = await Promise.all([
    servicio
      .from('profiles')
      .select('id, full_name, profile_role, organization_name, position_title, created_at')
      .in('id', unicos),
    servicio.from('subscriptions').select('user_id, tier').in('user_id', unicos),
    servicio.from('soporte_tickets').select('user_id').in('user_id', unicos),
    Promise.all(unicos.map((id) => servicio.auth.admin.getUserById(id))),
  ]);

  const plan = new Map((suscripciones.data || []).map((s) => [s.user_id as string, s.tier as string]));
  const cuenta = new Map<string, number>();
  for (const t of tickets.data || []) cuenta.set(t.user_id as string, (cuenta.get(t.user_id as string) || 0) + 1);
  const correo = new Map(unicos.map((id, i) => [id, correos[i].data.user?.email ?? null]));

  for (const id of unicos) {
    const p = (perfiles.data || []).find((x) => x.id === id) as
      | {
          full_name: string | null;
          profile_role: UsuarioDeSoporte['perfil'];
          organization_name: string | null;
          position_title: string | null;
          created_at: string | null;
        }
      | undefined;
    mapa.set(id, {
      id,
      nombre: p?.full_name ?? null,
      email: correo.get(id) ?? null,
      perfil: p?.profile_role ?? null,
      organizacion: p?.organization_name ?? null,
      cargo: p?.position_title ?? null,
      plan: plan.get(id) ?? null,
      registrado: p?.created_at ?? null,
      tickets: cuenta.get(id) || 0,
    });
  }
  return mapa;
}

/**
 * Lee el formulario de un mensaje (texto y adjunto opcional) y sube el
 * adjunto a la carpeta del dueño del ticket. Devuelve un error legible
 * si algo no cumple.
 */
export async function leerMensaje(
  form: FormData,
  duenoDelTicket: string,
  ticketId: string,
): Promise<{ cuerpo: string; adjunto_ruta: string | null; adjunto_nombre: string | null } | { error: string }> {
  const cuerpo = String(form.get('cuerpo') || '').trim();
  const archivo = form.get('adjunto');
  if (cuerpo.length > 5000) return { error: 'El mensaje es demasiado largo (máximo 5 000 caracteres).' };

  let adjunto_ruta: string | null = null;
  let adjunto_nombre: string | null = null;
  if (archivo instanceof File && archivo.size > 0) {
    if (!(TIPOS_DE_ADJUNTO as readonly string[]).includes(archivo.type)) {
      return { error: 'Solo se pueden adjuntar imágenes PNG o JPG, o un PDF.' };
    }
    if (archivo.size > LIMITE_DE_ADJUNTO) return { error: 'El archivo supera los 8 MB.' };
    const ext = archivo.type === 'application/pdf' ? 'pdf' : archivo.type === 'image/png' ? 'png' : 'jpg';
    adjunto_ruta = `${duenoDelTicket}/soporte/${ticketId}/${randomUUID()}.${ext}`;
    adjunto_nombre = (archivo.name || `captura.${ext}`).slice(0, 120);
    const { error } = await clienteDeServicio()
      .storage.from('uploads')
      .upload(adjunto_ruta, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type });
    if (error) return { error: 'No se pudo subir el archivo. Inténtalo de nuevo.' };
  }
  if (!cuerpo && !adjunto_ruta) return { error: 'Escribe un mensaje o adjunta un archivo.' };
  return { cuerpo, adjunto_ruta, adjunto_nombre };
}
