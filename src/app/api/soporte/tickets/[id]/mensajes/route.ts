import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leerMensaje } from '@/lib/soporte/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/soporte/tickets/:id/mensajes — un mensaje nuevo en la
 * conversación (formulario: cuerpo y adjunto opcional). Sirve igual al
 * usuario y al equipo: la base decide si es del equipo y mueve el estado.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Si la RLS no deja ver el ticket, tampoco se escribe en él.
  const { data: ticket } = await supabase
    .from('soporte_tickets')
    .select('id, user_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: 'No encontramos esa conversación.' }, { status: 404 });

  // Un tope contra envíos en ráfaga: 30 mensajes cada 10 minutos.
  const { count } = await supabase
    .from('soporte_mensajes')
    .select('id', { count: 'exact', head: true })
    .eq('autor_id', user.id)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());
  if ((count ?? 0) >= 30) {
    return NextResponse.json({ error: 'Estás enviando muchos mensajes seguidos. Espera un momento.' }, { status: 429 });
  }

  const mensaje = await leerMensaje(await req.formData(), ticket.user_id as string, ticket.id as string);
  if ('error' in mensaje) return NextResponse.json({ error: mensaje.error }, { status: 400 });

  const { error } = await supabase
    .from('soporte_mensajes')
    .insert({ ticket_id: ticket.id, autor_id: user.id, ...mensaje });
  if (error) return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
