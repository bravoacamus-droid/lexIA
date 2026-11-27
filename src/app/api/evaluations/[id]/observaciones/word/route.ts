/**
 * POST /api/evaluations/[id]/observaciones/word
 *
 * El Word con SOLO las observaciones seleccionadas (reunión con César del
 * 27/11/2026): las de la IA con lo que el usuario editó y las que añadió a
 * mano, en el orden en que llegan los ids. Forma del pliego de César
 * (`informe-observaciones.ts`). No cobra.
 *
 * Cuerpo: { ids: string[], caratula?: CaratulaDelWord }
 * Respuesta: el .docx.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cabeceraDescarga, nombreDeArchivo } from '@/lib/descargas/nombre-archivo';
import { cargarEvaluacionDeRequerimiento } from '@/lib/evaluacion/requerimiento/cargar';
import { CaratulaZ } from '@/lib/evaluacion/requerimiento/esquemas';
import { observacionesADocx } from '@/lib/evaluacion/requerimiento/informe-observaciones';
import { conEdicion } from '@/lib/evaluacion/requerimiento/observaciones';
import type { HallazgoDeAuditoria } from '@/lib/evaluacion/auditoria-tdr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Cuerpo = z.object({
  ids: z.array(z.string().regex(/^[\w-]{1,100}$/)).min(1).max(300),
  caratula: CaratulaZ.optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const c = await cargarEvaluacionDeRequerimiento(ctx.params.id);
  if ('error' in c) return c.error;
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload', message: 'Selecciona al menos una observación.' }, { status: 400 });

  const r = c.ev.result;
  const porId = new Map<string, HallazgoDeAuditoria>();
  for (const h of r.hallazgos ?? []) porId.set(h.id, conEdicion(h, r.ediciones?.[h.id]));
  for (const m of r.manuales ?? []) porId.set(m.id, m);
  const elegidas = Array.from(new Set(p.data.ids))
    .map((id) => porId.get(id))
    .filter((h): h is HallazgoDeAuditoria => !!h);
  if (elegidas.length === 0) {
    return NextResponse.json({ error: 'sin_seleccion', message: 'Ninguna de las observaciones seleccionadas existe.' }, { status: 400 });
  }

  const denominacion = (r.denominacion?.trim() || c.ev.title).trim();
  const buffer = await observacionesADocx({ denominacion, observaciones: elegidas, caratula: p.data.caratula });
  const nombre = `${nombreDeArchivo(`Observaciones — ${denominacion}`, 'Observaciones al requerimiento', 80)}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': cabeceraDescarga(nombre),
    },
  });
}
