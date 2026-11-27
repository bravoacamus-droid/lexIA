import { NextResponse } from 'next/server';
import { z } from 'zod';
import { respuestaDeRechazo, usarHerramienta } from '@/lib/billing/creditos';
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
    .object({
      nivel: z.enum(['diagnostico', 'borrador_condicionado', 'revision_final']),
      // «Informe que evalúa y descarta motivadamente» la figura pedida
      // cuando el análisis concluye que no corresponde (César, 27/09/2026).
      enfoque: z.enum(['descarte']).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  // Se cobra antes de redactar y se devuelve si la redacción falla.
  const cobro = await usarHerramienta(s.user.id, 'documentos_ejecucion', { detalle: `actuación ${params.aid}` });
  if (!cobro.ok) return respuestaDeRechazo(cobro);
  try {
    await redactar(s.supabase, params.id, params.aid, p.data.nivel, { id: s.user.id, nombre: s.nombre }, p.data.enfoque);
    return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
  } catch (e) {
    await cobro.reembolsar('la redacción falló');
    return fallo(e);
  }
}
