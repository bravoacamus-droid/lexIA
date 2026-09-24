import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureCanUse, recordUsage } from '@/lib/billing/feature-gate';
import { estadoDelExpediente, fallo, sesion } from '@/lib/ejecucion/api';
import { redactar } from '@/lib/ejecucion/servicio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Genera el documento en el nivel que el expediente permite (sección
 * 19) y lo audita en el acto (sección 16). Cuenta como una generación.
 */
export async function POST(req: Request, { params }: { params: { id: string; aid: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = z
    .object({ nivel: z.enum(['diagnostico', 'borrador_condicionado', 'revision_final']) })
    .safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const guard = await ensureCanUse(s.user.id, 'generator_call');
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  try {
    await redactar(s.supabase, params.id, params.aid, p.data.nivel, { id: s.user.id, nombre: s.nombre });
    await recordUsage(s.user.id, 'generator_call');
    return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
  } catch (e) {
    return fallo(e);
  }
}
