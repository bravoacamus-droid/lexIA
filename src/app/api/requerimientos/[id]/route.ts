import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ClauseSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int(),
  included: z.boolean(),
  mode: z.enum(['manual', 'ai']),
  content: z.string(),
  ai_input: z.string().optional().default(''),
  is_custom: z.boolean().optional().default(false),
});

const EntregaSchema = z.object({
  id: z.string(),
  numero: z.number().int().min(1),
  descripcion: z.string().max(600),
  plazo_dias: z.number().int().min(1).max(9999).nullable(),
  monto_pen: z.number().min(0).nullable(),
  forma_pago: z.string().max(120),
});

const ItemSchema = z.object({
  id: z.string(),
  numero: z.number().int().min(1),
  codigo: z.string().max(40).nullable(),
  descripcion: z.string().max(500),
  unidad_medida: z.string().max(10),
  cantidad: z.number().min(0),
  precio_unitario_pen: z.number().min(0).nullable(),
  marca_modelo: z.string().max(120).nullable(),
});

const UpdateSchema = z.object({
  area_usuaria: z.string().max(160).optional().nullable(),
  denominacion: z.string().min(2).max(500).optional(),
  organo_unidad_organica: z.string().max(160).optional().nullable(),
  actividad_poi: z.string().max(500).optional().nullable(),
  clauses: z.array(ClauseSchema).optional(),
  entregas: z.array(EntregaSchema).max(100).optional(),
  items: z.array(ItemSchema).max(500).optional(),
  status: z.enum(['draft', 'review', 'final', 'archived']).optional(),
});

/** GET /api/requerimientos/[id] — leer */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('entity_requirements')
    .select('*')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((data as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ requirement: data });
}

/** PATCH /api/requerimientos/[id] — actualizar */
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verificar ownership antes
  const { data: existing } = await supabase
    .from('entity_requirements')
    .select('id, user_id')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((existing as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }

  const { error } = await supabase
    .from('entity_requirements')
    .update(update as never)
    .eq('id', ctx.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/requerimientos/[id] — eliminar */
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('entity_requirements')
    .select('user_id')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((existing as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('entity_requirements')
    .delete()
    .eq('id', ctx.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
