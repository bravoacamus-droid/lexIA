import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { usuarioConPermiso } from '@/lib/auth/permisos-servidor';
import { subidosRecientemente } from '@/lib/biblioteca/subir';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/** Lo último que se subió desde el panel (permiso «biblioteca»). */
export async function GET() {
  const yo = await usuarioConPermiso('biblioteca');
  if (!yo) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ documentos: await subidosRecientemente(createAdminClient()) });
}
