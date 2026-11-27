import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as clienteSinCookies } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { ErrorDeGestion, fijarMiClave } from '@/lib/usuarios/gestion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * El usuario fija su contraseña. Si entró con una temporal
 * (`debe_cambiar_clave`) o nunca tuvo (entró con Google), basta la sesión;
 * si ya tenía una, pide la actual: con una sesión olvidada abierta, otro
 * no le cambia la contraseña.
 */
const Cuerpo = z.object({
  actual: z.string().max(72).optional(),
  nueva: z.string().min(1).max(72),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const forzado = user.app_metadata?.debe_cambiar_clave === true;
  const tieneClave = (user.identities ?? []).some((i) => i.provider === 'email');
  if (!forzado && tieneClave) {
    if (!p.data.actual || !user.email) {
      return NextResponse.json({ error: 'falta_actual', message: 'Escribe tu contraseña actual.' }, { status: 400 });
    }
    // Se comprueba con un cliente aparte para no tocar las cookies de la sesión.
    const prueba = clienteSinCookies(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await prueba.auth.signInWithPassword({ email: user.email, password: p.data.actual });
    if (error) {
      return NextResponse.json({ error: 'actual_incorrecta', message: 'La contraseña actual no es correcta.' }, { status: 400 });
    }
    await prueba.auth.signOut().catch(() => {});
    if (p.data.actual === p.data.nueva) {
      return NextResponse.json({ error: 'igual', message: 'La nueva contraseña debe ser distinta de la actual.' }, { status: 400 });
    }
  }
  try {
    await fijarMiClave(user.id, p.data.nueva);
    // El token nuevo trae el app_metadata actualizado: sin esto, el
    // middleware seguiría mandándolo a cambiar la contraseña hasta que
    // la sesión se renueve sola.
    await supabase.auth.refreshSession().catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErrorDeGestion) return NextResponse.json({ error: e.codigo, message: e.message }, { status: 400 });
    return NextResponse.json({ error: 'fallo', message: 'No se pudo cambiar la contraseña.' }, { status: 500 });
  }
}
