import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cliente mínimo del API de Culqi para suscripciones.
 *
 * Docs: https://docs.culqi.com/docs/integrations/recurrent-payments/
 *
 * Modelo:
 *   1. Frontend usa Culqi Checkout (JS público) y obtiene un `tokenId`.
 *   2. Backend crea un Customer con el tokenId.
 *   3. Backend crea una Subscription Customer+Plan.
 *   4. Webhooks notifican subscription.activated, charge.creation, etc.
 */

const CULQI_BASE = 'https://api.culqi.com/v2';

function getSecret(): string {
  const k = process.env.CULQI_PRIVATE_KEY;
  if (!k) throw new Error('CULQI_PRIVATE_KEY no configurada');
  return k;
}

async function culqiFetch(
  path: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: unknown },
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${CULQI_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data: data as Record<string, unknown> };
}

export async function createCulqiCustomer(args: {
  email: string;
  full_name: string;
  address?: string;
  address_city?: string;
  country_code?: string;
  phone_number?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const { status, data } = await culqiFetch('/customers', {
    method: 'POST',
    body: {
      first_name: args.full_name.split(' ')[0] || 'Cliente',
      last_name: args.full_name.split(' ').slice(1).join(' ') || 'LexIA',
      email: args.email,
      address: args.address || 'No especificado',
      address_city: args.address_city || 'Lima',
      country_code: args.country_code || 'PE',
      phone_number: args.phone_number || '999999999',
      metadata: args.metadata,
    },
  });
  if (status >= 300) {
    throw new Error(`Culqi createCustomer ${status}: ${JSON.stringify(data)}`);
  }
  return { id: String(data.id) };
}

export async function createCulqiSubscription(args: {
  card_id: string;
  plan_id: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const { status, data } = await culqiFetch('/recurrent/subscriptions/create', {
    method: 'POST',
    body: {
      card_id: args.card_id,
      plan_id: args.plan_id,
      metadata: args.metadata,
    },
  });
  if (status >= 300) {
    throw new Error(`Culqi createSubscription ${status}: ${JSON.stringify(data)}`);
  }
  return { id: String(data.id) };
}

export async function cancelCulqiSubscription(subscription_id: string): Promise<void> {
  const { status, data } = await culqiFetch(
    `/recurrent/subscriptions/${subscription_id}`,
    { method: 'DELETE' },
  );
  if (status >= 300) {
    throw new Error(`Culqi cancel ${status}: ${JSON.stringify(data)}`);
  }
}

/**
 * Verifica la firma HMAC del webhook. Culqi envía la cabecera
 * `culqi-signature` con HMAC-SHA256 del body crudo usando la clave privada.
 *
 * Devuelve true si la firma es válida.
 */
export function verifyCulqiSignature(rawBody: string, signature: string): boolean {
  const secret = getSecret();
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(computed, 'utf-8');
  const b = Buffer.from(signature, 'utf-8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Maps internos tier → plan_id de Culqi. Estos IDs deben coincidir con los
 * planes creados manualmente en el dashboard de Culqi.
 *
 * Defaults los pongo placeholder; al activar Culqi en producción se completan
 * desde el .env.
 */
export function planIdFor(tier: 'starter' | 'pro'): string | null {
  if (tier === 'starter') return process.env.CULQI_PLAN_STARTER || null;
  if (tier === 'pro') return process.env.CULQI_PLAN_PRO || null;
  return null;
}
