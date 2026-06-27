import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { DISCLAIMER_VERSION } from '@/lib/ai/voice-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ConsentSchema = z.object({
  accepted_ia_no_lawyer: z.literal(true),
  accepted_recording: z.literal(true),
  accepted_data_in_google_cloud: z.literal(true),
  accepted_no_confidential_third_party: z.literal(true),
});

/**
 * GET /api/voice/consent
 * Indica si el usuario ya aceptó la versión vigente del disclaimer.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('voice_consents')
    .select('id, disclaimer_version, accepted_at')
    .eq('user_id', user.id)
    .eq('disclaimer_version', DISCLAIMER_VERSION)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    has_consent: !!data,
    current_version: DISCLAIMER_VERSION,
    accepted: data || null,
  });
}

/**
 * POST /api/voice/consent
 * Registra el consentimiento del usuario. Las 4 casillas son obligatorias
 * (todas deben ser true). Guarda IP y user-agent para trazabilidad legal
 * conforme a Ley N° 29733 (Protección de Datos Personales).
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = ConsentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'consent_incomplete',
        detail:
          'Debes aceptar las 4 casillas obligatorias para usar Llamadas con el Abogado Virtual.',
      },
      { status: 400 },
    );
  }

  // Capturar IP y UA para audit log
  const ip =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const { data, error } = await supabase
    .from('voice_consents')
    .insert({
      user_id: user.id,
      disclaimer_version: DISCLAIMER_VERSION,
      accepted_ia_no_lawyer: true,
      accepted_recording: true,
      accepted_data_in_google_cloud: true,
      accepted_no_confidential_third_party: true,
      accepted_ip: ip,
      accepted_user_agent: userAgent.slice(0, 500),
    } as never)
    .select('id, accepted_at')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'insert_failed', detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, consent: data });
}
