import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  clienteDeServicio,
  COLUMNAS_DE_TICKET,
  comoResumen,
  datosDeUsuarios,
  esAdmin,
  type FilaDeTicket,
} from '@/lib/soporte/servidor';
import { CATEGORIAS, type CategoriaDeTicket, type EstadoDeTicket } from '@/lib/soporte/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/soporte/tickets — la bandeja del equipo.
 *   ?estado=abierto|respondido|resuelto|todos  ?categoria=…  ?q=texto
 * Devuelve los tickets de los demás usuarios con quién los escribió y
 * cuántos hay en cada estado.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await esAdmin(supabase, user.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const estado = url.searchParams.get('estado') || 'todos';
  const categoria = url.searchParams.get('categoria');
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  // Los tickets propios del administrador (si probó el widget) no son
  // trabajo del equipo: se atienden como usuario.
  let consulta = supabase
    .from('soporte_tickets')
    .select(COLUMNAS_DE_TICKET)
    .neq('user_id', user.id)
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(300);
  if (['abierto', 'respondido', 'resuelto'].includes(estado)) consulta = consulta.eq('estado', estado as EstadoDeTicket);
  if (categoria && categoria in CATEGORIAS) consulta = consulta.eq('categoria', categoria as CategoriaDeTicket);
  const [{ data }, conteo] = await Promise.all([
    consulta,
    supabase.from('soporte_tickets').select('estado, prioridad, leido_equipo_at, ultimo_mensaje_at').neq('user_id', user.id),
  ]);

  const filas = (data || []) as FilaDeTicket[];
  const usuarios = await datosDeUsuarios(clienteDeServicio(), filas.map((t) => t.user_id));

  let tickets = filas.map((t) => ({ ...comoResumen(t, true), usuario: usuarios.get(t.user_id) ?? null }));
  if (q) {
    tickets = tickets.filter((t) =>
      [t.asunto, t.ultimo_mensaje, `#${t.numero}`, t.usuario?.nombre, t.usuario?.email, t.usuario?.organizacion]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  const todos = (conteo.data || []) as Array<{ estado: EstadoDeTicket; prioridad: string; leido_equipo_at: string; ultimo_mensaje_at: string }>;
  const cuentas = {
    todos: todos.length,
    abierto: todos.filter((t) => t.estado === 'abierto').length,
    respondido: todos.filter((t) => t.estado === 'respondido').length,
    resuelto: todos.filter((t) => t.estado === 'resuelto').length,
    sin_leer: todos.filter((t) => new Date(t.ultimo_mensaje_at) > new Date(t.leido_equipo_at)).length,
    alta: todos.filter((t) => t.prioridad === 'alta' && t.estado !== 'resuelto').length,
  };

  return NextResponse.json({ tickets, cuentas });
}

/**
 * POST /api/admin/soporte/tickets — el equipo le escribe primero a un
 * usuario. JSON: { user_id, asunto, cuerpo }.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await esAdmin(supabase, user.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { user_id?: string; asunto?: string; cuerpo?: string };
  const cuerpo = (b.cuerpo || '').trim();
  const asunto = (b.asunto || '').trim().slice(0, 160);
  if (!b.user_id || !cuerpo || !asunto) {
    return NextResponse.json({ error: 'Falta el usuario, el asunto o el mensaje.' }, { status: 400 });
  }
  if (b.user_id === user.id) return NextResponse.json({ error: 'No puedes abrir una conversación contigo mismo.' }, { status: 400 });

  const { data: existe } = await clienteDeServicio().from('profiles').select('id').eq('id', b.user_id).maybeSingle();
  if (!existe) return NextResponse.json({ error: 'Ese usuario no existe.' }, { status: 404 });

  const { data: ticket, error } = await supabase
    .from('soporte_tickets')
    .insert({ user_id: b.user_id, asunto, categoria: 'consulta', estado: 'respondido', iniciado_por_equipo: true })
    .select('id')
    .single();
  if (error || !ticket) return NextResponse.json({ error: 'No se pudo abrir la conversación.' }, { status: 500 });

  const { error: e2 } = await supabase
    .from('soporte_mensajes')
    .insert({ ticket_id: ticket.id, autor_id: user.id, cuerpo: cuerpo.slice(0, 5000) });
  if (e2) return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 500 });
  return NextResponse.json({ id: ticket.id });
}
