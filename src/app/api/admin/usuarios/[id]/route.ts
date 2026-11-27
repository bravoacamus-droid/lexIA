import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioConPermiso } from '@/lib/auth/permisos-servidor';
import { cambiarCuenta, historialDe, restablecerClave, suspenderAcceso } from '@/lib/usuarios/gestion';
import { Herramientas, Perfil, Rol, respuestaDeError } from '../esquemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Id = z.string().uuid();

/** Historial de lo que el equipo hizo con esta cuenta. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const yo = await usuarioConPermiso('usuarios');
  if (!yo) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!Id.safeParse(params.id).success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  return NextResponse.json({ historial: await historialDe(params.id) });
}

const Accion = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('cambiar'),
    nombre: z.string().trim().min(2).max(120).optional(),
    organizacion: z.string().trim().max(160).nullable().optional(),
    cargo: z.string().trim().max(120).nullable().optional(),
    perfil: Perfil.optional(),
    rol: Rol.optional(),
    herramientasExtra: Herramientas.optional(),
    herramientasQuitadas: Herramientas.optional(),
    nota: z.string().max(500).nullable().optional(),
  }),
  z.object({ accion: z.literal('restablecer_clave') }),
  z.object({ accion: z.literal('suspender'), suspendido: z.boolean() }),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const yo = await usuarioConPermiso('usuarios');
  if (!yo) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!Id.safeParse(params.id).success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const p = Accion.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload', detail: p.error.flatten() }, { status: 400 });
  try {
    const a = p.data;
    if (a.accion === 'cambiar') {
      const { accion: _accion, ...cambios } = a;
      await cambiarCuenta(yo.id, params.id, cambios);
      return NextResponse.json({ ok: true });
    }
    if (a.accion === 'restablecer_clave') {
      return NextResponse.json({ ok: true, ...(await restablecerClave(yo.id, params.id)) });
    }
    await suspenderAcceso(yo.id, params.id, a.suspendido);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
}
