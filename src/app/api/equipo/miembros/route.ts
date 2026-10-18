import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { quitarMiembro } from '@/lib/billing/gestion';

/**
 * DELETE /api/equipo/miembros?user= — el propietario quita a un miembro;
 * sin `user`, el propio usuario sale del equipo.
 */
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const objetivo = new URL(req.url).searchParams.get('user') ?? user.id;
  try {
    await quitarMiembro(user.id, objetivo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'no_permitido', message: (e as Error).message }, { status: 403 });
  }
}
