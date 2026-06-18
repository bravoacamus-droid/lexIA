import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getInitialClauses,
  type ObjectoContractual,
} from '@/lib/requerimientos/catalog';
import { ensureCanUse } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  anio: z.number().int().min(2024).max(2100),
  objeto: z.enum(['bien', 'servicio', 'obra', 'consultoria_obra']),
  area_usuaria: z.string().max(160).optional(),
  denominacion: z.string().min(2).max(500),
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
  const { anio, objeto, area_usuaria, denominacion } = parsed.data;

  // Inicializar cláusulas vacías según objeto
  const clauses = getInitialClauses(objeto as ObjectoContractual);

  const { data, error } = await supabase
    .from('entity_requirements')
    .insert({
      user_id: user.id,
      anio,
      objeto,
      area_usuaria: area_usuaria || null,
      denominacion,
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
