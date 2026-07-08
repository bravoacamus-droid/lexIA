import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getInitialClauses,
  type ObjectoContractual,
} from '@/lib/requerimientos/catalog';
import {
  applyTemplate,
  getTemplateById,
} from '@/lib/requerimientos/templates';
import {
  getBaseObjeto,
  SUBTIPO_META,
  type SubtipoRequerimiento,
} from '@/lib/requerimientos/subtipos';
import { ensureCanUse } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Se acepta `subtipo` (nuevo modelo jerárquico) O `objeto` (legacy).
// Si viene subtipo, derivamos objeto y regimen automáticamente.
const CreateSchema = z
  .object({
    anio: z.number().int().min(2024).max(2100),
    regimen: z.enum(['menor_8uit', 'seleccion']).optional(),
    subtipo: z
      .enum(
        Object.keys(SUBTIPO_META) as [SubtipoRequerimiento, ...SubtipoRequerimiento[]],
      )
      .optional(),
    objeto: z.enum(['bien', 'servicio', 'obra', 'consultoria_obra']).optional(),
    area_usuaria: z.string().max(160).optional(),
    denominacion: z.string().min(2).max(500),
    template_id: z.string().max(80).optional(),
  })
  .refine((d) => d.subtipo || d.objeto, {
    message: 'Debe proveerse subtipo o objeto',
    path: ['subtipo'],
  });

/** POST /api/requerimientos — crear nuevo requerimiento (paso 1) */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Feature gate (cuenta como una generación)
  const guard = await ensureCanUse(user.id, 'generator_call');
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { anio, subtipo, area_usuaria, denominacion, template_id } = parsed.data;

  // Derivamos objeto base + régimen a partir del subtipo cuando venga.
  // Legacy: si sólo mandan objeto, el subtipo queda null y régimen 'seleccion'.
  const objeto: ObjectoContractual = subtipo
    ? getBaseObjeto(subtipo)
    : (parsed.data.objeto as ObjectoContractual);
  const regimen = subtipo
    ? SUBTIPO_META[subtipo].key.startsWith('menor_')
      ? 'menor_8uit'
      : 'seleccion'
    : parsed.data.regimen || 'seleccion';

  // Si se eligió una plantilla y aplica al objeto seleccionado, la aplicamos.
  // Esto pre-rellena las cláusulas típicas.
  let clauses: unknown = getInitialClauses(objeto);
  const denominacionFinal = denominacion;
  let areaUsuariaFinal = area_usuaria || null;

  if (template_id) {
    const tpl = getTemplateById(template_id);
    if (tpl && tpl.objeto === objeto) {
      const applied = applyTemplate(tpl);
      clauses = applied.clauses;
      if (!area_usuaria) areaUsuariaFinal = applied.area_usuaria;
    }
  }

  const { data, error } = await supabase
    .from('entity_requirements')
    .insert({
      user_id: user.id,
      anio,
      regimen,
      subtipo: subtipo || null,
      objeto,
      area_usuaria: areaUsuariaFinal,
      denominacion: denominacionFinal,
      clauses: clauses as never,
      status: 'draft',
    } as never)
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'insert_failed', detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: (data as { id: string }).id });
}

/** GET /api/requerimientos — listar requerimientos del usuario */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('entity_requirements')
    .select('id, nro, anio, objeto, area_usuaria, denominacion, status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}
