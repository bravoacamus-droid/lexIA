import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  normalizarRespuestas,
  type RespuestasRequerimiento,
} from '@/lib/generadores/ensamblador';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lo que se guarda; todo opcional para permitir guardado incremental. */
const ActualizarSchema = z.object({
  denominacion: z.string().min(2).max(500).optional(),
  cuantia: z.number().positive().nullable().optional(),
  monto_contrato: z.number().positive().nullable().optional(),
  status: z.enum(['draft', 'review', 'final', 'archived']).optional(),
  respuestas: z
    .object({
      campos: z.record(z.string()).optional(),
      redacciones: z.record(z.string()).optional(),
      opciones: z.record(z.string()).optional(),
      tablas: z.record(z.array(z.array(z.string()))).optional(),
      condiciones: z.record(z.boolean()).optional(),
    })
    .optional(),
});

interface Fila {
  id: string;
  user_id: string;
  plantilla_id: string;
  denominacion: string;
  cuantia: number | null;
  monto_contrato: number | null;
  status: string;
  respuestas: Partial<RespuestasRequerimiento>;
  created_at: string;
  updated_at: string;
}

async function cargar(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };

  const { data, error } = await supabase
    .from('requerimientos_plantilla')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!data) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) };

  const fila = data as Fila;
  // RLS ya lo impediría, pero un 403 explícito evita depender de una sola
  // capa para algo que no debe fallar nunca.
  if (fila.user_id !== user.id) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { supabase, user, fila };
}

/**
 * GET /api/generadores/requerimientos/[id]
 *
 * Devuelve la plantilla, las respuestas y el estado del documento: qué
 * falta, qué secciones quedaron fuera y qué topes se incumplen. La
 * interfaz no recalcula nada de eso por su cuenta, para que el aviso que
 * ve el usuario y el que se aplica al exportar sean el mismo.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const r = await cargar(ctx.params.id);
  if ('error' in r) return r.error;

  const plantilla = obtenerPlantilla(r.fila.plantilla_id);
  if (!plantilla) {
    return NextResponse.json(
      { error: 'plantilla_desconocida', detail: r.fila.plantilla_id },
      { status: 500 },
    );
  }

  const respuestas = normalizarRespuestas(r.fila.respuestas);
  const doc = ensamblarRequerimiento(plantilla, respuestas, {
    cuantia: r.fila.cuantia ?? undefined,
    montoContrato: r.fila.monto_contrato ?? undefined,
  });

  return NextResponse.json({
    requerimiento: {
      id: r.fila.id,
      plantilla_id: r.fila.plantilla_id,
      denominacion: r.fila.denominacion,
      cuantia: r.fila.cuantia,
      monto_contrato: r.fila.monto_contrato,
      status: r.fila.status,
      respuestas,
      created_at: r.fila.created_at,
      updated_at: r.fila.updated_at,
    },
    plantilla,
    estado: {
      faltantes: doc.faltantes,
      avisos: doc.avisos,
      omitidas: doc.omitidas,
    },
    vista_previa: doc.markdown,
  });
}

/** PATCH — guardado incremental de las respuestas. */
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const r = await cargar(ctx.params.id);
  if ('error' in r) return r.error;

  const parsed = ActualizarSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cambios: Record<string, unknown> = {};
  if (parsed.data.denominacion !== undefined) cambios.denominacion = parsed.data.denominacion;
  if (parsed.data.cuantia !== undefined) cambios.cuantia = parsed.data.cuantia;
  if (parsed.data.monto_contrato !== undefined) cambios.monto_contrato = parsed.data.monto_contrato;
  if (parsed.data.status !== undefined) cambios.status = parsed.data.status;

  if (parsed.data.respuestas) {
    // Fusión por grupo, no reemplazo: la interfaz manda solo lo que el
    // usuario tocó, y dos pestañas abiertas no deben borrarse el trabajo
    // la una a la otra.
    const previas = normalizarRespuestas(r.fila.respuestas);
    const nuevas = parsed.data.respuestas;
    cambios.respuestas = {
      campos: { ...previas.campos, ...(nuevas.campos ?? {}) },
      redacciones: { ...previas.redacciones, ...(nuevas.redacciones ?? {}) },
      opciones: { ...previas.opciones, ...(nuevas.opciones ?? {}) },
      tablas: { ...previas.tablas, ...(nuevas.tablas ?? {}) },
      condiciones: { ...previas.condiciones, ...(nuevas.condiciones ?? {}) },
    };
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ ok: true, sin_cambios: true });
  }

  const { error } = await r.supabase
    .from('requerimientos_plantilla')
    .update(cambios)
    .eq('id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE — borrado del requerimiento. */
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const r = await cargar(ctx.params.id);
  if ('error' in r) return r.error;

  const { error } = await r.supabase
    .from('requerimientos_plantilla')
    .delete()
    .eq('id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
