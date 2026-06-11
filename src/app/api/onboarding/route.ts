import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Schema permisivo: convierte cadenas vacías a null antes de validar.
 * Esto evita falsos negativos cuando el cliente envía "" (string vacío)
 * en lugar de null para campos opcionales.
 */
const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? null : v;

const schema = z.object({
  profile_role: z.enum(['entity', 'provider', 'consultant']),
  full_name: z.string().trim().min(1).max(120),
  organization_name: z.string().trim().min(1).max(160),
  // RUC: solo se valida si viene con valor; "" o null se aceptan como vacío.
  // El regex se relaja a "1-11 dígitos" para no rechazar RUCs incompletos
  // (se persisten igualmente; la validación de RUC formal es responsabilidad
  // del usuario al usarlo en documentos legales).
  ruc: z.preprocess(
    emptyToNull,
    z.string().trim().regex(/^\d{1,11}$/, 'RUC debe contener solo dígitos').nullable().optional(),
  ),
  position_title: z.preprocess(
    emptyToNull,
    z.string().trim().max(120).nullable().optional(),
  ),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const v = parsed.data;

  const { error } = await supabase
    .from('profiles')
    .update({
      profile_role: v.profile_role,
      full_name: v.full_name,
      organization_name: v.organization_name,
      ruc: v.ruc ?? null,
      position_title: v.position_title ?? null,
      onboarding_completed: true,
    } as never)
    .eq('id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'update_failed', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
