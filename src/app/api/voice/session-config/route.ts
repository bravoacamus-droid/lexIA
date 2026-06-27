import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  VOICE_MODEL_ID,
  VOICE_SYSTEM_PROMPT,
  DISCLAIMER_VERSION,
} from '@/lib/ai/voice-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/voice/session-config
 * Devuelve la configuración necesaria para que el cliente abra una
 * sesión de Gemini Live API directamente desde el navegador.
 *
 * Por simplicidad MVP entregamos la API key restringida directamente.
 * Trade-off documentado:
 *   - PRO: setup mínimo, funciona en Vercel sin servicio extra.
 *   - CON: la API key es visible en el navegador del usuario
 *     autenticado.
 * Mitigación:
 *   - La API key tiene restricciones de servicio (solo Gemini API).
 *   - Solo usuarios autenticados de LexIA pueden obtenerla.
 *   - Cuota mensual por feature gate (Día 7).
 *   - Para producción a gran escala, migrar a backend proxy o
 *     ephemeral tokens cuando Gemini Live los soporte.
 *
 * Body: { call_id: string }  — identificador de la llamada ya creada
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Validar consentimiento vigente
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

  const body = (await req.json().catch(() => ({}))) as { call_id?: string };
  if (!body.call_id) {
    return NextResponse.json({ error: 'missing_call_id' }, { status: 400 });
  }

  // Validar que la llamada exista y sea del usuario
  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, status, voice_id')
    .eq('id', body.call_id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });
  if ((call as { user_id?: string; status: string }).status !== 'active') {
    return NextResponse.json({ error: 'call_not_active' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
  }

  return NextResponse.json({
    api_key: apiKey,
    model: VOICE_MODEL_ID,
    voice_id: (call as { voice_id: string }).voice_id,
    system_instruction: VOICE_SYSTEM_PROMPT,
    tools: [
      {
        functionDeclarations: [
          {
            name: 'search_normativa',
            description:
              'Busca en la base normativa de LexIA. Devuelve los fragmentos más relevantes con su cita. USAR ANTES de citar cualquier norma.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Palabras clave o pregunta específica',
                },
                filter_type: {
                  type: 'string',
                  description:
                    'Opcional: ley, reglamento, directiva, opinion, pronunciamiento, resolucion, resolucion_tce, lineamiento',
                  nullable: true,
                },
              },
              required: ['query'],
            },
          },
        ],
      },
    ],
  });
}
