import { NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { esCronAutorizado } from '@/lib/auth/secreto';
import { cerrarLlamadasAbiertas } from '@/lib/voice/llamadas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron de retención de grabaciones de voz.
 *
 * Ejecuta el barrido diario que cumple la política de retención de 90
 * días informada al usuario en /legal/privacidad-voz:
 *   - Toma todas las voice_calls con audio_storage_path != null cuyo
 *     retention_until ya pasó.
 *   - Borra el archivo del bucket voice-recordings.
 *   - Limpia el campo audio_storage_path (la fila se conserva con su
 *     transcripción y métricas; el usuario aún puede ver el resumen
 *     de la llamada, simplemente ya no puede descargar el audio).
 *
 * Autenticación:
 *   - Bearer token con CRON_SECRET (Vercel Cron envía este header).
 *   - GET para Vercel Cron, POST para invocación manual desde panel
 *     admin (futuro).
 */
async function handleRun(req: Request): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 });
  }
  if (!esCronAutorizado(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 });
  }

  const admin = createAdmin(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Las llamadas que quedaron «en curso» (se cerró la pestaña sin colgar)
  // se cierran y se cobran hasta su último turno.
  const colgadas = await cerrarLlamadasAbiertas(admin, { antesDe: new Date(Date.now() - 3 * 3600 * 1000) });

  // Buscar llamadas con audio cuya retención venció.
  // Limit 500 por corrida para evitar timeouts.
  const { data: expired, error: queryErr } = await admin
    .from('voice_calls')
    .select('id, user_id, audio_storage_path, retention_until')
    .not('audio_storage_path', 'is', null)
    .lt('retention_until', new Date().toISOString())
    .limit(500);

  if (queryErr) {
    return NextResponse.json(
      { error: 'query_failed', detail: queryErr.message },
      { status: 500 },
    );
  }

  const candidates = (expired || []) as Array<{
    id: string;
    user_id: string;
    audio_storage_path: string | null;
    retention_until: string;
  }>;

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      message: 'No hay audios para borrar',
      llamadas_colgadas_cerradas: colgadas,
      processed: 0,
    });
  }

  // Borrar los archivos del bucket
  // Solo dentro de la carpeta del dueño: la ruta viene de la fila.
  const paths = candidates
    .map((c) => c.audio_storage_path)
    .filter((p, i): p is string => !!p && p.startsWith(`${candidates[i].user_id}/`) && !p.includes('..'));

  let removedCount = 0;
  let removeErr: string | null = null;
  if (paths.length > 0) {
    const { error } = await admin.storage.from('voice-recordings').remove(paths);
    if (error) {
      removeErr = error.message;
    } else {
      removedCount = paths.length;
    }
  }

  // Limpiar audio_storage_path en BD para los procesados (si el remove falló
  // igual limpiamos el path porque el archivo puede haberse perdido)
  const idsToClear = candidates.map((c) => c.id);
  const { error: updateErr } = await admin
    .from('voice_calls')
    .update({ audio_storage_path: null } as never)
    .in('id', idsToClear);

  return NextResponse.json({
    ok: true,
    llamadas_colgadas_cerradas: colgadas,
    candidates_found: candidates.length,
    storage_removed: removedCount,
    db_cleared: idsToClear.length,
    storage_error: removeErr,
    db_error: updateErr?.message || null,
  });
}

export async function GET(req: Request) {
  return handleRun(req);
}

export async function POST(req: Request) {
  return handleRun(req);
}
