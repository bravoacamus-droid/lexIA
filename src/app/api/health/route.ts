import { NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check ligero. Confirma:
 *   - Env vars críticas presentes
 *   - Conexión a Supabase (count en tabla pequeña)
 *
 * No revela info sensible. 200 ⇒ todo OK.
 * 503 ⇒ falta algo crítico.
 */
export async function GET() {
  const checks: Record<string, 'ok' | string> = {};
  const startedAt = Date.now();

  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
  ];
  for (const k of requiredEnvs) {
    checks[`env.${k}`] = process.env[k] ? 'ok' : 'missing';
  }

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { count, error } = await admin
      .from('normative_documents')
      .select('id', { count: 'exact', head: true });
    checks['db.normative_documents'] = error
      ? `error: ${error.message.slice(0, 80)}`
      : `ok (${count ?? 0} docs)`;
  } catch (e) {
    checks['db.normative_documents'] = `error: ${(e as Error).message.slice(0, 80)}`;
  }

  const allOk = Object.values(checks).every((v) => v.startsWith('ok'));
  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      uptime_ms: Date.now() - startedAt,
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
