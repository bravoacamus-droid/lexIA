import { NextResponse } from 'next/server';
import { z } from 'zod';
import { estadoDelExpediente, fallo, sesion } from '@/lib/ejecucion/api';
import { cargarExpediente, leerPendientes } from '@/lib/ejecucion/servicio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Leer un escaneo con OCR puede tomar un par de minutos.
export const maxDuration = 300;

const Cuerpo = z.object({
  archivos: z.array(z.object({ nombre: z.string().min(1).max(260), ruta: z.string().min(3).max(600) })).min(1).max(30),
  /** La versión oficial de un borrador de LexIA (sección 6). */
  versionDe: z.string().uuid().optional(),
});

/** Añade documentos al expediente y los lee. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  if (p.data.archivos.some((a) => !a.ruta.startsWith(`${s.user.id}/`)))
    return NextResponse.json({ error: 'ruta_ajena' }, { status: 403 });

  const { data: exp } = await s.supabase.from('expedientes').select('id').eq('id', params.id).maybeSingle();
  if (!exp) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { error } = await s.supabase.from('expediente_documentos').insert(
    p.data.archivos.map((a) => ({
      expediente_id: params.id,
      user_id: s.user.id,
      nombre: a.nombre,
      ruta: a.ruta,
      // La versión firmada de un borrador entra como presentada.
      estado: p.data.versionDe ? 'presentado' : 'original',
      version_de: p.data.versionDe ?? null,
    })),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const c = await cargarExpediente(s.supabase, params.id);
    if (c) await leerPendientes(s.supabase, c.documentos, s.user.id);
    await s.supabase.from('expedientes').update({ updated_at: new Date().toISOString() }).eq('id', params.id);
    return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
  } catch (e) {
    return fallo(e);
  }
}
