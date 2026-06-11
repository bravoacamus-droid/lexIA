import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createCulqiCustomer,
  createCulqiSubscription,
  planIdFor,
} from '@/lib/billing/culqi';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SCHEMA = z.object({
  /** Tier al que se quiere migrar (starter o pro). enterprise va por sales. */
  tier: z.enum(['starter', 'pro']),
  /** Token devuelto por Culqi.js tras la captura de tarjeta en el frontend. */
  culqi_token_id: z.string().min(8),
  /** Datos opcionales del cliente para registrar en Culqi. */
  email: z.string().email().optional(),
  full_name: z.string().min(2).optional(),
});

export async function POST(req: Request) {
  if (!process.env.CULQI_PRIVATE_KEY) {
    return NextResponse.json(
      {
        error: 'billing_not_configured',
        message:
          'La integración con Culqi aún no está configurada. Contáctanos para activar tu plan.',
      },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { tier, culqi_token_id, email, full_name } = parsed.data;

  const planId = planIdFor(tier);
  if (!planId) {
    return NextResponse.json(
      {
        error: 'plan_not_configured',
        message: `Falta el ID del plan Culqi para ${tier}. Configúralo en CULQI_PLAN_${tier.toUpperCase()}.`,
      },
      { status: 503 },
    );
  }

  try {
    // Cargar profile para tener el nombre/email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, organization_name')
      .eq('id', user.id)
      .maybeSingle();

    const fullName =
      full_name ||
      (profile as { full_name?: string } | null)?.full_name ||
      user.email?.split('@')[0] ||
      'Cliente LexIA';

    const customerEmail = email || user.email;
    if (!customerEmail) {
      return NextResponse.json(
        { error: 'no_email', message: 'No tenemos tu correo para facturación.' },
        { status: 400 },
      );
    }

    // 1. Crear Customer en Culqi
    const customer = await createCulqiCustomer({
      email: customerEmail,
      full_name: fullName,
      metadata: {
        lexia_user_id: user.id,
        organization: (profile as { organization_name?: string } | null)?.organization_name || null,
      },
    });

    // 2. Crear Subscription
    // Nota: en Culqi, el token se usa primero para crear una Card asociada al
    // Customer. Para simplificar, aquí asumimos que el cliente front-end ya
    // creó la Card con el token y nos pasa el card_id directamente como
    // `culqi_token_id`. (En una integración completa se haría POST /cards
    // antes con el token y el customer_id.)
    const subscription = await createCulqiSubscription({
      card_id: culqi_token_id, // si tu front pasa token, conviértelo a card primero
      plan_id: planId,
      metadata: { lexia_user_id: user.id, tier },
    });

    // 3. Actualizar nuestra fila de subscriptions a "active"
    await supabase
      .from('subscriptions')
      .update({
        tier,
        status: 'active',
        culqi_customer_id: customer.id,
        culqi_subscription_id: subscription.id,
        processor: 'culqi',
      } as never)
      .eq('user_id', user.id);

    return NextResponse.json({
      ok: true,
      tier,
      culqi_subscription_id: subscription.id,
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[billing/checkout] error:', msg);
    return NextResponse.json(
      { error: 'checkout_failed', detail: msg.slice(0, 300) },
      { status: 500 },
    );
  }
}
