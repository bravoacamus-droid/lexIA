import { NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check ligero. Confirma:
 *   - Env vars críticas presentes
 *   - Conexión a Supabase (count en tabla pequeña)
 *
 * 200 ⇒ todo OK · 503 ⇒ falta algo crítico.
 *
 * Es público (lo consultan los monitores), así que solo responde el
 * estado: qué variable falta o cuántos documentos hay queda en los logs
 * de Vercel, no en la respuesta (auditoría del 26/11/2026, S6).
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
  if (!allOk) console.error('[health] degradado', { checks, ms: Date.now() - startedAt });
  return NextResponse.json({ status: allOk ? 'ok' : 'degraded' }, { status: allOk ? 200 : 503 });
}
