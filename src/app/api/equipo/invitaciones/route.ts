import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { crearInvitacion, revocarInvitacion } from '@/lib/billing/gestion';

/**
 * POST /api/equipo/invitaciones — el propietario genera un enlace de
 * invitación (vale 14 días y una sola persona). No hay correo saliente:
 * el enlace se copia o se comparte por WhatsApp.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const inv = await crearInvitacion(user.id);
    const origen = new URL(req.url).origin;
    return NextResponse.json({ ...inv, enlace: `${origen}/equipo/unirse?token=${inv.token}` });
  } catch (e) {
    return NextResponse.json({ error: 'no_permitido', message: (e as Error).message }, { status: 403 });
  }
}

/** DELETE /api/equipo/invitaciones?id= — revoca una invitación pendiente. */
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  try {
    await revocarInvitacion(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'no_permitido', message: (e as Error).message }, { status: 403 });
  }
}
