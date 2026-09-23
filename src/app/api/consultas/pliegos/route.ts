import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Nuevo = z.object({
  cara: z.enum(['formulacion', 'absolucion']),
  procedimiento: z.string().max(400).default(''),
  numeroProcedimiento: z.string().max(120).default(''),
  objeto: z.string().max(4000).default(''),
  participante: z.string().max(300).default(''),
});

/** POST — abre un pliego nuevo, de una cara o de la otra. */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const cuerpo = await req.json().catch(() => null);
  const leido = Nuevo.safeParse(cuerpo);
  if (!leido.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: leido.error.flatten() },
      { status: 400 },
    );
  }
  const d = leido.data;

  const { data, error } = await supabase
    .from('pliegos_consultas')
    .insert({
      user_id: user.id,
      cara: d.cara,
      procedimiento: d.procedimiento,
      numero_procedimiento: d.numeroProcedimiento,
      objeto: d.objeto,
      participante: d.participante,
    } as never)
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'insert_failed', detail: error?.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id });
}
