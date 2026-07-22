import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { GeneratorPerfil } from '@/lib/ai/generator-perfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  perfil: z.enum([
    'area_usuaria',
    'dec',
    'area_legal',
    'titular_entidad',
    'aga',
    'fiscalizacion',
  ]),
  law_filter: z.array(z.enum(['ley_32069', 'ley_30225'])).optional(),
});

/** POST — crea una conversación nueva del generador */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { perfil, law_filter } = parsed.data;

  const { data, error } = await supabase
    .from('generator_conversations')
    .insert({
      user_id: user.id,
      perfil: perfil as GeneratorPerfil,
      law_filter: law_filter || null,
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

/** GET — lista conversaciones del usuario (con últimos 30) */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('generator_conversations')
    .select('id, title, perfil, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30);

  return NextResponse.json({ items: data || [] });
}
