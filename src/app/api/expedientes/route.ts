import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureCanUse } from '@/lib/billing/feature-gate';
import { ORDEN_ACTUACIONES } from '@/lib/ejecucion/catalogo';
import { perfilPermitido, sesion } from '@/lib/ejecucion/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Los expedientes contractuales del generador de ejecución.
 *
 * GET  — los del usuario, con su última actuación.
 * POST — uno nuevo, con el perfil que emite, lo que hay que resolver y
 *        los archivos que ya subió el navegador al bucket.
 */

const Archivo = z.object({ nombre: z.string().min(1).max(260), ruta: z.string().min(3).max(600) });

const Crear = z.object({
  perfil: z.string(),
  actuacion: z.enum(ORDEN_ACTUACIONES as [string, ...string[]]).nullable().optional(),
  pedido: z.string().max(4000).default(''),
  archivos: z.array(Archivo).max(30).default([]),
});

export async function GET() {
  const s = await sesion();
  if ('error' in s) return s.error;
  const { data, error } = await s.supabase
    .from('expedientes')
    .select('id, titulo, ficha, created_at, updated_at, expediente_actuaciones(id, perfil, actuacion, estado, analizada:analisis->>actuacion, procedencia:analisis->procedencia, updated_at), expediente_documentos(count)')
    .order('updated_at', { ascending: false })
    .limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expedientes: data ?? [] });
}

export async function POST(req: Request) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const guard = await ensureCanUse(s.user.id, 'generator_call');
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });

  const p = Crear.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload', detail: p.error.flatten() }, { status: 400 });
  const { perfil, actuacion, pedido, archivos } = p.data;
  if (!perfilPermitido(s.permitidos, perfil)) return NextResponse.json({ error: 'perfil_no_permitido' }, { status: 403 });
  if (!pedido.trim() && archivos.length === 0 && !actuacion)
    return NextResponse.json({ error: 'vacio', detail: 'Describe el caso o adjunta un documento.' }, { status: 400 });
  // Solo archivos de la carpeta del propio usuario.
  if (archivos.some((a) => !a.ruta.startsWith(`${s.user.id}/`)))
    return NextResponse.json({ error: 'ruta_ajena' }, { status: 403 });

  const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
  const { data: exp, error } = await s.supabase
    .from('expedientes')
    .insert({ user_id: s.user.id, titulo: `Nuevo expediente — ${hoy}` })
    .select('id')
    .single();
  if (error || !exp) return NextResponse.json({ error: error?.message ?? 'no se pudo crear' }, { status: 500 });
  const id = (exp as { id: string }).id;

  if (archivos.length) {
    const { error: e2 } = await s.supabase.from('expediente_documentos').insert(
      archivos.map((a) => ({ expediente_id: id, user_id: s.user.id, nombre: a.nombre, ruta: a.ruta })),
    );
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }
  const { data: act, error: e3 } = await s.supabase
    .from('expediente_actuaciones')
    .insert({ expediente_id: id, user_id: s.user.id, perfil, actuacion: actuacion ?? null, pedido: pedido.trim() })
    .select('id')
    .single();
  if (e3 || !act) return NextResponse.json({ error: e3?.message ?? 'no se pudo crear' }, { status: 500 });
  return NextResponse.json({ id, actuacionId: (act as { id: string }).id });
}
