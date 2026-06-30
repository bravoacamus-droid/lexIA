import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { DISCLAIMER_VERSION } from '@/lib/ai/voice-config';
import { ensureCanUse } from '@/lib/billing/feature-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  voice_id: z.enum(['Aoede', 'Puck', 'Charon', 'Kore']).optional().default('Aoede'),
  /**
   * Filtro de ley aplicable para el RAG de esta llamada. Array vacío
   * o ausente = sin filtro (busca en ambas leyes). Valores válidos:
   * 'ley_32069', 'ley_30225'.
   */
  law_filter: z
    .array(z.enum(['ley_32069', 'ley_30225']))
    .optional(),
});

/**
 * POST /api/voice/calls
 * Crea una nueva llamada (status='active').
 * Valida que el usuario tenga consentimiento aceptado.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Feature gate: ¿el plan del usuario incluye llamadas y tiene cuota?
  const guard = await ensureCanUse(user.id, 'voice_call_minute');
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status });
  }

  // Verificar consentimiento vigente
  const { data: consent } = await supabase
    .from('voice_consents')
    .select('id, disclaimer_version, accepted_at')
    .eq('user_id', user.id)
    .eq('disclaimer_version', DISCLAIMER_VERSION)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!consent) {
    return NextResponse.json(
      {
        error: 'consent_required',
        detail:
          'Debes aceptar el aviso de privacidad de Llamadas con el Abogado Virtual antes de iniciar una llamada.',
        required_disclaimer_version: DISCLAIMER_VERSION,
      },
      { status: 403 },
    );
  }

  // Crear llamada
  const lawFilter =
    parsed.data.law_filter && parsed.data.law_filter.length > 0
      ? parsed.data.law_filter
      : null;
  const { data, error } = await supabase
    .from('voice_calls')
    .insert({
      user_id: user.id,
      voice_id: parsed.data.voice_id,
      status: 'active',
      law_filter: lawFilter,
    } as never)
    .select('id, voice_id, started_at, law_filter')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'insert_failed', detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    call: data,
    consent_version: consent.disclaimer_version,
  });
}

/**
 * GET /api/voice/calls
 * Lista las llamadas del usuario (más recientes primero).
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('voice_calls')
    .select(
      'id, status, voice_id, started_at, ended_at, duration_seconds, summary, rag_queries_count, cited_documents, user_rating',
    )
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ calls: data || [] });
}
