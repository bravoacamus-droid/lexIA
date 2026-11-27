import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { usuarioConPermiso } from '@/lib/auth/permisos-servidor';
import { subirALaBiblioteca } from '@/lib/biblioteca/subir';
import { LEYES, TIPOS_SUBIBLES } from '@/lib/biblioteca/fichas';
import { respuestaDeError, rutaPropia } from '../comun';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Transcribir un escaneo, vectorizar cientos de fragmentos y resumir.
export const maxDuration = 300;

/** Agrega el documento a la biblioteca con la ficha confirmada (permiso «biblioteca»). */
const Cuerpo = z.object({
  ruta: z.string().min(3).max(500),
  ficha: z.object({
    tipo: z.enum(TIPOS_SUBIBLES as [string, ...string[]]),
    numero: z.string().trim().min(1).max(200),
    titulo: z.string().trim().min(1).max(500),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    ley: z.enum(LEYES),
    fuente: z.string().trim().url().max(1000).nullable().optional(),
  }),
});

export async function POST(req: Request) {
  const yo = await usuarioConPermiso('biblioteca');
  if (!yo) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: 'invalid_payload', message: 'Revisa los datos del documento.', detail: p.error.flatten() }, { status: 400 });
  }
  if (!rutaPropia(p.data.ruta, yo.id)) return NextResponse.json({ error: 'forbidden', message: 'Archivo fuera de tu carpeta.' }, { status: 403 });
  try {
    const r = await subirALaBiblioteca(createAdminClient(), {
      ruta: p.data.ruta,
      ficha: {
        tipo: p.data.ficha.tipo as (typeof TIPOS_SUBIBLES)[number],
        numero: p.data.ficha.numero,
        titulo: p.data.ficha.titulo,
        fecha: p.data.ficha.fecha ?? null,
        ley: p.data.ficha.ley,
        fuente: p.data.ficha.fuente ?? null,
      },
      actor: yo.id,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return respuestaDeError(e);
  }
}
