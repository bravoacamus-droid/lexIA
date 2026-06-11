import { NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { verifyCulqiSignature } from '@/lib/billing/culqi';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Webhook receiver de Culqi.
 *
 * Eventos relevantes para suscripciones (según docs):
 *   - subscription.created
 *   - subscription.activated
 *   - subscription.canceled
 *   - subscription.expired
 *   - charge.creation_succeeded (cobro recurrente exitoso)
 *   - charge.creation_failed   (cobro fallido — past_due)
 *
 * El header `culqi-signature` lleva el HMAC-SHA256 del body crudo.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('culqi-signature') || '';

  if (!process.env.CULQI_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'webhook_not_configured' },
      { status: 503 },
    );
  }

  if (!signature || !verifyCulqiSignature(rawBody, signature)) {
    console.error('[culqi-webhook] firma inválida');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event: {
    id?: string;
    type?: string;
    data?: {
      object?: Record<string, unknown>;
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventId = event.id || 'unknown';
  const eventType = event.type || 'unknown';
  const obj = event.data?.object || {};

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Idempotencia básica: si ya procesamos este eventId, no repetir
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('id, last_event_id')
    .eq('last_event_id', eventId)
    .maybeSingle();
  if (existingSub) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // Localizar nuestra fila por culqi_subscription_id o customer_id
  const culqiSubId = String(
    (obj as { subscription_id?: string; id?: string }).subscription_id ||
      (obj as { id?: string }).id ||
      '',
  );
  const culqiCustomerId = String((obj as { customer_id?: string }).customer_id || '');

  let subFilter = admin.from('subscriptions').select('id, user_id').limit(1);
  if (culqiSubId) {
    subFilter = subFilter.eq('culqi_subscription_id', culqiSubId);
  } else if (culqiCustomerId) {
    subFilter = subFilter.eq('culqi_customer_id', culqiCustomerId);
  } else {
    // Sin identificador → registramos el evento pero no actuamos.
    console.warn('[culqi-webhook] evento sin sub/customer id:', eventType);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: subRows } = await subFilter;
  const row = (subRows || [])[0] as { id: string; user_id: string } | undefined;
  if (!row) {
    console.warn('[culqi-webhook] no se encontró fila local para', culqiSubId || culqiCustomerId);
    return NextResponse.json({ ok: true, no_match: true });
  }

  // Mapping de evento → cambios
  const updates: Record<string, unknown> = {
    last_event_id: eventId,
    updated_at: new Date().toISOString(),
  };

  switch (eventType) {
    case 'subscription.activated':
    case 'subscription.created':
      updates.status = 'active';
      break;
    case 'subscription.canceled':
      updates.status = 'canceled';
      updates.cancel_at_period_end = false;
      break;
    case 'subscription.expired':
      updates.status = 'past_due';
      break;
    case 'charge.creation_succeeded':
      updates.status = 'active';
      updates.last_payment_at = new Date().toISOString();
      break;
    case 'charge.creation_failed':
      updates.status = 'past_due';
      break;
    default:
      // Evento informativo solo
      break;
  }

  await admin.from('subscriptions').update(updates as never).eq('id', row.id);

  // Log en subscription_events para audit completo
  await admin.from('subscription_events').insert({
    subscription_id: row.id,
    event_type: eventType,
    payload: event as never,
  } as never);

  return NextResponse.json({ ok: true, applied: updates });
}
