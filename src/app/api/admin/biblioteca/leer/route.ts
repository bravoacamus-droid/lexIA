import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { usuarioConPermiso } from '@/lib/auth/permisos-servidor';
import { leerSubida } from '@/lib/biblioteca/subir';
import { respuestaDeError, rutaPropia } from '../comun';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Un escaneo se transcribe con Gemini.
export const maxDuration = 120;

/**
 * Lee el archivo recién subido y propone su ficha (tipo, número, título,
 * fecha); dice si ya está en la biblioteca. No escribe nada.
 */
const Cuerpo = z.object({ ruta: z.string().min(3).max(500) });

export async function POST(req: Request) {
  const yo = await usuarioConPermiso('biblioteca');
  if (!yo) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (!rutaPropia(p.data.ruta, yo.id)) return NextResponse.json({ error: 'forbidden', message: 'Archivo fuera de tu carpeta.' }, { status: 403 });
  try {
    return NextResponse.json(await leerSubida(createAdminClient(), p.data.ruta));
  } catch (e) {
    return respuestaDeError(e);
  }
}
