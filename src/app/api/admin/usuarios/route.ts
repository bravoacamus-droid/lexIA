import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioConPermiso } from '@/lib/auth/permisos-servidor';
import { rolesQuePuedeAsignar } from '@/lib/auth/permisos';
import { crearCuenta, listarEquipos, listarUsuarios } from '@/lib/usuarios/gestion';
import { Herramientas, Perfil, Plan, Rol, respuestaDeError } from './esquemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Cuentas creadas por el equipo (reunión con César, 27/11/2026). Permiso
 * «usuarios»: administrador o superadmin. Ver `src/lib/usuarios/gestion.ts`.
 */
export async function GET() {
  const yo = await usuarioConPermiso('usuarios');
  if (!yo) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const [usuarios, equipos] = await Promise.all([listarUsuarios(), listarEquipos()]);
    return NextResponse.json({
      usuarios,
      equipos,
      yo: { id: yo.id, rol: yo.rol, rolesAsignables: rolesQuePuedeAsignar(yo.rol) },
    });
  } catch (e) {
    return respuestaDeError(e);
  }
}

const CuentaNueva = z
  .object({
    email: z.string().trim().email().max(254),
    nombre: z.string().trim().min(2).max(120),
    organizacion: z.string().trim().max(160).optional(),
    cargo: z.string().trim().max(120).optional(),
    perfil: Perfil,
    rol: Rol.default('usuario'),
    clave: z.string().min(10).max(72).optional(),
    herramientasExtra: Herramientas.default([]),
    herramientasQuitadas: Herramientas.default([]),
    nota: z.string().max(500).optional(),
    plan: z
      .object({
        id: Plan,
        meses: z.number().int().min(1).max(60).nullable(),
        creditosMes: z.number().int().min(0).max(1_000_000).optional(),
        maxUsuarios: z.number().int().min(1).max(500).optional(),
        nombreEquipo: z.string().trim().max(120).optional(),
      })
      .optional(),
    equipoId: z.string().uuid().optional(),
  })
  .refine((d) => !(d.plan && d.equipoId), { message: 'O plan propio o equipo, no los dos.' });

export async function POST(req: Request) {
  const yo = await usuarioConPermiso('usuarios');
  if (!yo) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const p = CuentaNueva.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'Revisa los datos del formulario.', detail: p.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const r = await crearCuenta(yo.id, p.data);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return respuestaDeError(e);
  }
}
