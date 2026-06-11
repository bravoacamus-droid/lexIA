import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Borra la cuenta del usuario actual de forma irreversible.
 *
 * Hace:
 *   1. auth.admin.deleteUser(uid) — esto desencadena las FKs ON DELETE
 *      CASCADE en profiles, subscriptions, chat_conversations, evaluations,
 *      generated_documents, user_folders, feature_usage, etc.
 *   2. Cierra la sesión del navegador llamando a signOut().
 *
 * Nota: si el usuario tiene suscripción activa en Culqi, queda como
 * responsabilidad del cliente cancelarla manualmente (la integración con
 * el endpoint /api/billing/checkout y los webhooks sigue siendo posible).
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', detail: error.message },
      { status: 500 },
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
