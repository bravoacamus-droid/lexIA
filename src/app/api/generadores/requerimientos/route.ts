import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { catalogoPlantillas, obtenerPlantilla } from '@/lib/generadores/plantillas';
import { ensureCanUse } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Requerimientos armados desde las plantillas oficiales que entregó
 * César, a diferencia de /api/requerimientos, que sigue el modelo
 * anterior de cláusulas de texto libre.
 *
 * Aquí se guardan las RESPUESTAS del usuario, no el documento: este se
 * rearma en cada exportación desde la plantilla vigente.
 */

const CrearSchema = z.object({
  plantilla_id: z.string().min(2).max(80),
  denominacion: z.string().min(2).max(500),
  cuantia: z.number().positive().optional(),
  monto_contrato: z.number().positive().optional(),
});

/** GET /api/generadores/requerimientos — listado del usuario + catálogo. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('requerimientos_plantilla')
    .select('id, plantilla_id, denominacion, status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    requerimientos: data ?? [],
    plantillas: catalogoPlantillas(),
  });
}

/** POST /api/generadores/requerimientos — crear uno nuevo. */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const guard = await ensureCanUse(user.id, 'generator_call');
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });

  const parsed = CrearSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Que la plantilla exista se comprueba aquí y no en la base: viven en
  // el repositorio, porque son código auditable contra los .docx.
  const plantilla = obtenerPlantilla(parsed.data.plantilla_id);
  if (!plantilla) {
    return NextResponse.json(
      { error: 'plantilla_desconocida', detail: parsed.data.plantilla_id },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('requerimientos_plantilla')
    .insert({
      user_id: user.id,
      plantilla_id: plantilla.id,
      denominacion: parsed.data.denominacion,
      cuantia: parsed.data.cuantia ?? null,
      monto_contrato: parsed.data.monto_contrato ?? null,
      respuestas: { campos: {}, redacciones: {}, opciones: {}, tablas: {}, condiciones: {} },
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
