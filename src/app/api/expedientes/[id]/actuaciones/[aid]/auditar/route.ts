import { NextResponse } from 'next/server';
import { estadoDelExpediente, fallo, sesion } from '@/lib/ejecucion/api';
import { reauditar } from '@/lib/ejecucion/servicio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Vuelve a auditar el documento, por ejemplo tras corregir la ficha. */
export async function POST(_req: Request, { params }: { params: { id: string; aid: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  try {
    await reauditar(s.supabase, params.id, params.aid, s.user.id);
    return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
  } catch (e) {
    return fallo(e);
  }
}
