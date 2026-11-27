import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { tienePermiso } from '@/lib/auth/permisos-servidor';
import { asignarPlan, listarCuentas, recargar, servicio, suspender } from '@/lib/billing/gestion';

/**
 * Panel de planes (permiso «planes»: administrador o superadmin). Mientras no haya cobro en
 * línea, aquí se activan los planes y las recargas que el cliente pide
 * por WhatsApp.
 */
async function administrador() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return (await tienePermiso(servicio(), user.id, 'planes')) ? user : null;
}

export async function GET() {
  const user = await administrador();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ cuentas: await listarCuentas() });
}

const Accion = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('asignar'),
    userId: z.string().uuid(),
    plan: z.enum(['prueba', 'consulta', 'profesional', 'especialista', 'equipos', 'organizaciones']),
    modalidad: z.enum(['mensual', 'anual']).default('mensual'),
    meses: z.number().int().min(1).max(60).nullable().default(1),
    creditosMes: z.number().int().min(0).max(1_000_000).optional(),
    maxUsuarios: z.number().int().min(1).max(500).optional(),
    nombreEquipo: z.string().max(120).optional(),
  }),
  z.object({
    accion: z.literal('recargar'),
    userId: z.string().uuid(),
    creditos: z.number().int().min(1).max(1_000_000),
    detalle: z.string().max(200).optional(),
  }),
  z.object({ accion: z.literal('suspender'), userId: z.string().uuid(), suspendido: z.boolean() }),
]);

export async function POST(req: Request) {
  const user = await administrador();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const p = Accion.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: 'invalid_payload', detail: p.error.flatten() }, { status: 400 });
  }
  try {
    const a = p.data;
    if (a.accion === 'asignar') {
      await asignarPlan({ ...a, hechoPor: user.id });
    } else if (a.accion === 'recargar') {
      await recargar({ userId: a.userId, creditos: a.creditos, detalle: a.detalle, hechoPor: user.id });
    } else {
      await suspender({ userId: a.userId, suspendido: a.suspendido });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'fallo', message: (e as Error).message }, { status: 400 });
  }
}
