import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { renombrarEquipo } from '@/lib/billing/gestion';

/** PATCH /api/equipo — el propietario cambia el nombre del equipo. */
export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = z.object({ nombre: z.string().min(2).max(120) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  try {
    await renombrarEquipo(user.id, p.data.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'no_permitido', message: (e as Error).message }, { status: 403 });
  }
}
