import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { esAdmin, leerTicket } from '@/lib/soporte/servidor';
import { CATEGORIAS, type CategoriaDeTicket, type EstadoDeTicket } from '@/lib/soporte/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/soporte/tickets/:id — la conversación completa (y la marca como leída). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ticket = await leerTicket(supabase, params.id, { id: user.id, admin: await esAdmin(supabase, user.id) });
  if (!ticket) return NextResponse.json({ error: 'No encontramos esa conversación.' }, { status: 404 });
  return NextResponse.json({ ticket });
}

/**
 * PATCH /api/soporte/tickets/:id
 *   El usuario: { estado: 'resuelto' | 'abierto' } y { calificacion: 1–5 }.
 *   El equipo, además: prioridad, categoria y nota_interna.
 * La RLS y el disparador de guarda repiten estas reglas en la base.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = await esAdmin(supabase, user.id);
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const cambios: Record<string, unknown> = {};

  const estados: EstadoDeTicket[] = admin ? ['abierto', 'respondido', 'resuelto'] : ['abierto', 'resuelto'];
  if (typeof cuerpo.estado === 'string' && estados.includes(cuerpo.estado as EstadoDeTicket)) {
    cambios.estado = cuerpo.estado;
  }
  if (typeof cuerpo.calificacion === 'number' && cuerpo.calificacion >= 1 && cuerpo.calificacion <= 5) {
    cambios.calificacion = Math.round(cuerpo.calificacion);
  }
  if (admin) {
    if (cuerpo.prioridad === 'normal' || cuerpo.prioridad === 'alta') cambios.prioridad = cuerpo.prioridad;
    if (typeof cuerpo.categoria === 'string' && cuerpo.categoria in CATEGORIAS) {
      cambios.categoria = cuerpo.categoria as CategoriaDeTicket;
    }
    if (typeof cuerpo.nota_interna === 'string') cambios.nota_interna = cuerpo.nota_interna.slice(0, 2000) || null;
  }
  if (Object.keys(cambios).length === 0) return NextResponse.json({ error: 'Nada que cambiar.' }, { status: 400 });

  const { data, error } = await supabase.from('soporte_tickets').update(cambios).eq('id', params.id).select('id');
  if (error) return NextResponse.json({ error: 'No se pudo guardar el cambio.' }, { status: 400 });
  if (!data || data.length === 0) return NextResponse.json({ error: 'No encontramos esa conversación.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/soporte/tickets/:id — solo el equipo (pruebas o spam). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await esAdmin(supabase, user.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { error } = await supabase.from('soporte_tickets').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: 'No se pudo eliminar.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
