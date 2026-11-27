import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ErrorDeGestion } from '@/lib/usuarios/gestion';
import { COSTO, type Herramienta } from '@/lib/billing/creditos';

/** Lo que comparten las rutas de /api/admin/usuarios. */

const HERRAMIENTAS = Object.keys(COSTO) as [Herramienta, ...Herramienta[]];
export const Herramientas = z.array(z.enum(HERRAMIENTAS)).max(HERRAMIENTAS.length);
export const Rol = z.enum(['usuario', 'soporte', 'bibliotecario', 'administrador', 'superadmin']);
export const Perfil = z.enum(['entity', 'provider', 'consultant']);
export const Plan = z.enum(['prueba', 'consulta', 'profesional', 'especialista', 'equipos', 'organizaciones']);

/** Errores de la gestión → respuesta con mensaje para el panel. */
export function respuestaDeError(e: unknown) {
  if (e instanceof ErrorDeGestion) {
    const status =
      e.codigo === 'sin_permiso' || e.codigo === 'rol_no_permitido'
        ? 403
        : e.codigo === 'ya_existe'
          ? 409
          : e.codigo === 'no_existe'
            ? 404
            : 400;
    return NextResponse.json({ error: e.codigo, message: e.message, ...e.extra }, { status });
  }
  console.error('[admin/usuarios]', e);
  return NextResponse.json({ error: 'fallo', message: 'No se pudo completar la acción.' }, { status: 500 });
}
