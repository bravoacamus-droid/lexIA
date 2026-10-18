import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { aceptarInvitacion, verInvitacion } from '@/lib/billing/gestion';

/** GET /api/equipo/unirse?token= — a qué equipo invita el enlace. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const info = token ? await verInvitacion(token) : null;
  if (!info) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json(info);
}

/** POST /api/equipo/unirse — el usuario con sesión acepta la invitación. */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = z.object({ token: z.string().min(10).max(100) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  try {
    return NextResponse.json(await aceptarInvitacion(user.id, p.data.token));
  } catch (e) {
    return NextResponse.json({ error: 'no_permitido', message: (e as Error).message }, { status: 400 });
  }
}
