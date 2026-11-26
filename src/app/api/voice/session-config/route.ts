import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import {
  VOICE_MODEL_ID,
  buildVoiceSystemPrompt,
  buildVoiceInitialGreeting,
  DISCLAIMER_VERSION,
  REGIMEN_DE_VOZ,
} from '@/lib/ai/voice-config';
import { respuestaDeRechazo, usarHerramienta } from '@/lib/billing/creditos';
import { cerrarLlamada, DURACION_MAXIMA_SEGUNDOS } from '@/lib/voice/llamadas';
import { crearTokenDeVoz, HERRAMIENTAS_DE_VOZ } from '@/lib/voice/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Reconexiones por llamada: Google corta cada ~10 min; una llamada de 2 h necesita ~12. */
const MAX_RENOVACIONES = 40;

/**
 * POST /api/voice/session-config
 * Prepara la sesión de Gemini Live que el navegador abre directamente.
 *
 * Antes se entregaba la API key del servidor: la misma del chat, los
 * embeddings y la Files API (auditoría del 26/11/2026, S2). Ahora se
 * entrega un token efímero de un solo uso con el modelo, el prompt, la voz
 * y la herramienta fijados (ver `src/lib/voice/token.ts`).
 *
 * Body:
 *   { call_id }                 — primera vez: entrega la configuración y
 *                                 el token, y arranca el reloj de cobro
 *                                 (`started_at`).
 *   { call_id, renovar: true }  — en cada reconexión: solo un token nuevo.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { call_id?: string; renovar?: boolean };
  if (!body.call_id) {
    return NextResponse.json({ error: 'missing_call_id' }, { status: 400 });
  }

  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id, status, voice_id, started_at, metadata')
    .eq('id', body.call_id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });
  const llamada = call as {
    id: string;
    user_id: string;
    status: string;
    voice_id: string;
    started_at: string;
    metadata: Record<string, unknown> | null;
  };
  if (llamada.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (llamada.status !== 'active') {
    return NextResponse.json({ error: 'call_not_active' }, { status: 400 });
  }

  // La voz responde solo sobre la Ley 32069 (César, 27/09/2026).
  const lawFilter = REGIMEN_DE_VOZ;
  const systemInstruction = buildVoiceSystemPrompt(lawFilter);
  const admin = createAdminClient();
  const metadata = llamada.metadata ?? {};

  // ── Reconexión: un token nuevo para la misma sesión ──────────────────
  if (body.renovar) {
    const renovaciones = Number(metadata.token_renovaciones ?? 0);
    const vence = new Date(new Date(llamada.started_at).getTime() + DURACION_MAXIMA_SEGUNDOS * 1000);
    if (!metadata.token_emitido_at || renovaciones >= MAX_RENOVACIONES || vence.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'renovacion_no_permitida' }, { status: 409 });
    }
    await admin
      .from('voice_calls')
      .update({ metadata: { ...metadata, token_renovaciones: renovaciones + 1 } } as never)
      .eq('id', llamada.id);
    try {
      const token = await crearTokenDeVoz({ voiceId: llamada.voice_id, systemInstruction, vence });
      return NextResponse.json({ token });
    } catch (e) {
      console.error('[voice/session-config] no se pudo renovar el token', (e as Error).message);
      return NextResponse.json({ error: 'session_unavailable' }, { status: 502 });
    }
  }

  // ── Primera vez ──────────────────────────────────────────────────────
  // El plan también se comprueba aquí, no solo al crear la llamada.
  const guard = await usarHerramienta(user.id, 'consulta_voz', { soloComprobar: true });
  if (!guard.ok) return respuestaDeRechazo(guard);

  const { data: consent } = await supabase
    .from('voice_consents')
    .select('id')
    .eq('user_id', user.id)
    .eq('disclaimer_version', DISCLAIMER_VERSION)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!consent) {
    return NextResponse.json({ error: 'consent_required' }, { status: 403 });
  }

  // Una sesión por llamada: se reserva antes de pedir el token, para que
  // dos pedidos a la vez no saquen dos. El reloj de cobro empieza aquí.
  const ahora = new Date();
  const { data: reservada } = await admin
    .from('voice_calls')
    .update({
      started_at: ahora.toISOString(),
      metadata: { ...metadata, token_emitido_at: ahora.toISOString(), token_renovaciones: 0 },
    } as never)
    .eq('id', llamada.id)
    .eq('status', 'active')
    .is('metadata->>token_emitido_at', null)
    .select('id');
  if (!reservada || reservada.length === 0) {
    return NextResponse.json(
      { error: 'sesion_ya_entregada', detail: 'Esta llamada ya tiene su sesión. Inicia una llamada nueva.' },
      { status: 409 },
    );
  }

  let token: string;
  try {
    token = await crearTokenDeVoz({
      voiceId: llamada.voice_id,
      systemInstruction,
      vence: new Date(ahora.getTime() + DURACION_MAXIMA_SEGUNDOS * 1000),
    });
  } catch (e) {
    console.error('[voice/session-config] no se pudo crear el token', (e as Error).message);
    // Sin sesión no hubo llamada: se cierra sin cobrar (dura ~0 s).
    await cerrarLlamada(admin, { id: llamada.id, user_id: llamada.user_id, started_at: ahora.toISOString() }, {
      estado: 'failed',
      fin: new Date(),
    });
    return NextResponse.json({ error: 'session_unavailable' }, { status: 502 });
  }

  return NextResponse.json({
    token,
    model: VOICE_MODEL_ID,
    voice_id: llamada.voice_id,
    system_instruction: systemInstruction,
    initial_greeting: buildVoiceInitialGreeting(lawFilter),
    tools: HERRAMIENTAS_DE_VOZ,
  });
}
